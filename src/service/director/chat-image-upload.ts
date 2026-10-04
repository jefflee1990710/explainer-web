import { put } from "@vercel/blob";
import { requireAppUser } from "@/service/auth";

const MAX_BYTES = 5 * 1024 * 1024;

// Public blob for a director-chat reference still. Same 5MB cap as other image uploads.
export async function uploadDirectorChatImageAction(formData: FormData) {
  await requireAppUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "沒有收到檔案" };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false as const, error: "請選擇圖片" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: "圖片不可超過 5MB" };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false as const, error: "尚未設定 Vercel Blob" };
  }

  const safeName = file.name.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80) || "image";
  const blob = await put(`explainer/directors/chat/${Date.now()}-${safeName}`, file, {
    access: "public",
  });
  return { ok: true as const, url: blob.url };
}
