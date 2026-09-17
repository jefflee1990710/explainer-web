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
import { initialFrames } from "@/lib/higgsfield/frame-prompts";
import { refreshProjectJobs, regenerateFrame } from "@/lib/higgsfield/pipeline";
import { toPublicVideo, type PublicVideo } from "@/lib/serialize";
import type { FramePosition } from "@/types/project";

type ProjectResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

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

// Redo a single frame for 1 credit while reviewing the timeline.
export async function regenerateFrameAction(
  projectId: string,
  clipNumber: number,
  position: FramePosition,
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
    const exists = project.frames?.some(
      (frame) => frame.clipNumber === clipNumber && frame.position === position,
    );
    if (!exists) return { ok: false, error: "找不到這張分鏡圖" };

    await assertCanSpendCredits(user, 1);
    await consumeCredits(user.clerkUserId, 1);
    await projects.updateOne(
      { _id: project._id },
      {
        $inc: { framesCreditCost: 1 },
        $set: { updatedAt: new Date() },
      },
    );

    // Submission is a single fast request; run inline so the UI flips to
    // "generating" immediately.
    await regenerateFrame(project, clipNumber, position);

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
