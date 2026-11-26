// $0.00 Vast.ai Worker FFmpeg nodes (`ffmpeg:*`): queued as a `canvas_ffmpeg` worker task.
// The worker settles success itself; polling only notices a failed worker task.

import { settleFailedJob } from "@/service/canvas/execution/jobs/settle";
import { runningResult } from "@/service/canvas/execution/providers/shared";
import type { CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";

export const ffmpegProvider: CanvasProviderAdapter = {
  provider: "ffmpeg",
  presetFromCatalog: true,
  dispatch: async (ctx) => {
    const workerTaskId = await ctx.resolved.enqueueFfmpegWorkerTask({
      jobIdHex: ctx.jobIdHex,
      modelId: ctx.spec.id,
      clerkUserId: ctx.clerkUserId,
    });
    return runningResult(ctx, {
      domainKind: "worker_ffmpeg",
      externalJobId: workerTaskId.toHexString(),
    });
  },
  poll: async (job, resolved) => {
    if (!job.externalJobId) return job;
    const wt = await resolved.findWorkerTaskStatus(job.externalJobId).catch(() => null);
    if (wt?.status === "failed") {
      return settleFailedJob(job, wt.error || "FFmpeg 處理失敗", resolved);
    }
    return job;
  },
};
