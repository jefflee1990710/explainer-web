import { generateText } from "ai";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { videosCollection } from "@/dao";
import { directorModel } from "@/service/director/model";
import { captionBrief, shareCaptionPrompt } from "@/service/video-share/caption-brief";
import { isVideoShareId } from "@/service/video-share/platforms";

export type DraftShareCaptionResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

// Draft a platform caption from the stored storyboard, not the MP4.
export async function draftShareCaptionAction(
  videoId: string,
  platform: string,
): Promise<DraftShareCaptionResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
    if (!isVideoShareId(platform)) return { ok: false, error: "不支援的平台" };

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video) return { ok: false, error: "專案不存在" };
    if (!video.phaseA) return { ok: false, error: "還沒有分鏡內容，無法起草文案" };

    const language = video.language || "en";
    const prompt = shareCaptionPrompt({
      platform,
      language,
      brief: captionBrief({ source: video.source, phaseA: video.phaseA }),
    });
    const { text } = await generateText({
      model: directorModel(),
      system: prompt.system,
      prompt: prompt.user,
    });
    const cleaned = text.trim();
    if (!cleaned) return { ok: false, error: "文案起草失敗，請再試一次" };
    return { ok: true, text: cleaned };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "文案起草失敗",
    };
  }
}
