import { EDIT_LIMITS, type BookendClip, type VideoEdit } from "@/model/video-edit";
import type { ReelStatus } from "@/model/project";
import { clipReelFingerprint, isReelBusy, type ReelClipSource } from "@/service/reel/fingerprint";

export type FinalRecord = {
  edit?: VideoEdit;
  finalUrl?: string;
  finalStatus?: ReelStatus;
  finalFingerprint?: string;
};

// FNV-1a; works in the browser and on the server without node:crypto.
export function hashText(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function bookendKey(clip?: BookendClip) {
  return clip ? [clip.kind, clip.assetUrl, clip.kind === "image" ? clip.durationSec : 0] : null;
}

// Content key of an edit. Layer ids are excluded so a copied template compares equal.
export function stableEditString(edit?: VideoEdit) {
  if (!edit) return "";
  return JSON.stringify({
    layers: edit.layers.map((l) => [l.assetUrl, l.anchor, l.marginPct, l.widthPct, l.opacity]),
    intro: bookendKey(edit.intro),
    outro: bookendKey(edit.outro),
  });
}

export function hasEdit(edit?: VideoEdit) {
  return Boolean(edit && (edit.layers.length > 0 || edit.intro || edit.outro));
}

export function isEditDirty(edit?: VideoEdit, template?: VideoEdit) {
  return stableEditString(edit) !== stableEditString(template);
}

export function finalFingerprint(video: ReelClipSource & { edit?: VideoEdit }) {
  return `${clipReelFingerprint(video)}#${hashText(stableEditString(video.edit))}`;
}

export function isFinalCurrent(video: ReelClipSource & FinalRecord) {
  return Boolean(
    video.finalUrl &&
      video.finalStatus === "completed" &&
      video.finalFingerprint === finalFingerprint(video),
  );
}

export function isFinalBusy(status?: ReelStatus) {
  return isReelBusy(status);
}

// An export older than this is presumed dead (killed function) and may be re-queued.
export const FINAL_STALE_MS = 6 * 60 * 1000;

// Busy and recent enough to still be running.
export function isFinalRunning(
  video: { finalStatus?: ReelStatus; finalQueuedAt?: Date | string },
  now = Date.now(),
): boolean {
  if (!isFinalBusy(video.finalStatus) || !video.finalQueuedAt) return false;
  return now - new Date(video.finalQueuedAt).getTime() < FINAL_STALE_MS;
}

export function editAssetUrls(edit: VideoEdit) {
  return [
    ...edit.layers.map((layer) => layer.assetUrl),
    ...(edit.intro ? [edit.intro.assetUrl] : []),
    ...(edit.outro ? [edit.outro.assetUrl] : []),
  ];
}

export function brandAssetPath(clerkUserId: string, id: string, ext: string) {
  return `explainer/brand/${clerkUserId}/${id}.${ext}`;
}

// Public host of this project's Blob store, from a `vercel_blob_rw_<storeId>_<secret>` token.
export function blobStoreHost(token?: string): string | null {
  const match = token?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  return match ? `${match[1].toLowerCase()}.public.blob.vercel-storage.com` : null;
}

// Render downloads these URLs, so only this user's folder in this project's store is allowed.
export function isBrandAssetUrl(url: string, clerkUserId: string, storeHost: string | null): boolean {
  if (!storeHost) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === storeHost &&
      parsed.pathname.startsWith(`/explainer/brand/${clerkUserId}/`)
    );
  } catch {
    return false;
  }
}

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov" };

export type UploadCheck =
  | { ok: true; kind: "image" | "video"; ext: string }
  | { ok: false; error: string };

export function checkBrandUpload(file: { type: string; size: number }): UploadCheck {
  if (file.size <= 0) return { ok: false, error: "檔案是空的" };
  if (IMAGE_TYPES[file.type]) {
    if (file.size > EDIT_LIMITS.imageBytes) return { ok: false, error: "圖片不可超過 5MB" };
    return { ok: true, kind: "image", ext: IMAGE_TYPES[file.type] };
  }
  if (VIDEO_TYPES[file.type]) {
    if (file.size > EDIT_LIMITS.videoBytes) return { ok: false, error: "影片不可超過 50MB" };
    return { ok: true, kind: "video", ext: VIDEO_TYPES[file.type] };
  }
  return { ok: false, error: "只支援 PNG、JPG、WebP 圖片或 MP4、MOV 影片" };
}

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

export function normalizeTemplateName(raw: string): NameCheck {
  const name = raw.trim();
  const { min, max } = EDIT_LIMITS.templateName;
  if (name.length < min) return { ok: false, error: "請輸入樣板名稱" };
  if (name.length > max) return { ok: false, error: `樣板名稱最多 ${max} 字` };
  return { ok: true, name };
}
