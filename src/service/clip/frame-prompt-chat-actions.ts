import { generateText, Output } from "ai";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { videosCollection } from "@/dao";
import type { FramePosition, SceneChatMessage } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, getActiveSubscription, isSubscriptionActive, refundCredits } from "@/service/billing/credits";
import { sceneChatRateLimited } from "@/service/clip/scene-chat";
import {
  FRAME_PROMPT_SUMMARY_MAX,
  applyFramePromptEdit,
  emptyFramePromptSummary,
  framePromptEditSystem,
  framePromptEditUser,
  framePromptSummarySystem,
  framePromptSummaryUser,
  framePromptThread,
  normalizeFramePromptSummary,
  openingSummaryFresh,
  withFramePromptThread,
} from "@/service/clip/frame-prompt-chat";
import { directorModel } from "@/service/director/model";
import { isInheritedTalkingHeadStart } from "@/service/director/talking-head";
import { clipKeyframeUrls } from "@/service/higgsfield/clip-keyframes";
import { failUnsubmittedFrames, regenerateFrame } from "@/service/higgsfield/pipeline";
import { FRAME_COST } from "@/service/production-plan";
import { isProductionLike } from "@/service/project-status";

type FramePromptResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

const summarySchema = z.object({
  summary: z.string(),
});

const editSchema = z.object({
  summary: z.string(),
  prompt: z.string(),
});

function revalidateVideo(projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/billing");
}

function fail(error: unknown, fallback: string): FramePromptResult {
  console.error(fallback, error);
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

function parseTarget(input: { videoId?: string; clipNumber?: number; position?: string }) {
  const videoId = String(input.videoId ?? "");
  const clipNumber = Number(input.clipNumber);
  const position = input.position === "end" ? "end" : input.position === "start" ? "start" : "";
  if (!ObjectId.isValid(videoId) || !Number.isInteger(clipNumber) || !position) {
    return null;
  }
  return { videoId, clipNumber, position: position as FramePosition };
}

// First assistant message: a short summary of the prompt already stored on this still.
export async function openFramePromptChatAction(input: {
  videoId: string;
  clipNumber: number;
  position: FramePosition;
  locale?: string;
}): Promise<FramePromptResult> {
  try {
    const user = await requireAppUser();
    const target = parseTarget(input);
    if (!target) return { ok: false, error: "專案不存在" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能使用 AI 修改" };

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(target.videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) return { ok: false, error: "分鏡尚未完成" };

    const locale = input.locale || "en";
    const existing = framePromptThread(project.sceneChats, target.clipNumber, target.position);
    if (openingSummaryFresh(existing?.messages, locale)) return { ok: true, project: toPublicVideo(project) };

    const frame = (project.frames || []).find(
      (item) => item.clipNumber === target.clipNumber && item.position === target.position,
    );
    const prompt = frame?.prompt?.trim() ?? "";
    let summary = emptyFramePromptSummary(locale);
    if (prompt) {
      try {
        const { output } = await generateText({
          model: directorModel(),
          output: Output.object({ schema: summarySchema }),
          system: framePromptSummarySystem(locale),
          prompt: framePromptSummaryUser(prompt),
        });
        summary = normalizeFramePromptSummary(output.summary);
      } catch (error) {
        console.error("frame prompt summary failed", error);
        return { ok: false, error: "AI 修改失敗，請再試一次" };
      }
    }

    const now = new Date();
    const assistant: SceneChatMessage = {
      role: "assistant",
      content: summary.slice(0, FRAME_PROMPT_SUMMARY_MAX),
      locale,
      createdAt: now,
    };
    const sceneChats = withFramePromptThread(project.sceneChats, {
      clipNumber: target.clipNumber,
      position: target.position,
      messages: [assistant],
    });
    // A chat that already has a user reply is left alone.
    const wrote = await projects.updateOne(
      {
        _id: project._id,
        clerkUserId: user.clerkUserId,
        sceneChats: {
          $not: {
            $elemMatch: {
              clipNumber: target.clipNumber,
              position: target.position,
              "messages.role": "user",
            },
          },
        },
      },
      { $set: { sceneChats, updatedAt: now } },
    );
    const updated = await projects.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    if (wrote.matchedCount === 1) revalidateVideo(target.videoId);
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "AI 修改失敗，請再試一次");
  }
}

// Rewrite this still's stored prompt. The picture is redrawn only when the user asks.
export async function sendFramePromptChatAction(input: {
  videoId: string;
  clipNumber: number;
  position: FramePosition;
  message: string;
}): Promise<FramePromptResult> {
  try {
    const user = await requireAppUser();
    const target = parseTarget(input);
    if (!target) return { ok: false, error: "專案不存在" };
    const message = String(input.message ?? "").trim();
    if (!message) return { ok: false, error: "請輸入訊息" };
    if (message.length > 2000) return { ok: false, error: "訊息過長" };

    const sub = await getActiveSubscription(user.clerkUserId);
    if (!isSubscriptionActive(sub)) return { ok: false, error: "需要訂閱才能使用 AI 修改" };

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(target.videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) return { ok: false, error: "分鏡尚未完成" };
    const frame = (project.frames || []).find(
      (item) => item.clipNumber === target.clipNumber && item.position === target.position,
    );
    if (!frame) return { ok: false, error: "找不到這張分鏡圖" };

    const thread = framePromptThread(project.sceneChats, target.clipNumber, target.position);
    if (sceneChatRateLimited(thread?.messages, new Date())) {
      return { ok: false, error: "AI 修改太頻繁，請稍後再試" };
    }

    let output: z.infer<typeof editSchema>;
    try {
      ({ output } = await generateText({
        model: directorModel(),
        output: Output.object({ schema: editSchema }),
        system: framePromptEditSystem(),
        prompt: framePromptEditUser({
          prompt: frame.prompt || "",
          history: thread?.messages || [],
          message,
        }),
      }));
    } catch (error) {
      console.error("frame prompt chat failed", error);
      return { ok: false, error: "AI 修改失敗，請再試一次" };
    }

    const applied = applyFramePromptEdit(frame.prompt || "", output.prompt);
    if (!applied.ok) return applied;

    const now = new Date();
    const userMsg: SceneChatMessage = { role: "user", content: message, createdAt: now };
    const assistantMsg: SceneChatMessage = {
      role: "assistant",
      content: normalizeFramePromptSummary(output.summary),
      ...(applied.changed ? { promptChanged: true } : {}),
      createdAt: now,
    };
    const sceneChats = withFramePromptThread(project.sceneChats, {
      clipNumber: target.clipNumber,
      position: target.position,
      messages: [...(thread?.messages || []), userMsg, assistantMsg].slice(-40),
    });

    const wrote = await projects.updateOne(
      { _id: project._id, clerkUserId: user.clerkUserId },
      {
        $set: {
          sceneChats,
          updatedAt: now,
          ...(applied.changed
            ? {
                "frames.$[frame].prompt": applied.prompt,
                "frames.$[frame].promptEdited": true,
              }
            : {}),
        },
        ...(applied.changed ? { $unset: { "frames.$[frame].revision": "" } } : {}),
      },
      applied.changed
        ? { arrayFilters: [{ "frame.clipNumber": target.clipNumber, "frame.position": target.position }] }
        : undefined,
    );
    if (wrote.matchedCount !== 1) return { ok: false, error: "專案不存在" };
    const updated = await projects.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(target.videoId);
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "AI 修改失敗，請再試一次");
  }
}

// Redraw only this still from the prompt saved by the chat. Does not start the video.
export async function regenerateFramePromptAction(
  videoId: string,
  clipNumber: number,
  position: FramePosition,
): Promise<FramePromptResult> {
  try {
    const user = await requireAppUser();
    const target = parseTarget({ videoId, clipNumber, position });
    if (!target) return { ok: false, error: "專案不存在" };

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(target.videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(project.status)) return { ok: false, error: "分鏡尚未完成" };
    const frame = (project.frames || []).find(
      (item) => item.clipNumber === target.clipNumber && item.position === target.position,
    );
    if (!frame?.prompt?.trim()) return { ok: false, error: "找不到這張分鏡圖" };
    if (frame.status === "queued" || frame.status === "in_progress") {
      return { ok: false, error: "這張分鏡圖還在產生中，請稍後再重畫" };
    }
    if (isInheritedTalkingHeadStart(project.skillSlug, target.clipNumber, target.position)) {
      return { ok: false, error: "這張起始圖沿用上一段的結尾，請重畫上一段的結尾圖。" };
    }
    if (target.position === "end" && !clipKeyframeUrls(project.frames, target.clipNumber).start) {
      return { ok: false, error: "起始畫格還沒有圖，請先完成起始畫格" };
    }

    await assertCanSpendCredits(user, FRAME_COST);
    const spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
    const attemptStartedAt = new Date();
    try {
      await regenerateFrame(project, target.clipNumber, target.position, undefined, {
        useStoredPrompt: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "分鏡圖送出失敗";
      const missed = await failUnsubmittedFrames(
        project._id,
        target.clipNumber,
        message,
        attemptStartedAt,
        [target.position === "start" ? "end" : "start"],
        { strict: true },
      );
      if (missed > 0) await refundCredits(user.clerkUserId, missed * FRAME_COST, spendKey);
      throw error;
    }

    const updated = await projects.findOne({ _id: project._id });
    if (!updated) return { ok: false, error: "專案不存在" };
    revalidateVideo(target.videoId);
    return { ok: true, project: toPublicVideo(updated) };
  } catch (error) {
    return fail(error, "重新產生分鏡圖失敗");
  }
}
