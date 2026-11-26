// Builds the React Flow frame nodes drawn behind each canvas group.

import type { Node } from "@xyflow/react";
import type { CanvasGroup, CanvasGroupColor, CanvasNodeData, CanvasNodeType } from "@/model/canvas";
import { groupFrameBounds, type GroupRect } from "@/service/canvas/core/groups";

export const GROUP_FRAME_TYPE = "groupFrame";
const FRAME_ID_PREFIX = "group-frame:";

// Collapsed groups show a small card instead of a frame around hidden members.
export const COLLAPSED_FRAME_SIZE = { width: 420, height: 92 };
// Used until React Flow has measured a card.
const FALLBACK_SIZE = { width: 312, height: 400 };

export const GROUP_COLOR_HEX: Record<CanvasGroupColor, string> = {
  lime: "#c6f24b",
  sky: "#38bdf8",
  violet: "#a78bfa",
  amber: "#f59e0b",
  rose: "#fb7185",
  slate: "#94a3b8",
};

export type GroupFrameData = {
  group: CanvasGroup;
  // Members that are model nodes (what Run group would run).
  runnableCount: number;
  // Set while the group's Director is still planning. Display only; frames are not saved.
  planLocked?: boolean;
};

export type GroupFrameNode = Node<GroupFrameData, typeof GROUP_FRAME_TYPE>;
export type CanvasFlowNode = Node<CanvasNodeData, CanvasNodeType>;
export type DisplayNode = CanvasFlowNode | GroupFrameNode;

export function frameNodeId(groupId: string): string {
  return `${FRAME_ID_PREFIX}${groupId}`;
}

export function groupIdFromFrameId(id: string): string | null {
  return id.startsWith(FRAME_ID_PREFIX) ? id.slice(FRAME_ID_PREFIX.length) : null;
}

function rectOf(node: CanvasFlowNode): GroupRect {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? FALLBACK_SIZE.width,
    height: node.measured?.height ?? node.height ?? FALLBACK_SIZE.height,
  };
}

// One frame per group, sized around its members; collapsed groups get a compact card.
export function buildGroupFrames(
  groups: readonly CanvasGroup[],
  nodes: readonly CanvasFlowNode[],
): GroupFrameNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const frames: GroupFrameNode[] = [];
  for (const group of groups) {
    const members = group.memberIds
      .map((id) => byId.get(id))
      .filter((n): n is CanvasFlowNode => Boolean(n));
    const bounds = groupFrameBounds(members.map(rectOf));
    if (!bounds) continue;
    const size = group.collapsed ? COLLAPSED_FRAME_SIZE : bounds;
    frames.push({
      id: frameNodeId(group.id),
      type: GROUP_FRAME_TYPE,
      position: { x: bounds.x, y: bounds.y },
      width: size.width,
      height: size.height,
      measured: { width: size.width, height: size.height },
      // Below edges and cards; only the title bar takes pointer events.
      zIndex: -1,
      selectable: false,
      deletable: false,
      focusable: false,
      connectable: false,
      dragHandle: ".scro-group-drag",
      style: { pointerEvents: "none" },
      data: {
        group,
        runnableCount: members.filter((n) => n.type === "model").length,
      },
    });
  }
  return frames;
}
