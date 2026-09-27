import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/service/auth";
import { videosCollection } from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";
import { isReelCurrent } from "@/service/reel/fingerprint";
import {
  blobStoreHost,
  brandAssetPath,
  checkBrandUpload,
  editAssetUrls,
  finalFingerprint,
  hasEdit,
  isBrandAssetUrl,
  isFinalBusy,
  isFinalCurrent,
} from "@/service/video-edit/edit-state";
import { runFinalJob } from "@/service/video-edit/final-job";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { videoEditSchema } from "@/model/video-edit";

type Fail = { ok: false; error: string };
type ProjectResult = { ok: true; project: PublicVideo } | Fail;

async function ownedVideo(videoId: string, clerkUserId: string) {
  if (!ObjectId.isValid(videoId)) return null;
  const videos = await videosCollection();
  return videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
}

// Autosave from the Video tab. Asset URLs must live in this user's Blob folder.
export async function updateVideoEditAction(videoId: string, edit: unknown): Promise<ProjectResult> {
  const user = await requireAppUser();
  const parsed = videoEditSchema.safeParse(edit);
  if (!parsed.success) return { ok: false, error: "圖層設定格式錯誤" };
  const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
  if (!editAssetUrls(parsed.data).every((url) => isBrandAssetUrl(url, user.clerkUserId, storeHost))) {
    return { ok: false, error: "素材網址無效，請重新上傳" };
  }
  const video = await ownedVideo(videoId, user.clerkUserId);
  if (!video) return { ok: false, error: "找不到影片" };
  const videos = await videosCollection();
  await videos.updateOne({ _id: video._id }, { $set: { edit: parsed.data, updatedAt: new Date() } });
  const updated = await videos.findOne({ _id: video._id });
  return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
}

export async function uploadBrandAssetAction(
  formData: FormData,
): Promise<{ ok: true; url: string; kind: "image" | "video" } | Fail> {
  const user = await requireAppUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "沒有收到檔案" };
  const checked = checkBrandUpload(file);
  if (!checked.ok) return checked;
  const url = await persistBuffer(
    Buffer.from(await file.arrayBuffer()),
    brandAssetPath(user.clerkUserId, randomUUID(), checked.ext),
    file.type,
  );
  return { ok: true, url, kind: checked.kind };
}

// Queue the branded render. Idempotent for a fingerprint already queued, running, or done.
export async function exportFinalVideoAction(videoId: string): Promise<ProjectResult> {
  const user = await requireAppUser();
  const video = await ownedVideo(videoId, user.clerkUserId);
  if (!video) return { ok: false, error: "找不到影片" };
  if (!isReelCurrent(video)) return { ok: false, error: "成片合成中，完成後再匯出" };
  if (!hasEdit(video.edit)) return { ok: false, error: "先加入圖層或開頭結尾" };

  const fingerprint = finalFingerprint(video);
  const videos = await videosCollection();
  const alreadyRunning = isFinalBusy(video.finalStatus) && video.finalFingerprint === fingerprint;
  if (!isFinalCurrent(video) && !alreadyRunning) {
    await videos.updateOne(
      { _id: video._id },
      {
        $set: { finalStatus: "queued", finalFingerprint: fingerprint, updatedAt: new Date() },
        $unset: { finalError: "" },
      },
    );
    after(() => runFinalJob(video._id, fingerprint));
    revalidatePath(`/app/projects/${video.projectId.toHexString()}`);
  }
  const updated = await videos.findOne({ _id: video._id });
  return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
}
