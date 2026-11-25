// Pure graph edits for a Director plan: place its rows step by step, merge the finished plan, or rebuild.

import type { CanvasGroup } from "@/model/canvas";

type GraphNode = { id: string };
type GraphEdge = { id: string; source: string; target: string; sourceHandle?: string | null };

// Adds the expanded rows; a rebuild first removes the old group's members except the Director.
export function applyDirectorBuild<N extends GraphNode, E extends GraphEdge>(
  graph: { nodes: readonly N[]; edges: readonly E[] },
  input: {
    directorId: string;
    expansion: { nodes: readonly N[]; edges: readonly E[] };
    replaceGroup?: CanvasGroup;
  },
): { nodes: N[]; edges: E[]; removedIds: string[] } {
  const removed = new Set((input.replaceGroup?.memberIds ?? []).filter((id) => id !== input.directorId));
  const nodes = graph.nodes.filter((n) => !removed.has(n.id));
  const edges = graph.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeIds = new Set(edges.map((e) => e.id));
  return {
    nodes: [...nodes, ...input.expansion.nodes.filter((n) => !nodeIds.has(n.id))],
    edges: [...edges, ...input.expansion.edges.filter((e) => !edgeIds.has(e.id))],
    removedIds: [...removed],
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