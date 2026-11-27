"use client";

// Workspace state for the Sequence timeline drawer, and the concat → Sequence conversion.

import { useCallback, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Edge } from "@xyflow/react";
import { toast } from "sonner";
import type { CanvasGroup } from "@/model/canvas";
import type { CanvasModelSpec } from "@/model/canvas-model";
import { applyConcatToSequence, planConcatToSequence } from "@/service/canvas/core/sequence";
import { markStaleOutputs } from "@/service/canvas/core/stale-outputs";
import { switchDirectorClipJoin } from "@/service/canvas/directors/director-clip-join";
import { CLIP_JOIN_PARAM, type ClipJoinMode } from "@/service/canvas/scro-groups/clip-join";
import {
  toDomainEdges,
  toDomainNodes,
  toFlowEdges,
  toFlowNodes,
  type FlowNode,
} from "@/app/app/canvas/workspace/canvas-graph-state";

export function useSequenceTimeline({
  models,
  isZh,
  setNodes,
  setEdges,
  nodesRef,
  edgesRef,
  snapshotGroups,
  updateGroups,
  scheduleAutosave,
}: {
  models: readonly CanvasModelSpec[];
  isZh: boolean;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  nodesRef: MutableRefObject<FlowNode[]>;
  edgesRef: MutableRefObject<Edge[]>;
  snapshotGroups: (nodes: ReturnType<typeof toDomainNodes>) => CanvasGroup[];
  updateGroups: (update: (prev: CanvasGroup[]) => CanvasGroup[]) => void;
  scheduleAutosave: () => void;
}) {
  const [timelineNodeId, setTimelineNodeId] = useState<string | null>(null);

  const openTimeline = useCallback((nodeId: string) => setTimelineNodeId(nodeId), []);
  const closeTimeline = useCallback(() => setTimelineNodeId(null), []);

  // Replaces a concat chain with one Sequence node at the same place and opens its timeline.
  const convertConcat = useCallback(
    (concatId: string) => {
      const nodes = toDomainNodes(nodesRef.current);
      const edges = toDomainEdges(edgesRef.current);
      const groups = snapshotGroups(nodes);
      const plan = planConcatToSequence({ nodes, edges }, concatId);
      if ("error" in plan) {
        toast.error(isZh ? "這個節點無法轉為時間線" : plan.error);
        return;
      }
      const nodeId = `model-${crypto.randomUUID().slice(0, 8)}`;
      const next = applyConcatToSequence({ nodes, edges, groups }, plan, {
        nodeId,
        edgeId: () => `e-${crypto.randomUUID().slice(0, 8)}`,
      });
      setNodes(toFlowNodes(next.nodes));
      setEdges(toFlowEdges(next.edges, next.nodes, models));
      if (next.groups) updateGroups(() => next.groups!);
      scheduleAutosave();
      setTimelineNodeId(nodeId);
      toast.success(
        isZh
          ? `已把 ${plan.absorbedIds.length} 個接片節點轉為一條時間線`
          : `Replaced ${plan.absorbedIds.length} concat node(s) with one Sequence`,
      );
    },
    [edgesRef, isZh, models, nodesRef, scheduleAutosave, setEdges, setNodes, snapshotGroups, updateGroups],
  );

  // Director finish: before Plan it only sets the param; once built it swaps the join nodes in place.
  const setDirectorClipJoin = useCallback(
    (directorId: string, mode: ClipJoinMode) => {
      const nodes = toDomainNodes(nodesRef.current);
      const edges = toDomainEdges(edgesRef.current);
      const groups = snapshotGroups(nodes);
      const next = switchDirectorClipJoin({ nodes, edges, groups }, directorId, mode);
      if (!next) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === directorId
              ? { ...n, data: { ...n.data, toolParams: { ...n.data.toolParams, [CLIP_JOIN_PARAM]: mode } } }
              : n,
          ),
        );
        scheduleAutosave();
        return;
      }
      const marked = markStaleOutputs(next.nodes, next.edges, next.addedIds);
      setNodes(toFlowNodes(marked.nodes));
      setEdges(toFlowEdges(next.edges, marked.nodes, models));
      updateGroups(() => next.groups);
      scheduleAutosave();
      toast.success(
        mode === "sequence"
          ? isZh ? "已改用一條時間線收尾" : "Clips now end in one Sequence"
          : isZh ? "已改用接片節點收尾" : "Clips now end in Concat nodes",
      );
    },
    [edgesRef, isZh, models, nodesRef, scheduleAutosave, setEdges, setNodes, snapshotGroups, updateGroups],
  );

  return { timelineNodeId, openTimeline, closeTimeline, convertConcat, setDirectorClipJoin };
}
