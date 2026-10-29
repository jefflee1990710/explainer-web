import { generateText } from "ai";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { videosCollection } from "@/dao";
import { directorModel } from "@/service/director/model";
import { persistBuffer } from "@/service/higgsfield/persist";
import { captionBrief, shareCaptionPrompt } from "@/service/video-share/caption-brief";
import { isVideoShareId } from "@/service/video-share/platforms";

export type DraftShareCaptionResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export type PersistExportedShareVideoResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

// Upload a client-exported MP4 buffer to Vercel Blob so WhatsApp / social link shares carry the rendered video URL.
export async function persistExportedShareVideoAction(
  videoId: string,
  formData: FormData,
): Promise<PersistExportedShareVideoResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "影片檔案無效" };
    }
    const videos = await videosCollection();
    const id = new ObjectId(videoId);
    const video = await videos.findOne({ _id: id, clerkUserId: user.clerkUserId });
    if (!video) return { ok: false, error: "專案不存在" };

    const bytes = Buffer.from(await file.arrayBuffer());
    const url = await persistBuffer(
      bytes,
      `explainer/${videoId}/exports/share-${Date.now()}.mp4`,
      "video/mp4",
    );
    await videos.updateOne(
      { _id: id },
      { $set: { finalUrl: url, finalStatus: "completed", updatedAt: new Date() } },
    );
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "上傳分享影片失敗",
    };
  }
}

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
