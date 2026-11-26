// Kahn topological waves for model nodes. Planner and director cards are not executed.
// Callers keep importing this from "@/service/canvas/core/graph".

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { isExplainerPlannerNode } from "@/service/canvas/directors/explainer-planner";
import { isScroDirectorNode } from "@/service/canvas/directors/scro-director";

// Plans parallel execution waves across model nodes using Kahn's topological sort.
// When `targetModelNodeIds` is provided, restricts execution to those targets and
// all of their upstream model ancestors. Throws if a cycle exists.
export function computeExecutionWaves(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  targetModelNodeIds?: readonly string[],
): string[][] {
  const modelOrder = new Map<string, number>();
  const allModelIds: string[] = [];
  for (const node of nodes) {
    // Planner nodes only plan; their expanded nodes do the work.
    if (node.type === "model" && !isExplainerPlannerNode(node) && !isScroDirectorNode(node)) {
      modelOrder.set(node.id, allModelIds.length);
      allModelIds.push(node.id);
    }
  }

  let selectedSet: Set<string>;
  if (targetModelNodeIds !== undefined) {
    // Walk upstream from requested targets to gather all ancestor model nodes.
    const reverseAdj = new Map<string, string[]>();
    for (const edge of edges) {
      if (!modelOrder.has(edge.source) || !modelOrder.has(edge.target)) continue;
      const parents = reverseAdj.get(edge.target);
      if (parents) {
        parents.push(edge.source);
      } else {
        reverseAdj.set(edge.target, [edge.source]);
      }
    }

    selectedSet = new Set<string>();
    const stack: string[] = [];
    for (const id of targetModelNodeIds) {
      if (modelOrder.has(id) && !selectedSet.has(id)) {
        selectedSet.add(id);
        stack.push(id);
      }
    }
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      for (const parent of reverseAdj.get(current) ?? []) {
        if (!selectedSet.has(parent)) {
          selectedSet.add(parent);
          stack.push(parent);
        }
      }
    }
  } else {
    selectedSet = new Set(allModelIds);
  }

  if (selectedSet.size === 0) {
    return [];
  }

  const selectedIds = allModelIds.filter((id) => selectedSet.has(id));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, Set<string>>();
  for (const id of selectedIds) {
    inDegree.set(id, 0);
    dependents.set(id, new Set<string>());
  }

  // Deduplicate parallel edges between the same pair of model nodes.
  for (const edge of edges) {
    if (!selectedSet.has(edge.source) || !selectedSet.has(edge.target)) {
      continue;
    }
    const deps = dependents.get(edge.source);
    if (!deps || deps.has(edge.target)) continue;
    deps.add(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const sortByNodeOrder = (ids: string[]) =>
    ids.sort((a, b) => (modelOrder.get(a) ?? 0) - (modelOrder.get(b) ?? 0));

  let currentWave = sortByNodeOrder(
    selectedIds.filter((id) => (inDegree.get(id) ?? 0) === 0),
  );

  const waves: string[][] = [];
  let processed = 0;

  while (currentWave.length > 0) {
    waves.push(currentWave);
    processed += currentWave.length;

    const nextWave: string[] = [];
    for (const id of currentWave) {
      for (const dependentId of dependents.get(id) ?? []) {
        const remaining = (inDegree.get(dependentId) ?? 0) - 1;
        inDegree.set(dependentId, remaining);
        if (remaining === 0) {
          nextWave.push(dependentId);
        }
      }
    }
    currentWave = sortByNodeOrder(nextWave);
  }

  if (processed !== selectedIds.length) {
    throw new Error(
      "Cannot compute execution waves: cycle detected in canvas graph",
    );
  }

  return waves;
}
