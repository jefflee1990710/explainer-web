// Pure: clears canvas previews made stale by an input change, plus everything downstream.

import type { CanvasNodeData } from "@/model/canvas";

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
