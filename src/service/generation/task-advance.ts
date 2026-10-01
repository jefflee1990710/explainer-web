import { charactersCollection, generationJobsCollection, videosCollection } from "@/dao";
import { mediaUrlFromResponse, fetchHiggsfieldStatus } from "@/service/higgsfield/generate";
import { applyJobStatus, refreshProjectJobs } from "@/service/higgsfield/pipeline";
import { failJob, runJobById } from "@/service/generation/task-runner";
import { MAX_SUBMIT_ATTEMPTS, PROVIDER_TIMEOUT_MS, providerTimedOut } from "@/service/generation/task-policy";
import { recoverStaleReel } from "@/service/reel/enqueue";
import type { GenerationJob } from "@/model/generation-job";

// One poll should not submit a pile of images.
const SEND_LIMIT = 2;
const REFRESH_LIMIT = 8;

// Pending and due, or a send whose runner died and left an expired lock.
export function jobNeedsResend(
  job: Pick<GenerationJob, "status" | "attempts" | "nextAttemptAt" | "lockedUntil">,
  now: number,
) {
  if ((job.attempts ?? 0) >= MAX_SUBMIT_ATTEMPTS) return false;
  if (job.status === "pending") {
    return !job.nextAttemptAt || job.nextAttemptAt.getTime() <= now;
  }
  if (job.status === "submitting") {
    return Boolean(job.lockedUntil && job.lockedUntil.getTime() < now);
  }
  return false;
}

// The task list used to re-read Mongo only. Pull provider results, resend
// jobs whose runner died, and time out ones the provider never finished.
export async function advanceOwnedJobs(clerkUserId: string) {
  const videos = await videosCollection();
  // Reel concat is local ffmpeg, not a generation job. Retry ones whose worker died.
  const busyReels = await videos
    .find({ clerkUserId, reelStatus: { $in: ["queued", "in_progress"] } })
    .limit(20)
    .toArray();
  for (const video of busyReels) {
    await recoverStaleReel(video).catch((error) => {
      console.error("[reel] recover failed", { videoId: video._id.toHexString(), error });
    });
  }

  const videoDocs = await videos
    .find({ clerkUserId }, { projection: { _id: 1 } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  const characters = await (
    await charactersCollection()
  )
    .find({ clerkUserId }, { projection: { _id: 1 } })
    .limit(200)
    .toArray();
  const projectIds = videoDocs.map((doc) => doc._id);
  const characterIds = characters.map((doc) => doc._id);
  if (projectIds.length === 0 && characterIds.length === 0) return;

  const owners: Array<Record<string, unknown>> = [];
  if (projectIds.length) owners.push({ projectId: { $in: projectIds } });
  if (characterIds.length) owners.push({ characterId: { $in: characterIds } });

  const jobs = await generationJobsCollection();
  const active = await jobs
    .find({
      $and: [
        owners.length === 1 ? owners[0]! : { $or: owners },
        { status: { $in: ["pending", "submitting", "queued", "in_progress"] } },
      ],
    })
    .sort({ updatedAt: 1 })
    .limit(30)
    .toArray();
  if (active.length === 0) return;

  const refreshed = new Set<string>();
  for (const job of active) {
    if (refreshed.size >= REFRESH_LIMIT) break;
    if (!job.projectId) continue;
    if (job.status !== "queued" && job.status !== "in_progress") continue;
    if (!job.statusUrl) continue;
    const key = job.projectId.toHexString();
    if (refreshed.has(key)) continue;
    refreshed.add(key);
    await refreshProjectJobs(job.projectId);
  }

  for (const job of active) {
    if (job.kind !== "character") continue;
    if (!job.statusUrl || !job.requestId) continue;
    if (job.status !== "queued" && job.status !== "in_progress") continue;
    try {
      const remote = await fetchHiggsfieldStatus(job.statusUrl);
      await applyJobStatus({
        requestId: job.requestId,
        status: remote.status,
        outputUrl: mediaUrlFromResponse(remote),
      });
    } catch (error) {
      console.error("[tasks] character refresh failed", { jobId: job._id, error });
    }
  }

  const now = Date.now();
  let sent = 0;
  for (const job of active) {
    if (sent >= SEND_LIMIT) break;
    if (!jobNeedsResend(job, now)) continue;
    await runJobById(job._id);
    sent += 1;
  }

  const cutoff = new Date(now - PROVIDER_TIMEOUT_MS);
  const stale = await jobs
    .find({
      $and: [
        owners.length === 1 ? owners[0]! : { $or: owners },
        { status: { $in: ["queued", "in_progress"] } },
        {
          $or: [
            { submittedAt: { $lt: cutoff } },
            { submittedAt: { $exists: false }, createdAt: { $lt: cutoff } },
          ],
        },
      ],
    })
    .limit(20)
    .toArray();
  for (const job of stale) {
    if (!providerTimedOut(job, now)) continue;
    await failJob(job, "產生逾時，credit 已退回");
  }
}
