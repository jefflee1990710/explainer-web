// Pure graph edits after a Director plan: build or rebuild its rows, or keep them and cut lost outputs.

import type { CanvasGroup } from "@/model/canvas";
import { directorHandles, parseDirectorHandle, type ExplainerDirectorPlan } from "@/service/canvas/explainer-director";

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

// Removes wires from Director outputs the new plan no longer has, and names their targets.
export function dropCutDirectorEdges<E extends Pick<GraphEdge, "source" | "target" | "sourceHandle">>(
  edges: readonly E[],
  directorId: string,
  plan: ExplainerDirectorPlan,
): { edges: E[]; cutTargets: string[] } {
  const live = new Set(directorHandles(plan));
  const cutTargets: string[] = [];
  const kept = edges.filter((e) => {
    const handle = e.sourceHandle;
    const cut = e.source === directorId && Boolean(handle && parseDirectorHandle(handle)) && !live.has(handle!);
    if (cut && !cutTargets.includes(e.target)) cutTargets.push(e.target);
    return !cut;
  });
  return { edges: kept, cutTargets };
}
