// Unified Vast.ai Worker runner for single Canvas nodes (`canvas_node`)
// and multi-wave topological Canvas flows (`canvas_flow`).

import { ObjectId } from "mongodb";
import { canvasJobsCollection, canvasProjectsCollection } from "@/dao";
import type { CanvasEdge, CanvasFlowRunState, CanvasJob, CanvasNode, CanvasProject } from "@/model/canvas";
import type { WorkerTask } from "@/model/worker-task";
import {
  dispatchQueuedCanvasJobById,
  pollSingleCanvasJobById,
  submitCanvasNodeJob,
} from "@/service/canvas/executor";
import { executeCanvasFfmpegJob } from "@/service/canvas/ffmpeg-ops";
import { computeExecutionWaves } from "@/service/canvas/graph";
import { UPSTREAM_FAILED_ERROR } from "@/service/canvas/orphan-busy";
import { flowRerunNodeIds, isOutputStale } from "@/service/canvas/stale-outputs";
import { scheduleCanvasFlowWorkerTask } from "@/service/worker/schedule";
import type { WorkerTaskExecutionResult } from "@/service/worker/task-executor";

export type CanvasNodeWorkerDeps = {
  findCanvasJob: (jobId: ObjectId) => Promise<CanvasJob | null>;
  dispatchQueuedJob: (jobId: ObjectId) => Promise<CanvasJob | null>;
  pollRunningJob: (jobId: ObjectId) => Promise<CanvasJob | null>;
  runFfmpegJob: (
    jobId: ObjectId,
  ) => Promise<{ outcome: "completed"; outputUrl: string } | { outcome: "failed"; error: string }>;
};

export async function executeCanvasNodeTask(
  jobId: ObjectId,
  deps?: Partial<CanvasNodeWorkerDeps>,
): Promise<WorkerTaskExecutionResult> {
  const resolved: CanvasNodeWorkerDeps = {
    findCanvasJob: async (id) => {
      const col = await canvasJobsCollection();
      return col.findOne({ _id: id });
    },
    dispatchQueuedJob: (id) => dispatchQueuedCanvasJobById(id),
    pollRunningJob: (id) => pollSingleCanvasJobById(id),
    runFfmpegJob: (id) => executeCanvasFfmpegJob(id),
    ...deps,
  };

  const job = await resolved.findCanvasJob(jobId);
  if (!job) {
    return { outcome: "completed", stage: "not_found" };
  }
  if (job.status === "completed") {
    return { outcome: "completed", outputUrl: job.outputUrl, stage: "completed" };
  }
  if (job.status === "failed") {
    return {
      outcome: "failed",
      error: job.error || "畫布節點執行失敗",
      permanent: true,
    };
  }

  // FFmpeg nodes execute directly on the Vast.ai worker without double queueing.
  if (job.provider === "ffmpeg" && job.status === "queued") {
    const res = await resolved.runFfmpegJob(jobId);
    if (res.outcome === "failed") {
      return { outcome: "failed", error: res.error, permanent: true };
    }
    return { outcome: "completed", outputUrl: res.outputUrl, stage: "completed" };
  }

  let latest: CanvasJob | null = job;
  if (job.status === "queued") {
    latest = await resolved.dispatchQueuedJob(jobId);
  } else if (job.status === "running") {
    latest = await resolved.pollRunningJob(jobId);
  }

  if (!latest) {
    return { outcome: "completed", stage: "removed" };
  }
  if (latest.status === "completed") {
    return { outcome: "completed", outputUrl: latest.outputUrl, stage: "completed" };
  }
  if (latest.status === "failed") {
    return {
      outcome: "failed",
      error: latest.error || "畫布節點執行失敗",
      permanent: true,
    };
  }

  return {
    outcome: "requeue",
    delayMs: 5_000,
    progress: 40,
    stage: latest.provider === "scro" ? `polling_${latest.domainKind ?? "scro"}` : "polling_provider",
  };
}

export type CanvasFlowWorkerDeps = {
  findCanvasProject: (canvasId: ObjectId, clerkUserId: string) => Promise<CanvasProject | null>;
  setActiveFlowRun: (
    canvasId: ObjectId,
    clerkUserId: string,
    activeFlowRun: CanvasFlowRunState,
    options?: { onlyIfRunningFlowId?: string },
  ) => Promise<boolean | void>;
  abortFlowRun: (canvasId: ObjectId, clerkUserId: string) => Promise<void>;
  scheduleFlowTask: (input: {
    canvasId: string;
    flowRunId: string;
    clerkUserId: string;
  }) => Promise<void> | void;
  markNodeFailed: (
    canvasId: ObjectId,
    clerkUserId: string,
    nodeId: string,
    error: string,
  ) => Promise<void>;
  markNodeQueued: (canvasId: ObjectId, clerkUserId: string, nodeId: string) => Promise<void>;
  submitNodeQueued: (input: {
    clerkUserId: string;
    canvasId: string;
    nodeId: string;
    flowRunId: string;
  }) => Promise<
    | { ok: true; job: CanvasJob; creditUsd: number }
    | { ok: false; error: string; job?: CanvasJob }
  >;
  findCanvasJobsByIds: (
    canvasId: ObjectId,
    clerkUserId: string,
    jobIds: ObjectId[],
  ) => Promise<CanvasJob[]>;
  // Existing jobs already created for this flowRunId so a retried step never double-charges.
  findFlowNodeJobs?: (
    canvasId: ObjectId,
    clerkUserId: string,
    flowRunId: string,
    nodeIds: string[],
  ) => Promise<CanvasJob[]>;
  // True when this caller owns the flow step. False means another step is in progress.
  claimFlowStep: (canvasId: ObjectId, clerkUserId: string, flowRunId: string) => Promise<boolean>;
  now: () => Date;
};

// Lease long enough to cover audio/video duration probes (30s) and batch job inserts.
const FLOW_STEP_LOCK_MS = 90_000;

// Drop the step lease before saving, so the next poll can take the following wave.
function flowRunWithoutLock(run: CanvasFlowRunState): CanvasFlowRunState {
  const next = { ...run };
  delete next.stepLockUntil;
  return next;
}

function defaultFlowDeps(): CanvasFlowWorkerDeps {
  return {
    findCanvasProject: async (canvasId, clerkUserId) => {
      const col = await canvasProjectsCollection();
      return col.findOne({ _id: canvasId, clerkUserId });
    },
    setActiveFlowRun: async (canvasId, clerkUserId, activeFlowRun, options) => {
      const col = await canvasProjectsCollection();
      const filter = options?.onlyIfRunningFlowId
        ? {
            _id: canvasId,
            clerkUserId,
            "activeFlowRun.flowRunId": options.onlyIfRunningFlowId,
            "activeFlowRun.status": "running" as const,
            "activeFlowRun.aborted": { $ne: true },
          }
        : {
            _id: canvasId,
            clerkUserId,
            "activeFlowRun.status": { $ne: "running" as const },
          };
      const res = await col.updateOne(filter, {
        $set: { activeFlowRun, updatedAt: activeFlowRun.updatedAt },
      });
      return res.modifiedCount === 1;
    },
    abortFlowRun: async (canvasId, clerkUserId) => {
      const col = await canvasProjectsCollection();
      const now = new Date();
      await col.updateOne(
        { _id: canvasId, clerkUserId, "activeFlowRun.status": "running" },
        {
          $set: {
            "activeFlowRun.aborted": true,
            "activeFlowRun.status": "stopped",
            "activeFlowRun.updatedAt": now,
            updatedAt: now,
          },
        },
      );
      // Reset nodes that were pre-marked `queued` (e.g. waiting on upstream) without a live job.
      const project = await col.findOne({ _id: canvasId, clerkUserId }, { projection: { nodes: 1 } });
      if (!project) return;
      const queuedNodes = project.nodes.filter(
        (n) => n.type === "model" && n.data.status === "queued",
      );
      if (queuedNodes.length === 0) return;
      const validJobIds = queuedNodes
        .map((n) => n.data.lastJobId)
        .filter((id): id is string => Boolean(id && ObjectId.isValid(id)))
        .map((id) => new ObjectId(id));
      const jobsCol = await canvasJobsCollection();
      const liveJobs =
        validJobIds.length > 0
          ? await jobsCol
              .find({
                _id: { $in: validJobIds },
                canvasId,
                clerkUserId,
                status: { $in: ["queued", "running"] },
              })
              .toArray()
          : [];
      const liveJobIdSet = new Set(liveJobs.map((j) => j._id.toHexString()));
      for (const node of queuedNodes) {
        if (node.data.lastJobId && liveJobIdSet.has(node.data.lastJobId)) continue;
        const restoredStatus = node.data.outputUrl?.trim() ? "completed" : "idle";
        await col.updateOne(
          { _id: canvasId, clerkUserId, "nodes.id": node.id, "nodes.data.status": "queued" },
          {
            $set: { "nodes.$.data.status": restoredStatus, updatedAt: now },
            $unset: { "nodes.$.data.lastError": "" },
          },
        );
      }
    },
    scheduleFlowTask: (input) => scheduleCanvasFlowWorkerTask(input),
    markNodeFailed: async (canvasId, clerkUserId, nodeId, error) => {
      const col = await canvasProjectsCollection();
      const now = new Date();
      await col.updateOne(
        { _id: canvasId, clerkUserId, "nodes.id": nodeId },
        {
          $set: {
            "nodes.$.data.status": "failed",
            "nodes.$.data.lastError": error,
            updatedAt: now,
          },
        },
      );
    },
    markNodeQueued: async (canvasId, clerkUserId, nodeId) => {
      const col = await canvasProjectsCollection();
      await col.updateOne(
        { _id: canvasId, clerkUserId, "nodes.id": nodeId },
        { $set: { "nodes.$.data.status": "queued", updatedAt: new Date() }, $unset: { "nodes.$.data.lastError": "" } },
      );
    },
    submitNodeQueued: (input) =>
      submitCanvasNodeJob({
        ...input,
        queueToWorker: true,
      }),
    findCanvasJobsByIds: async (canvasId, clerkUserId, jobIds) => {
      if (jobIds.length === 0) return [];
      const col = await canvasJobsCollection();
      return col.find({ _id: { $in: jobIds }, canvasId, clerkUserId }).toArray();
    },
    findFlowNodeJobs: async (canvasId, clerkUserId, flowRunId, nodeIds) => {
      if (nodeIds.length === 0) return [];
      const col = await canvasJobsCollection();
      return col
        .find({ canvasId, clerkUserId, flowRunId, nodeId: { $in: nodeIds } })
        .sort({ createdAt: -1 })
        .toArray();
    },
    claimFlowStep: async (canvasId, clerkUserId, flowRunId) => {
      const col = await canvasProjectsCollection();
      const now = new Date();
      const res = await col.updateOne(
        {
          _id: canvasId,
          clerkUserId,
          "activeFlowRun.flowRunId": flowRunId,
          "activeFlowRun.status": "running",
          "activeFlowRun.aborted": { $ne: true },
          $or: [
            { "activeFlowRun.stepLockUntil": { $exists: false } },
            { "activeFlowRun.stepLockUntil": null },
            { "activeFlowRun.stepLockUntil": { $lte: now } },
          ],
        },
        { $set: { "activeFlowRun.stepLockUntil": new Date(now.getTime() + FLOW_STEP_LOCK_MS) } },
      );
      return res.modifiedCount === 1;
    },
    now: () => new Date(),
  };
}

function isBusyStatus(status: string | undefined): boolean {
  return status === "queued" || status === "running";
}

// Model nodes wired straight into nodeId that are still queued or running.
export function busyUpstreamModelIds(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  nodeId: string,
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  for (const edge of edges) {
    if (edge.target !== nodeId || out.includes(edge.source)) continue;
    const source = byId.get(edge.source);
    if (source?.type === "model" && isBusyStatus(source.data.status)) out.push(source.id);
  }
  return out;
}

// nodeId -> job id for wave nodes whose last job is still queued or running.
async function activeNodeJobIds(
  project: CanvasProject,
  nodeIds: readonly string[],
  deps: CanvasFlowWorkerDeps,
  canvasId: ObjectId,
  clerkUserId: string,
): Promise<Map<string, string>> {
  const byJobId = new Map<string, string>();
  for (const nodeId of nodeIds) {
    const node = project.nodes.find((n) => n.id === nodeId);
    const jobId = node?.data.lastJobId;
    if (node && isBusyStatus(node.data.status) && jobId && ObjectId.isValid(jobId)) byJobId.set(jobId, nodeId);
  }
  const out = new Map<string, string>();
  if (byJobId.size === 0) return out;
  const jobs = await deps.findCanvasJobsByIds(canvasId, clerkUserId, [...byJobId.keys()].map((id) => new ObjectId(id)));
  for (const job of jobs) {
    const nodeId = byJobId.get(job._id.toHexString());
    if (nodeId && isBusyStatus(job.status)) out.set(nodeId, job._id.toHexString());
  }
  return out;
}

// Single-node Run while a wired upstream node is still running: wait for it, then run this node.
// Returns null when nothing upstream is running, so the caller submits right away.
export async function startCanvasNodeAfterUpstream(
  params: { clerkUserId: string; canvasId: string; nodeId: string },
  deps?: Partial<CanvasFlowWorkerDeps>,
): Promise<
  | { ok: true; activeFlowRun: CanvasFlowRunState; waitingOn: string[] }
  | { ok: false; error: string }
  | null
> {
  if (!ObjectId.isValid(params.canvasId)) return null;
  const resolved = { ...defaultFlowDeps(), ...deps };
  const canvasObjectId = new ObjectId(params.canvasId);
  const project = await resolved.findCanvasProject(canvasObjectId, params.clerkUserId);
  if (!project) return null;
  const waitingOn = busyUpstreamModelIds(project.nodes, project.edges, params.nodeId);
  if (waitingOn.length === 0) return null;
  const started = await startCanvasFlowRun(
    { clerkUserId: params.clerkUserId, canvasId: params.canvasId, nodeIds: [...waitingOn, params.nodeId] },
    resolved,
  );
  if (!started.ok) return started;
  await resolved.markNodeQueued(canvasObjectId, params.clerkUserId, params.nodeId);
  return { ...started, waitingOn };
}

// Keeps only the listed nodes in each wave and drops waves left empty.
export function filterFlowWaves(waves: string[][], nodeIds: readonly string[]): string[][] {
  const keep = new Set(nodeIds);
  return waves.map((wave) => wave.filter((id) => keep.has(id))).filter((wave) => wave.length > 0);
}

export async function startCanvasFlowRun(
  params: {
    clerkUserId: string;
    canvasId: string;
    nodeIds?: string[];
    rerunNodeIds?: string[];
    rerunAll?: boolean;
  },
  deps?: Partial<CanvasFlowWorkerDeps>,
): Promise<
  | { ok: true; activeFlowRun: CanvasFlowRunState }
  | { ok: false; error: string }
> {
  if (!ObjectId.isValid(params.canvasId)) {
    return { ok: false, error: "找不到畫布專案" };
  }
  const resolved = { ...defaultFlowDeps(), ...deps };
  const canvasObjectId = new ObjectId(params.canvasId);
  const project = await resolved.findCanvasProject(canvasObjectId, params.clerkUserId);
  if (!project) {
    return { ok: false, error: "找不到畫布專案" };
  }
  if (project.activeFlowRun?.status === "running") {
    return { ok: false, error: "這張畫布已有工作流正在執行中，請先等待完成或停止後再試" };
  }

  let waves: string[][];
  try {
    waves = computeExecutionWaves(project.nodes, project.edges);
    if (params.nodeIds) waves = filterFlowWaves(waves, params.nodeIds);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "畫布連線有循環，無法執行",
    };
  }
  if (waves.length === 0) {
    return { ok: false, error: "畫布上沒有可執行的模型或工具節點" };
  }

  const now = resolved.now();
  const flowRunId = `flow-${crypto.randomUUID().slice(0, 8)}`;
  // Captured now, so a later autosave cannot clear the old-version mark before this run starts.
  const rerunNodeIds = flowRerunNodeIds(project.nodes, project.edges, params.rerunNodeIds ?? []);
  const activeFlowRun: CanvasFlowRunState = {
    flowRunId,
    status: "running",
    currentWave: 1,
    totalWaves: waves.length,
    waveIndex: 0,
    waves,
    activeWaveJobIds: [],
    failedNodeIds: [],
    ...(rerunNodeIds.length > 0 ? { rerunNodeIds } : {}),
    ...(params.rerunAll ? { rerunAll: true } : {}),
    aborted: false,
    startedAt: now,
    updatedAt: now,
  };

  const started = await resolved.setActiveFlowRun(canvasObjectId, params.clerkUserId, activeFlowRun);
  if (started === false) {
    return { ok: false, error: "這張畫布已有工作流正在執行中，請先等待完成或停止後再試" };
  }
  await resolved.scheduleFlowTask({
    canvasId: params.canvasId,
    flowRunId,
    clerkUserId: params.clerkUserId,
  });

  return { ok: true, activeFlowRun };
}

export async function stopCanvasFlowRun(
  params: { clerkUserId: string; canvasId: string },
  deps?: Partial<CanvasFlowWorkerDeps>,
): Promise<void> {
  if (!ObjectId.isValid(params.canvasId)) return;
  const resolved = { ...defaultFlowDeps(), ...deps };
  await resolved.abortFlowRun(new ObjectId(params.canvasId), params.clerkUserId);
}

export async function executeCanvasFlowTask(
  task: WorkerTask,
  deps?: Partial<CanvasFlowWorkerDeps>,
): Promise<WorkerTaskExecutionResult> {
  if (!ObjectId.isValid(task.targetId)) {
    return { outcome: "failed", error: "無效的 Canvas ID", permanent: true };
  }
  const clerkUserId = String(task.payload?.clerkUserId ?? "");
  const flowRunId = String(task.payload?.flowRunId ?? "");
  if (!clerkUserId || !flowRunId) {
    return { outcome: "failed", error: "缺少 Canvas flow metadata", permanent: true };
  }

  const resolved = { ...defaultFlowDeps(), ...deps };
  const canvasObjectId = new ObjectId(task.targetId);
  const project = await resolved.findCanvasProject(canvasObjectId, clerkUserId);
  const run = project?.activeFlowRun;
  if (!project || !run || run.flowRunId !== flowRunId) {
    return { outcome: "completed", stage: "flow_superseded" };
  }
  if (run.aborted || run.status === "stopped") {
    return { outcome: "completed", stage: "flow_aborted" };
  }
  if (run.status === "completed" || run.status === "failed") {
    return { outcome: "completed", stage: `flow_${run.status}` };
  }

  // One owner per step. The page poll and the local after() loop both call this.
  const claimed = await resolved.claimFlowStep(canvasObjectId, clerkUserId, flowRunId);
  if (!claimed) {
    return { outcome: "requeue", delayMs: 3_000, stage: "flow_locked" };
  }
  const owned = await resolved.findCanvasProject(canvasObjectId, clerkUserId);
  const ownedRun = owned?.activeFlowRun;
  if (!owned || !ownedRun || ownedRun.flowRunId !== flowRunId) {
    return { outcome: "completed", stage: "flow_superseded" };
  }
  if (ownedRun.aborted || ownedRun.status === "stopped") {
    return { outcome: "completed", stage: "flow_aborted" };
  }
  if (ownedRun.status === "completed" || ownedRun.status === "failed") {
    return { outcome: "completed", stage: `flow_${ownedRun.status}` };
  }

  const failedSet = new Set(ownedRun.failedNodeIds ?? []);
  let waveIndex = ownedRun.waveIndex;
  let activeWaveJobIds = [...(ownedRun.activeWaveJobIds ?? [])];

  // 1. Poll any in-flight jobs from the current wave.
  if (activeWaveJobIds.length > 0) {
    const objIds = activeWaveJobIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const jobs = await resolved.findCanvasJobsByIds(canvasObjectId, clerkUserId, objIds);

    let stillRunning = false;
    for (const job of jobs) {
      if (job.status === "queued" || job.status === "running") {
        stillRunning = true;
      } else if (job.status === "failed") {
        failedSet.add(job.nodeId);
      }
    }

    if (stillRunning) {
      const updatedRun: CanvasFlowRunState = {
        ...flowRunWithoutLock(ownedRun),
        failedNodeIds: [...failedSet],
        updatedAt: resolved.now(),
      };
      const saved = await resolved.setActiveFlowRun(canvasObjectId, clerkUserId, updatedRun, {
        onlyIfRunningFlowId: flowRunId,
      });
      if (saved === false) {
        return { outcome: "completed", stage: "flow_aborted" };
      }
      return {
        outcome: "requeue",
        delayMs: 3_000,
        progress: Math.min(95, Math.round(((waveIndex + 0.5) / Math.max(1, ownedRun.waves.length)) * 100)),
        stage: `wave_${waveIndex + 1}_running`,
      };
    }

    // Current wave settled -> advance to next wave.
    activeWaveJobIds = [];
    waveIndex += 1;
  }

  // 2. Start the next runnable wave.
  while (waveIndex < ownedRun.waves.length) {
    const fresh = await resolved.findCanvasProject(canvasObjectId, clerkUserId);
    if (!fresh?.activeFlowRun || fresh.activeFlowRun.aborted || fresh.activeFlowRun.status !== "running") {
      return { outcome: "completed", stage: "flow_aborted" };
    }

    const wave = ownedRun.waves[waveIndex] ?? [];
    const runnableIds: string[] = [];

    for (const nodeId of wave) {
      const upstreamFailed = fresh.edges.some(
        (e) => e.target === nodeId && failedSet.has(e.source),
      );
      if (upstreamFailed) {
        failedSet.add(nodeId);
        await resolved.markNodeFailed(canvasObjectId, clerkUserId, nodeId, UPSTREAM_FAILED_ERROR);
        continue;
      }
      const node = fresh.nodes.find((n) => n.id === nodeId);
      const mustRerun =
        ownedRun.rerunAll || ownedRun.rerunNodeIds?.includes(nodeId) || isOutputStale(node?.data ?? {});
      // Completed nodes are reused unless this run regenerates every node, or that old preview.
      if (node?.data.status === "completed" && node.data.outputUrl?.trim() && !mustRerun) {
        continue;
      }
      runnableIds.push(nodeId);
    }

    // A node already running from its own Run is watched, not submitted (and charged) again.
    const adoptedJobIds = await activeNodeJobIds(fresh, runnableIds, resolved, canvasObjectId, clerkUserId);
    let toSubmit = runnableIds.filter((nodeId) => !adoptedJobIds.has(nodeId));

    // Idempotency guard: if a prior step already created a job for (flowRunId, nodeId),
    // adopt/settle it instead of submitting & charging a second time.
    const findFlowNodeJobs = deps ? deps.findFlowNodeJobs : resolved.findFlowNodeJobs;
    if (toSubmit.length > 0 && findFlowNodeJobs) {
      const existingFlowJobs = await findFlowNodeJobs(canvasObjectId, clerkUserId, flowRunId, toSubmit);
      const existingByNode = new Map<string, CanvasJob>();
      for (const job of existingFlowJobs) {
        if (!existingByNode.has(job.nodeId)) existingByNode.set(job.nodeId, job);
      }
      const remaining: string[] = [];
      for (const nodeId of toSubmit) {
        const existing = existingByNode.get(nodeId);
        if (!existing) {
          remaining.push(nodeId);
        } else if (isBusyStatus(existing.status)) {
          adoptedJobIds.set(nodeId, existing._id.toHexString());
        } else if (existing.status === "failed") {
          failedSet.add(nodeId);
        }
        // If `existing.status === "completed"`, skip re-submitting.
      }
      toSubmit = remaining;
    }

    if (toSubmit.length === 0 && adoptedJobIds.size === 0) {
      waveIndex += 1;
      continue;
    }

    const submitted = await Promise.all(
      toSubmit.map((nodeId) =>
        resolved.submitNodeQueued({
          clerkUserId,
          canvasId: task.targetId,
          nodeId,
          flowRunId,
        }),
      ),
    );

    const newJobIds: string[] = [...adoptedJobIds.values()];
    for (let i = 0; i < toSubmit.length; i += 1) {
      const nodeId = toSubmit[i]!;
      const res = submitted[i]!;
      if (!res.ok) {
        failedSet.add(nodeId);
        await resolved.markNodeFailed(canvasObjectId, clerkUserId, nodeId, res.error);
      } else if (res.job.status === "queued" || res.job.status === "running") {
        newJobIds.push(res.job._id.toHexString());
      } else if (res.job.status === "failed") {
        failedSet.add(nodeId);
      }
    }

    if (newJobIds.length > 0) {
      const nextRun: CanvasFlowRunState = {
        ...flowRunWithoutLock(ownedRun),
        status: "running",
        currentWave: waveIndex + 1,
        totalWaves: ownedRun.waves.length,
        waveIndex,
        activeWaveJobIds: newJobIds,
        failedNodeIds: [...failedSet],
        updatedAt: resolved.now(),
      };
      const saved = await resolved.setActiveFlowRun(canvasObjectId, clerkUserId, nextRun, {
        onlyIfRunningFlowId: flowRunId,
      });
      if (saved === false) {
        return { outcome: "completed", stage: "flow_aborted" };
      }
      return {
        outcome: "requeue",
        delayMs: 3_000,
        progress: Math.min(95, Math.round(((waveIndex + 0.2) / Math.max(1, ownedRun.waves.length)) * 100)),
        stage: `wave_${waveIndex + 1}_queued`,
      };
    }

    waveIndex += 1;
  }

  const finalStatus = failedSet.size > 0 ? "failed" : "completed";
  const finishedRun: CanvasFlowRunState = {
    ...flowRunWithoutLock(ownedRun),
    status: finalStatus,
    currentWave: ownedRun.waves.length,
    totalWaves: ownedRun.waves.length,
    waveIndex: ownedRun.waves.length,
    activeWaveJobIds: [],
    failedNodeIds: [...failedSet],
    ...(failedSet.size > 0 ? { error: `${failedSet.size} 個節點執行失敗` } : {}),
    updatedAt: resolved.now(),
  };
  const saved = await resolved.setActiveFlowRun(canvasObjectId, clerkUserId, finishedRun, {
    onlyIfRunningFlowId: flowRunId,
  });
  if (saved === false) {
    return { outcome: "completed", stage: "flow_aborted" };
  }
  return {
    outcome: "completed",
    stage: `flow_${finalStatus}`,
  };
}
