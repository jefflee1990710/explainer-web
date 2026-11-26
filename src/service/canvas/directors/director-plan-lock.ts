// While a Director is still planning, every other node in its group stays locked.

import type { CanvasNode } from "@/model/canvas";
import { isPlanDirectorNode } from "@/service/canvas/directors/explainer-director";
import { readPlannerParams } from "@/service/canvas/directors/explainer-planner";

type LockNode = {
  id: string;
  type?: string | null;
  data: CanvasNode["data"] | { modelId?: string; toolParams?: Record<string, unknown> };
};

function plannerView(node: LockNode): Pick<CanvasNode, "type" | "data"> {
  return { type: "model", data: node.data as CanvasNode["data"] };
}

export type DirectorPlanningLocks = {
  // Rows the Director has placed. The Director card itself stays usable.
  nodeIds: ReadonlySet<string>;
  // Groups whose frame should not be dragged, run, ungrouped, or deleted.
  groupIds: ReadonlySet<string>;
};

export function directorPlanningLocks(
  nodes: readonly LockNode[],
  groups: readonly { id: string; memberIds: readonly string[] }[],
): DirectorPlanningLocks {
  const planning = new Set(
    nodes
      .filter((node) => {
        if (node.type !== "model") return false;
        const view = plannerView(node);
        return isPlanDirectorNode(view) && readPlannerParams(view).planStatus === "planning";
      })
      .map((node) => node.id),
  );
  const nodeIds = new Set<string>();
  const groupIds = new Set<string>();
  if (planning.size === 0) return { nodeIds, groupIds };
  for (const group of groups) {
    if (!group.memberIds.some((id) => planning.has(id))) continue;
    groupIds.add(group.id);
    for (const id of group.memberIds) {
      if (!planning.has(id)) nodeIds.add(id);
    }
  }
  return { nodeIds, groupIds };
}
