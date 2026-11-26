"use client";

// Group frame actions (rename, color, collapse, run, ungroup, delete) and the Group / Ungroup
// selection pill with its Cmd/Ctrl+G shortcut. Groups a Director is still planning stay locked.

import { useCallback, useEffect, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Edge } from "@xyflow/react";
import type { DirectorPlanningLocks } from "@/service/canvas/directors/director-plan-lock";
import type { useCanvasGroups } from "@/app/app/canvas/groups/use-canvas-groups";
import type { FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";

export type CanvasGroupActionsHookDeps = {
  groupsApi: ReturnType<typeof useCanvasGroups>;
  planLocks: DirectorPlanningLocks;
  planLockRef: MutableRefObject<DirectorPlanningLocks>;
  isZh: boolean;
  isFlowRunning: boolean;
  handleRunGroup: (groupId: string) => void | Promise<void>;
  markStale: (nodeIds: readonly string[]) => void;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  edgesRef: MutableRefObject<Edge[]>;
};

export function useCanvasGroupActions({
  groupsApi,
  planLocks,
  planLockRef,
  isZh,
  isFlowRunning,
  handleRunGroup,
  markStale,
  setNodes,
  setEdges,
  edgesRef,
}: CanvasGroupActionsHookDeps) {
  // Deletes the frame and every member node, plus wires that touch them.
  const canvasGroups = groupsApi.groups;
  const ungroupById = groupsApi.ungroup;
  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      if (planLockRef.current.groupIds.has(groupId)) return;
      const group = canvasGroups.find((g) => g.id === groupId);
      if (!group) return;
      const members = new Set(group.memberIds);
      markStale(
        edgesRef.current
          .filter((e) => members.has(e.source) && !members.has(e.target))
          .map((e) => e.target),
      );
      setNodes((prev) => prev.filter((n) => !members.has(n.id)));
      setEdges((prev) => prev.filter((e) => !members.has(e.source) && !members.has(e.target)));
      ungroupById(groupId);
    },
    [canvasGroups, ungroupById, markStale, setNodes, setEdges],
  );

  const groupContextValue = useMemo(
    () => ({
      isZh,
      isFlowRunning,
      onRename: groupsApi.renameGroup,
      onColor: groupsApi.recolorGroup,
      onToggleCollapse: groupsApi.toggleCollapse,
      onRun: handleRunGroup,
      onUngroup: (groupId: string) => {
        if (planLockRef.current.groupIds.has(groupId)) return;
        ungroupById(groupId);
      },
      onDelete: handleDeleteGroup,
    }),
    [
      isZh,
      isFlowRunning,
      groupsApi.renameGroup,
      groupsApi.recolorGroup,
      groupsApi.toggleCollapse,
      ungroupById,
      handleRunGroup,
      handleDeleteGroup,
    ],
  );

  const { groupSelection, ungroupSelection } = groupsApi;
  // A Director that is still planning keeps its frame and rows together.
  const selectionHitsPlanning = useMemo(() => {
    if (planLocks.groupIds.size === 0) return false;
    const selected = new Set(groupsApi.selectedIds);
    return groupsApi.groups.some(
      (group) => planLocks.groupIds.has(group.id) && group.memberIds.some((id) => selected.has(id)),
    );
  }, [planLocks.groupIds, groupsApi.groups, groupsApi.selectedIds]);
  const groupSelectedNodes = useCallback(() => {
    if (selectionHitsPlanning) return false;
    return groupSelection(isZh ? "群組" : "Group");
  }, [groupSelection, isZh, selectionHitsPlanning]);
  const ungroupSelectedNodes = useCallback(() => {
    if (selectionHitsPlanning) return false;
    return ungroupSelection();
  }, [selectionHitsPlanning, ungroupSelection]);
  const { selectionInGroup, selectionIsOneGroup } = useMemo(() => {
    const selected = new Set(groupsApi.selectedIds);
    return {
      selectionInGroup: groupsApi.groups.some((g) => g.memberIds.some((id) => selected.has(id))),
      // Selection already matches one group exactly, so grouping again would do nothing.
      selectionIsOneGroup: groupsApi.groups.some(
        (g) => g.memberIds.length === selected.size && g.memberIds.every((id) => selected.has(id)),
      ),
    };
  }, [groupsApi.groups, groupsApi.selectedIds]);

  // Cmd/Ctrl+G groups the selection; Shift+Cmd/Ctrl+G ungroups it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "g") return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, [contenteditable='true']")) return;
      const handled = event.shiftKey ? ungroupSelectedNodes() : groupSelectedNodes();
      if (handled) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupSelectedNodes, ungroupSelectedNodes]);

  return {
    groupContextValue,
    selectionHitsPlanning,
    groupSelectedNodes,
    ungroupSelectedNodes,
    selectionInGroup,
    selectionIsOneGroup,
  };
}
