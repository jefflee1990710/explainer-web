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

function brandKindFromUrl(url: string): "image" | "video" {
  const path = url.toLowerCase().split("?")[0];
  if (path.endsWith(".mp4") || path.endsWith(".mov")) return "video";
  return "image";
}

async function fetchPublicAsset(url: string, maxBytes: number, timeoutMs: number) {
  await assertReferenceImageUrlAllowed(url);
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error("無法下載素材");
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const size = Number(contentLength);
    if (Number.isFinite(size) && size > maxBytes) throw new Error("檔案太大");
  }
  const type = (response.headers.get("content-type") || "").split(";")[0].trim();
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) throw new Error("檔案太大");
  return { buffer, type };
}

// MCP has no upload tool: copy a public image into the user's brand folder.
export async function importReferenceImage(url: string, clerkUserId: string): Promise<string> {
  if (isBrandAssetUrl(url, clerkUserId, blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN))) return url;

  let downloaded: { buffer: Buffer; type: string };
  try {
    downloaded = await fetchPublicAsset(url, EDIT_LIMITS.imageBytes, 15_000);
  } catch (error) {
    if (error instanceof Error && error.message === "檔案太大") throw new Error("圖片不可超過 5MB");
    if (error instanceof Error && error.message === "無法下載素材") throw new Error("無法下載參考圖");
    throw error;
  }
  const checked = checkBrandUpload({ type: downloaded.type, size: downloaded.buffer.length });
  if (!checked.ok || checked.kind !== "image") {
    throw new Error(checked.ok ? "參考圖只支援 PNG、JPG、WebP" : checked.error);
  }
  return persistBuffer(
    downloaded.buffer,
    brandAssetPath(clerkUserId, randomUUID(), checked.ext),
    downloaded.type,
  );
}

// Copy a public image or video into the user's brand folder for layers, bookends, and logos.
export async function importBrandAsset(
  url: string,
  clerkUserId: string,
): Promise<{ url: string; kind: "image" | "video" }> {
  const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
  if (isBrandAssetUrl(url, clerkUserId, storeHost)) {
    return { url, kind: brandKindFromUrl(url) };
  }

  const downloaded = await fetchPublicAsset(url, EDIT_LIMITS.videoBytes, 60_000);
  const checked = checkBrandUpload({ type: downloaded.type, size: downloaded.buffer.length });
  if (!checked.ok) throw new Error(checked.error);
  const stored = await persistBuffer(
    downloaded.buffer,
    brandAssetPath(clerkUserId, randomUUID(), checked.ext),
    downloaded.type,
  );
  return { url: stored, kind: checked.kind };
}
