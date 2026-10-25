import { put } from "@vercel/blob";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/ogg"]);

export const ACADEMY_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const ACADEMY_MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const VIDEO_URL_EXT = /\.(mp4|webm|mov|m4v|ogg)(?:[?#].*)?$/i;

export type AcademyMediaKind = "image" | "video";

// Classify an uploaded file as an Academy image or video, or reject it.
export function classifyAcademyMedia(file: Pick<File, "type" | "name" | "size">): {
  kind: AcademyMediaKind;
} | { error: string } {
  const type = file.type.toLowerCase();
  const kind: AcademyMediaKind | null = IMAGE_TYPES.has(type)
    ? "image"
    : VIDEO_TYPES.has(type)
      ? "video"
      : VIDEO_URL_EXT.test(file.name)
        ? "video"
        : null;
  if (!kind) {
    return { error: "Only images (JPEG, PNG, WebP, GIF) and videos (MP4, WebM, MOV) are allowed" };
  }
  const max = kind === "image" ? ACADEMY_MAX_IMAGE_BYTES : ACADEMY_MAX_VIDEO_BYTES;
  if (file.size <= 0 || file.size > max) {
    return {
      error:
        kind === "image"
          ? "Image must be between 1 byte and 12MB"
          : "Video must be between 1 byte and 80MB",
    };
  }
  return { kind };
}

// True when a Markdown image URL should render as a <video> player.
export function isAcademyVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (VIDEO_URL_EXT.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return /\/explainer\/academy\//i.test(parsed.pathname) && VIDEO_URL_EXT.test(parsed.pathname);
  } catch {
    return false;
  }
}

// Markdown snippet inserted at the caret after a successful Blob upload.
export function academyMediaMarkdown(kind: AcademyMediaKind, url: string, alt: string): string {
  const safeAlt = alt.replace(/[[\]]/g, "").trim() || (kind === "video" ? "Lesson video" : "Lesson image");
  return `\n\n![${safeAlt}](${url})\n\n`;
}

// Upload a course image or video to Vercel Blob under explainer/academy/.
export async function uploadAcademyMedia(file: File): Promise<
  { ok: true; url: string; kind: AcademyMediaKind; markdown: string } | { ok: false; error: string }
> {
  const classified = classifyAcademyMedia(file);
  if ("error" in classified) return { ok: false, error: classified.error };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, error: "BLOB_READ_WRITE_TOKEN is not configured for file upload" };
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`explainer/academy/${Date.now()}-${safeName}`, file, {
    access: "public",
    contentType: file.type || undefined,
  });
  return {
    ok: true,
    url: blob.url,
    kind: classified.kind,
    markdown: academyMediaMarkdown(classified.kind, blob.url, file.name.replace(/\.[^.]+$/, "")),
  };
}
