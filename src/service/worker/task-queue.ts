import { ObjectId, type Filter } from "mongodb";
import {
  extendJobsCollection,
  generationJobsCollection,
  jutsuJobsCollection,
  teleportJobsCollection,
  workerTasksCollection,
} from "@/dao";
import type {
  WorkerTask,
  WorkerTaskKind,
  WorkerTaskLane,
} from "@/model/worker-task";

export const WORKER_DEFAULT_LEASE_MS = 5 * 60 * 1000; // 5 minutes per heartbeat lease
export const WORKER_GPU_LEASE_MS = 25 * 60 * 1000; // 25 minutes initial GPU lease (renewed by heartbeat)
export const WORKER_DEFAULT_MAX_ATTEMPTS = 5;

let indexesReady: Promise<void> | undefined;

export function ensureWorkerTaskIndexes() {
  indexesReady ??= (async () => {
    const col = await workerTasksCollection();
    await col
      .createIndex({ lane: 1, status: 1, nextAttemptAt: 1, createdAt: 1 })
      .catch(() => {});
    await col
      .createIndex({ lane: 1, status: 1, lockedUntil: 1 })
      .catch(() => {});
    await col.createIndex({ dedupeKey: 1, status: 1 }).catch(() => {});
    await col.createIndex({ targetId: 1, kind: 1 }).catch(() => {});
    await col.createIndex({ workerId: 1, heartbeatAt: -1 }).catch(() => {});
  })().catch((err) => {
    indexesReady = undefined;
    throw err;
  });
  return indexesReady;
}

export function shouldUseWorkerQueueOnly(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.WORKER_QUEUE_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function inferWorkerTaskLane(
  kind: WorkerTaskKind,
  hints?: {
    generationKind?: string;
    useComfy?: boolean;
  },
): WorkerTaskLane {
  if (kind === "jutsu_swap" || kind === "teleport") {
    return "gpu";
  }
  if (
    (kind === "generation_submit" || kind === "generation_refresh") &&
    hints?.generationKind === "video" &&
    hints?.useComfy
  ) {
    return "gpu";
  }
  return "cpu";
}

export function computeWorkerRetryBackoffMs(attempt: number): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const ms = 5_000 * Math.pow(3, safeAttempt - 1);
  return Math.min(5 * 60 * 1000, Math.round(ms));
}

export function buildWorkerTaskClaimFilter(
  lane: WorkerTaskLane,
  now: Date = new Date(),
): Filter<WorkerTask> & { $or: Array<Filter<WorkerTask>> } {
  return {
    lane,
    $expr: { $lt: ["$attempts", "$maxAttempts"] },
    $or: [
      { status: "pending", nextAttemptAt: { $lte: now } },
      { status: "in_progress", lockedUntil: { $lt: now } },
    ],
  };
}

export type EnqueueWorkerTaskInput = {
  kind: WorkerTaskKind;
  targetId: string | ObjectId;
  lane?: WorkerTaskLane;
  dedupeKey?: string;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
  nextAttemptAt?: Date;
  generationKind?: string;
  useComfy?: boolean;
};

export async function enqueueWorkerTask(
  input: EnqueueWorkerTaskInput,
): Promise<ObjectId> {
  await ensureWorkerTaskIndexes();
  const col = await workerTasksCollection();
  const now = new Date();
  const targetId =
    typeof input.targetId === "string"
      ? input.targetId
      : input.targetId.toHexString();
  const lane =
    input.lane ??
    inferWorkerTaskLane(input.kind, {
      generationKind: input.generationKind,
      useComfy: input.useComfy,
    });
  const dedupeKey = input.dedupeKey ?? `${input.kind}:${targetId}`;
  const nextAttemptAt = input.nextAttemptAt ?? now;

  const existing = await col.findOneAndUpdate(
    {
      dedupeKey,
      status: { $in: ["pending", "in_progress"] },
    },
    {
      $set: {
        updatedAt: now,
        ...(input.payload ? { payload: input.payload } : {}),
      },
      $min: { nextAttemptAt },
    },
    { returnDocument: "after" },
  );
  if (existing?._id) {
    return existing._id;
  }

  const doc: Omit<WorkerTask, "_id"> = {
    kind: input.kind,
    lane,
    status: "pending",
    targetId,
    dedupeKey,
    ...(input.payload ? { payload: input.payload } : {}),
    progress: 0,
    attempts: 0,
    maxAttempts: input.maxAttempts ?? WORKER_DEFAULT_MAX_ATTEMPTS,
    nextAttemptAt,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  return insertedId;
}

export async function enqueueWorkerTasks(
  inputs: EnqueueWorkerTaskInput[],
): Promise<ObjectId[]> {
  if (inputs.length === 0) return [];
  const ids: ObjectId[] = [];
  for (const item of inputs) {
    ids.push(await enqueueWorkerTask(item));
  }
  return ids;
}

export async function claimNextWorkerTask(input: {
  lane: WorkerTaskLane;
  workerId: string;
  leaseMs?: number;
}): Promise<WorkerTask | null> {
  await ensureWorkerTaskIndexes();
  const col = await workerTasksCollection();
  const now = new Date();
  const leaseMs =
    input.leaseMs ??
    (input.lane === "gpu" ? WORKER_GPU_LEASE_MS : WORKER_DEFAULT_LEASE_MS);
  const lockedUntil = new Date(now.getTime() + leaseMs);

  const claimed = await col.findOneAndUpdate(
    buildWorkerTaskClaimFilter(input.lane, now),
    {
      $set: {
        status: "in_progress",
        workerId: input.workerId,
        lockedUntil,
        heartbeatAt: now,
        startedAt: now,
        updatedAt: now,
      },
      $inc: { attempts: 1 },
    },
    {
      sort: { nextAttemptAt: 1, createdAt: 1 },
      returnDocument: "after",
    },
  );
  return (claimed as WorkerTask | null) ?? null;
}

export async function updateWorkerTaskProgress(input: {
  taskId: string | ObjectId;
  workerId: string;
  progress?: number;
  stage?: string;
  leaseMs?: number;
}): Promise<boolean> {
  const col = await workerTasksCollection();
  const now = new Date();
  const _id =
    typeof input.taskId === "string" ? new ObjectId(input.taskId) : input.taskId;
  const leaseMs = input.leaseMs ?? WORKER_DEFAULT_LEASE_MS;
  const lockedUntil = new Date(now.getTime() + leaseMs);

  const res = await col.updateOne(
    { _id, status: "in_progress", workerId: input.workerId },
    {
      $set: {
        lockedUntil,
        heartbeatAt: now,
        updatedAt: now,
        ...(typeof input.progress === "number"
          ? { progress: Math.max(0, Math.min(100, Math.round(input.progress))) }
          : {}),
        ...(input.stage ? { stage: input.stage } : {}),
      },
    },
  );
  return res.matchedCount === 1;
}

/**
 * Re-parks an in-progress task back to `pending` without burning an extra retry attempt
 * when the task is waiting for an async provider poll or upstream dependency.
 */
export async function requeueWorkerTaskForPoll(input: {
  taskId: string | ObjectId;
  workerId: string;
  delayMs: number;
  progress?: number;
  stage?: string;
  lane?: WorkerTaskLane;
}): Promise<boolean> {
  const col = await workerTasksCollection();
  const now = new Date();
  const _id =
    typeof input.taskId === "string" ? new ObjectId(input.taskId) : input.taskId;
  const nextAttemptAt = new Date(now.getTime() + Math.max(1_000, input.delayMs));

  const res = await col.updateOne(
    { _id, status: "in_progress", workerId: input.workerId },
    {
      $set: {
        status: "pending",
        nextAttemptAt,
        heartbeatAt: now,
        updatedAt: now,
        ...(input.lane ? { lane: input.lane } : {}),
        ...(typeof input.progress === "number"
          ? { progress: Math.max(0, Math.min(99, Math.round(input.progress))) }
          : {}),
        ...(input.stage ? { stage: input.stage } : {}),
      },
      $inc: { attempts: -1 },
      $unset: { lockedUntil: "" },
    },
  );
  return res.matchedCount === 1;
}

export async function completeWorkerTask(input: {
  taskId: string | ObjectId;
  workerId: string;
  outputUrl?: string;
  stage?: string;
}): Promise<boolean> {
  const col = await workerTasksCollection();
  const now = new Date();
  const _id =
    typeof input.taskId === "string" ? new ObjectId(input.taskId) : input.taskId;

  const res = await col.updateOne(
    { _id, status: "in_progress", workerId: input.workerId },
    {
      $set: {
        status: "completed",
        progress: 100,
        completedAt: now,
        heartbeatAt: now,
        updatedAt: now,
        ...(input.outputUrl ? { outputUrl: input.outputUrl } : {}),
        ...(input.stage ? { stage: input.stage } : {}),
      },
      $unset: { lockedUntil: "", error: "" },
    },
  );
  return res.matchedCount === 1;
}

export async function failOrRetryWorkerTask(input: {
  taskId: string | ObjectId;
  workerId: string;
  error: string;
  permanent?: boolean;
}): Promise<"retried" | "failed" | "lost"> {
  const col = await workerTasksCollection();
  const now = new Date();
  const _id =
    typeof input.taskId === "string" ? new ObjectId(input.taskId) : input.taskId;

  const current = await col.findOne({
    _id,
    status: "in_progress",
    workerId: input.workerId,
  });
  if (!current) return "lost";

  const canRetry = !input.permanent && current.attempts < current.maxAttempts;
  if (canRetry) {
    const backoff = computeWorkerRetryBackoffMs(current.attempts);
    await col.updateOne(
      { _id, status: "in_progress", workerId: input.workerId },
      {
        $set: {
          status: "pending",
          error: input.error,
          nextAttemptAt: new Date(now.getTime() + backoff),
          updatedAt: now,
        },
        $unset: { lockedUntil: "" },
      },
    );
    return "retried";
  }

  await col.updateOne(
    { _id, status: "in_progress", workerId: input.workerId },
    {
      $set: {
        status: "failed",
        error: input.error,
        completedAt: now,
        updatedAt: now,
      },
      $unset: { lockedUntil: "" },
    },
  );
  return "failed";
}

export async function getWorkerQueueStats() {
  await ensureWorkerTaskIndexes();
  const col = await workerTasksCollection();
  const [pendingGpu, pendingCpu, inProgressGpu, inProgressCpu, recentWorkers] =
    await Promise.all([
      col.countDocuments({ lane: "gpu", status: "pending" }),
      col.countDocuments({ lane: "cpu", status: "pending" }),
      col.countDocuments({ lane: "gpu", status: "in_progress" }),
      col.countDocuments({ lane: "cpu", status: "in_progress" }),
      col
        .aggregate<{ _id: string; lastHeartbeat: Date; activeCount: number }>([
          {
            $match: {
              workerId: { $exists: true, $ne: "" },
              heartbeatAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
            },
          },
          {
            $group: {
              _id: "$workerId",
              lastHeartbeat: { $max: "$heartbeatAt" },
              activeCount: {
                $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
              },
            },
          },
        ])
        .toArray(),
    ]);

  return {
    pending: { gpu: pendingGpu, cpu: pendingCpu },
    inProgress: { gpu: inProgressGpu, cpu: inProgressCpu },
    activeWorkers: recentWorkers.map((w) => ({
      workerId: w._id,
      lastHeartbeat: w.lastHeartbeat.toISOString(),
      activeCount: w.activeCount,
    })),
  };
}

/**
 * Ensures any pending/in-flight domain jobs (`generationJobs`, `jutsuJobs`, `teleportJobs`, `extendJobs`)
 * have corresponding active `workerTasks` entries so Vast workers never miss an orphaned job.
 */
export async function syncPendingDomainJobsToWorkerQueue(limit = 50): Promise<{
  enqueued: number;
}> {
  await ensureWorkerTaskIndexes();
  const [genCol, jutsuCol, teleCol, extCol] = await Promise.all([
    generationJobsCollection(),
    jutsuJobsCollection(),
    teleportJobsCollection(),
    extendJobsCollection(),
  ]);

  const now = new Date();
  const [pendingGens, inflightGens, activeJutsus, activeTeleports, activeExtends] =
    await Promise.all([
      genCol
        .find({ status: "pending", nextAttemptAt: { $lte: now } })
        .sort({ createdAt: 1 })
        .limit(limit)
        .toArray(),
      genCol
        .find({ status: { $in: ["queued", "in_progress"] } })
        .sort({ updatedAt: 1 })
        .limit(limit)
        .toArray(),
      jutsuCol.find({ status: "rendering" }).limit(limit).toArray(),
      teleCol.find({ status: "rendering" }).limit(limit).toArray(),
      extCol.find({ status: "rendering" }).limit(limit).toArray(),
    ]);

  let enqueued = 0;
  for (const job of pendingGens) {
    if (!job._id) continue;
    await enqueueWorkerTask({
      kind: "generation_submit",
      targetId: job._id,
      generationKind: job.kind,
      nextAttemptAt: job.nextAttemptAt ?? now,
    });
    enqueued += 1;
  }
  for (const job of inflightGens) {
    if (!job._id) continue;
    const useComfy = Boolean(job.statusUrl?.startsWith("comfy://prompt/"));
    await enqueueWorkerTask({
      kind: "generation_refresh",
      targetId: job._id,
      lane: useComfy ? "gpu" : "cpu",
      generationKind: job.kind,
      useComfy,
    });
    enqueued += 1;
  }
  for (const job of activeJutsus) {
    if (!job._id) continue;
    await enqueueWorkerTask({ kind: "jutsu_swap", targetId: job._id, lane: "gpu" });
    enqueued += 1;
  }
  for (const job of activeTeleports) {
    if (!job._id) continue;
    await enqueueWorkerTask({ kind: "teleport", targetId: job._id, lane: "gpu" });
    enqueued += 1;
  }
  for (const job of activeExtends) {
    if (!job._id) continue;
    await enqueueWorkerTask({ kind: "extend", targetId: job._id, lane: "cpu" });
    enqueued += 1;
  }
  return { enqueued };
}

