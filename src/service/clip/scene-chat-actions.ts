import { generateText, Output } from "ai";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { videosCollection } from "@/dao";
import type { SceneChatMessage } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { clipVideoCost, sceneImageCost } from "@/service/production-plan";
import { updateClipStoryboardAction } from "@/service/generation/actions";
import { directorModel } from "@/service/director/model";
import { isProductionLike } from "@/service/project-status";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { withWrittenCanvas } from "@/service/director/written-chinese";
import { revalidatePath } from "next/cache";
import {
  SCENE_CHAT_FIELDS,
  SCENE_CHAT_KEPT,
  applySceneChatToClips,
  normalizeSceneChatSummary,
  regenStoryboardInput,
  sceneChatRateLimited,
  sceneChatSystemPrompt,
  sceneChatUserPrompt,
} from "@/service/clip/scene-chat";

type SceneChatResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

const sceneChatSchema = z.object({
  summary: z.string(),
  scope: z.enum(["current", "all"]),
  edits: z.array(
    z.object({
      clipNumber: z.number().int(),
      field: z.enum(SCENE_CHAT_FIELDS),
      content: z.string(),
    }),
  ),
});

function revalidateVideo(projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/billing");
}

function fail(error: unknown, fallback: string): SceneChatResult {
  console.error(fallback, error);
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

// Ask the model to rewrite this clip's start still, end still, or camera, then save the text.
export async function sendClipSceneChatAction(input: {
  videoId: string;
  clipNumber: number;
  message: string;
}): Promise<SceneChatResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(input?.videoId ?? "");
    const clipNumber = Number(input?.clipNumber);
    if (!ObjectId.isValid(videoId) || !Number.isInteger(clipNumber)) {
      return { ok: false, error: "專案不存在" };
    }
    const message = String(input?.message ?? "").trim();
    if (!message) return { ok: false, error: "請輸入訊息" };
    if (message.length > 2000) return { ok: false, error: "訊息過長" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能使用 AI 修改" };

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) return { ok: false, error: "分鏡尚未完成" };
    const clip = project.phaseA.clips.find((item) => item.clipNumber === clipNumber);
    if (!clip) return { ok: false, error: "找不到這段分鏡" };

    const thread = (project.sceneChats || []).find((item) => item.clipNumber === clipNumber);
    if (sceneChatRateLimited(thread?.messages, new Date())) {
      return { ok: false, error: "AI 修改太頻繁，請稍後再試" };
    }

    let output: z.infer<typeof sceneChatSchema>;
    try {
      ({ output } = await generateText({
        model: directorModel(),
        output: Output.object({ schema: sceneChatSchema }),
        system: sceneChatSystemPrompt(),
        prompt: sceneChatUserPrompt({
          clips: project.phaseA.clips,
          currentClip: clipNumber,
          history: thread?.messages || [],
          message,
        }),
      }));
    } catch (error) {
      console.error("scene chat failed", error);
      return { ok: false, error: "AI 修改失敗，請再試一次" };
    }

    const applied = applySceneChatToClips({
      clips: project.phaseA.clips,
      currentClip: clipNumber,
      scope: output.scope,
      edits: output.edits,
      skillSlug: project.skillSlug,
    });
    if (!applied.ok) return applied;
    const currentFields = applied.changed.find((item) => item.clipNumber === clipNumber)?.fields;

    const now = new Date();
    const userMsg: SceneChatMessage = { role: "user", content: message, createdAt: now };
    const assistantMsg: SceneChatMessage = {
      role: "assistant",
      content: normalizeSceneChatSummary(
        output.summary,
        applied.changed.reduce((sum, item) => sum + item.fields.length, 0),
      ),
      ...(currentFields?.length ? { changedPaths: currentFields } : {}),
      ...(applied.changed.length ? { changedClips: applied.changed } : {}),
      createdAt: now,
    };
    const messages = [...(thread?.messages || []), userMsg, assistantMsg].slice(-SCENE_CHAT_KEPT);
    const sceneChats = thread
      ? (project.sceneChats || []).map((item) =>
          item.clipNumber === clipNumber ? { ...item, messages } : item,
        )
      : [...(project.sceneChats || []), { clipNumber, messages }];

    const clips = applied.clips;
    let frames = project.frames || [];
    if (applied.changed.length > 0) {
      const changedNumbers = new Set(applied.changed.map((item) => item.clipNumber));
      const nextProject = await withWrittenCanvas({ ...project, phaseA: { ...project.phaseA, clips } });
      const style = await loadRenderableStyle({
        styleId: project.styleId,
        ownerClerkUserId: project.clerkUserId,
      });
      frames = (project.frames || []).map((frame) => {
        const own = changedNumbers.has(frame.clipNumber);
        const handoff = frame.position === "end" && changedNumbers.has(frame.clipNumber + 1);
        if (!own && !handoff) return frame;
        return {
          ...frame,
          prompt: buildFramePrompt(nextProject, frame.clipNumber, frame.position, {
            revision: frame.revision,
            style,
          }),
        };
      });
    }

    const wrote = await projects.updateOne(
      { _id: project._id, clerkUserId: user.clerkUserId },
      {
        $set: {
          "phaseA.clips": clips,
          frames,
          sceneChats,
          updatedAt: now,
        },
      },
    );
    if (wrote.matchedCount !== 1) return { ok: false, error: "專案不存在" };

    const updated = await projects.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(videoId);
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "AI 修改失敗，請再試一次");
  }
}

// Redraw this clip's stills, then start its video once both pictures exist.
export async function regenerateClipSceneMediaAction(
  videoId: string,
  clipNumber: number,
): Promise<SceneChatResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId) || !Number.isInteger(clipNumber)) {
      return { ok: false, error: "專案不存在" };
    }
    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    const clip = project.phaseA.clips.find((item) => item.clipNumber === clipNumber);
    if (!clip) return { ok: false, error: "找不到這段分鏡" };

    const source = { ...project, frames: project.frames || [] };
    await assertCanSpendCredits(
      user,
      sceneImageCost(source, [clipNumber]) + clipVideoCost(source, clipNumber),
    );

    const saved = await updateClipStoryboardAction(
      videoId,
      clipNumber,
      regenStoryboardInput(clip, project.skillSlug),
      { regenerate: true },
    );
    if (!saved.ok) return saved;

    try {
      await projects.updateOne(
        { _id: project._id, clerkUserId: user.clerkUserId },
        { $addToSet: { autoVideoClips: clipNumber }, $set: { updatedAt: new Date() } },
      );
    } catch (error) {
      console.error("queue clip video after scene chat failed", error);
    }

    const updated = await projects.findOne({ _id: project._id });
    if (!updated) return saved;
    revalidateVideo(videoId);
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "更新分鏡失敗");
  }
}
