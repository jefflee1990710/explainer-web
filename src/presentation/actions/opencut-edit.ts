"use server";

import { put } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao/videos";
import { requireClerkUserId } from "@/service/auth";
import { getOpencutEdit, saveOpencutEdit } from "@/service/opencut/edit-store";

const MAX_UPLOAD_BYTES = 25_000_000;

export async function getOpencutEditAction(videoId: string) {
  try {
    const edit = await getOpencutEdit(videoId);
    return { ok: true as const, edit };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "讀取剪輯失敗" };
  }
}

export async function saveOpencutEditAction(input: {
  videoId: string;
  project: unknown;
  media: unknown;
}) {
  try {
    return await saveOpencutEdit(input);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "儲存剪輯失敗" };
  }
}

// A file dropped into OpenCut has no Blob URL yet. Store it next to the video, then keep the URL.
export async function uploadOpencutMediaAction(formData: FormData) {
  try {
    const clerkUserId = await requireClerkUserId();
    const videoId = formData.get("videoId");
    const mediaId = formData.get("mediaId");
    const file = formData.get("file");
    if (typeof videoId !== "string" || !ObjectId.isValid(videoId)) {
      return { ok: false as const, error: "影片不存在" };
    }
    if (typeof mediaId !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(mediaId)) {
      return { ok: false as const, error: "素材編號不正確" };
    }
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return { ok: false as const, error: "素材太大或是空的" };
    }
    const videos = await videosCollection();
    const video = await videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
    if (!video) return { ok: false as const, error: "影片不存在" };
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { ok: false as const, error: "尚未設定 Vercel Blob" };
    }
    const blob = await put(`explainer/${videoId}/opencut/${mediaId}`, file, {
      access: "public",
      allowOverwrite: true,
    });
    return { ok: true as const, url: blob.url };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "上傳素材失敗" };
  }
}
