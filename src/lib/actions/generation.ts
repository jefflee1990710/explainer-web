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
import { videosCollection } from "@/lib/collections";
import { runStillJob } from "@/lib/director/jobs";
import { persistFrameAnnotation } from "@/lib/higgsfield/frame-annotation";
import { buildFramePrompt, framesWithClip } from "@/lib/higgsfield/frame-prompts";
import {
  failUnsubmittedFrames,
  refreshProjectJobs,
  regenerateFrame,
  regenerateFrames,
  stillBlocker,
} from "@/lib/higgsfield/pipeline";
import { isProductionLike } from "@/lib/project-status";
import { FRAME_COST, FRAMES_COST } from "@/lib/production-plan";
import { toPublicVideo, type PublicVideo } from "@/lib/serialize";
import type {
  ClipFrame,
  ClipStoryboardInput,
  FramePosition,
  FrameRevision,
  FrameRevisionInput,
} from "@/types/project";

type ProjectResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

// Director remarks are appended to the image prompt; keep them short.
const MAX_REMARK_LENGTH = 600;

function revalidateProject(projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/billing");
}

// Storyboard approved → enter per-clip production (free).
export async function approveStoryboardAction(
  projectId: string,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "尚未有可核准的分鏡" };
    if (project.status !== "awaiting_approval") {
      return { ok: false, error: "這個專案目前不能產生分鏡圖" };
    }

    // Approval is free: it opens per-clip production. Frames and videos are
    // charged when each clip is generated.
    await projects.updateOne(
      { _id: project._id },
      {
        $set: { status: "production", error: undefined, updatedAt: new Date() },
        $unset: { stillError: "" },
      },
    );
    // Projects without a cast lock the character with a still; start it now so
    // it is usually ready before the first frame request.
    after(() => runStillJob(project._id));

    const updated = await projects.findOne({ _id: project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生分鏡圖失敗",
    };
  }
}

// Redo a single frame for 1 credit while reviewing the timeline. The optional
// revision (director's remark + hand-drawn sketch over the current frame)
// steers the redo: the sketch is burned onto the frame, stored in Blob, and
// sent as the first reference image.
export async function regenerateFrameAction(
  projectId: string,
  clipNumber: number,
  position: FramePosition,
  revisionInput?: FrameRevisionInput,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }
    if (position !== "start" && position !== "end") {
      return { ok: false, error: "無效的分鏡圖位置" };
    }

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) {
      return { ok: false, error: "請先核准分鏡" };
    }
    const frame = project.frames?.find(
      (item) => item.clipNumber === clipNumber && item.position === position,
    );
    if (!frame) return { ok: false, error: "找不到這張分鏡圖" };
    // A redo deletes the frame's current job, which would strand the credit
    // already spent on it; make the user wait for it to settle instead.
    if (frame.status === "queued" || frame.status === "in_progress") {
      return { ok: false, error: "這張分鏡圖還在產生中，請稍後再重畫" };
    }

    // Build the revision before charging so an upload failure costs nothing.
    const remark = revisionInput?.remark?.trim().slice(0, MAX_REMARK_LENGTH);
    let revision: FrameRevision | undefined;
    if (revisionInput?.sketchDataUrl) {
      const baseImageUrl = frame.blobUrl || frame.outputUrl;
      if (frame.status !== "completed" || !baseImageUrl) {
        return { ok: false, error: "這張分鏡圖還沒有可標註的圖片" };
      }
      const annotatedUrl = await persistFrameAnnotation({
        projectId: project._id,
        clipNumber,
        position,
        baseImageUrl,
        sketchDataUrl: revisionInput.sketchDataUrl,
      });
      revision = { remark: remark || undefined, annotatedUrl };
    } else if (remark) {
      revision = { remark };
    }

    await assertCanSpendCredits(user, FRAME_COST);
    await consumeCredits(user.clerkUserId, FRAME_COST);
    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          updatedAt: new Date(),
          // Keep the prompt/revision actually used on the frame for later review.
          "frames.$[frame].prompt": buildFramePrompt(project, clipNumber, position, {
            revision,
          }),
          ...(revision
            ? { "frames.$[frame].revision": revision }
            : {}),
        },
        ...(revision ? {} : { $unset: { "frames.$[frame].revision": "" } }),
      },
      {
        arrayFilters: [{ "frame.clipNumber": clipNumber, "frame.position": position }],
      },
    );

    // Submission is a single fast request; run inline so the frame shows
    // in-progress feedback immediately.
    try {
      await regenerateFrame(project, clipNumber, position, revision);
    } catch (error) {
      // Nothing went out: give the credit back.
      await refundCredits(user.clerkUserId, FRAME_COST);
      throw error;
    }

    const updated = await projects.findOne({ _id: project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "重新產生分鏡圖失敗",
    };
  }
}

// Storyboard text feeds the image prompts; cap each field.
const MAX_STORYBOARD_FIELD_LENGTH = 1200;

function cleanField(value: unknown) {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_STORYBOARD_FIELD_LENGTH)
    : "";
}

// Rewrite one clip's storyboard while reviewing frames (free). With
// `regenerate`, that clip's start + end frames are redrawn from the new text
// (1 credit each). The previous clip's end-frame prompt is refreshed too since
// it hands off to this clip's scene, but it is not redrawn automatically.
export async function updateClipStoryboardAction(
  projectId: string,
  clipNumber: number,
  input: ClipStoryboardInput,
  options?: { regenerate?: boolean },
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }

    const clean: ClipStoryboardInput = {
      explainerScene: cleanField(input?.explainerScene),
      motionCamera: cleanField(input?.motionCamera),
      englishVo: cleanField(input?.englishVo),
    };
    if (!clean.explainerScene) return { ok: false, error: "畫面描述不能空白" };
    if (!clean.englishVo) return { ok: false, error: "旁白不能空白" };

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) {
      return { ok: false, error: "請先核准分鏡" };
    }
    const clipIndex = project.phaseA.clips.findIndex(
      (clip) => clip.clipNumber === clipNumber,
    );
    if (clipIndex < 0) return { ok: false, error: "找不到這段分鏡" };

    const regenerate = options?.regenerate === true;
    // Same as a single redo: regenerating would delete in-flight frame jobs
    // whose credits are already spent, so wait for them to settle first.
    if (
      regenerate &&
      (project.frames || []).some(
        (frame) =>
          frame.clipNumber === clipNumber &&
          (frame.status === "queued" || frame.status === "in_progress"),
      )
    ) {
      return { ok: false, error: "這一段的分鏡圖還在產生中，請稍後再重畫" };
    }

    const cost = regenerate ? FRAMES_COST : 0;
    if (regenerate) await assertCanSpendCredits(user, cost);

    // Apply the edit in memory first so frame prompts are rebuilt from the new text.
    const editedAt = new Date().toISOString();
    const clips = project.phaseA.clips.map((clip, index) =>
      index === clipIndex ? { ...clip, ...clean, editedAt } : clip,
    );
    const nextProject = { ...project, phaseA: { ...project.phaseA, clips } };

    // Frames need the character lock before they can be redrawn.
    if (regenerate) {
      const blocker = await stillBlocker(project);
      if (blocker) return { ok: false, error: blocker };
    }

    // With `regenerate`, this clip gets fresh queued entries (old sketches
    // described the old scene). Otherwise only refresh prompts for this clip
    // and the previous clip's end frame, which hands off to it.
    const frames: ClipFrame[] = regenerate
      ? framesWithClip(nextProject, clipNumber)
      : (project.frames || []).map((frame) => {
          const own = frame.clipNumber === clipNumber;
          const handoff = frame.clipNumber === clipNumber - 1 && frame.position === "end";
          if (!own && !handoff) return frame;
          return {
            ...frame,
            prompt: buildFramePrompt(nextProject, frame.clipNumber, frame.position, {
              revision: frame.revision,
            }),
          };
        });

    if (regenerate) await consumeCredits(user.clerkUserId, cost);
    try {
      await projects.updateOne(
        { _id: project._id },
        { $set: { "phaseA.clips": clips, frames, updatedAt: new Date() } },
      );
    } catch (error) {
      // Write failed before anything went out → give back the full charge.
      if (regenerate) await refundCredits(user.clerkUserId, cost);
      throw error;
    }

    if (regenerate) {
      try {
        await regenerateFrames({ ...nextProject, frames }, [
          { clipNumber, position: "start" },
          { clipNumber, position: "end" },
        ]);
      } catch (error) {
        // The two frames go out one at a time, so the first may already have a
        // live job: that one is reconciliation's to finish and refund. Fail and
        // refund only the entries that never reached the provider, otherwise
        // they would sit `queued` with no job behind them.
        const message = error instanceof Error ? error.message : "分鏡圖送出失敗";
        const missed = await failUnsubmittedFrames(project._id, clipNumber, message);
        if (missed > 0) await refundCredits(user.clerkUserId, missed * FRAME_COST);
        throw error;
      }
    }

    const updated = await projects.findOne({ _id: project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "更新分鏡失敗",
    };
  }
}

// Poll target for every in-flight state; refreshes provider jobs while
// images or videos are being generated.
export async function refreshGenerationAction(
  projectId: string,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(projectId)) {
      return { ok: false, error: "專案不存在" };
    }
    const id = new ObjectId(projectId);
    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: id,
      clerkUserId: user.clerkUserId,
    });
    if (!project) return { ok: false, error: "專案不存在" };

    // Only pending jobs are polled, so this is cheap when nothing is running.
    if (isProductionLike(project.status)) {
      await refreshProjectJobs(id);
    }

    const updated = await projects.findOne({ _id: id });
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "更新進度失敗",
    };
  }
}
