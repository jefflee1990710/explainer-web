"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { assertCanSpendCredits, consumeCredits } from "@/lib/billing/credits";
import { videosCollection } from "@/lib/collections";
import {
  runFrameGenerationJob,
  runPhaseBAndGenerateJob,
} from "@/lib/director/jobs";
import { persistFrameAnnotation } from "@/lib/higgsfield/frame-annotation";
import { buildFramePrompt, initialFrames } from "@/lib/higgsfield/frame-prompts";
import {
  refreshProjectJobs,
  regenerateFrame,
  regenerateFrames,
} from "@/lib/higgsfield/pipeline";
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

// Step 1 approval: storyboard is accepted → generate start/end frames.
// Cost: 1 credit per image = clipCount × 2.
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

    const frames = initialFrames(project);
    const cost = frames.length;
    await assertCanSpendCredits(user, cost);
    await consumeCredits(user.clerkUserId, cost);

    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          status: "frames_generating",
          frames,
          framesCreditCost: cost,
          framesCharged: true,
          error: undefined,
          updatedAt: new Date(),
        },
        $unset: { framesSubmittedAt: "" },
      },
    );

    after(() => runFrameGenerationJob(project._id));

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
    if (project.status !== "frames_ready") {
      return { ok: false, error: "請等分鏡圖全部完成後再重新產生" };
    }
    const frame = project.frames?.find(
      (item) => item.clipNumber === clipNumber && item.position === position,
    );
    if (!frame) return { ok: false, error: "找不到這張分鏡圖" };

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

    await assertCanSpendCredits(user, 1);
    await consumeCredits(user.clerkUserId, 1);
    await projects.updateOne(
      { _id: project._id },
      {
        $inc: { framesCreditCost: 1 },
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

    // Submission is a single fast request; run inline so the UI flips to
    // "generating" immediately.
    await regenerateFrame(project, clipNumber, position, revision);

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
      referenceTranslation: cleanField(input?.referenceTranslation),
    };
    if (!clean.explainerScene) return { ok: false, error: "畫面描述不能空白" };
    if (!clean.englishVo) return { ok: false, error: "旁白不能空白" };

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (project.status !== "frames_ready") {
      return { ok: false, error: "請等分鏡圖全部完成後再編輯分鏡" };
    }
    const clipIndex = project.phaseA.clips.findIndex(
      (clip) => clip.clipNumber === clipNumber,
    );
    if (clipIndex < 0) return { ok: false, error: "找不到這段分鏡" };

    const regenerate = options?.regenerate === true;
    const cost = regenerate ? 2 : 0;
    if (regenerate) await assertCanSpendCredits(user, cost);

    // Apply the edit in memory first so frame prompts are rebuilt from the new text.
    const clips = project.phaseA.clips.map((clip, index) =>
      index === clipIndex ? { ...clip, ...clean } : clip,
    );
    const nextProject = {
      ...project,
      phaseA: { ...project.phaseA, clips },
    };
    const frames: ClipFrame[] = (project.frames || []).map((frame) => {
      const own = frame.clipNumber === clipNumber;
      const handoff = frame.clipNumber === clipNumber - 1 && frame.position === "end";
      if (!own && !handoff) return frame;
      // A redo from new text starts clean: old sketches described the old scene.
      const next: ClipFrame = { ...frame };
      if (regenerate && own) delete next.revision;
      next.prompt = buildFramePrompt(nextProject, frame.clipNumber, frame.position, {
        revision: next.revision,
      });
      return next;
    });

    if (regenerate) await consumeCredits(user.clerkUserId, cost);
    await projects.updateOne(
      { _id: project._id },
      {
        $set: { "phaseA.clips": clips, frames, updatedAt: new Date() },
        ...(regenerate ? { $inc: { framesCreditCost: cost } } : {}),
      },
    );

    if (regenerate) {
      await regenerateFrames({ ...nextProject, frames }, [
        { clipNumber, position: "start" },
        { clipNumber, position: "end" },
      ]);
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

// Step 2 approval: frames accepted → Phase B prompts + video generation.
// Cost: 1 credit per clip.
export async function approveAndGenerateAction(
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
    if (project.status !== "frames_ready") {
      return { ok: false, error: "請先完成並核准分鏡圖" };
    }
    const unfinished = (project.frames || []).some(
      (frame) => frame.status !== "completed",
    );
    if (unfinished) {
      return { ok: false, error: "還有分鏡圖未完成，請重新產生失敗的那幾張" };
    }

    const cost = project.phaseA.clipCount;
    await assertCanSpendCredits(user, cost);
    await consumeCredits(user.clerkUserId, cost);

    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          status: "approved",
          creditCost: cost,
          creditsCharged: true,
          error: undefined,
          updatedAt: new Date(),
        },
      },
    );

    after(() => runPhaseBAndGenerateJob(project._id));

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

    if (
      project.status === "generating" ||
      project.status === "frames_generating"
    ) {
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
