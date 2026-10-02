import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { EDIT_LIMITS } from "@/model/video-edit";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  blobStoreHost,
  brandAssetPath,
  checkBrandUpload,
  isBrandAssetUrl,
} from "@/service/video-edit/edit-state";
import { isPublicAddress } from "@/service/project/public-address";

async function assertReferenceImageUrlAllowed(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("參考圖網址無法使用");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("參考圖網址必須是 https");
  }

  const host = parsed.hostname;
  const literal = isIP(host);
  if (literal === 4 || literal === 6) {
    if (!isPublicAddress(host)) throw new Error("參考圖網址無法使用");
    return;
  }

  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new Error("參考圖網址無法使用");
  }
  for (const rec of records) {
    if (!isPublicAddress(rec.address)) throw new Error("參考圖網址無法使用");
  }
}

// MCP has no upload tool: copy a public image into the user's brand folder.
export async function importReferenceImage(url: string, clerkUserId: string): Promise<string> {
  if (isBrandAssetUrl(url, clerkUserId, blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN))) return url;

  await assertReferenceImageUrlAllowed(url);

  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("無法下載參考圖");

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const size = Number(contentLength);
    if (Number.isFinite(size) && size > EDIT_LIMITS.imageBytes) {
      throw new Error("圖片不可超過 5MB");
    }
  }

  const type = (response.headers.get("content-type") || "").split(";")[0].trim();
  const buffer = Buffer.from(await response.arrayBuffer());
  const checked = checkBrandUpload({ type, size: buffer.length });
  if (!checked.ok || checked.kind !== "image") {
    throw new Error(checked.ok ? "參考圖只支援 PNG、JPG、WebP" : checked.error);
  }
  return persistBuffer(buffer, brandAssetPath(clerkUserId, randomUUID(), checked.ext), type);
}
