import type { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";
import { consumeCredits, refundCredits } from "@/service/billing/credits";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { settledAutoVideoClips } from "@/service/clip/auto-video-list";
import { hasJobSince } from "@/service/higgsfield/job-attempts";
import { clipKeyframeUrls } from "@/service/higgsfield/clip-keyframes";
import { autoVideoDecision } from "@/service/production-plan";
import { chargedVideoCredits, STUCK_CLAIM_MS, videoCost } from "@/service/production-plan";
import type { Project, ProjectClip } from "@/model/project";

const IN_FLIGHT = new Set<ProjectClip["status"]>(["queued", "in_progress"]);

type StartResult = { ok: true } | { ok: false; error: string; retry?: boolean };

async function isStuckClaim(
  projectId: ObjectId,
  clipNumber: number,
  clip: ProjectClip,
): Promise<boolean> {
  if (clip.status !== "queued" || !clip.submittedAt) return false;
  const claimedAt = Date.parse(clip.submittedAt);
  if (Number.isNaN(claimedAt) || Date.now() - claimedAt <= STUCK_CLAIM_MS) return false;
  const jobs = await generationJobsCollection();
  const videoJobs = await jobs
    .find({ projectId, kind: "video", clipIndex: clipNumber - 1 })
    .toArray();
  return !hasJobSince(videoJobs, new Date(claimedAt));
}

// Claim one clip, charge it and queue its video job (Phase B runs at send time).
// Caller already checked the storyboard exists.
// Video starts only when both scene images have files.
export async function claimAndStartClipVideo(
  clerkUserId: string,
  project: Project,
  clipNumber: number,
): Promise<StartResult> {
  const projects = await videosCollection();
  const row = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber);
  if (!row) return { ok: false, error: "找不到這段分鏡" };
  const { start, end } = clipKeyframeUrls(project.frames, clipNumber);
  if (!start || !end) return { ok: false, error: "這段的畫格還沒完成", retry: true };

  const submittedAt = new Date().toISOString();
  // Billed per second of the storyboard duration; stored on the clip for refunds.
  const cost = videoCost(row.durationSeconds, project.styleId);
  const existing = project.clips.find((clip) => clip.clipNumber === clipNumber);
  const stuck = existing ? await isStuckClaim(project._id, clipNumber, existing) : false;
  if (existing && !stuck && IN_FLIGHT.has(existing.status)) {
    return { ok: false, error: "這段正在生成中", retry: true };
  }

  const claimed = existing
    ? await projects.findOneAndUpdate(
        {
          _id: project._id,
          clips: {
            $elemMatch: stuck
              ? { clipNumber, status: "queued", submittedAt: existing.submittedAt }
              : { clipNumber, status: { $nin: ["queued", "in_progress"] } },
          },
        },
        {
          $set: {
            "clips.$.status": "queued",
            "clips.$.submittedAt": submittedAt,
            "clips.$.durationSeconds": row.durationSeconds,
            "clips.$.creditsCharged": cost,
            // Empty prompt makes the sender run Phase B for this attempt.
            "clips.$.prompt": "",
            status: "production",
            updatedAt: new Date(),
          },
          $unset: {
            "clips.$.error": "",
            "clips.$.blobUrl": "",
            "clips.$.outputUrl": "",
          },
        },
      )
    : await projects.findOneAndUpdate(
        { _id: project._id, "clips.clipNumber": { $ne: clipNumber } },
        {
          $push: {
            clips: {
              clipNumber,
              durationSeconds: row.durationSeconds,
              prompt: "",
              status: "queued" as const,
              submittedAt,
              creditsCharged: cost,
            },
          },
          $set: { status: "production", updatedAt: new Date() },
        },
      );
  if (!claimed) return { ok: false, error: "這段正在生成中", retry: true };
  // Taking over a stuck claim settles it: its charge had no job, so hand it back.
  if (stuck) await refundCredits(clerkUserId, chargedVideoCredits(existing));

  try {
    await consumeCredits(clerkUserId, cost);
  } catch (error) {
    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          "clips.$[clip].status": "failed",
          "clips.$[clip].error": error instanceof Error ? error.message : "扣款失敗",
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
    );
    return {
      ok: false,
      error: error instanceof Error ? error.message : "扣款失敗",
    };
  }

  try {
    // Old video jobs would outrank the new claim in reconcile; replace them.
    const jobs = await generationJobsCollection();
    await jobs.deleteMany({ projectId: project._id, kind: "video", clipIndex: clipNumber - 1 });
    const id = await insertPendingJob({
      projectId: project._id,
      clipIndex: clipNumber - 1,
      kind: "video",
    });
    kickJob(id);
  } catch (error) {
    // No job owns the charge: refund it here.
    const message = error instanceof Error ? error.message : "產片排程失敗";
    await compensateClipVideo(project, clipNumber, message, cost);
    return { ok: false, error: message };
  }
  return { ok: true };
}

// Hand the credit back and mark the clip failed. For exits that leave the clip
// with no job to own its outcome, so a charged clip is never stranded `queued`.
async function compensateClipVideo(
  project: Project,
  clipNumber: number,
  message: string,
  cost: number,
) {
  await refundCredits(project.clerkUserId, cost);
  const projects = await videosCollection();
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        "clips.$[clip].status": "failed",
        "clips.$[clip].error": message,
        updatedAt: new Date(),
      },
    },
    { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
  );
}

// Start videos for clips flagged by "產生全部影片", once both stills exist.
export async function queueAutoClipVideos(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  const pending = project?.autoVideoClips;
  if (!project || !pending?.length) return;

  const remaining: number[] = [];
  for (const clipNumber of pending) {
    const decision = autoVideoDecision(project.frames, project.clips, clipNumber);
    if (decision === "wait") {
      remaining.push(clipNumber);
      continue;
    }
    if (decision !== "start") continue;

    const fresh = await projects.findOne({ _id: projectId });
    if (!fresh) return;
    const started = await claimAndStartClipVideo(fresh.clerkUserId, fresh, clipNumber);
    if (!started.ok && started.retry) remaining.push(clipNumber);
  }

  const settled = settledAutoVideoClips(pending, remaining);
  if (settled.length === 0) return;
  await projects.updateOne(
    { _id: projectId },
    { $pull: { autoVideoClips: { $in: settled } }, $set: { updatedAt: new Date() } },
  );
}
