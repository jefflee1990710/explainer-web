"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/lib/billing/credits";
import { generationJobsCollection, videosCollection } from "@/lib/collections";
import { runClipVideoJob } from "@/lib/director/jobs";
import { framesWithClip } from "@/lib/higgsfield/frame-prompts";
import { hasJobSince } from "@/lib/higgsfield/job-attempts";
import { clipKeyframeUrls } from "@/lib/higgsfield/clip-keyframes";
import {
  failUnsubmittedFrames,
  regenerateFrames,
  stillBlocker,
} from "@/lib/higgsfield/pipeline";
import { isProductionLike } from "@/lib/project-status";
import {
  FRAME_COST,
  FRAMES_COST,
  STUCK_CLAIM_MS,
  VIDEO_COST,
  planRemaining,
} from "@/lib/production-plan";
import { toPublicVideo, type PublicVideo } from "@/lib/serialize";
import type { Project, ProjectClip } from "@/types/project";

type ProjectResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

type RemainingResult =
  | { ok: true; project: PublicVideo; skipped: number[] }
  | { ok: false; error: string };

function revalidateProject(projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/billing");
}

// Owner check + "storyboard approved" gate shared by every per-clip action.
async function loadProduction(
  projectId: string,
  clerkUserId: string,
): Promise<
  | { ok: true; project: Project & { phaseA: NonNullable<Project["phaseA"]> } }
  | { ok: false; error: string }
> {
  if (!ObjectId.isValid(projectId)) return { ok: false, error: "專案不存在" };
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: new ObjectId(projectId), clerkUserId });
  if (!project?.phaseA) return { ok: false, error: "專案不存在" };
  if (!isProductionLike(project.status)) {
    return { ok: false, error: "請先核准分鏡" };
  }
  return { ok: true, project: project as Project & { phaseA: NonNullable<Project["phaseA"]> } };
}

const IN_FLIGHT = new Set<ProjectClip["status"]>(["queued", "in_progress"]);

// True when a clip was claimed for video long enough ago that its background
// job must be gone, and no video job from that claim ever appeared. Such a clip
// is paid for but frozen, so the user is allowed to claim it again.
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

// Draw (or redraw) both frames of one clip. Cost: FRAMES_COST.
export async function generateClipFramesAction(
  projectId: string,
  clipNumber: number,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;
    const { project } = loaded;
    const projects = await videosCollection();

    const row = project.phaseA.clips.find((clip) => clip.clipNumber === clipNumber);
    if (!row) return { ok: false, error: "找不到這段分鏡" };

    // Redrawing deletes the clip's frame jobs; an in-flight one would be
    // stranded with its credit already spent, so wait for it to settle first.
    if (
      (project.frames || []).some(
        (frame) =>
          frame.clipNumber === clipNumber &&
          (frame.status === "queued" || frame.status === "in_progress"),
      )
    ) {
      return { ok: false, error: "這一段的分鏡圖還在產生中，請稍後再重畫" };
    }

    // Frames need the character lock; this also kicks the still off if missing.
    const blocker = await stillBlocker(project);
    if (blocker) return { ok: false, error: blocker };

    await assertCanSpendCredits(user, FRAMES_COST);
    const spendKey = await consumeCredits(user.clerkUserId, FRAMES_COST);
    const frames = framesWithClip(project, clipNumber);
    try {
      await projects.updateOne(
        { _id: project._id },
        { $set: { frames, status: "production", updatedAt: new Date() } },
      );
    } catch (error) {
      // Write failed before anything went out → give back the full charge.
      await refundCredits(user.clerkUserId, FRAMES_COST, spendKey);
      throw error;
    }

    // Anything older than this belongs to a previous attempt and cannot prove
    // that this one reached the provider.
    const attemptStartedAt = new Date();
    try {
      await regenerateFrames({ ...project, frames }, [
        { clipNumber, position: "start" },
        { clipNumber, position: "end" },
      ]);
    } catch (error) {
      // The two frames go out one at a time, so the first may already have a
      // live job: that one is reconciliation's to finish and refund. Fail and
      // refund only the entries that never reached the provider, otherwise
      // they would sit `queued` with no job behind them.
      const message = error instanceof Error ? error.message : "分鏡圖送出失敗";
      const missed = await failUnsubmittedFrames(
        project._id,
        clipNumber,
        message,
        attemptStartedAt,
      );
      if (missed > 0) {
        await refundCredits(user.clerkUserId, missed * FRAME_COST, spendKey);
      }
      throw error;
    }

    const updated = await projects.findOne({ _id: project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生畫格失敗",
    };
  }
}

// Produce (or reproduce) one clip's video. Cost: VIDEO_COST. Phase B + submit
// run in a background job; the clip is marked `queued` here so the UI flips at once.
export async function generateClipVideoAction(
  projectId: string,
  clipNumber: number,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;
    const { project } = loaded;
    const projects = await videosCollection();

    const row = project.phaseA.clips.find((clip) => clip.clipNumber === clipNumber);
    if (!row) return { ok: false, error: "找不到這段分鏡" };
    const { start, end } = clipKeyframeUrls(project.frames, clipNumber);
    const framesDone = Boolean(start && end);
    if (!framesDone) return { ok: false, error: "這段的畫格還沒完成" };

    await assertCanSpendCredits(user, VIDEO_COST);

    // Atomic claim so a double click can never charge twice: either flip an
    // existing clip that is not in flight, or insert the clip if it has no entry.
    const submittedAt = new Date().toISOString();
    const existing = project.clips.find((clip) => clip.clipNumber === clipNumber);
    // A claim whose background job never started (a lost `after()`) would leave
    // a paid clip `queued` forever with no way back. Re-claiming is allowed once
    // the claim is old and still has no job behind it; the claim below is pinned
    // to that exact `submittedAt`, so it stays the single gate against a double
    // charge.
    const stuck = existing
      ? await isStuckClaim(project._id, clipNumber, existing)
      : false;
    if (existing && !stuck && IN_FLIGHT.has(existing.status)) {
      return { ok: false, error: "這段正在生成中" };
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
              status: "production",
              updatedAt: new Date(),
            },
            $unset: { "clips.$.error": "" },
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
                status: "queued",
                submittedAt,
              },
            },
            $set: { status: "production", updatedAt: new Date() },
          },
        );
    if (!claimed) return { ok: false, error: "這段正在生成中" };

    try {
      await consumeCredits(user.clerkUserId, VIDEO_COST);
    } catch (error) {
      // Charge failed after the claim: release it.
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
      throw error;
    }

    after(() => runClipVideoJob(project._id, clipNumber));

    const updated = await projects.findOne({ _id: project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產片失敗",
    };
  }
}

// "補齊剩餘": frames for clips without them, videos for clips whose frames are
// ready. Each clip is charged and submitted on its own; failures are reported
// as `skipped` and never block the others.
export async function generateRemainingAction(
  projectId: string,
): Promise<RemainingResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;

    const plan = planRemaining(loaded.project);
    if (plan.cost === 0) return { ok: false, error: "沒有需要補齊的段落" };
    // Upfront balance check only; each clip below charges itself.
    await assertCanSpendCredits(user, plan.cost);

    const skipped: number[] = [];
    let firstError = "";
    for (const clipNumber of plan.frames) {
      const result = await generateClipFramesAction(projectId, clipNumber);
      if (!result.ok) {
        skipped.push(clipNumber);
        firstError ||= result.error;
      }
    }
    for (const clipNumber of plan.videos) {
      const result = await generateClipVideoAction(projectId, clipNumber);
      if (!result.ok) {
        skipped.push(clipNumber);
        firstError ||= result.error;
      }
    }
    if (skipped.length === plan.frames.length + plan.videos.length) {
      return { ok: false, error: firstError || "補齊失敗" };
    }

    const projects = await videosCollection();
    const updated = await projects.findOne({ _id: loaded.project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!), skipped };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "補齊失敗",
    };
  }
}
