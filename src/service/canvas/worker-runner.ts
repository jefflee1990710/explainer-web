// Unified Vast.ai Worker runner for single Canvas nodes (`canvas_node`)
// and multi-wave topological Canvas flows (`canvas_flow`).

import { ObjectId } from "mongodb";
import { canvasJobsCollection, canvasProjectsCollection } from "@/dao";
import type { CanvasFlowRunState, CanvasJob, CanvasProject } from "@/model/canvas";
import type { WorkerTask } from "@/model/worker-task";
import {
  dispatchQueuedCanvasJobById,
  pollSingleCanvasJobById,
  submitCanvasNodeJob,
} from "@/service/canvas/executor";
import { executeCanvasFfmpegJob } from "@/service/canvas/ffmpeg-ops";
import { computeExecutionWaves } from "@/service/canvas/graph";
import { isOutputStale } from "@/service/canvas/stale-outputs";
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
  ) => Promise<void>;
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
  now: () => Date;
};

function defaultFlowDeps(): CanvasFlowWorkerDeps {
  return {
    findCanvasProject: async (canvasId, clerkUserId) => {
      const col = await canvasProjectsCollection();
      return col.findOne({ _id: canvasId, clerkUserId });
    },
    setActiveFlowRun: async (canvasId, clerkUserId, activeFlowRun) => {
      const col = await canvasProjectsCollection();
      await col.updateOne(
        { _id: canvasId, clerkUserId },
        { $set: { activeFlowRun, updatedAt: activeFlowRun.updatedAt } },
      );
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
    now: () => new Date(),
  };
}

// Keeps only the listed nodes in each wave and drops waves left empty.
export function filterFlowWaves(waves: string[][], nodeIds: readonly string[]): string[][] {
  const keep = new Set(nodeIds);
  return waves.map((wave) => wave.filter((id) => keep.has(id))).filter((wave) => wave.length > 0);
}

export async function startCanvasFlowRun(
  params: { clerkUserId: string; canvasId: string; nodeIds?: string[] },
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
  const activeFlowRun: CanvasFlowRunState = {
    flowRunId,
    status: "running",
    currentWave: 1,
    totalWaves: waves.length,
    waveIndex: 0,
    waves,
    activeWaveJobIds: [],
    failedNodeIds: [],
    aborted: false,
    startedAt: now,
    updatedAt: now,
  };

  await resolved.setActiveFlowRun(canvasObjectId, params.clerkUserId, activeFlowRun);
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

  const failedSet = new Set(run.failedNodeIds ?? []);
  let waveIndex = run.waveIndex;
  let activeWaveJobIds = [...(run.activeWaveJobIds ?? [])];

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
        ...run,
        failedNodeIds: [...failedSet],
        updatedAt: resolved.now(),
      };
      await resolved.setActiveFlowRun(canvasObjectId, clerkUserId, updatedRun);
      return {
        outcome: "requeue",
        delayMs: 3_000,
        progress: Math.min(95, Math.round(((waveIndex + 0.5) / Math.max(1, run.waves.length)) * 100)),
        stage: `wave_${waveIndex + 1}_running`,
      };
    }

    // Current wave settled -> advance to next wave.
    activeWaveJobIds = [];
    waveIndex += 1;
  }

  // 2. Start the next runnable wave.
  while (waveIndex < run.waves.length) {
    const fresh = await resolved.findCanvasProject(canvasObjectId, clerkUserId);
    if (!fresh?.activeFlowRun || fresh.activeFlowRun.aborted) {
      return { outcome: "completed", stage: "flow_aborted" };
    }

    const wave = run.waves[waveIndex] ?? [];
    const runnableIds: string[] = [];

    for (const nodeId of wave) {
      const upstreamFailed = fresh.edges.some(
        (e) => e.target === nodeId && failedSet.has(e.source),
      );
      if (upstreamFailed) {
        failedSet.add(nodeId);
        continue;
      }
      const node = fresh.nodes.find((n) => n.id === nodeId);
      // Completed nodes are reused unless their preview is an old version.
      if (node?.data.status === "completed" && node.data.outputUrl?.trim() && !isOutputStale(node.data)) {
        continue;
      }
      runnableIds.push(nodeId);
    }

    if (runnableIds.length === 0) {
      waveIndex += 1;
      continue;
    }

    const submitted = await Promise.all(
      runnableIds.map((nodeId) =>
        resolved.submitNodeQueued({
          clerkUserId,
          canvasId: task.targetId,
          nodeId,
          flowRunId,
        }),
      ),
    );

    const newJobIds: string[] = [];
    for (let i = 0; i < runnableIds.length; i += 1) {
      const nodeId = runnableIds[i]!;
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
        ...run,
        status: "running",
        currentWave: waveIndex + 1,
        totalWaves: run.waves.length,
        waveIndex,
        activeWaveJobIds: newJobIds,
        failedNodeIds: [...failedSet],
        updatedAt: resolved.now(),
      };
      await resolved.setActiveFlowRun(canvasObjectId, clerkUserId, nextRun);
      return {
        outcome: "requeue",
        delayMs: 3_000,
        progress: Math.min(95, Math.round(((waveIndex + 0.2) / Math.max(1, run.waves.length)) * 100)),
        stage: `wave_${waveIndex + 1}_queued`,
      };
    }

    waveIndex += 1;
  }

  const finalStatus = failedSet.size > 0 ? "failed" : "completed";
  const finishedRun: CanvasFlowRunState = {
    ...run,
    status: finalStatus,
    currentWave: run.waves.length,
    totalWaves: run.waves.length,
    waveIndex: run.waves.length,
    activeWaveJobIds: [],
    failedNodeIds: [...failedSet],
    ...(failedSet.size > 0 ? { error: `${failedSet.size} 個節點執行失敗` } : {}),
    updatedAt: resolved.now(),
  };
  await resolved.setActiveFlowRun(canvasObjectId, clerkUserId, finishedRun);
  return {
    outcome: "completed",
    stage: `flow_${finalStatus}`,
  };
}
