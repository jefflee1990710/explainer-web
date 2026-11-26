// Pure: marks canvas previews made stale by an input change, plus everything downstream.

import type { CanvasNodeData, CanvasNodeStatus, CanvasNodeType, CanvasOutputKind } from "@/model/canvas";
import { isNewerJob } from "@/service/canvas/core/graph";
import { directorNeedsReplan, isPlanDirectorNode } from "@/service/canvas/directors/explainer-director";
import { isExplainerPlannerNode } from "@/service/canvas/directors/explainer-planner";
import { isScroDirectorNode } from "@/service/canvas/directors/scro-director";

type GraphNode = { id: string; type: string; data: CanvasNodeData };
type GraphEdge = { source: string; target: string };

// Fields that change what a node generates. Status and output fields are not inputs.
const INPUT_KEYS = [
  "prompt",
  "text",
  "negativePrompt",
  "modelId",
  "presetId",
  "aspectRatio",
  "resolution",
  "durationSeconds",
  "seed",
  "toolParams",
  "mediaUrl",
  "characterId",
] as const satisfies readonly (keyof CanvasNodeData)[];

export function isGenerationInputPatch(data: CanvasNodeData, patch: Partial<CanvasNodeData>): boolean {
  return INPUT_KEYS.some(
    (key) => key in patch && JSON.stringify(patch[key]) !== JSON.stringify(data[key]),
  );
}

// Back to idle with no preview; the stamp keeps server recovery from restoring the old output.
export function clearNodeOutput(data: CanvasNodeData, clearedAt: string): CanvasNodeData {
  const rest: CanvasNodeData = { ...data };
  delete rest.outputUrl;
  delete rest.outputKind;
  delete rest.lastJobId;
  delete rest.lastError;
  delete rest.lastCostUsd;
  delete rest.staleOutputUrl;
  return { ...rest, status: "idle", outputClearedAt: clearedAt };
}

// Changed nodes first, then every node reachable along edges (breadth-first).
export function downstreamNodeIds(edges: readonly GraphEdge[], startIds: readonly string[]): string[] {
  const out = new Map<string, string[]>();
  for (const edge of edges) {
    const list = out.get(edge.source);
    if (list) list.push(edge.target);
    else out.set(edge.source, [edge.target]);
  }
  const seen = new Set<string>();
  const queue = [...startIds];
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    queue.push(...(out.get(id) ?? []));
  }
  return order;
}

function hasStaleState(node: GraphNode): boolean {
  if (node.type !== "model" && node.type !== "character") return false;
  const status = node.data.status;
  if (status === "queued" || status === "running") return false;
  return Boolean(node.data.outputUrl) || status === "completed" || status === "failed";
}

// The preview was made before an input changed. A new output gets a new URL, which ends it.
export function isOutputStale(data: CanvasNodeData): boolean {
  return Boolean(data.outputUrl && data.staleOutputUrl === data.outputUrl);
}

type RememberedJobOutput = {
  status: CanvasNodeStatus;
  lastJobId: string;
  lastCostUsd?: number;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  lastError?: string;
};

// Paint a polled job onto a node. A completed job with a new file replaces the old clip.
// The same file must stay put while it is still marked as an old version, or Run Flow
// would treat that preview as current and skip it.
export function applyRememberedJobOutput(data: CanvasNodeData, job: RememberedJobOutput): CanvasNodeData {
  // An older poll must not put the previous file back on a node that already moved on.
  if (isNewerJob(data.lastJobId, job.lastJobId)) return data;
  // A node explicitly reset (e.g. Director Replan) must not resurrect a job created before the reset.
  if (data.status === "idle" && !data.lastJobId && data.outputClearedAt) {
    const clearedMs = Date.parse(data.outputClearedAt);
    const jobMs = /^[a-f0-9]{24}$/i.test(job.lastJobId)
      ? Number.parseInt(job.lastJobId.slice(0, 8), 16) * 1000
      : 0;
    if (Number.isFinite(clearedMs) && jobMs > 0 && jobMs <= clearedMs) return data;
  }
  const sameOldClip =
    isOutputStale(data) && job.status === "completed" && (!job.outputUrl || job.outputUrl === data.outputUrl);
  if (sameOldClip) {
    return {
      ...data,
      status: data.status ?? job.status,
      lastJobId: job.lastJobId,
      ...(job.lastCostUsd !== undefined ? { lastCostUsd: job.lastCostUsd } : {}),
    };
  }
  const next: CanvasNodeData = {
    ...data,
    status: job.status,
    lastJobId: job.lastJobId,
    ...(job.lastCostUsd !== undefined ? { lastCostUsd: job.lastCostUsd } : {}),
    ...(job.outputUrl ? { outputUrl: job.outputUrl } : {}),
    ...(job.outputKind ? { outputKind: job.outputKind } : {}),
    lastError: job.status === "failed" ? job.lastError : undefined,
  };
  if (job.status === "completed" && job.outputUrl && job.outputUrl !== data.outputUrl) {
    delete next.staleOutputUrl;
  }
  return next;
}

// Merges only server execution fields from a flow poll into local node data,
// preserving any unsaved user edits (prompt, model params, toolParams, etc.).
export function mergeFlowPollNodeData(
  local: CanvasNodeData,
  server: CanvasNodeData,
): CanvasNodeData {
  if (isNewerJob(local.lastJobId, server.lastJobId)) return local;
  // Do not let an older flow poll overwrite a node explicitly cleared locally.
  if (local.status === "idle" && !local.lastJobId && local.outputClearedAt && server.lastJobId) {
    const clearedMs = Date.parse(local.outputClearedAt);
    const jobMs = /^[a-f0-9]{24}$/i.test(server.lastJobId)
      ? Number.parseInt(server.lastJobId.slice(0, 8), 16) * 1000
      : 0;
    if (Number.isFinite(clearedMs) && jobMs > 0 && jobMs <= clearedMs) return local;
  }
  const next: CanvasNodeData = {
    ...local,
    ...(server.status !== undefined ? { status: server.status } : {}),
    ...(server.lastJobId !== undefined ? { lastJobId: server.lastJobId } : {}),
    ...(server.lastCostUsd !== undefined ? { lastCostUsd: server.lastCostUsd } : {}),
    ...(server.outputUrl !== undefined ? { outputUrl: server.outputUrl } : {}),
    ...(server.outputKind !== undefined ? { outputKind: server.outputKind } : {}),
    ...(server.outputMeta !== undefined ? { outputMeta: server.outputMeta } : {}),
    lastError: server.status === "failed" ? server.lastError : undefined,
  };
  // Auto-captions writes the transcribed SRT into `data.text` on completion.
  if (
    local.modelId === "scro:auto-captions" &&
    server.status === "completed" &&
    server.text !== undefined &&
    server.lastJobId &&
    server.lastJobId !== local.lastJobId
  ) {
    next.text = server.text;
  }
  // A freshly completed output URL clears an older stale mark, while preserving
  // a newer local stale mark if the user edited inputs during the run.
  if (server.status === "completed" && server.outputUrl && server.outputUrl !== local.outputUrl) {
    delete next.staleOutputUrl;
  } else if (server.staleOutputUrl && !local.staleOutputUrl) {
    next.staleOutputUrl = server.staleOutputUrl;
  }
  return next;
}

// Completed previews a flow must regenerate: the ones already marked old, any extra ids
// (the canvas UI's old-version nodes), and every finished model downstream of those,
// because a new upstream picture or clip makes the later preview old too.
export function flowRerunNodeIds(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  extraIds: readonly string[] = [],
): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seeds = new Set(extraIds);
  for (const node of nodes) {
    if (isOutputStale(node.data)) seeds.add(node.id);
  }
  if (seeds.size === 0) return [];
  return downstreamNodeIds(edges, [...seeds]).filter((id) => {
    const node = byId.get(id);
    if (!node || node.type !== "model") return false;
    const director = { type: node.type as CanvasNodeType, data: node.data };
    if (isExplainerPlannerNode(director) || isScroDirectorNode(director)) return false;
    return seeds.has(id) || Boolean(node.data.outputUrl?.trim());
  });
}

// Keeps the old preview, marked as an old version that Run must regenerate.
export function markStaleOutputs<N extends GraphNode>(
  nodes: readonly N[],
  edges: readonly GraphEdge[],
  changedIds: readonly string[],
): { nodes: N[]; staleIds: string[] } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const staleIds = downstreamNodeIds(edges, changedIds).filter((id) => {
    const node = byId.get(id);
    if (!node || (node.type !== "model" && node.type !== "character")) return false;
    if (node.data.status === "queued" || node.data.status === "running") return false;
    return Boolean(node.data.outputUrl) && !isOutputStale(node.data);
  });
  if (staleIds.length === 0) return { nodes: [...nodes], staleIds };
  const stale = new Set(staleIds);
  return {
    nodes: nodes.map((n) =>
      stale.has(n.id) ? { ...n, data: { ...n.data, staleOutputUrl: n.data.outputUrl } } : n,
    ),
    staleIds,
  };
}

// Why a node's preview is an old version: its inputs changed, or ("settings") an upstream
// Explainer Director's settings changed but it was not replanned yet.
export type OutdatedReason = "inputs" | "settings";

export function outdatedNodeReasons(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): Map<string, OutdatedReason> {
  const reasons = new Map<string, OutdatedReason>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    const director = { type: node.type as CanvasNodeType, data: node.data };
    if (!isPlanDirectorNode(director) || !directorNeedsReplan(director)) continue;
    for (const id of downstreamNodeIds(edges, [node.id])) {
      if (id !== node.id && byId.get(id)?.data.outputUrl) reasons.set(id, "settings");
    }
  }
  for (const node of nodes) {
    if (isOutputStale(node.data)) reasons.set(node.id, "inputs");
  }
  return reasons;
}

export function clearStaleOutputs<N extends GraphNode>(
  nodes: readonly N[],
  edges: readonly GraphEdge[],
  changedIds: readonly string[],
  clearedAt: string,
): { nodes: N[]; clearedIds: string[] } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const clearedIds = downstreamNodeIds(edges, changedIds).filter((id) => {
    const node = byId.get(id);
    return node ? hasStaleState(node) : false;
  });
  if (clearedIds.length === 0) return { nodes: [...nodes], clearedIds };
  const clear = new Set(clearedIds);
  return {
    nodes: nodes.map((n) => (clear.has(n.id) ? { ...n, data: clearNodeOutput(n.data, clearedAt) } : n)),
    clearedIds,
  };
}
