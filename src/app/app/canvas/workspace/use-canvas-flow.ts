"use client";

// Run Flow: live header status, the 3s poll, start, stop, and a group's run.
// The workspace keeps importing nothing from the worker; this hook only calls Server Actions.

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Edge } from "@xyflow/react";
import { toast } from "sonner";
import type { CanvasGroup, CanvasViewport } from "@/model/canvas";
import { pollCanvasFlowAction, runCanvasFlowAction, stopCanvasFlowAction } from "@/presentation/actions/canvas";
import type { CanvasProjectDto } from "@/service/canvas/projects";
import { computeExecutionWaves } from "@/service/canvas/graph";
import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import { isScroDirectorNode } from "@/service/canvas/scro-director";
import { mergeFlowPollNodeData, outdatedNodeReasons } from "@/service/canvas/stale-outputs";
import { directorPlanningLocks } from "@/service/canvas/director-plan-lock";
import { deriveCanvasFlowHeaderStatus } from "@/app/app/canvas/flow-header-status";
import type { SaveStatus } from "@/app/app/canvas/canvas-topbar";
import { JOB_POLL_INTERVAL_MS } from "@/app/app/canvas/workspace/canvas-timing";
import {
  toDomainEdges,
  toDomainNodes,
  withRememberedJobOutputs,
  type FlowNode,
  type RememberedJobOutput,
} from "@/app/app/canvas/workspace/canvas-graph-state";

export type CanvasFlowHookDeps = {
  initialFlowRun: CanvasProjectDto["activeFlowRun"];
  nodes: FlowNode[];
  models: readonly CanvasModelSpec[];
  locale: string;
  isZh: boolean;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  syncWallet: (nextCreditUsd?: number) => void;
  nodesRef: MutableRefObject<FlowNode[]>;
  edgesRef: MutableRefObject<Edge[]>;
  jobOutputRef: MutableRefObject<Map<string, RememberedJobOutput>>;
  viewportRef: MutableRefObject<CanvasViewport>;
  activeProjectIdRef: MutableRefObject<string>;
  saveTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  planLockRef: MutableRefObject<ReturnType<typeof directorPlanningLocks>>;
  groups: readonly CanvasGroup[];
};

export function useCanvasFlow(deps: CanvasFlowHookDeps) {
  const {
    initialFlowRun,
    nodes,
    models,
    locale,
    isZh,
    setNodes,
    setEdges,
    setSaveStatus,
    syncWallet,
    nodesRef,
    edgesRef,
    jobOutputRef,
    viewportRef,
    activeProjectIdRef,
    saveTimerRef,
    planLockRef,
    groups,
  } = deps;

  const [isFlowRunning, setIsFlowRunning] = useState(
    initialFlowRun?.status === "running",
  );
  const [flowWaveProgress, setFlowWaveProgress] = useState<{
    current: number;
    total: number;
  } | null>(
    initialFlowRun
      ? {
          current: initialFlowRun.currentWave,
          total: initialFlowRun.totalWaves,
        }
      : null,
  );
  // finished = a Run Flow ended; stopped = the user stopped it. The pill itself is derived from cards.
  const [flowSettled, setFlowSettled] = useState<"finished" | "stopped" | null>(() => {
    const status = initialFlowRun?.status;
    if (status === "completed" || status === "failed") return "finished";
    if (status === "stopped") return "stopped";
    return null;
  });
  // Failures belonging to the flow that is running now. Idle pills ignore this and read each card.
  const [runFailureIds, setRunFailureIds] = useState<string[]>(
    initialFlowRun?.status === "running"
      ? [...(initialFlowRun.failedNodeIds ?? [])]
      : [],
  );

  // Top-bar pill tracks the cards on screen, including retries after a flow has finished.
  const flowStatus = useMemo(
    () =>
      deriveCanvasFlowHeaderStatus({
        nodes,
        models,
        locale,
        isFlowRunning,
        wave: flowWaveProgress,
        settled: flowSettled,
        runFailureIds,
      }),
    [nodes, models, locale, isFlowRunning, flowWaveProgress, flowSettled, runFailureIds],
  );

  const flowStartingRef = useRef(false);

  // Worker-driven multi-wave flow polling loop (survives page reloads & closed tabs).
  useEffect(() => {
    if (!isFlowRunning) return;
    let alive = true;
    let inFlight = false;

    const timer = window.setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await pollCanvasFlowAction(activeProjectIdRef.current);
        if (!alive) return;
        syncWallet(res.creditUsd);

        for (const node of res.nodes) {
          if (node.type !== "model") continue;
          if (node.data.lastJobId) {
            jobOutputRef.current.set(node.id, {
              status: node.data.status ?? "idle",
              lastJobId: node.data.lastJobId,
              lastCostUsd: node.data.lastCostUsd,
              outputUrl: node.data.outputUrl,
              outputKind: node.data.outputKind,
              lastError: node.data.lastError,
            });
          }
        }
        setNodes((prev) =>
          prev.map((flowNode) => {
            const serverNode = res.nodes.find((n) => n.id === flowNode.id);
            if (!serverNode) return flowNode;
            return {
              ...flowNode,
              data: mergeFlowPollNodeData(flowNode.data, serverNode.data),
            };
          }),
        );
        setEdges((prev) =>
          prev.map((e) => {
            const targetNode = res.nodes.find((n) => n.id === e.target);
            const busy =
              targetNode?.type === "model" &&
              (targetNode.data.status === "queued" || targetNode.data.status === "running");
            return { ...e, animated: Boolean(busy) };
          }),
        );

        const run = res.activeFlowRun;
        if (!run || run.status !== "running") {
          setIsFlowRunning(false);
          if (run) {
            setFlowWaveProgress({ current: run.currentWave, total: run.totalWaves });
            setRunFailureIds([...(run.failedNodeIds ?? [])]);
            setFlowSettled(run.status === "stopped" ? "stopped" : "finished");
          } else {
            setFlowWaveProgress(null);
            setRunFailureIds([]);
            setFlowSettled("stopped");
          }
          if (run?.status === "completed") {
            toast.success(isZh ? "整條工作流執行完成！" : "Workflow completed!");
          } else if (run?.status === "failed") {
            toast.error(
              isZh
                ? `工作流結束（${run.failedNodeIds.length} 個節點失敗並已自動退費）`
                : `Workflow finished (${run.failedNodeIds.length} node(s) failed & refunded)`,
            );
          }
        } else {
          setFlowWaveProgress({ current: run.currentWave, total: run.totalWaves });
          setRunFailureIds([...(run.failedNodeIds ?? [])]);
        }
      } catch {
        // Keep polling silently on transient network hiccups.
      } finally {
        inFlight = false;
      }
    }, JOB_POLL_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [isFlowRunning, isZh, setEdges, setNodes, syncWallet]);

  // Worker-backed multi-wave Run Flow trigger; nodeIds limits it to one group.
  // rerunAll is the top Run Flow button: every model node generates again.
  const startFlowRun = useCallback(async (nodeIds?: string[], rerunAll = false) => {
    if (flowStartingRef.current) return;
    flowStartingRef.current = true;
    try {
      // Cancel pending autosave because runCanvasFlowAction persists the latest graph itself.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const currentEdges = toDomainEdges(edgesRef.current);
      const liveNodes = toDomainNodes(nodesRef.current);
      // Old-version previews (after a replan or an input edit) must be generated again.
      const rerunNodeIds = [...outdatedNodeReasons(liveNodes, currentEdges).entries()]
        .filter(([, reason]) => reason === "inputs")
        .map(([id]) => id);
      const currentNodes = toDomainNodes(
        withRememberedJobOutputs(nodesRef.current, jobOutputRef.current),
      );

      let waves: string[][];
      try {
        waves = computeExecutionWaves(currentNodes, currentEdges);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Invalid graph");
        return;
      }
      const locked = planLockRef.current.nodeIds;
      if (nodeIds) waves = waves.map((w) => w.filter((id) => nodeIds.includes(id))).filter((w) => w.length);
      if (locked.size > 0) waves = waves.map((w) => w.filter((id) => !locked.has(id))).filter((w) => w.length);
      if (waves.length === 0) return;
      const limitTo = nodeIds || locked.size > 0 ? waves.flat() : undefined;

      const res = await runCanvasFlowAction({
        canvasId: activeProjectIdRef.current,
        nodes: currentNodes,
        edges: currentEdges,
        viewport: viewportRef.current,
        ...(limitTo ? { nodeIds: limitTo } : {}),
        ...(rerunAll ? { rerunAll: true } : {}),
        ...(rerunNodeIds.length > 0 ? { rerunNodeIds } : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSaveStatus("saved");
      syncWallet(res.creditUsd);
      setIsFlowRunning(true);
      setFlowSettled(null);
      setRunFailureIds([...(res.activeFlowRun.failedNodeIds ?? [])]);
      setFlowWaveProgress({
        current: res.activeFlowRun.currentWave,
        total: res.activeFlowRun.totalWaves,
      });
    } finally {
      flowStartingRef.current = false;
    }
  }, [syncWallet]);

  const handleRunFlow = useCallback(() => void startFlowRun(undefined, true), [startFlowRun]);

  // Run group: only the group's model nodes run, in dependency order.
  const handleRunGroup = useCallback(
    (groupId: string) => {
      if (planLockRef.current.groupIds.has(groupId)) return;
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;
      const members = new Set(group.memberIds);
      const runnable = nodesRef.current
        .filter((n) => members.has(n.id) && n.type === "model" && !isScroDirectorNode(n))
        .map((n) => n.id);
      if (runnable.length === 0) return;
      void startFlowRun(runnable);
    },
    [groups, startFlowRun],
  );

  const handleStopFlow = useCallback(async () => {
    await stopCanvasFlowAction(activeProjectIdRef.current).catch(() => {});
    setIsFlowRunning(false);
    setFlowWaveProgress(null);
    setRunFailureIds([]);
    setFlowSettled("stopped");
    // Clear waiting nodes that never received a job (e.g. startCanvasNodeAfterUpstream) so they don't stay queued.
    setNodes((prev) =>
      prev.map((n) => {
        if (n.type !== "model" || n.data.status !== "queued") return n;
        const remembered = jobOutputRef.current.get(n.id);
        const hasLiveJob = Boolean(
          n.data.lastJobId &&
            remembered &&
            remembered.lastJobId === n.data.lastJobId &&
            (remembered.status === "queued" || remembered.status === "running"),
        );
        if (hasLiveJob) return n;
        return {
          ...n,
          data: {
            ...n.data,
            status: n.data.outputUrl?.trim() ? "completed" : "idle",
            lastError: undefined,
          },
        };
      }),
    );
    toast.info(isZh ? "已停止後續波次執行" : "Stopped remaining flow waves");
  }, [isZh, setNodes]);

  return {
    isFlowRunning,
    flowWaveProgress,
    setIsFlowRunning,
    setFlowWaveProgress,
    setFlowSettled,
    setRunFailureIds,
    flowStatus,
    startFlowRun,
    handleRunFlow,
    handleRunGroup,
    handleStopFlow,
  };
}
