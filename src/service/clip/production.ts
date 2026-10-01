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
import {
  enqueueClipFrameJobs,
  failUnsubmittedFrames,
  stillBlocker,
} from "@/service/higgsfield/pipeline";
import { isProductionLike } from "@/service/project-status";
import {
  clipVideoCost,
  FRAME_COST,
  planGenerateAllClips,
  planGenerateAllScenes,
  planRemaining,
  planSelected,
  sceneImageCost,
} from "@/service/production-plan";
import { isInheritedTalkingHeadStart, talkingHeadFramesCost } from "@/service/director/talking-head";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import type { Project } from "@/model/project";

// Enqueue-only: the editor already flipped the clip; poll fills the rest.
type EnqueueResult = { ok: true } | { ok: false; error: string };

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
): Promise<EnqueueResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;
    const { project } = loaded;

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

    const frameCost = talkingHeadFramesCost(project.skillSlug, clipNumber);
    await assertCanSpendCredits(user, frameCost);
    const spendKey = await consumeCredits(user.clerkUserId, frameCost);

    // Anything older than this belongs to a previous attempt and cannot prove
    // that this one reached the provider.
    const attemptStartedAt = new Date();
    try {
      // One frames write + one jobs insert: start goes out now, end is queued
      // as its own task and released when the start file lands.
      await enqueueClipFrameJobs(project, [clipNumber]);
    } catch (error) {
      // Refund whatever never got a job (a frame with no job would sit
      // `queued` forever); a frame that did get one is reconciliation's.
      const message = error instanceof Error ? error.message : "分鏡圖送出失敗";
      const inherited = isInheritedTalkingHeadStart(project.skillSlug, clipNumber, "start");
      const missed = await failUnsubmittedFrames(
        project._id,
        clipNumber,
        message,
        attemptStartedAt,
        inherited ? ["start"] : [],
      );
      if (missed > 0) {
        await refundCredits(user.clerkUserId, missed * FRAME_COST, spendKey);
      }
      throw error;
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生畫格失敗",
    };
  }
}

// Produce (or reproduce) one clip's video. Cost: clipVideoCost (per second). Phase B + submit
// run in a background job; the clip is marked `queued` here so the UI flips at once.
export async function generateClipVideoAction(
  projectId: string,
  clipNumber: number,
): Promise<EnqueueResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;
    const { project } = loaded;

    const row = project.phaseA.clips.find((clip) => clip.clipNumber === clipNumber);
    if (!row) return { ok: false, error: "找不到這段分鏡" };

    await assertCanSpendCredits(user, clipVideoCost(project, clipNumber));
    const started = await claimAndStartClipVideo(user.clerkUserId, project, clipNumber);
    if (!started.ok) return { ok: false, error: started.error };

    return { ok: true };
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

// Filmstrip multi-select: frames or videos for the checked clips only. Each
// clip charges itself; ineligible or failed clips come back as `skipped`.
export async function generateSelectedClipsAction(
  projectId: string,
  clipNumbers: number[],
  kind: "frames" | "videos",
): Promise<RemainingResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;

    // Client input: keep unique integer clip numbers only.
    const picks = Array.isArray(clipNumbers)
      ? [...new Set(clipNumbers.filter((n) => Number.isInteger(n)))]
      : [];
    if (kind !== "frames" && kind !== "videos") return { ok: false, error: "未知的產生類型" };
    const plan = planSelected(loaded.project, picks, kind);
    const targets = kind === "frames" ? plan.frames : plan.videos;
    if (targets.length === 0) {
      return {
        ok: false,
        error: kind === "frames" ? "選取的段落都在產生中" : "選取的段落都還沒有完成的畫格",
      };
    }
    await assertCanSpendCredits(user, plan.cost);

    const skipped = picks.filter((clipNumber) => !targets.includes(clipNumber));
    let firstError = "";
    for (const clipNumber of targets) {
      const result =
        kind === "frames"
          ? await generateClipFramesAction(projectId, clipNumber)
          : await generateClipVideoAction(projectId, clipNumber);
      if (!result.ok) {
        skipped.push(clipNumber);
        firstError ||= result.error;
      }
    }
    if (skipped.length === picks.length) {
      return { ok: false, error: firstError || "產生失敗" };
    }

    const projects = await videosCollection();
    const updated = await projects.findOne({ _id: loaded.project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!), skipped };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生失敗",
    };
  }
}

// Draw both scene images for every clip that is not already drawing.
// Inserts the jobs and returns; provider work runs in the queue.
export async function generateAllSceneImagesAction(
  projectId: string,
): Promise<EnqueueResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;

    const plan = planGenerateAllScenes(loaded.project);
    if (plan.cost === 0) return { ok: false, error: "沒有可產生的分鏡圖" };
    const blocker = await stillBlocker(loaded.project);
    if (blocker) return { ok: false, error: blocker };
    await assertCanSpendCredits(user, plan.cost);
    const spendKey = await consumeCredits(user.clerkUserId, plan.cost);
    try {
      await enqueueClipFrameJobs(loaded.project, plan.frames);
    } catch (error) {
      await refundCredits(user.clerkUserId, plan.cost, spendKey);
      throw error;
    }
    return { ok: true };
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
): Promise<EnqueueResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;

    const plan = planGenerateAllClips(loaded.project);
    if (plan.cost === 0) return { ok: false, error: "沒有可產生的段落" };
    const blocker = await stillBlocker(loaded.project);
    if (blocker) return { ok: false, error: blocker };
    await assertCanSpendCredits(user, plan.cost);
    const frameCost = sceneImageCost(loaded.project, plan.frames);
    if (frameCost > 0) {
      const spendKey = await consumeCredits(user.clerkUserId, frameCost);
      try {
        await enqueueClipFrameJobs(loaded.project, plan.frames);
      } catch (error) {
        await refundCredits(user.clerkUserId, frameCost, spendKey);
        throw error;
      }
    }

    const projects = await videosCollection();
    await projects.updateOne(
      { _id: loaded.project._id },
      { $set: { autoVideoClips: plan.videos, updatedAt: new Date() } },
    );
    await queueAutoClipVideos(loaded.project._id);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生影片失敗",
    };
  }
}
