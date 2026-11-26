// Pure: before a single node runs, finds an upstream Director whose card changed since its last plan.

import type { CanvasNodeData, CanvasNodeType } from "@/model/canvas";
import { directorNeedsReplan, isPlanDirectorNode } from "@/service/canvas/directors/explainer-director";
import { downstreamNodeIds } from "@/service/canvas/core/stale-outputs";

type GraphNode = { id: string; type: string; data: CanvasNodeData };
type GraphEdge = { source: string; target: string };

export type ReplanBeforeRun = {
  directorId: string;
  // Other previews below that Director that stay old versions until they run again.
  affectedIds: string[];
};

function upstreamNodeIds(edges: readonly GraphEdge[], startId: string): string[] {
  const into = new Map<string, string[]>();
  for (const edge of edges) {
    const list = into.get(edge.target);
    if (list) list.push(edge.source);
    else into.set(edge.target, [edge.source]);
  }
  const seen = new Set<string>([startId]);
  const queue = [...(into.get(startId) ?? [])];
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    queue.push(...(into.get(id) ?? []));
  }
  return order;
}

export function replanBeforeRun(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  nodeId: string,
): ReplanBeforeRun | undefined {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const directorId = upstreamNodeIds(edges, nodeId).find((id) => {
    const node = byId.get(id);
    if (!node) return false;
    const director = { type: node.type as CanvasNodeType, data: node.data };
    return isPlanDirectorNode(director) && directorNeedsReplan(director);
  });
  if (!directorId) return undefined;
  const affectedIds = downstreamNodeIds(edges, [directorId]).filter((id) => {
    if (id === directorId || id === nodeId) return false;
    const node = byId.get(id);
    return Boolean(node && (node.type === "model" || node.type === "character") && node.data.outputUrl);
  });
  return { directorId, affectedIds };
}
