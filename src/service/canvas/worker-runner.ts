// Vast.ai worker runner for one canvas node (`canvas_node`).
// Flow start, stop, and stepping live in flow/run.ts and are re-exported here.

import { ObjectId } from "mongodb";
import { canvasJobsCollection } from "@/dao";
import type { CanvasJob } from "@/model/canvas";
import {
  dispatchQueuedCanvasJobById,
  pollSingleCanvasJobById,
} from "@/service/canvas/executor";
import { executeCanvasFfmpegJob } from "@/service/canvas/ffmpeg-ops";
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

export type { CanvasFlowWorkerDeps } from "@/service/canvas/flow/run";
export {
  busyUpstreamModelIds,
  executeCanvasFlowTask,
  filterFlowWaves,
  startCanvasFlowRun,
  startCanvasNodeAfterUpstream,
  stopCanvasFlowRun,
} from "@/service/canvas/flow/run";
