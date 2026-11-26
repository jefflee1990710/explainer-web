"use client";

// Replays canvas-agent ops onto the graph, one step at a time, and can undo that turn.

import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useReactFlow, type Edge } from "@xyflow/react";
import type { CanvasGroup, CanvasNode, CanvasViewport } from "@/model/canvas";
import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import { isPlanDirectorNode } from "@/service/canvas/explainer-director";
import { isExplainerPlannerNode, readPlannerParams } from "@/service/canvas/explainer-planner";
import { applyCanvasAgentOp } from "@/service/canvas-agent/apply-ops";
import type { CanvasAgentGraph, CanvasAgentOp } from "@/service/canvas-agent/types";
import type { CanvasAgentGraphSnapshot } from "@/app/app/canvas/agent/canvas-agent-dock";
import type { DisplayNode } from "@/app/app/canvas/groups/group-frames";
import { AGENT_OP_STEP_MS } from "@/app/app/canvas/workspace/canvas-timing";
import {
  toDomainEdges,
  toDomainNodes,
  toFlowEdges,
  toFlowNodes,
  withRememberedJobOutputs,
  type FlowNode,
  type RememberedJobOutput,
} from "@/app/app/canvas/workspace/canvas-graph-state";

export type CanvasAgentReplayDeps = {
  models: readonly CanvasModelSpec[];
  reactFlow: ReturnType<typeof useReactFlow<DisplayNode, Edge>>;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  scheduleAutosave: () => void;
  nodesRef: MutableRefObject<FlowNode[]>;
  edgesRef: MutableRefObject<Edge[]>;
  jobOutputRef: MutableRefObject<Map<string, RememberedJobOutput>>;
  viewportRef: MutableRefObject<CanvasViewport>;
  saveTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  snapshotGroups: (nodes: CanvasNode[]) => CanvasGroup[];
  updateGroups: (update: (groups: CanvasGroup[]) => CanvasGroup[]) => void;
  resetGroups: (groups: CanvasGroup[]) => void;
  startDirectorPlan: (nodeId: string, graph?: { nodes: FlowNode[]; edges: Edge[] }) => Promise<void>;
};

export function useCanvasAgentReplay(deps: CanvasAgentReplayDeps) {
  const {
    models,
    reactFlow,
    setNodes,
    setEdges,
    scheduleAutosave,
    nodesRef,
    edgesRef,
    jobOutputRef,
    viewportRef,
    saveTimerRef,
    snapshotGroups,
    updateGroups,
    resetGroups,
    startDirectorPlan,
  } = deps;

  // Canvas agent: the graph sent with each chat message, per-turn undo snapshots, and op replay.
  const agentSnapshotsRef = useRef(new Map<string, CanvasAgentGraph>());

  const getAgentGraph = useCallback((): CanvasAgentGraphSnapshot => {
    // The action saves this graph itself, so a pending autosave would only repeat it.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const domain = toDomainNodes(withRememberedJobOutputs(nodesRef.current, jobOutputRef.current));
    return {
      nodes: domain,
      edges: toDomainEdges(edgesRef.current),
      groups: snapshotGroups(domain),
      viewport: viewportRef.current,
    };
  }, [snapshotGroups]);

  const applyAgentOps = useCallback(
    async (messageId: string, ops: CanvasAgentOp[]) => {
      const before = getAgentGraph();
      agentSnapshotsRef.current.set(messageId, {
        nodes: before.nodes,
        edges: before.edges,
        groups: before.groups,
      });
      let graph: CanvasAgentGraph = { nodes: before.nodes, edges: before.edges, groups: before.groups };
      let skipped = 0;

      for (const op of ops) {
        await new Promise((resolve) => window.setTimeout(resolve, AGENT_OP_STEP_MS));
        const result = applyCanvasAgentOp(graph, op);
        if (!result.applied) {
          skipped += 1;
          continue;
        }
        graph = result.graph;
        // Patch React Flow state per op so existing nodes keep their measured size.
        switch (op.kind) {
          case "add_node":
            setNodes((prev) => [...prev, ...toFlowNodes([op.node])]);
            break;
          case "update_node":
            setNodes((prev) =>
              prev.map((n) => (n.id === op.nodeId ? { ...n, data: { ...n.data, ...op.patch } } : n)),
            );
            break;
          case "move_node":
            setNodes((prev) =>
              prev.map((n) => (n.id === op.nodeId ? { ...n, position: op.position } : n)),
            );
            break;
          case "remove_node":
            setNodes((prev) => prev.filter((n) => n.id !== op.nodeId));
            setEdges((prev) => prev.filter((e) => e.source !== op.nodeId && e.target !== op.nodeId));
            break;
          case "add_edge":
            setEdges((prev) => [...prev, ...toFlowEdges([op.edge], graph.nodes, models)]);
            break;
          case "remove_edge":
            setEdges((prev) => prev.filter((e) => e.id !== op.edgeId));
            break;
          case "mark_stale": {
            const ids = new Set(op.nodeIds);
            setNodes((prev) =>
              prev.map((n) =>
                ids.has(n.id) && n.data.outputUrl ? { ...n, data: { ...n.data, staleOutputUrl: n.data.outputUrl } } : n,
              ),
            );
            break;
          }
          case "add_group":
          case "update_group":
          case "remove_group": {
            const nextGroups: CanvasGroup[] = graph.groups ?? [];
            updateGroups(() => nextGroups);
            break;
          }
        }
      }

      scheduleAutosave();
      window.setTimeout(() => {
        void reactFlow.fitView({ padding: 0.2, duration: 400 });
      }, 80);

      // Explainer cards the assistant added start planning right away (free).
      // Directors the assistant edited with a replan request replan the same way.
      const agentPlanners = graph.nodes.filter(
        (n) =>
          (isExplainerPlannerNode(n) &&
            !readPlannerParams(n).plannerVideoId &&
            ops.some((op) => op.kind === "add_node" && op.node.id === n.id)) ||
          (isPlanDirectorNode(n) && n.data.toolParams?.replanRequested === true),
      );
      if (agentPlanners.length > 0) {
        const flowGraph = {
          nodes: toFlowNodes(graph.nodes),
          edges: toFlowEdges(graph.edges, graph.nodes, models),
        };
        for (const planner of agentPlanners) {
          await startDirectorPlan(planner.id, flowGraph);
        }
      }
      return { skipped };
    },
    [
      getAgentGraph,
      models,
      reactFlow,
      scheduleAutosave,
      setEdges,
      setNodes,
      startDirectorPlan,
      updateGroups,
    ],
  );

  const undoAgentTurn = useCallback(
    async (messageId: string) => {
      const snapshot = agentSnapshotsRef.current.get(messageId);
      if (!snapshot) return;
      agentSnapshotsRef.current.delete(messageId);
      setNodes(toFlowNodes(snapshot.nodes));
      setEdges(toFlowEdges(snapshot.edges, snapshot.nodes, models));
      resetGroups(snapshot.groups ?? []);
      scheduleAutosave();
    },
    [models, resetGroups, scheduleAutosave, setEdges, setNodes],
  );

  return { getAgentGraph, applyAgentOps, undoAgentTurn };
}
