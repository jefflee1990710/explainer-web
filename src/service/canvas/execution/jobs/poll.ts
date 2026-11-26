// Polls a running canvas job and settles it when the provider finishes or the wait expires.
// Callers keep importing pollCanvasJobs from "@/service/canvas/execution/executor".
// Provider-specific status reads live in execution/providers/.

import { ObjectId } from "mongodb";
import { canvasJobsCollection } from "@/dao";
import type { CanvasJob } from "@/model/canvas";
import { refundCanvasJobOnce } from "@/service/canvas/execution/job-ledger";
import {
  resolveDeps,
  type CanvasExecutorDeps,
  type PollCanvasJobsInput,
  type PollCanvasJobsResult,
} from "@/service/canvas/execution/jobs/deps";
import { settleFailedJob } from "@/service/canvas/execution/jobs/settle";
import { pollAdapterFor } from "@/service/canvas/execution/providers";

// Maximum wall-clock wait for an async Canvas job before failing & refunding.
export const CANVAS_ASYNC_JOB_TIMEOUT_MS = 30 * 60 * 1000;
export const CANVAS_IMAGE_JOB_TIMEOUT_MS = 15 * 60 * 1000;

export function isCanvasJobTimedOut(job: Pick<CanvasJob, "status" | "outputKind" | "provider" | "createdAt">, nowMs: number): boolean {
  if (job.status !== "queued" && job.status !== "running") return false;
  const createdMs = job.createdAt instanceof Date ? job.createdAt.getTime() : Number.NaN;
  if (!Number.isFinite(createdMs)) return false;
  const limit =
    job.outputKind === "video" || job.provider === "scro" || job.provider === "ffmpeg"
      ? CANVAS_ASYNC_JOB_TIMEOUT_MS
      : CANVAS_IMAGE_JOB_TIMEOUT_MS;
  return nowMs - createdMs >= limit;
}

async function pollSingleCanvasJob(
  job: CanvasJob,
  resolved: CanvasExecutorDeps,
): Promise<CanvasJob> {
  if (job.status === "completed") {
    return job;
  }
  if (job.status === "failed") {
    // Ensure a failed job is refunded at most once even if a prior failure crashed mid-settlement.
    if (!job.refundedAt) {
      await refundCanvasJobOnce(job._id, job.clerkUserId, resolved);
    }
    return job;
  }

  if (isCanvasJobTimedOut(job, resolved.now().getTime())) {
    return settleFailedJob(job, "模型執行逾時，USD Credit 已自動退還", resolved);
  }

  return pollAdapterFor(job.provider).poll(job, resolved);
}

export async function pollSingleCanvasJobById(
  jobId: ObjectId,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<CanvasJob | null> {
  const resolved = resolveDeps(deps);
  const job = resolved.findCanvasJobById
    ? await resolved.findCanvasJobById(jobId)
    : await (await canvasJobsCollection()).findOne({ _id: jobId });
  if (!job) return null;
  return pollSingleCanvasJob(job, resolved);
}

// Polls active Mentalok, OpenRouter, Scro, and FFmpeg jobs for a canvas project in parallel,
// copying completed outputs into permanent Vercel Blob storage and issuing
// idempotent single refunds on provider failures.
export async function pollCanvasJobs(
  input: PollCanvasJobsInput,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<PollCanvasJobsResult> {
  const resolved = resolveDeps(deps);
  if (!ObjectId.isValid(input.canvasId)) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return { jobs: [], creditUsd };
  }

  const uniqueJobIds: ObjectId[] = [];
  const seen = new Set<string>();
  for (const rawId of input.jobIds) {
    const trimmed = rawId.trim();
    if (!trimmed || seen.has(trimmed) || !ObjectId.isValid(trimmed)) continue;
    seen.add(trimmed);
    uniqueJobIds.push(new ObjectId(trimmed));
  }

  if (uniqueJobIds.length === 0) {
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return { jobs: [], creditUsd };
  }

  const canvasObjectId = new ObjectId(input.canvasId);
  const existingJobs = await resolved.findCanvasJobsByIds(
    canvasObjectId,
    input.clerkUserId,
    uniqueJobIds,
  );

  const updatedJobs = await Promise.all(
    existingJobs.map((job) => pollSingleCanvasJob(job, resolved)),
  );

  const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
  return { jobs: updatedJobs, creditUsd };
}
