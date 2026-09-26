import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/service/billing/credits";
import { videosCollection } from "@/dao";
import { claimAndStartClipVideo, queueAutoClipVideos } from "@/service/clip/auto-video";
import { framesWithClip } from "@/service/higgsfield/frame-prompts";
import { planFrameSubmissions } from "@/service/higgsfield/clip-keyframes";
import {
  failUnsubmittedFrames,
  regenerateFrames,
  stillBlocker,
} from "@/service/higgsfield/pipeline";
import { isProductionLike } from "@/service/project-status";
import {
  FRAME_COST,
  FRAMES_COST,
  VIDEO_COST,
  planGenerateAllClips,
  planGenerateAllScenes,
  planRemaining,
} from "@/service/production-plan";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import type { Project } from "@/model/project";

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
    return { ok: false, error: "分鏡尚未完成" };
  }
  return { ok: true, project: project as Project & { phaseA: NonNullable<Project["phaseA"]> } };
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
    const targets = [
      { clipNumber, position: "start" as const },
      { clipNumber, position: "end" as const },
    ];
    const { deferred } = planFrameSubmissions(targets, frames);
    try {
      await regenerateFrames({ ...project, frames }, targets);
    } catch (error) {
      // The two frames go out one at a time, so the first may already have a
      // live job: that one is reconciliation's to finish and refund. Fail and
      // refund only the entries that never reached the provider, otherwise
      // they would sit `queued` with no job behind them. A deferred end stays
      // queued only when the start job exists; if the start never went out,
      // the end is failed and refunded too.
      const message = error instanceof Error ? error.message : "分鏡圖送出失敗";
      const missed = await failUnsubmittedFrames(
        project._id,
        clipNumber,
        message,
        attemptStartedAt,
        deferred.map((target) => target.position),
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

    await assertCanSpendCredits(user, VIDEO_COST);
    const started = await claimAndStartClipVideo(user.clerkUserId, project, clipNumber);
    if (!started.ok) return { ok: false, error: started.error };

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

async function submitSceneImages(
  projectId: string,
  clipNumbers: number[],
) {
  const skipped: number[] = [];
  let firstError = "";
  const submitted: number[] = [];
  for (const clipNumber of clipNumbers) {
    const result = await generateClipFramesAction(projectId, clipNumber);
    if (!result.ok) {
      skipped.push(clipNumber);
      firstError ||= result.error;
    } else {
      submitted.push(clipNumber);
    }
  }
  return { skipped, firstError, submitted };
}

// Draw both scene images for every clip that is not already drawing.
export async function generateAllSceneImagesAction(
  projectId: string,
): Promise<RemainingResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;

    const plan = planGenerateAllScenes(loaded.project);
    if (plan.cost === 0) return { ok: false, error: "沒有可產生的分鏡圖" };
    await assertCanSpendCredits(user, plan.cost);

    const { skipped, firstError } = await submitSceneImages(projectId, plan.frames);
    if (skipped.length === plan.frames.length) {
      return { ok: false, error: firstError || "產生分鏡圖失敗" };
    }

    const projects = await videosCollection();
    const updated = await projects.findOne({ _id: loaded.project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!), skipped };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生分鏡圖失敗",
    };
  }
}

// Draw every scene image, then start each clip video once both stills exist.
export async function generateAllClipsAction(
  projectId: string,
): Promise<RemainingResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;

    const plan = planGenerateAllClips(loaded.project);
    if (plan.cost === 0) return { ok: false, error: "沒有可產生的段落" };
    await assertCanSpendCredits(user, plan.cost);

    const { skipped, firstError, submitted } = await submitSceneImages(
      projectId,
      plan.frames,
    );
    // Videos follow the clips we actually queued, plus clips already drawing
    // (their stills will unlock the video). Failed submits stay off the list.
    const autoVideoClips = plan.videos.filter(
      (clipNumber) => submitted.includes(clipNumber) || !plan.frames.includes(clipNumber),
    );
    if (submitted.length === 0 && autoVideoClips.length === 0) {
      return { ok: false, error: firstError || "產生失敗" };
    }

    const projects = await videosCollection();
    await projects.updateOne(
      { _id: loaded.project._id },
      { $set: { autoVideoClips, updatedAt: new Date() } },
    );
    await queueAutoClipVideos(loaded.project._id);

    const updated = await projects.findOne({ _id: loaded.project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!), skipped };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生影片失敗",
    };
  }
}
