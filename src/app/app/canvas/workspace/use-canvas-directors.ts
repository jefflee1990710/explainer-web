"use client";

// Explainer, Talking Head, Swap, and Teleport planning, row reveal, and Build.

import { useCallback, useEffect, useMemo, useRef } from "react";
import { type Edge } from "@xyflow/react";
import { toast } from "sonner";
import type {
  CanvasGroup,
} from "@/model/canvas";
import {
  findCanvasModel,
} from "@/service/canvas/catalog/model-catalog";
import {
  isExplainerPlannerNode,
  readPlannerParams,
} from "@/service/canvas/directors/explainer-planner";
import { replacePlannerWithExpansion } from "@/service/canvas/directors/explainer-expand";
import {
  isPlanDirectorNode,
  readDirectorPlan,
} from "@/service/canvas/directors/explainer-director";
import {
  applyDirectorBuild,
  directorRevealSteps,
  mergeDirectorRows,
  syncDirectorReplanRows,
} from "@/service/canvas/directors/explainer-director-apply";
import type { CanvasExplainerPlanState } from "@/service/canvas/directors/explainer-plan";
import type { ScroGroup } from "@/service/canvas/scro-groups/builder";
import { defaultGroupColor, defaultGroupTitle, withGroup } from "@/service/canvas/core/groups";
import {
  buildSwapDirectorGroup,
  buildTeleportDirectorGroup,
  isScroDirectorNode,
  isSwapDirectorNode,
  readExpandedNodeIds,
  scroDirectorBuildMessage,
} from "@/service/canvas/directors/scro-director";
import {
  type ScroDialogTool,
} from "@/app/app/canvas/scro-group-dialogs";
import { replanBeforeRun } from "@/service/canvas/directors/director-replan-run";
import type { CanvasMediaItem } from "@/app/app/canvas/scro-group-options";
import {
  getCanvasExplainerPlanAction,
  startCanvasExplainerPlanAction,
} from "@/presentation/actions/canvas-explainer";
import {
  DIRECTOR_REVEAL_STEP_MS,
  JOB_POLL_INTERVAL_MS,
} from "@/app/app/canvas/workspace/canvas-timing";
import {
  toDomainEdges,
  toDomainNodes,
  toFlowEdges,
  toFlowNodes,
  withRememberedJobOutputs,
  type FlowNode,
  type RememberedJobOutput,
} from "@/app/app/canvas/workspace/canvas-graph-state";
import {
  clearNodeOutput,
  downstreamNodeIds,
} from "@/service/canvas/core/stale-outputs";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ReplanBeforeRunItem } from "@/app/app/canvas/replan-before-run-dialog";
import type { ScroDialogState } from "@/app/app/canvas/scro-group-dialogs";
import { directorPlanningLocks } from "@/service/canvas/directors/director-plan-lock";

// The rows, wires, and frame a Director plan places on the canvas.
type ExpandedDirectorRows = Pick<
  Extract<CanvasExplainerPlanState, { status: "ready" }>,
  "nodes" | "edges" | "group"
>;

type ReplanRun = {
  nodeId: string;
  directorId: string;
  nodeLabel: string;
  affected: ReplanBeforeRunItem[];
} | null;

export type CanvasDirectorsHookDeps = {
  nodes: FlowNode[];
  models: readonly import("@/service/canvas/catalog/model-catalog").CanvasModelSpec[];
  isZh: boolean;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<import("@xyflow/react").Edge[]>>;
  scheduleAutosave: () => void;
  nodesRef: MutableRefObject<FlowNode[]>;
  edgesRef: MutableRefObject<import("@xyflow/react").Edge[]>;
  jobOutputRef: MutableRefObject<Map<string, RememberedJobOutput>>;
  viewportRef: MutableRefObject<import("@/model/canvas").CanvasViewport>;
  activeProjectIdRef: MutableRefObject<string>;
  planLockRef: MutableRefObject<ReturnType<typeof directorPlanningLocks>>;
  onRunNode: (nodeId: string) => void | Promise<void>;
  replanRun: ReplanRun;
  setReplanRun: Dispatch<SetStateAction<ReplanRun>>;
  runAfterReplanRef: MutableRefObject<Map<string, string>>;
  setReplannedRunId: Dispatch<SetStateAction<string | null>>;
  placeScroGroup: (group: ScroGroup, tool: ScroDialogTool, origin: { x: number; y: number }) => void;
  applyPendingGroupLayout: () => void;
  snapshotGroups: (nodes: import("@/model/canvas").CanvasNode[]) => import("@/model/canvas").CanvasGroup[];
  updateGroups: (update: (groups: import("@/model/canvas").CanvasGroup[]) => import("@/model/canvas").CanvasGroup[]) => void;
  addGroup: (group: CanvasGroup) => void;
  pendingGroupLayoutRef: MutableRefObject<{
    ids: Set<string>;
    edges: { source: string; target: string }[];
    origin: { x: number; y: number };
    layout: "explainer" | "depth";
  } | null>;
  scroDialog: ScroDialogState;
  setScroDialog: Dispatch<SetStateAction<ScroDialogState>>;
};

export function useCanvasDirectors(deps: CanvasDirectorsHookDeps) {
  const {
    nodes, models, isZh, setNodes, setEdges, scheduleAutosave,
    nodesRef, edgesRef, jobOutputRef, viewportRef, activeProjectIdRef, planLockRef,
    onRunNode, replanRun, setReplanRun, runAfterReplanRef, setReplannedRunId,
    placeScroGroup, applyPendingGroupLayout, snapshotGroups, updateGroups, addGroup,
    scroDialog, setScroDialog, pendingGroupLayoutRef,
  } = deps;

  // Free Explainer planning: mark the card as planning, save the graph, then queue Phase A.
  // `graph` lets callers that just added the card (dialog, AI assistant) pass the fresh state.
  const startDirectorPlan = useCallback(
    async (nodeId: string, graph?: { nodes: FlowNode[]; edges: Edge[] }) => {
      const baseNodes = graph?.nodes ?? nodesRef.current;
      const nextEdges = graph?.edges ?? edgesRef.current;
      if (!baseNodes.some((n) => n.id === nodeId)) return;
      const markPlanning = (n: FlowNode): FlowNode =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                toolParams: {
                  ...n.data.toolParams,
                  planStatus: "planning",
                  planError: undefined,
                  planStage: undefined,
                  plannerVideoId: undefined,
                  replanRequested: undefined,
                },
              },
            }
          : n;
      const nextNodes = baseNodes.map(markPlanning);
      setNodes((prev) =>
        prev.some((n) => n.id === nodeId) ? prev.map(markPlanning) : nextNodes,
      );
      try {
        const res = await startCanvasExplainerPlanAction({
          canvasId: activeProjectIdRef.current,
          nodeId,
          nodes: toDomainNodes(withRememberedJobOutputs(nextNodes, jobOutputRef.current)),
          edges: toDomainEdges(nextEdges),
          viewport: viewportRef.current,
        });
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    toolParams: res.ok
                      ? { ...n.data.toolParams, plannerVideoId: res.plannerVideoId, planStatus: "planning" }
                      : { ...n.data.toolParams, planStatus: "failed", planError: res.error },
                  },
                }
              : n,
          ),
        );
        if (!res.ok) {
          runAfterReplanRef.current.delete(nodeId);
          toast.error(res.error);
        }
      } catch (err) {
        runAfterReplanRef.current.delete(nodeId);
        const msg = err instanceof Error ? err.message : "Planning failed";
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    toolParams: { ...n.data.toolParams, planStatus: "failed", planError: msg },
                  },
                }
              : n,
          ),
        );
        toast.error(msg);
      }
      scheduleAutosave();
    },
    [setNodes, scheduleAutosave],
  );

  const onPlanExplainer = useCallback(
    (nodeId: string) => void startDirectorPlan(nodeId),
    [startDirectorPlan],
  );

  // Card label for the Replan confirm: model name, plus the clip number from a Director row id.
  const runNodeLabel = useCallback(
    (nodeId: string) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      const spec = node?.data.modelId ? findCanvasModel(node.data.modelId, models) : undefined;
      const name = spec?.name ?? node?.data.label ?? node?.data.modelId ?? nodeId;
      const clip = /-(\d+)$/.exec(nodeId)?.[1];
      return clip ? `${name} · Clip ${clip}` : name;
    },
    [models],
  );

  // Run / Re-run on a card: a Director changed since its last plan asks to Replan first.
  const requestRunNode = useCallback(
    async (nodeId: string) => {
      if (planLockRef.current.nodeIds.has(nodeId)) return;
      const need = replanBeforeRun(toDomainNodes(nodesRef.current), toDomainEdges(edgesRef.current), nodeId);
      if (!need) return onRunNode(nodeId);
      setReplanRun({
        nodeId,
        directorId: need.directorId,
        nodeLabel: runNodeLabel(nodeId),
        affected: need.affectedIds.map((id) => ({ id, label: runNodeLabel(id) })),
      });
    },
    [onRunNode, runNodeLabel],
  );

  const cancelReplanRun = useCallback(() => setReplanRun(null), []);

  const confirmReplanRun = useCallback(() => {
    if (!replanRun) return;
    setReplanRun(null);
    runAfterReplanRef.current.set(replanRun.directorId, replanRun.nodeId);
    void startDirectorPlan(replanRun.directorId);
  }, [replanRun, startDirectorPlan]);

  const closeScroDialog = useCallback(() => setScroDialog(null), []);

  // Adds a dialog-built Life or Poster group at the spot the dialog was opened from.
  const insertScroGroup = useCallback(
    (group: ScroGroup, tool: ScroDialogTool) => {
      const origin = scroDialog?.position ?? group.nodes[0]?.position ?? { x: 0, y: 0 };
      setScroDialog(null);
      placeScroGroup(group, tool, origin);
    },
    [scroDialog, placeScroGroup],
  );

  // Images and videos already on the canvas, offered first in the setup dialogs.
  const canvasMedia = useMemo<CanvasMediaItem[]>(
    () =>
      nodes.flatMap((n): CanvasMediaItem[] => {
        if (n.type === "media" && n.data.mediaUrl && n.data.mediaKind) {
          return [{
            nodeId: n.id,
            label: n.data.fileName ?? n.data.label ?? n.id,
            mediaKind: n.data.mediaKind,
            url: n.data.mediaUrl,
          }];
        }
        if (n.type === "character") {
          const url = n.data.outputUrl || n.data.mediaUrl;
          if (!url) return [];
          return [{
            nodeId: n.id,
            label: n.data.label ?? n.data.fileName ?? n.id,
            mediaKind: "image",
            url,
          }];
        }
        if (
          n.type === "model" &&
          n.data.outputUrl &&
          n.data.outputKind &&
          n.data.outputKind !== "text"
        ) {
          const spec = n.data.modelId ? findCanvasModel(n.data.modelId, models) : undefined;
          return [{
            nodeId: n.id,
            label: spec?.name ?? n.data.modelId ?? n.id,
            mediaKind: n.data.outputKind,
            url: n.data.outputUrl,
          }];
        }
        return [];
      }),
    [nodes, models],
  );

  // Directors whose rows are still being placed one node at a time.
  const revealTimersRef = useRef<Map<string, number>>(new Map());
  const stopReveal = useCallback((directorId: string) => {
    const timer = revealTimersRef.current.get(directorId);
    if (timer !== undefined) window.clearInterval(timer);
    revealTimersRef.current.delete(directorId);
  }, []);
  useEffect(() => {
    const timers = revealTimersRef.current;
    return () => {
      for (const timer of timers.values()) window.clearInterval(timer);
      timers.clear();
    };
  }, []);

  // Measured re-layout of a Director's rows once their cards render.
  const layoutDirectorRows = useCallback(
    (directorId: string, expanded: ExpandedDirectorRows) => {
      const first = expanded.nodes[0];
      const talkingHead = nodesRef.current.find((n) => n.id === directorId)?.data.modelId === "scro:talking-head";
      pendingGroupLayoutRef.current = {
        ids: new Set(expanded.nodes.map((n) => n.id)),
        edges: expanded.edges.filter((e) => e.source !== directorId),
        origin: first ? first.position : { x: 0, y: 0 },
        layout: talkingHead ? "depth" : "explainer",
      };
      window.setTimeout(applyPendingGroupLayout, 600);
      scheduleAutosave();
    },
    [applyPendingGroupLayout, scheduleAutosave],
  );

  // Puts a Director's rows on the canvas. Rows this plan already placed take the final data;
  // otherwise old rows go and the new ones appear one node at a time, wires following.
  const placeDirectorRows = useCallback(
    (directorId: string, expanded: ExpandedDirectorRows, replaceOld: boolean) => {
      stopReveal(directorId);
      const domain = toDomainNodes(nodesRef.current);
      const oldGroup = snapshotGroups(domain).find((g) => g.memberIds.includes(directorId));
      const allNodes = [...domain, ...expanded.nodes];
      const flow = { nodes: toFlowNodes(expanded.nodes), edges: toFlowEdges(expanded.edges, allNodes, models) };

      if (oldGroup?.id === expanded.group.id) {
        const present = new Set(nodesRef.current.map((n) => n.id));
        setNodes((prev) => mergeDirectorRows({ nodes: prev, edges: [] }, { nodes: flow.nodes, edges: [] }).nodes);
        setEdges((prev) => mergeDirectorRows({ nodes: [], edges: prev }, { nodes: [], edges: flow.edges }).edges);
        addGroup(expanded.group);
        if (flow.nodes.some((n) => !present.has(n.id))) layoutDirectorRows(directorId, expanded);
        else scheduleAutosave();
        return;
      }

      const removed = new Set(
        replaceOld && oldGroup ? oldGroup.memberIds.filter((id) => id !== directorId) : [],
      );
      if (oldGroup && removed.size > 0) {
        const clearedAt = new Date().toISOString();
        const currentEdges = toDomainEdges(edgesRef.current);
        const clear = { directorId, expansion: { nodes: [], edges: [] }, replaceGroup: oldGroup, clearedAt };
        const preview = applyDirectorBuild(
          { nodes: toDomainNodes(nodesRef.current), edges: currentEdges },
          clear,
        );
        for (const id of [...preview.removedIds, ...preview.resetIds]) {
          jobOutputRef.current.delete(id);
        }
        setNodes((prev) => applyDirectorBuild({ nodes: prev, edges: currentEdges }, clear).nodes);
        setEdges((prev) => applyDirectorBuild({ nodes: [], edges: prev }, clear).edges);
        updateGroups((prev) => prev.filter((g) => g.id !== oldGroup.id));
      }
      addGroup(expanded.group);
      const kept = nodesRef.current.map((n) => n.id).filter((id) => !removed.has(id));
      const steps = directorRevealSteps(flow, [directorId, ...kept]);
      let index = 0;
      const timer = window.setInterval(() => {
        const step = steps[index++];
        if (!step) {
          stopReveal(directorId);
          layoutDirectorRows(directorId, expanded);
          return;
        }
        setNodes((prev) => (prev.some((n) => n.id === step.node.id) ? prev : [...prev, step.node]));
        if (step.edges.length > 0) {
          setEdges((prev) => [...prev, ...step.edges.filter((e) => !prev.some((p) => p.id === e.id))]);
        }
      }, DIRECTOR_REVEAL_STEP_MS);
      revealTimersRef.current.set(directorId, timer);
    },
    [models, setNodes, setEdges, snapshotGroups, updateGroups, addGroup, stopReveal, layoutDirectorRows, scheduleAutosave],
  );

  // Phase A is in: place the rows now while still prompts and reference stills are made.
  const onDirectorPlanBuilding = useCallback(
    (nodeId: string, state: Extract<CanvasExplainerPlanState, { status: "building" }>) => {
      const director = nodesRef.current.find((n) => n.id === nodeId);
      if (!director || !state.plan) return;
      const toolParams = director.data.toolParams ?? {};
      const drafting = toolParams.planDraft === true;
      // A Replan keeps the rows it already has until the plan is finished.
      const firstBuild = drafting || !readDirectorPlan(toDomainNodes([director])[0]!);
      const placed = snapshotGroups(toDomainNodes(nodesRef.current)).some(
        (g) => g.id === state.group.id && g.memberIds.includes(nodeId),
      );
      const setParams = (next: typeof toolParams) =>
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, toolParams: next } } : n)));

      if (firstBuild && !placed) {
        setParams({ ...toolParams, plan: state.plan, planDraft: true, planStage: state.stage });
        // A retried draft drops the rows the failed attempt placed.
        placeDirectorRows(nodeId, state, drafting);
      } else if (toolParams.planStage !== state.stage) {
        setParams({ ...toolParams, planStage: state.stage });
        scheduleAutosave();
      }
    },
    [setNodes, snapshotGroups, placeDirectorRows, scheduleAutosave],
  );

  // Stores a finished plan on its Director and always builds its rows: first plan, rows placed
  // while planning, or a Replan with a new clip count. Same-count Replans update in place.
  const onDirectorPlanReady = useCallback(
    (nodeId: string, state: Extract<CanvasExplainerPlanState, { status: "ready" }>) => {
      const director = nodesRef.current.find((n) => n.id === nodeId);
      if (!director || !state.plan) return;
      const before = toDomainNodes([director])[0]!;
      const drafting = director.data.toolParams?.planDraft === true;
      const oldPlan = drafting ? undefined : readDirectorPlan(before);
      const toolParams = {
        ...director.data.toolParams,
        plan: state.plan,
        planStatus: "planned",
        planningWith: undefined,
        planDraft: undefined,
        planStage: undefined,
      };
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, toolParams } } : n)));
      // A Run that asked for this Replan goes ahead once the rows keep their ids.
      const waitingRun = runAfterReplanRef.current.get(nodeId);
      runAfterReplanRef.current.delete(nodeId);
      if (oldPlan && oldPlan.clips.length === state.plan.clips.length) {
        // Rows keep their ids, so wires stay. Reference stills and row inputs follow the new plan,
        // and all child + downstream nodes have old media cleared and reset to idle.
        const clearedAt = new Date().toISOString();
        const memberIds =
          snapshotGroups(toDomainNodes(nodesRef.current)).find((g) => g.memberIds.includes(nodeId))?.memberIds ??
          [];
        const synced = syncDirectorReplanRows(
          { nodes: toDomainNodes(nodesRef.current), edges: toDomainEdges(edgesRef.current) },
          { nodes: state.nodes, edges: state.edges },
          memberIds,
          clearedAt,
        );
        for (const id of [...synced.resetIds, ...synced.removedIds]) {
          jobOutputRef.current.delete(id);
        }
        const syncedById = new Map(synced.nodes.map((n) => [n.id, n]));
        setNodes((prev) => {
          const kept = prev.flatMap((n) => {
            if (n.id === nodeId) return [{ ...n, data: { ...n.data, toolParams } }];
            const row = syncedById.get(n.id);
            return row ? [{ ...n, data: row.data }] : [];
          });
          const have = new Set(kept.map((n) => n.id));
          return [...kept, ...toFlowNodes(synced.nodes.filter((n) => !have.has(n.id)))];
        });
        setEdges(toFlowEdges(synced.edges, synced.nodes, models));
        if (synced.addedIds.length > 0 || synced.removedIds.length > 0) {
          const drop = new Set(synced.removedIds);
          updateGroups((prev) =>
            prev.map((g) => {
              if (!g.memberIds.includes(nodeId)) return g;
              const ids = g.memberIds.filter((id) => !drop.has(id));
              for (const id of synced.addedIds) if (!ids.includes(id)) ids.push(id);
              return { ...g, memberIds: ids };
            }),
          );
        }
        if (waitingRun) {
          setReplannedRunId(waitingRun);
          toast.success(
            isZh
              ? "已更新規劃並重置所有子節點，正在重新生成"
              : "Plan updated and child nodes reset; regenerating now",
          );
        } else {
          toast.success(
            isZh
              ? "已更新規劃並重置所有子節點，按右上角 Run Flow 重新生成"
              : "Plan updated and child nodes reset. Run Flow to regenerate",
          );
        }
        scheduleAutosave();
        return;
      }
      if (waitingRun) {
        toast.info(
          isZh ? "片段數量改變，已重建所有列，請在新的列再按 Run" : "Clip count changed and the rows were rebuilt; press Run on the new row",
        );
      }
      placeDirectorRows(nodeId, state, Boolean(oldPlan) || drafting);
    },
    [setNodes, setEdges, scheduleAutosave, placeDirectorRows, snapshotGroups, updateGroups, models, isZh],
  );

  // Planning cards waiting on the worker (polled like canvas jobs).
  const planningNodeIdsKey = useMemo(
    () =>
      nodes
        .filter((n) => {
          if (n.type !== "model" || !isExplainerPlannerNode({ type: "model", data: n.data })) {
            return false;
          }
          const plan = readPlannerParams(n);
          return plan.planStatus === "planning" && Boolean(plan.plannerVideoId);
        })
        .map((n) => n.id)
        .join(","),
    [nodes],
  );

  useEffect(() => {
    if (!planningNodeIdsKey) return;
    const ids = planningNodeIdsKey.split(",");
    let alive = true;
    let inFlight = false;

    const setPlannerParams = (nodeId: string, patch: Record<string, unknown>) =>
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, toolParams: { ...n.data.toolParams, ...patch } } }
            : n,
        ),
      );

    const timer = window.setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        for (const nodeId of ids) {
          const state = await getCanvasExplainerPlanAction({
            canvasId: activeProjectIdRef.current,
            nodeId,
          }).catch(() => null);
          if (!alive || !state || state.status === "planning") continue;
          const planner = nodesRef.current.find((n) => n.id === nodeId);
          // Another tick already handled (or removed) this planning card.
          if (!planner || readPlannerParams(planner).planStatus !== "planning") continue;
          if (state.status === "failed") {
            runAfterReplanRef.current.delete(nodeId);
            setPlannerParams(nodeId, { planStatus: "failed", planError: state.error, planStage: undefined });
            scheduleAutosave();
            continue;
          }
          if (state.status === "building") {
            onDirectorPlanBuilding(nodeId, state);
            continue;
          }
          // A Director keeps its card and stores the plan; it never swaps itself for the rows.
          if (state.plan && isPlanDirectorNode({ type: "model", data: planner.data })) {
            onDirectorPlanReady(nodeId, state);
            continue;
          }
          // The planning card disappears; only the expanded per-clip nodes remain.
          const allNodes = [...toDomainNodes(nodesRef.current), ...state.nodes];
          const next = replacePlannerWithExpansion(
            { nodes: nodesRef.current, edges: edgesRef.current },
            nodeId,
            {
              nodes: toFlowNodes(state.nodes),
              edges: toFlowEdges(state.edges, allNodes, models),
            },
          );
          // Measured re-layout runs once the new cards render (and as a fallback after a beat).
          pendingGroupLayoutRef.current = {
            ids: new Set(state.nodes.map((n) => n.id)),
            edges: state.edges,
            origin: planner.position,
            layout: planner.data.modelId === "scro:talking-head" ? "depth" : "explainer",
          };
          setNodes(next.nodes);
          setEdges(next.edges);
          addGroup(state.group);
          scheduleAutosave();
          window.setTimeout(applyPendingGroupLayout, 600);
        }
      } finally {
        inFlight = false;
      }
    }, JOB_POLL_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [
    planningNodeIdsKey,
    models,
    setNodes,
    setEdges,
    addGroup,
    scheduleAutosave,
    applyPendingGroupLayout,
    onDirectorPlanReady,
    onDirectorPlanBuilding,
  ]);

  // Build replaces the previous trim → render → grade rows and keeps the director card.
  const handleBuildScroDirector = useCallback(
    (nodeId: string) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node || !isScroDirectorNode(node)) return;
      const swap = isSwapDirectorNode(node);
      const videoNodeId = edgesRef.current.find((e) => e.target === nodeId && e.targetHandle === "video")?.source;
      const referenceNodeId = edgesRef.current.find(
        (e) => e.target === nodeId && e.targetHandle === (swap ? "refImages" : "image"),
      )?.source;
      const builtGroupId =
        typeof node.data.toolParams?.builtGroupId === "string" && node.data.toolParams.builtGroupId
          ? node.data.toolParams.builtGroupId
          : `${swap ? "swap" : "teleport"}-${crypto.randomUUID().slice(0, 6)}`;
      const input = {
        directorId: nodeId,
        videoNodeId,
        referenceNodeId,
        idPrefix: builtGroupId,
        origin: { x: node.position.x + 380, y: node.position.y },
      };
      const built = swap ? buildSwapDirectorGroup(node, input) : buildTeleportDirectorGroup(node, input);
      if ("error" in built) {
        toast.error(scroDirectorBuildMessage(built.error, isZh));
        return;
      }
      const previous = new Set(readExpandedNodeIds(node.data));
      const clearedAt = previous.size > 0 ? new Date().toISOString() : undefined;
      const downstreamReset =
        previous.size > 0
          ? new Set(
              downstreamNodeIds(toDomainEdges(edgesRef.current), [...previous]).filter(
                (id) => id !== nodeId && !previous.has(id),
              ),
            )
          : new Set<string>();
      for (const id of [...previous, ...downstreamReset]) {
        jobOutputRef.current.delete(id);
      }
      // Stamp rebuilt nodes with outputClearedAt so snapshot merge does not resurrect old outputs for reused ids.
      const nextGroupNodes = clearedAt
        ? built.group.nodes.map((n) =>
            n.type === "model" || n.type === "character"
              ? { ...n, data: clearNodeOutput(n.data, clearedAt) }
              : n,
          )
        : built.group.nodes;
      const kind = swap ? "swap" : "teleport";
      setNodes((prev) => [
        ...prev
          .filter((n) => !previous.has(n.id))
          .map((n) => {
            if (n.id === nodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  toolParams: {
                    ...(n.data.toolParams ?? {}),
                    directorMode: true,
                    builtGroupId,
                    expandedNodeIds: built.expandedNodeIds,
                  },
                },
              };
            }
            if (clearedAt && downstreamReset.has(n.id) && (n.type === "model" || n.type === "character")) {
              return { ...n, data: clearNodeOutput(n.data, clearedAt) };
            }
            return n;
          }),
        ...toFlowNodes(nextGroupNodes),
      ]);
      setEdges((prev) => [
        ...prev.filter((e) => !previous.has(e.source) && !previous.has(e.target)),
        ...toFlowEdges(
          built.group.edges,
          [...toDomainNodes(nodesRef.current).filter((n) => !previous.has(n.id)), ...built.group.nodes],
          models,
        ),
      ]);
      // A plain object widens kind to string; the CanvasGroup type keeps "swap" | "teleport".
      const frame: CanvasGroup = {
        id: builtGroupId,
        title: defaultGroupTitle(kind),
        color: defaultGroupColor(kind),
        kind,
        memberIds: built.memberIds,
      };
      updateGroups((prev) =>
        prev.some((g) => g.id === builtGroupId)
          ? prev.map((g) => (g.id === builtGroupId ? { ...g, memberIds: built.memberIds } : g))
          : withGroup(prev, frame),
      );
      pendingGroupLayoutRef.current = {
        ids: new Set(built.expandedNodeIds),
        edges: built.group.edges,
        origin: input.origin,
        layout: "depth",
      };
      scheduleAutosave();
      window.setTimeout(applyPendingGroupLayout, 600);
    },
    [isZh, models, setNodes, setEdges, updateGroups, scheduleAutosave, applyPendingGroupLayout],
  );


  return {
    onPlanExplainer,
    requestRunNode,
    cancelReplanRun,
    confirmReplanRun,
    closeScroDialog,
    insertScroGroup,
    canvasMedia,
    handleBuildScroDirector,
    startDirectorPlan,
  };
}
