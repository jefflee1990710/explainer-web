"use client";

// Single-node run and the 3s job poll. A node waiting on a busy upstream becomes a flow.

import { useCallback, useEffect, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Edge } from "@xyflow/react";
import { toast } from "sonner";
import type { CanvasViewport } from "@/model/canvas";
import { pollCanvasJobsAction, runCanvasNodeAction } from "@/presentation/actions/canvas";
import type { CanvasJobDto } from "@/service/canvas/projects";
import { formatUsd } from "@/service/billing/usd";
import { directorPlanningLocks } from "@/service/canvas/director-plan-lock";
import { JOB_POLL_INTERVAL_MS } from "@/app/app/canvas/workspace/canvas-timing";
import {
  toDomainEdges,
  toDomainNodes,
  withRememberedJobOutputs,
  type FlowNode,
  type RememberedJobOutput,
} from "@/app/app/canvas/workspace/canvas-graph-state";
import type { SaveStatus } from "@/app/app/canvas/canvas-topbar";

type FlowWave = { current: number; total: number } | null;

export type CanvasJobsHookDeps = {
  nodes: FlowNode[];
  isFlowRunning: boolean;
  isZh: boolean;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  setIsFlowRunning: (value: boolean) => void;
  setFlowSettled: (value: "finished" | "stopped" | null) => void;
  setRunFailureIds: (ids: string[]) => void;
  setFlowWaveProgress: (wave: FlowWave) => void;
  syncWallet: (nextCreditUsd?: number) => void;
  scheduleAutosave: () => void;
  nodesRef: MutableRefObject<FlowNode[]>;
  edgesRef: MutableRefObject<Edge[]>;
  jobOutputRef: MutableRefObject<Map<string, RememberedJobOutput>>;
  viewportRef: MutableRefObject<CanvasViewport>;
  activeProjectIdRef: MutableRefObject<string>;
  saveTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  planLockRef: MutableRefObject<ReturnType<typeof directorPlanningLocks>>;
};

export function useCanvasJobs(deps: CanvasJobsHookDeps) {
  const {
    nodes,
    isFlowRunning,
    isZh,
    setNodes,
    setEdges,
    setSaveStatus,
    setIsFlowRunning,
    setFlowSettled,
    setRunFailureIds,
    setFlowWaveProgress,
    syncWallet,
    scheduleAutosave,
    nodesRef,
    edgesRef,
    jobOutputRef,
    viewportRef,
    activeProjectIdRef,
    saveTimerRef,
    planLockRef,
  } = deps;

  // Applies polled or completed job updates back into React Flow node state.
  const applyJobUpdates = useCallback(
    (jobs: readonly CanvasJobDto[]) => {
      if (jobs.length === 0) return;
      const byNodeId = new Map<string, CanvasJobDto>();
      for (const job of jobs) {
        byNodeId.set(job.nodeId, job);
      }

      for (const job of jobs) {
        const previous = jobOutputRef.current.get(job.nodeId);
        const outputUrl = job.outputUrl ?? previous?.outputUrl;
        const outputKind = job.outputKind ?? previous?.outputKind;
        jobOutputRef.current.set(job.nodeId, {
          status: job.status,
          lastJobId: job.id,
          lastCostUsd: job.chargedUsd,
          ...(outputUrl ? { outputUrl } : {}),
          ...(outputKind ? { outputKind } : {}),
          ...(job.status === "failed" && job.error ? { lastError: job.error } : {}),
        });
      }

      setNodes((prev) =>
        withRememberedJobOutputs(prev, jobOutputRef.current),
      );

      // Update animated edge state for running targets.
      setEdges((prev) =>
        prev.map((e) => {
          const job = byNodeId.get(e.target);
          if (!job) return e;
          return {
            ...e,
            animated: job.status === "queued" || job.status === "running",
          };
        }),
      );
    },
    [setNodes, setEdges],
  );

  // Active-job 3-second polling loop (completely idle when no node is queued/running).
  const activeJobIds = useMemo(() => {
    const ids: string[] = [];
    for (const node of nodes) {
      if (
        node.type === "model" &&
        (node.data.status === "queued" || node.data.status === "running") &&
        node.data.lastJobId
      ) {
        ids.push(node.data.lastJobId);
      }
    }
    return ids;
  }, [nodes]);

  const activeJobIdsKey = activeJobIds.join(",");

  useEffect(() => {
    if (!activeJobIdsKey || isFlowRunning) return;
    const jobIds = activeJobIdsKey.split(",");
    let alive = true;
    let inFlight = false;

    const timer = window.setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await pollCanvasJobsAction({
          canvasId: activeProjectIdRef.current,
          jobIds,
        });
        if (!alive) return;
        applyJobUpdates(res.jobs);
        syncWallet(res.creditUsd);
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
  }, [activeJobIdsKey, isFlowRunning, applyJobUpdates, syncWallet]);

  const onRunNode = useCallback(
    async (nodeId: string) => {
      if (planLockRef.current.nodeIds.has(nodeId)) return;
      // Cancel pending autosave because runCanvasNodeAction saves the latest graph itself.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: "queued", lastError: undefined } }
            : n,
        ),
      );
      try {
        const res = await runCanvasNodeAction({
          canvasId: activeProjectIdRef.current,
          nodeId,
          nodes: toDomainNodes(
            withRememberedJobOutputs(nodesRef.current, jobOutputRef.current),
          ),
          edges: toDomainEdges(edgesRef.current),
          viewport: viewportRef.current,
        });
        syncWallet(res.creditUsd);
        if (!res.ok) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "failed",
                      lastError: res.error,
                    },
                  }
                : n,
            ),
          );
          scheduleAutosave();
          if (res.code === "INSUFFICIENT_CREDIT") {
            toast.error(
              isZh
                ? `USD Credit 餘額不足（需 ${formatUsd(res.requiredUsd ?? 0)}，剩餘 ${formatUsd(res.availableUsd ?? 0)}），請先前往加值`
                : `Insufficient USD Credit (need ${formatUsd(res.requiredUsd ?? 0)}, remaining ${formatUsd(res.availableUsd ?? 0)})`,
            );
          } else {
            toast.error(res.error);
          }
          return;
        }
        if ("waitingForUpstream" in res) {
          setIsFlowRunning(true);
          setFlowSettled(null);
          setRunFailureIds([...(res.activeFlowRun.failedNodeIds ?? [])]);
          setFlowWaveProgress({ current: res.activeFlowRun.currentWave, total: res.activeFlowRun.totalWaves });
          setSaveStatus("saved");
          toast.info(isZh ? "上游還在執行，完成後會自動執行這個節點" : "Waiting for the upstream node; this node runs when it finishes");
          return;
        }
        applyJobUpdates([res.job]);
        setSaveStatus("saved");
        if (res.job.status === "completed") {
          toast.success(
            isZh
              ? `節點完成（扣除 ${formatUsd(res.job.chargedUsd)}）`
              : `Node completed (${formatUsd(res.job.chargedUsd)})`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Execution failed";
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, status: "failed", lastError: msg } }
              : n,
          ),
        );
        scheduleAutosave();
        toast.error(msg);
      }
    },
    [setNodes, syncWallet, applyJobUpdates, isZh, scheduleAutosave],
  );

  return { onRunNode };
}
