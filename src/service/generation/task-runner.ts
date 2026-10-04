import type { Filter, ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";
import { failCharacterVersion } from "@/service/character/sync";
import { syncStylePreviewJob } from "@/service/style/user-style-preview";
import { syncReelCoverJob } from "@/service/video-edit/reel-cover";
import { fetchHiggsfieldStatus, mediaUrlFromResponse } from "@/service/higgsfield/generate";
import {
  jobNeedsRefresh,
  jobNeedsRefreshFilter,
  userFacingJobError,
} from "@/service/higgsfield/job-status";
import {
  applyJobStatus,
  persistImmediateSubmit,
  refreshProjectJobs,
  refundClaimedFailure,
  syncProjectFromJobs,
} from "@/service/higgsfield/pipeline";
import {
  MAX_SUBMIT_ATTEMPTS,
  PROVIDER_TIMEOUT_MS,
  SUBMIT_BATCH,
  providerTimedOut,
  shouldRetrySubmit,
} from "@/service/generation/task-policy";
import { sendJob } from "@/service/generation/task-senders";
import {
  claimFailure,
  claimJobById,
  claimNextJob,
  ensureGenerationJobIndexes,
  markRetry,
  markSubmitted,
} from "@/service/generation/task-store";
import { STUCK_CLAIM_MS } from "@/service/production-plan";
import type { Sent } from "@/service/generation/sent";
import type { GenerationJob } from "@/model/generation-job";

// Projects per refresh run checked for a stale queued clip claim.
const STALE_CLIP_SWEEP_LIMIT = 50;

// `lost`: our lock expired and another runner now owns the job.
type RunOutcome = "sent" | "retried" | "failed" | "lost";

// `after()` entry: claim this job if nobody else has, then send it.
export async function runJobById(id: ObjectId) {
  const job = await claimJobById(id);
  if (job) await runClaimedJob(job);
}

// Send one claimed job; transient errors go back to pending, others fail + refund.
export async function runClaimedJob(job: GenerationJob): Promise<RunOutcome> {
  const fence = { status: "submitting" as const, attempts: job.attempts };
  let sent: Sent;
  try {
    sent = await sendJob(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "送出失敗";
    if (shouldRetrySubmit(error, job.attempts ?? 1)) {
      if (await markRetry(job, message)) return "retried";
      console.warn("[queue] retry skipped, claim lost", { jobId: job._id });
      return "lost";
    }
    if (await failJob(job, message, fence)) return "failed";
    console.warn("[queue] fail skipped, claim lost", { jobId: job._id });
    return "lost";
  }

  if (!(await markSubmitted(job, sent))) {
    console.warn("[queue] submit not recorded, claim lost", {
      jobId: job._id,
      requestId: sent.requestId,
    });
    return "lost";
  }

  // The provider has the request now; errors below must not fail or refund it.
  // The refresh cron / webhook finish whatever is left.
  try {
    if (sent.status === "failed" || sent.status === "nsfw") {
      // The failure claim inside applyJobStatus refunds exactly once.
      await applyJobStatus({ requestId: sent.requestId, status: sent.status, error: sent.error });
    } else {
      // Sync providers return the file on submit; land it now.
      await persistImmediateSubmit(sent);
    }
    if (job.projectId) await syncProjectFromJobs(job.projectId);
  } catch (error) {
    console.error("[queue] post-submit sync failed", { jobId: job._id, error });
  }
  return "sent";
}

// Mark failed and refund exactly once (the status claim is the guard).
export async function failJob(
  job: GenerationJob,
  message: string,
  onlyIf: Filter<GenerationJob> = {},
) {
  const error = userFacingJobError("failed", message);
  const claimed = await claimFailure(job._id, error, "failed", onlyIf);
  if (!claimed) return false;

  if (job.kind === "character") {
    if (job.characterId && job.versionId) {
      await failCharacterVersion(job.characterId, job.versionId, error);
    }
    return true;
  }
  if (job.kind === "stylePreview") {
    await syncStylePreviewJob(job, "failed");
    return true;
  }
  if (job.kind === "reelCover") {
    await syncReelCoverJob(job, "failed");
    return true;
  }
  if (!job.projectId) return true;

  const projects = await videosCollection();
  const project = await projects.findOne({ _id: job.projectId });
  if (project) await refundClaimedFailure(job, project, error);
  await syncProjectFromJobs(job.projectId);
  return true;
}

// Cron 1: send due pending jobs, and fail ones whose runner died on the last attempt.
export async function drainPendingJobs(limit = SUBMIT_BATCH) {
  await ensureGenerationJobIndexes();
  const jobs = await generationJobsCollection();
  const now = new Date();
  // Never claimable again (attempt cap reached), so nothing else would settle them.
  const exhausted = await jobs
    .find({
      status: "submitting",
      lockedUntil: { $lt: now },
      attempts: { $gte: MAX_SUBMIT_ATTEMPTS },
    })
    .limit(limit)
    .toArray();
  let failed = 0;
  for (const job of exhausted) {
    // Fence: a slow runner may still record its submit before we get here.
    const stillStuck = {
      status: "submitting" as const,
      attempts: job.attempts,
      lockedUntil: { $lt: now },
    };
    // One throwing job (e.g. a refund error) must not abort the batch.
    try {
      if (await failJob(job, "送出逾時，credit 已退回", stillStuck)) failed += 1;
    } catch (error) {
      console.error("[queue] exhausted job fail threw", { jobId: job._id, error });
    }
  }

  let sent = 0;
  let retried = 0;
  for (let index = 0; index < limit; index += 1) {
    const job = await claimNextJob();
    if (!job) break;
    try {
      const outcome = await runClaimedJob(job);
      if (outcome === "sent") sent += 1;
      else if (outcome === "retried") retried += 1;
      else if (outcome === "failed") failed += 1;
    } catch (error) {
      // Left `submitting`; the lock expires and the job is retried or failed later.
      console.error("[queue] job run threw", { jobId: job._id, error });
    }
  }
  return { sent, failed, retried };
}

// Cron 2: poll submitted jobs across users, then time out stragglers.
export async function refreshSubmittedJobs() {
  await ensureGenerationJobIndexes();
  const jobs = await generationJobsCollection();
  // Filter before the limit so settled jobs can never crowd out ones still in flight.
  const candidates = await jobs
    .find(jobNeedsRefreshFilter())
    .sort({ updatedAt: 1 })
    .limit(200)
    .toArray();
  const due = candidates.filter(jobNeedsRefresh);

  // Project jobs refresh per project so the project sync runs once each.
  const projectIds = new Map<string, ObjectId>();
  for (const job of due) {
    if (job.projectId) projectIds.set(job.projectId.toHexString(), job.projectId);
  }
  for (const projectId of projectIds.values()) {
    await refreshProjectJobs(projectId).catch((error) =>
      console.error("[queue] project refresh failed", { projectId, error }),
    );
  }
  // Projects with no due job still need a sync when a charged clip claim went
  // stale (e.g. its job was never inserted), so the orphan sweep can refund it.
  const staleClaimCutoff = new Date(Date.now() - STUCK_CLAIM_MS).toISOString();
  const projects = await videosCollection();
  const staleClipProjects = await projects
    .find(
      { clips: { $elemMatch: { status: "queued", submittedAt: { $lt: staleClaimCutoff } } } },
      { projection: { _id: 1 } },
    )
    .sort({ updatedAt: 1 })
    .limit(STALE_CLIP_SWEEP_LIMIT)
    .toArray();
  for (const { _id } of staleClipProjects) {
    if (projectIds.has(_id.toHexString())) continue;
    await syncProjectFromJobs(_id).catch((error) =>
      console.error("[queue] stale clip sweep failed", { projectId: _id, error }),
    );
  }

  for (const job of due.filter((item) => item.kind === "character" || item.kind === "stylePreview" || item.kind === "reelCover")) {
    if (!job.statusUrl || !job.requestId) continue;
    try {
      const remote = await fetchHiggsfieldStatus(job.statusUrl);
      await applyJobStatus({
        requestId: job.requestId,
        status: remote.status,
        outputUrl: mediaUrlFromResponse(remote),
      });
    } catch (error) {
      console.error("[queue] job refresh failed", { jobId: job._id, kind: job.kind, error });
    }
  }

  // Re-read: the refresh above may have just finished some of them.
  const now = Date.now();
  const cutoff = new Date(now - PROVIDER_TIMEOUT_MS);
  const stale = await jobs
    .find({
      status: { $in: ["queued", "in_progress"] },
      $or: [
        { submittedAt: { $lt: cutoff } },
        { submittedAt: { $exists: false }, createdAt: { $lt: cutoff } },
      ],
    })
    .limit(200)
    .toArray();
  let timedOut = 0;
  for (const job of stale) {
    if (!providerTimedOut(job, now)) continue;
    if (await failJob(job, "產生逾時，credit 已退回")) timedOut += 1;
  }
  return { refreshed: due.length, timedOut, staleClipProjects: staleClipProjects.length };
}
