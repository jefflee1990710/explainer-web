// Writes a finished canvas job to Blob, or fails it and refunds once.
// Submit and poll share these so a provider error cannot charge twice.

import type { CanvasJob, CanvasOutputKind } from "@/model/canvas";
import { markJobCompleted, markJobFailed } from "@/service/canvas/execution/job-ledger";
import {
  buildCanvasBlobPathname,
  toErrorMessage,
  type CanvasExecutorDeps,
} from "@/service/canvas/execution/jobs/deps";

export async function settleCompletedJob(
  job: CanvasJob,
  rawOutputUrl: string,
  resolved: CanvasExecutorDeps,
): Promise<CanvasJob> {
  const outputKind: CanvasOutputKind = job.outputKind ?? "image";
  const jobIdHex = job._id.toHexString();
  const blobPath = buildCanvasBlobPathname(
    job.clerkUserId,
    jobIdHex,
    outputKind,
    rawOutputUrl,
  );

  // Persist to Vercel Blob BEFORE marking completed; transient Blob errors
  // leave the job `running` so the next poll retries without double-charging.
  let permanentUrl: string;
  try {
    permanentUrl = await resolved.persistMedia(rawOutputUrl, blobPath);
  } catch (error) {
    console.warn("[canvas-executor] transient persistMedia failure; will retry on next poll", {
      jobId: jobIdHex,
      error: toErrorMessage(error, "persistMedia failed"),
    });
    return job;
  }

  return markJobCompleted(job, { outputUrl: permanentUrl, outputKind }, resolved);
}

export async function settleFailedJob(
  job: CanvasJob,
  errorMessage: string,
  resolved: CanvasExecutorDeps,
): Promise<CanvasJob> {
  return markJobFailed(job, errorMessage, resolved);
}
