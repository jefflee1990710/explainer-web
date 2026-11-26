// Pure graph edits for a Director plan: place its rows step by step, merge the finished plan, or rebuild.

import type { CanvasGroup, CanvasNodeData } from "@/model/canvas";
import { isPlanDirectorNode, parseDirectorHandle } from "@/service/canvas/explainer-director";
import { clearNodeOutput, downstreamNodeIds, isGenerationInputPatch } from "@/service/canvas/stale-outputs";

type GraphNode = { id: string; type?: string; data?: CanvasNodeData };
type GraphEdge = { id: string; source: string; target: string; sourceHandle?: string | null };

function isResettableNode(node: GraphNode): node is GraphNode & { data: CanvasNodeData } {
  if (!node.data) return false;
  if (node.type !== "model" && node.type !== "character") return false;
  if (node.type === "model" && isPlanDirectorNode({ type: "model", data: node.data })) return false;
  return true;
}

// Adds the expanded rows; a rebuild first removes the old group's members except the Director
// and resets any downstream model/character nodes that were wired from them.
export function applyDirectorBuild<N extends GraphNode, E extends GraphEdge>(
  graph: { nodes: readonly N[]; edges: readonly E[] },
  input: {
    directorId: string;
    expansion: { nodes: readonly N[]; edges: readonly E[] };
    replaceGroup?: CanvasGroup;
    clearedAt?: string;
  },
): { nodes: N[]; edges: E[]; removedIds: string[]; resetIds: string[] } {
  const removed = new Set((input.replaceGroup?.memberIds ?? []).filter((id) => id !== input.directorId));
  const resetIds: string[] = [];
  const downstreamReset =
    removed.size > 0 && input.clearedAt
      ? new Set(
          downstreamNodeIds(graph.edges, [...removed]).filter(
            (id) => id !== input.directorId && !removed.has(id),
          ),
        )
      : new Set<string>();

  const nodes = graph.nodes
    .filter((n) => !removed.has(n.id))
    .map((n) => {
      if (input.clearedAt && downstreamReset.has(n.id) && isResettableNode(n)) {
        resetIds.push(n.id);
        return { ...n, data: clearNodeOutput(n.data, input.clearedAt) };
      }
      return n;
    });
  const edges = graph.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeIds = new Set(edges.map((e) => e.id));
  return {
    nodes: [...nodes, ...input.expansion.nodes.filter((n) => !nodeIds.has(n.id))],
    edges: [...edges, ...input.expansion.edges.filter((e) => !edgeIds.has(e.id))],
    removedIds: [...removed],
    resetIds,
  };
}

// Finished plan onto rows built while planning: same-id nodes take the final data but keep
// where they sit and any output already made; reference stills and wires that only exist now are added.
export function mergeDirectorRows<N extends GraphNode & { data: object }, E extends GraphEdge>(
  graph: { nodes: readonly N[]; edges: readonly E[] },
  expansion: { nodes: readonly N[]; edges: readonly E[] },
): { nodes: N[]; edges: E[]; addedIds: string[] } {
  const finalById = new Map(expansion.nodes.map((n) => [n.id, n]));
  const present = new Set(graph.nodes.map((n) => n.id));
  const nodes = graph.nodes.map((n) => {
    const next = finalById.get(n.id);
    return next ? { ...n, data: { ...n.data, ...next.data } } : n;
  });
  const added = expansion.nodes.filter((n) => !present.has(n.id));
  const edgeIds = new Set(graph.edges.map((e) => e.id));
  return {
    nodes: [...nodes, ...added],
    edges: [...graph.edges, ...expansion.edges.filter((e) => !edgeIds.has(e.id))],
    addedIds: added.map((n) => n.id),
  };
}

// Row role shared by the old plan and a replan (`exp-old-voice-1` and `exp-new-voice-1` are both `voice-1`).
const ROW_ROLE = /-(frame|video|voice|mux|concat|ref|silence|grade)-(\d+)$/;

function rowRole(id: string): string | undefined {
  const match = ROW_ROLE.exec(id);
  return match ? `${match[1]}-${match[2]}` : undefined;
}

type ReplanNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: CanvasNodeData;
};
type ReplanEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

// Fields a finished plan may refresh onto existing rows before resetting their outputs.
function planInputPatch(next: CanvasNodeData): Partial<CanvasNodeData> {
  const patch: Partial<CanvasNodeData> = {};
  if (next.presetId !== undefined) patch.presetId = next.presetId;
  if (next.aspectRatio !== undefined) patch.aspectRatio = next.aspectRatio;
  if (next.resolution !== undefined) patch.resolution = next.resolution;
  if (next.durationSeconds !== undefined) patch.durationSeconds = next.durationSeconds;
  if (next.toolParams !== undefined) patch.toolParams = next.toolParams;
  if (next.mediaUrl !== undefined) patch.mediaUrl = next.mediaUrl;
  if (next.mediaKind !== undefined) patch.mediaKind = next.mediaKind;
  if (next.label !== undefined) patch.label = next.label;
  if (next.fileName !== undefined) patch.fileName = next.fileName;
  return patch;
}

function refUrlKey(
  nodes: readonly ReplanNode[],
  edges: readonly ReplanEdge[],
  frameId: string,
): string {
  return edges
    .filter((edge) => edge.target === frameId && edge.targetHandle === "refImages")
    .map((edge) => nodes.find((node) => node.id === edge.source)?.data.mediaUrl)
    .filter((url): url is string => Boolean(url))
    .sort()
    .join("\n");
}

// Same clip count keeps the row ids already on the canvas. Copies the new plan's reference
// stills and row inputs, adds/drops reference stills, and resets all child + downstream model/character
// nodes back to idle with old media cleaned.
export function syncDirectorReplanRows<N extends ReplanNode, E extends ReplanEdge>(
  graph: { nodes: readonly N[]; edges: readonly E[] },
  expansion: { nodes: readonly N[]; edges: readonly E[] },
  memberIds: readonly string[],
  clearedAt: string = new Date().toISOString(),
): {
  nodes: N[];
  edges: E[];
  changedIds: string[];
  addedIds: string[];
  removedIds: string[];
  resetIds: string[];
} {
  const members = new Set(memberIds);
  const directorEdgeSources = new Set(
    graph.edges.filter((e) => Boolean(parseDirectorHandle(e.sourceHandle))).map((e) => e.source),
  );
  const isDirector = (node: ReplanNode) =>
    (node.type === "model" && isPlanDirectorNode({ type: "model", data: node.data })) ||
    directorEdgeSources.has(node.id);
  const directorIds = new Set(graph.nodes.filter((n) => members.has(n.id) && isDirector(n)).map((n) => n.id));

  const existingByRole = new Map<string, N>();
  for (const node of graph.nodes) {
    if (!members.has(node.id)) continue;
    const role = rowRole(node.id);
    if (role) existingByRole.set(role, node);
  }
  const expansionByRole = new Map<string, N>();
  for (const node of expansion.nodes) {
    const role = rowRole(node.id);
    if (role) expansionByRole.set(role, node);
  }

  const changed = new Set<string>();
  const removedIds = [...existingByRole.entries()]
    .filter(([role]) => role.startsWith("ref-") && !expansionByRole.has(role))
    .map(([, node]) => node.id);
  const removed = new Set(removedIds);
  for (const id of removedIds) changed.add(id);

  const added = [...expansionByRole.entries()]
    .filter(([role]) => role.startsWith("ref-") && !existingByRole.has(role))
    .map(([, node]) => node);
  const anchor = [...existingByRole.values()].find((node) => rowRole(node.id)?.startsWith("ref-"));
  const addedNodes = added.map((node, index) =>
    anchor
      ? { ...node, position: { x: anchor.position.x, y: anchor.position.y + (index + 1) * 180 } }
      : node,
  );

  const idFor = (id: string) => {
    const role = rowRole(id);
    return role ? (existingByRole.get(role)?.id ?? id) : id;
  };
  const frameIds = new Set(
    [...existingByRole.entries()].filter(([role]) => role.startsWith("frame-")).map(([, node]) => node.id),
  );

  const patchedNodes = graph.nodes.flatMap((node) => {
    if (removed.has(node.id)) return [];
    const role = members.has(node.id) ? rowRole(node.id) : undefined;
    const next = role ? expansionByRole.get(role) : undefined;
    if (!next) return [node];
    const patch = planInputPatch(next.data);
    if (isGenerationInputPatch(node.data, patch)) changed.add(node.id);
    return [{ ...node, data: { ...node.data, ...patch } }];
  });
  const combinedNodes = [...patchedNodes, ...addedNodes];

  const translatedRefs: E[] = [];
  for (const edge of expansion.edges) {
    if (edge.targetHandle !== "refImages") continue;
    const source = idFor(edge.source);
    const target = idFor(edge.target);
    if (!frameIds.has(target)) continue;
    translatedRefs.push({
      ...edge,
      id: `${source}->${target}:refImages`,
      source,
      sourceHandle: edge.sourceHandle || "output",
      target,
      targetHandle: "refImages",
    });
  }
  const freshRefs = new Set<E>(translatedRefs);
  for (const frameId of frameIds) {
    const before = refUrlKey(graph.nodes, graph.edges, frameId);
    const after = refUrlKey(combinedNodes, translatedRefs, frameId);
    if (before !== after) changed.add(frameId);
  }

  const seen = new Set<string>();
  const edges = [...graph.edges, ...translatedRefs].filter((edge) => {
    if (removed.has(edge.source) || removed.has(edge.target)) return false;
    if (edge.targetHandle === "refImages" && frameIds.has(edge.target) && !freshRefs.has(edge)) return false;
    if (seen.has(edge.id)) return false;
    seen.add(edge.id);
    return true;
  });

  // Reset every child model/character node in the director's group plus anything wired downstream.
  const resetSeeds = [
    ...memberIds.filter((id) => !directorIds.has(id) && !removed.has(id)),
    ...graph.edges.filter((e) => directorIds.has(e.source)).map((e) => e.target),
  ];
  const resetTargets = new Set(
    downstreamNodeIds([...graph.edges, ...edges], resetSeeds).filter((id) => !directorIds.has(id)),
  );
  const resetIds: string[] = [];
  const allNodes = combinedNodes.map((node) => {
    if (!resetTargets.has(node.id) || !isResettableNode(node)) return node;
    resetIds.push(node.id);
    return { ...node, data: clearNodeOutput(node.data, clearedAt) };
  });

  return {
    nodes: allNodes,
    edges,
    changedIds: [...changed],
    addedIds: added.map((node) => node.id),
    removedIds,
    resetIds,
  };
}

// One node per step, in build order; each step also carries the wires whose two ends are now placed.
export function directorRevealSteps<N extends GraphNode, E extends GraphEdge>(
  expansion: { nodes: readonly N[]; edges: readonly E[] },
  existingIds: Iterable<string>,
): { node: N; edges: E[] }[] {
  const placed = new Set(existingIds);
  const waiting = [...expansion.edges];
  return expansion.nodes.map((node) => {
    placed.add(node.id);
    const ready = waiting.filter((e) => placed.has(e.source) && placed.has(e.target));
    for (const e of ready) waiting.splice(waiting.indexOf(e), 1);
    return { node, edges: ready };
  });
}