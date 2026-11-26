// Which model nodes a card's "run with dependents" action includes.

import type { CanvasNodeData } from "@/model/canvas";
import { downstreamNodeIds } from "@/service/canvas/core/stale-outputs";
import { isExplainerPlannerNode } from "@/service/canvas/directors/explainer-planner";
import { isScroDirectorNode } from "@/service/canvas/directors/scro-director";

type GraphNode = { id: string; type: string; data: CanvasNodeData };
type GraphEdge = { source: string; target: string };

// This node, then every runnable model downstream. Upstream and side branches stay out.
export function runnableNodeAndDependents(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  nodeId: string,
): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return downstreamNodeIds(edges, [nodeId]).filter((id) => {
    const node = byId.get(id);
    if (!node || node.type !== "model" || !node.data.modelId) return false;
    const director = { type: "model" as const, data: node.data };
    if (isExplainerPlannerNode(director) || isScroDirectorNode(director)) return false;
    return true;
  });
}
