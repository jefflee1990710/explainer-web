// Pure replay of agent ops onto a canvas graph. Used by the client to animate
// the agent's edits onto the live graph, where the user may have changed things.

import { withGroup } from "@/service/canvas/groups";
import type { CanvasAgentGraph, CanvasAgentOp } from "@/service/canvas-agent/types";

export function applyCanvasAgentOp(
  graph: CanvasAgentGraph,
  op: CanvasAgentOp,
): { graph: CanvasAgentGraph; applied: boolean } {
  const { nodes, edges } = graph;
  const groups = graph.groups ?? [];
  const skip = { graph, applied: false };
  const hasNode = (id: string) => nodes.some((n) => n.id === id);
  const hasGroup = (id: string) => groups.some((g) => g.id === id);

  switch (op.kind) {
    case "add_node":
      if (hasNode(op.node.id)) return skip;
      return { graph: { ...graph, nodes: [...nodes, op.node] }, applied: true };

    case "update_node":
      if (!hasNode(op.nodeId)) return skip;
      return {
        graph: {
          ...graph,
          nodes: nodes.map((n) =>
            n.id === op.nodeId ? { ...n, data: { ...n.data, ...op.patch } } : n,
          ),
        },
        applied: true,
      };

    case "move_node":
      if (!hasNode(op.nodeId)) return skip;
      return {
        graph: {
          ...graph,
          nodes: nodes.map((n) => (n.id === op.nodeId ? { ...n, position: op.position } : n)),
        },
        applied: true,
      };

    case "remove_node":
      if (!hasNode(op.nodeId)) return skip;
      return {
        graph: {
          nodes: nodes.filter((n) => n.id !== op.nodeId),
          edges: edges.filter((e) => e.source !== op.nodeId && e.target !== op.nodeId),
          ...(graph.groups
            ? {
                groups: groups
                  .map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => id !== op.nodeId) }))
                  .filter((g) => g.memberIds.length > 0),
              }
            : {}),
        },
        applied: true,
      };

    case "add_edge": {
      const { edge } = op;
      if (!hasNode(edge.source) || !hasNode(edge.target)) return skip;
      // A replaced single-input edge arrives as its own remove_edge op first.
      const duplicate = edges.some(
        (e) =>
          e.id === edge.id ||
          (e.source === edge.source &&
            e.target === edge.target &&
            e.targetHandle === edge.targetHandle),
      );
      if (duplicate) return skip;
      return { graph: { ...graph, edges: [...edges, edge] }, applied: true };
    }

    case "remove_edge":
      if (!edges.some((e) => e.id === op.edgeId)) return skip;
      return { graph: { ...graph, edges: edges.filter((e) => e.id !== op.edgeId) }, applied: true };

    case "add_group": {
      // Members the user removed meanwhile are dropped; nothing left means nothing to frame.
      const memberIds = op.group.memberIds.filter(hasNode);
      if (memberIds.length === 0) return skip;
      return { graph: { ...graph, groups: withGroup(groups, { ...op.group, memberIds }) }, applied: true };
    }

    case "update_group": {
      if (!hasGroup(op.groupId)) return skip;
      const patch = op.patch.memberIds
        ? { ...op.patch, memberIds: op.patch.memberIds.filter(hasNode) }
        : op.patch;
      const current = groups.find((g) => g.id === op.groupId)!;
      return { graph: { ...graph, groups: withGroup(groups, { ...current, ...patch }) }, applied: true };
    }

    case "remove_group":
      if (!hasGroup(op.groupId)) return skip;
      return { graph: { ...graph, groups: groups.filter((g) => g.id !== op.groupId) }, applied: true };
  }
}

export function applyCanvasAgentOps(
  graph: CanvasAgentGraph,
  ops: readonly CanvasAgentOp[],
): { graph: CanvasAgentGraph; skipped: number } {
  let current = graph;
  let skipped = 0;
  for (const op of ops) {
    const res = applyCanvasAgentOp(current, op);
    current = res.graph;
    if (!res.applied) skipped += 1;
  }
  return { graph: current, skipped };
}
