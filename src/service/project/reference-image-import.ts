import { randomUUID } from "node:crypto";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  blobStoreHost,
  brandAssetPath,
  checkBrandUpload,
  isBrandAssetUrl,
} from "@/service/video-edit/edit-state";

// MCP has no upload tool: copy a public image into the user's brand folder.
export async function importReferenceImage(url: string, clerkUserId: string): Promise<string> {
  if (isBrandAssetUrl(url, clerkUserId, blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN))) return url;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`無法下載參考圖（${response.status}）`);
  const type = (response.headers.get("content-type") || "").split(";")[0].trim();
  const buffer = Buffer.from(await response.arrayBuffer());
  const checked = checkBrandUpload({ type, size: buffer.length });
  if (!checked.ok || checked.kind !== "image") {
    throw new Error(checked.ok ? "參考圖只支援 PNG、JPG、WebP" : checked.error);
  }
  return persistBuffer(buffer, brandAssetPath(clerkUserId, randomUUID(), checked.ext), type);
}
