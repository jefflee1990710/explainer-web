import type { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";
import { finalFingerprint, hashText } from "@/service/video-edit/edit-state";
import { renderFinalVideo } from "@/service/video-edit/render";

// ffmpeg errors are English noise; keep our own Chinese messages.
function finalErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /[\u4e00-\u9fff]/.test(message) ? message : "匯出影片失敗，請確認素材格式後再試";
}

// queued → in_progress → completed / failed, like runReelJob. An edit or clip
// change mid-render drops the file and asks for a re-export.
export async function runFinalJob(videoId: ObjectId, fingerprint: string) {
  const videos = await videosCollection();
  const claimed = await videos.findOneAndUpdate(
    { _id: videoId, finalFingerprint: fingerprint, finalStatus: "queued" },
    { $set: { finalStatus: "in_progress", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!claimed) return;

  try {
    if (!claimed.edit || !claimed.reelUrl) throw new Error("缺少成片或圖層設定");
    const buffer = await renderFinalVideo(claimed.reelUrl, claimed.edit);
    const finalUrl = await persistBuffer(
      buffer,
      `explainer/${videoId.toHexString()}/final-${hashText(fingerprint)}.mp4`,
      "video/mp4",
    );
    const latest = await videos.findOne({ _id: videoId });
    if (!latest || finalFingerprint(latest) !== fingerprint) {
      await videos.updateOne(
        { _id: videoId, finalFingerprint: fingerprint },
        { $set: { finalStatus: "failed", finalError: "匯出期間圖層有變動，請重新匯出", updatedAt: new Date() } },
      );
      return;
    }
    await videos.updateOne(
      { _id: videoId, finalFingerprint: fingerprint },
      { $set: { finalUrl, finalStatus: "completed", updatedAt: new Date() }, $unset: { finalError: "" } },
    );
  } catch (error) {
    await videos.updateOne(
      { _id: videoId, finalFingerprint: fingerprint },
      { $set: { finalStatus: "failed", finalError: finalErrorMessage(error), updatedAt: new Date() } },
    );
  }
}
