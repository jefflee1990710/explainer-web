// Polls a running canvas job and settles it when the provider finishes or the wait expires.
// Callers keep importing pollCanvasJobs from "@/service/canvas/executor".

import { ObjectId } from "mongodb";
import { canvasJobsCollection } from "@/dao";
import type { CanvasJob, CanvasOutputKind } from "@/model/canvas";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { markJobCompleted, refundCanvasJobOnce } from "@/service/canvas/job-ledger";
import type { MentalokJobRecord } from "@/service/mentalok/client";
import { OPENROUTER_VIDEOS_URL } from "@/service/openrouter/generate";
import {
  resolveDeps,
  toErrorMessage,
  type CanvasExecutorDeps,
  type PollCanvasJobsInput,
  type PollCanvasJobsResult,
} from "@/service/canvas/jobs/deps";
import { settleCompletedJob, settleFailedJob } from "@/service/canvas/jobs/settle";

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

  if (job.provider === "ffmpeg") {
    if (!job.externalJobId) return job;
    const wt = await resolved.findWorkerTaskStatus(job.externalJobId).catch(() => null);
    if (wt?.status === "failed") {
      return settleFailedJob(job, wt.error || "FFmpeg 處理失敗", resolved);
    }
    return job;
  }

  if (job.provider === "scro") {
    if (
      !job.externalJobId ||
      (job.domainKind !== "video" &&
        job.domainKind !== "jutsu" &&
        job.domainKind !== "teleport" &&
        job.domainKind !== "explainer_frame")
    ) {
      return job;
    }
    const pollRes = await resolved
      .pollScroAsyncJob({
        clerkUserId: job.clerkUserId,
        domainKind: job.domainKind,
        externalJobId: job.externalJobId,
      })
      .catch(() => ({ status: "running" as const }));

    if (pollRes.status === "failed") {
      return settleFailedJob(job, pollRes.error, resolved);
    }
    if (pollRes.status === "completed") {
      if (pollRes.outputUrl.includes(".public.blob.vercel-storage.com/")) {
        const outputKind: CanvasOutputKind = job.outputKind ?? "video";
        return markJobCompleted(
          job,
          { outputUrl: pollRes.outputUrl, outputKind },
          resolved,
        );
      }
      return settleCompletedJob(job, pollRes.outputUrl, resolved);
    }
    return job;
  }

  if (job.provider === "mentalok") {
    if (!job.externalJobId) return job;
    let remote: MentalokJobRecord;
    try {
      remote = await resolved.getMentalokJob(job.externalJobId);
    } catch (error) {
      console.warn("[canvas-executor] transient Mentalok poll error", {
        jobId: job._id.toHexString(),
        error: toErrorMessage(error, "Mentalok poll failed"),
      });
      return job;
    }

    if (remote.status === "completed") {
      if (!remote.outputUrl) {
        return settleFailedJob(
          job,
          "Mentalok 任務已完成但未回傳輸出檔案",
          resolved,
        );
      }
      return settleCompletedJob(job, remote.outputUrl, resolved);
    }

    if (remote.status === "failed") {
      return settleFailedJob(
        job,
        remote.error || "Mentalok 生成失敗",
        resolved,
      );
    }

    return job;
  }

  if (job.provider === "google") {
    if (!job.externalJobId || job.outputKind !== "video") return job;
    let remote: GenerationSubmitResult;
    try {
      remote = await resolved.fetchGoogleStudioVideo(job.externalJobId);
    } catch (error) {
      console.warn("[canvas-executor] transient Google AI Studio poll error", {
        jobId: job._id.toHexString(),
        error: toErrorMessage(error, "Google AI Studio poll failed"),
      });
      return job;
    }
    if (remote.status === "completed") {
      const rawUrl = remote.video?.url;
      if (!rawUrl) return settleFailedJob(job, "Google AI Studio 任務已完成但未回傳影片", resolved);
      return settleCompletedJob(job, rawUrl, resolved);
    }
    if (remote.status === "failed" || remote.status === "nsfw") {
      const defaultMsg =
        remote.status === "nsfw"
          ? "內容觸發安全審核限制，已自動退還 USD Credit"
          : "Google AI Studio 影片生成失敗";
      return settleFailedJob(job, remote.error || defaultMsg, resolved);
    }
    return job;
  }

  if (job.provider === "minimax") {
    if (!job.statusUrl) return job;
    let remote: GenerationSubmitResult;
    try {
      remote = await resolved.fetchMinimaxCanvasVideo(job.statusUrl);
    } catch (error) {
      console.warn("[canvas-executor] transient MiniMax poll error", {
        jobId: job._id.toHexString(),
        error: toErrorMessage(error, "MiniMax poll failed"),
      });
      return job;
    }
    if (remote.status === "completed") {
      const rawUrl = remote.video?.url;
      if (!rawUrl) return settleFailedJob(job, "MiniMax 任務已完成但未回傳影片", resolved);
      return settleCompletedJob(job, rawUrl, resolved);
    }
    if (remote.status === "failed" || remote.status === "nsfw") {
      const defaultMsg =
        remote.status === "nsfw"
          ? "內容觸發安全審核限制，已自動退還 USD Credit"
          : "MiniMax 影片生成失敗";
      return settleFailedJob(job, remote.error || defaultMsg, resolved);
    }
    return job;
  }

  // OpenRouter async video polling.
  const statusUrl =
    job.statusUrl ||
    (job.externalJobId
      ? `${OPENROUTER_VIDEOS_URL}/${encodeURIComponent(job.externalJobId)}`
      : undefined);
  if (!statusUrl) return job;

  let remote: GenerationSubmitResult;
  try {
    remote = await resolved.fetchOpenRouterStatus(statusUrl);
  } catch (error) {
    console.warn("[canvas-executor] transient OpenRouter poll error", {
      jobId: job._id.toHexString(),
      error: toErrorMessage(error, "OpenRouter poll failed"),
    });
    return job;
  }

  if (remote.status === "completed") {
    const rawUrl = remote.video?.url || remote.images?.[0]?.url;
    if (!rawUrl) {
      return settleFailedJob(
        job,
        "OpenRouter 任務已完成但未回傳輸出檔案",
        resolved,
      );
    }
    return settleCompletedJob(job, rawUrl, resolved);
  }

  if (remote.status === "failed" || remote.status === "nsfw") {
    const defaultMsg =
      remote.status === "nsfw"
        ? "內容觸發安全審核限制，已自動退還 USD Credit"
        : "OpenRouter 影片生成失敗";
    return settleFailedJob(job, remote.error || defaultMsg, resolved);
  }

  return job;
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
