// Records Scro Swap group membership after the agent adds or removes a wire.

import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/working-graph";
import { isSwapDirectorNode } from "@/service/canvas/directors/scro-director";
import { syncSwapDirectorGroupMembers } from "@/service/canvas/directors/swap-group-membership";

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function commitSwapDirectorGroups(g: CanvasAgentWorkingGraph, createMissing: boolean): void {
  const next = syncSwapDirectorGroupMembers(g.nodes, g.edges, g.groups, { createMissing });
  if (next === g.groups) return;
  const prevById = new Map(g.groups.map((group) => [group.id, group]));
  const nextIds = new Set(next.map((group) => group.id));
  for (const group of g.groups) {
    if (!nextIds.has(group.id)) g.ops.push({ kind: "remove_group", groupId: group.id });
  }
  for (const group of next) {
    const prev = prevById.get(group.id);
    if (!prev) {
      g.ops.push({ kind: "add_group", group });
      continue;
    }
    if (!sameIds(prev.memberIds, group.memberIds)) {
      g.ops.push({ kind: "update_group", groupId: group.id, patch: { memberIds: group.memberIds } });
    }
  }
  g.groups = next;
}

export function edgeTouchesSwapDirector(g: CanvasAgentWorkingGraph, sourceId: string, targetId: string): boolean {
  return [sourceId, targetId].some((id) => {
    const node = g.nodes.find((item) => item.id === id);
    return Boolean(node && isSwapDirectorNode(node));
  });
}
