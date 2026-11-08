import { ObjectId } from "mongodb";
import type { WorkerTask, WorkerTaskLane } from "@/model/worker-task";
import { processClaimedWorkerTask } from "@/service/worker/task-executor";
import {
  claimNextWorkerTask,
  syncPendingDomainJobsToWorkerQueue,
  updateWorkerTaskProgress,
} from "@/service/worker/task-queue";
import type { WorkerApiClient } from "./api-client";
import { cleanupComfyLocalJobFiles, cleanupStaleComfyFiles } from "./comfy-local";

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export async function claimAndExecuteTask(input: {
  lane: WorkerTaskLane;
  workerId: string;
  apiClient?: WorkerApiClient;
}): Promise<boolean> {
  const { lane, workerId, apiClient } = input;

  // Prefer HTTP API claim when `apiClient` is provided, falling back to direct MongoDB claim.
  let task: WorkerTask | null = null;
  if (apiClient) {
    const pub = await apiClient.claimTask(lane).catch(() => null);
    if (pub) {
      task = {
        _id: new ObjectId(pub.id),
        kind: pub.kind,
        lane: pub.lane,
        status: pub.status,
        targetId: pub.targetId,
        payload: pub.payload,
        progress: pub.progress,
        stage: pub.stage,
        workerId: pub.workerId,
        attempts: pub.attempts,
        maxAttempts: pub.maxAttempts,
        nextAttemptAt: new Date(pub.updatedAt),
        createdAt: new Date(pub.createdAt),
        updatedAt: new Date(pub.updatedAt),
      };
    }
  }
  if (!task) {
    task = await claimNextWorkerTask({ lane, workerId });
  }
  if (!task) return false;

  const startMs = Date.now();
  console.log(
    `[worker:${workerId}] claimed ${lane.toUpperCase()} task ${task._id.toHexString()} (${task.kind} -> ${task.targetId})`,
  );

  // Periodic lease heartbeat every 45 seconds while task is running
  const heartbeatTimer = setInterval(() => {
    void updateWorkerTaskProgress({
      taskId: task!._id,
      workerId,
    }).catch(() => {});
    if (apiClient) {
      void apiClient
        .reportProgress(task!._id.toHexString())
        .catch(() => {});
    }
  }, 45_000);

  try {
    const outcome = await processClaimedWorkerTask(task, workerId);
    if (apiClient) {
      await apiClient
        .completeTask(task._id.toHexString(), outcome)
        .catch(() => {});
    }
    if (
      lane === "gpu" &&
      (outcome.outcome === "completed" || outcome.outcome === "failed")
    ) {
      await cleanupComfyLocalJobFiles(task.targetId).catch(() => {});
    }
    const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(
      `[worker:${workerId}] finished ${lane.toUpperCase()} task ${task._id.toHexString()} (${task.kind}) -> ${outcome.outcome} in ${elapsedSec}s`,
    );
    return true;
  } finally {
    clearInterval(heartbeatTimer);
  }
}

export async function runTwoLaneWorkerLoop(options: {
  workerId: string;
  gpuConcurrency?: number;
  cpuConcurrency?: number;
  idleSleepMs?: number;
  signal?: AbortSignal;
  apiClient?: WorkerApiClient;
  claimAndRunOne?: (lane: WorkerTaskLane, slot: number) => Promise<boolean>;
}): Promise<void> {
  const gpuConcurrency = Math.max(1, options.gpuConcurrency ?? 1);
  const cpuConcurrency = Math.max(1, options.cpuConcurrency ?? 6);
  const idleSleepMs = options.idleSleepMs ?? 1_500;
  const { workerId, signal, apiClient } = options;

  const runner =
    options.claimAndRunOne ??
    ((lane: WorkerTaskLane) =>
      claimAndExecuteTask({ lane, workerId, apiClient }));

  const startSlotLoop = async (lane: WorkerTaskLane, slot: number) => {
    while (!signal?.aborted) {
      try {
        const worked = await runner(lane, slot);
        if (!worked) {
          await sleep(idleSleepMs, signal);
        }
      } catch (error) {
        console.error(`[worker:${workerId}] ${lane}#${slot} loop error`, error);
        await sleep(Math.max(2_000, idleSleepMs), signal);
      }
    }
  };

  // Periodic background sweep of any orphaned domain jobs into `workerTasks` + stale ComfyUI files
  const sweepLoop = async () => {
    if (options.claimAndRunOne) return;
    while (!signal?.aborted) {
      try {
        await Promise.all([
          syncPendingDomainJobsToWorkerQueue(40),
          cleanupStaleComfyFiles(),
        ]);
      } catch (error) {
        console.error(`[worker:${workerId}] domain sweep error`, error);
      }
      await sleep(15_000, signal);
    }
  };

  const loops: Promise<void>[] = [sweepLoop()];
  for (let i = 0; i < gpuConcurrency; i += 1) {
    loops.push(startSlotLoop("gpu", i + 1));
  }
  for (let i = 0; i < cpuConcurrency; i += 1) {
    loops.push(startSlotLoop("cpu", i + 1));
  }
  await Promise.allSettled(loops);
}
