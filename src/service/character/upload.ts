import { put } from "@vercel/blob";
import { requireAppUser } from "@/service/auth";

export async function uploadCharacterImageAction(formData: FormData) {
  await requireAppUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "請選擇圖片" };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false as const, error: "尚未設定 Vercel Blob" };
  }

  const blob = await put(`explainer/characters/${Date.now()}-${file.name}`, file, {
    access: "public",
  });
  return { ok: true as const, url: blob.url };
}
