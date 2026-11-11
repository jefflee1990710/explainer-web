"use server";

import { put } from "@vercel/blob";
import { requireAppUser } from "@/service/auth";
import { validateSimpleMediaFile } from "@/service/project/simple-media-validation";

export async function uploadSimpleMediaAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await requireAppUser();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "請選擇影片或音訊檔案" };
    }

    const validation = validateSimpleMediaFile(file);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { ok: false, error: "尚未設定 Vercel Blob" };
    }

    const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, "_") : "media";
    const blob = await put(`explainer/simple-media/${Date.now()}-${safeName}`, file, {
      access: "public",
    });

    return { ok: true, url: blob.url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "上傳素材失敗",
    };
  }
}
