"use client";

// Canvas group state for the workspace: frames shown behind members, frame drags that
// move every member, collapse, rename, recolor, and grouping the current selection.

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type NodeChange, NodeChangeset } from "@xyflow/react";
import type { CanvasGroup, CanvasGroupColor } from "@/model/canvas";
import {
  defaultGroupColor,
  defaultGroupTitle,
  normalizeCanvasGroups,
  withGroup,
} from "@/service/canvas/groups";
import {
  buildGroupFrames,
  type CanvasFlowNode,
  type DisplayNode,
  type GroupFrameNode,
  groupIdFromFrameId,
} from "./group-frames";

type FrameDrag = {
  groupId: string;
  frameStart: { x: number; y: number };
  memberStart: Map<string, { x: number; y: number }>;
};

export function useCanvasGroups(params: {
  initialGroups: CanvasGroup[];
  nodes: CanvasFlowNode[];
  setNodes: Dispatch<SetStateAction<CanvasFlowNode[]>>;
  scheduleAutosave: () => void;
}) {
  const { nodes, setNodes, scheduleAutosave } = params;
  const [groups, setGroups] = useState<CanvasGroup[]>(params.initialGroups);
  const groupsRef = useRef(groups);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // Membership stays valid however nodes were removed (keyboard, card button, assistant).
  const liveGroups = useMemo(() => normalizeCanvasGroups(groups, nodes), [groups, nodes]);
  const frames = useMemo(() => buildGroupFrames(liveGroups, nodes), [liveGroups, nodes]);
  const framesRef = useRef<GroupFrameNode[]>(frames);
  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  // Frames first so they render underneath; members of collapsed groups are hidden.
  const displayNodes = useMemo<DisplayNode[]>(() => {
    const hiddenIds = new Set(liveGroups.filter((g) => g.collapsed).flatMap((g) => g.memberIds));
    const shown = hiddenIds.size
      ? nodes.map((n) => (hiddenIds.has(n.id) ? { ...n, hidden: true } : n))
      : nodes;
    return [...frames, ...shown];
  }, [frames, liveGroups, nodes]);

  const updateGroups = useCallback(
    (update: (prev: CanvasGroup[]) => CanvasGroup[]) => {
      setGroups((prev) => {
        const next = update(prev);
        groupsRef.current = next;
        return next;
      });
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  // Valid groups for saving or sending to the assistant.
  const snapshotGroups = useCallback(
    (domainNodes: readonly { id: string }[]) => normalizeCanvasGroups(groupsRef.current, domainNodes),
    [],
  );

  const dragRef = useRef<FrameDrag | null>(null);

  // Handles frame changes itself and returns the changes meant for real nodes.
  const splitNodeChanges = useCallback(
    (changes: NodeChangeset<DisplayNode>): { nodeChanges: NodeChangeset<CanvasFlowNode>; frameDragEnded: boolean } => {
      const nodeChanges: NodeChange<CanvasFlowNode>[] = [];
      let frameDragEnded = false;
      for (const change of changes) {
        const groupId = groupIdFromFrameId(change.id);
        if (!groupId) {
          nodeChanges.push(change as NodeChange<CanvasFlowNode>);
          continue;
        }
        if (change.type !== "position") continue;
        if (change.position) {
          let drag = dragRef.current;
          if (!drag || drag.groupId !== groupId) {
            const frame = framesRef.current.find((f) => f.data.group.id === groupId);
            if (!frame) continue;
            const members = new Set(frame.data.group.memberIds);
            drag = {
              groupId,
              frameStart: { ...frame.position },
              memberStart: new Map(
                nodes.filter((n) => members.has(n.id)).map((n) => [n.id, { ...n.position }]),
              ),
            };
            dragRef.current = drag;
          }
          const dx = change.position.x - drag.frameStart.x;
          const dy = change.position.y - drag.frameStart.y;
          const starts = drag.memberStart;
          setNodes((prev) =>
            prev.map((n) => {
              const start = starts.get(n.id);
              return start ? { ...n, position: { x: start.x + dx, y: start.y + dy } } : n;
            }),
          );
        }
        if (change.dragging === false) {
          dragRef.current = null;
          frameDragEnded = true;
        }
      }
      return { nodeChanges: new NodeChangeset<CanvasFlowNode>(nodeChanges), frameDragEnded };
    },
    [nodes, setNodes],
  );

  const patchGroup = useCallback(
    (groupId: string, patch: Partial<CanvasGroup>) =>
      updateGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g))),
    [updateGroups],
  );

  const renameGroup = useCallback(
    (groupId: string, title: string) => patchGroup(groupId, { title: title.slice(0, 120) }),
    [patchGroup],
  );
  const recolorGroup = useCallback(
    (groupId: string, color: CanvasGroupColor) => patchGroup(groupId, { color }),
    [patchGroup],
  );
  const toggleCollapse = useCallback(
    (groupId: string) =>
      updateGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))),
    [updateGroups],
  );
  const ungroup = useCallback(
    (groupId: string) => updateGroups((prev) => prev.filter((g) => g.id !== groupId)),
    [updateGroups],
  );
  const addGroup = useCallback(
    (group: CanvasGroup) => updateGroups((prev) => withGroup(prev, group)),
    [updateGroups],
  );

  const selectedIds = useMemo(() => nodes.filter((n) => n.selected).map((n) => n.id), [nodes]);

  // Frames the selected nodes as a new custom group (they leave any old group).
  const groupSelection = useCallback(
    (title: string) => {
      const ids = nodesSelectedNow(nodes);
      if (ids.length < 2) return false;
      addGroup({
        id: `grp-${crypto.randomUUID().slice(0, 8)}`,
        title: title || defaultGroupTitle("custom"),
        color: defaultGroupColor("custom"),
        kind: "custom",
        memberIds: ids,
      });
      return true;
    },
    [addGroup, nodes],
  );

  // Removes the frames of every group that holds a selected node.
  const ungroupSelection = useCallback(() => {
    const ids = new Set(nodesSelectedNow(nodes));
    if (ids.size === 0) return false;
    const hit = liveGroups.filter((g) => g.memberIds.some((id) => ids.has(id))).map((g) => g.id);
    if (hit.length === 0) return false;
    updateGroups((prev) => prev.filter((g) => !hit.includes(g.id)));
    return true;
  }, [liveGroups, nodes, updateGroups]);

  // Replaces every group at once (assistant undo).
  const resetGroups = useCallback(
    (next: CanvasGroup[]) => updateGroups(() => next),
    [updateGroups],
  );

  return {
    groups: liveGroups,
    displayNodes,
    selectedIds,
    snapshotGroups,
    splitNodeChanges,
    renameGroup,
    recolorGroup,
    toggleCollapse,
    ungroup,
    addGroup,
    groupSelection,
    ungroupSelection,
    resetGroups,
    updateGroups,
  };
}

function nodesSelectedNow(nodes: readonly CanvasFlowNode[]): string[] {
  return nodes.filter((n) => n.selected && !n.hidden).map((n) => n.id);
}
