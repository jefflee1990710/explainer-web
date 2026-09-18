import { del } from "@vercel/blob";
import { isExplainerBlobUrl } from "@/lib/characters/storage";

// Remove uploaded references and persisted blueprints from Vercel Blob.
export async function deleteExplainerBlobUrls(urls: string[]) {
  const ours = [...new Set(urls.filter(isExplainerBlobUrl))];
  if (!ours.length) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("尚未設定 BLOB_READ_WRITE_TOKEN，無法刪除檔案");
  }
  await del(ours);
}
