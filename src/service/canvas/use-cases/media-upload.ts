// Domain media upload validation (<= 15 MB, strict MIME allowlist) and Vercel Blob
// persistence for the Interactive Node Canvas Editor (/app/canvas).

import type { CanvasMediaKind, CanvasMediaMeta } from "@/model/canvas";
import { persistBuffer } from "@/service/higgsfield/persist";
import { isUsableProbe, mediaMetaFromProbe, parseMediaProbe } from "@/service/canvas/core/media-meta";
import { probeMediaBuffer } from "@/service/canvas/use-cases/media-meta";

export const CANVAS_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Strict MIME allowlist mapped to Canvas media kind and Blob extension.
export const ALLOWED_UPLOAD_MIME_MAP: Record<
  string,
  { mediaKind: CanvasMediaKind; ext: string }
> = {
  "image/png": { mediaKind: "image", ext: "png" },
  "image/jpeg": { mediaKind: "image", ext: "jpg" },
  "image/webp": { mediaKind: "image", ext: "webp" },
  "video/mp4": { mediaKind: "video", ext: "mp4" },
  "video/webm": { mediaKind: "video", ext: "webm" },
  "video/quicktime": { mediaKind: "video", ext: "mov" },
  "audio/mpeg": { mediaKind: "audio", ext: "mp3" },
  "audio/wav": { mediaKind: "audio", ext: "wav" },
  "audio/mp4": { mediaKind: "audio", ext: "m4a" },
  "audio/ogg": { mediaKind: "audio", ext: "ogg" },
};

export type UploadCanvasMediaResult =
  | {
      ok: true;
      url: string;
      mediaKind: CanvasMediaKind;
      fileName: string;
      contentType: string;
      sizeBytes: number;
      // Video and audio only; the client stores it as the media node's outputMeta.
      meta?: CanvasMediaMeta;
    }
  | {
      ok: false;
      error: string;
    };

export type CanvasMediaUploadDeps = {
  persistBuffer: (buffer: Buffer, pathname: string, contentType: string) => Promise<string>;
  randomId: () => string;
  probeBuffer: (buffer: Buffer, ext: string) => Promise<string>;
};

// Validates a FormData `file` entry and uploads it to `canvas/uploads/<uid>/<uuid>.<ext>`.
export async function uploadCanvasMediaFromFormData(
  clerkUserId: string,
  formData: FormData,
  deps?: Partial<CanvasMediaUploadDeps>,
): Promise<UploadCanvasMediaResult> {
  const entry = formData.get("file");
  if (!entry || typeof entry === "string") {
    return { ok: false, error: "請選擇要上傳的媒體檔案" };
  }

  const file = entry as File;
  if (file.size <= 0) {
    return { ok: false, error: "檔案內容不可為空" };
  }
  if (file.size > CANVAS_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "檔案大小超過 15 MB 上限" };
  }

  const normalizedMime = (file.type || "").split(";")[0]?.trim().toLowerCase() || "";
  const allowed = ALLOWED_UPLOAD_MIME_MAP[normalizedMime];
  if (!allowed) {
    return {
      ok: false,
      error: `不支援的檔案格式（${normalizedMime || "unknown"}）。僅支援 PNG/JPEG/WebP、MP4/WebM/MOV、MP3/WAV/M4A/OGG。`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength <= 0 || buffer.byteLength > CANVAS_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "檔案大小無效或超過 15 MB 上限" };
  }

  const id = deps?.randomId ? deps.randomId() : crypto.randomUUID();
  const persist = deps?.persistBuffer ?? persistBuffer;
  const pathname = `canvas/uploads/${clerkUserId}/${id}.${allowed.ext}`;
  const url = await persist(buffer, pathname, normalizedMime);

  // A failed probe still uploads; the assistant probes again later.
  let meta: CanvasMediaMeta | undefined;
  if (allowed.mediaKind !== "image") {
    const probe = deps?.probeBuffer ?? probeMediaBuffer;
    const probed = parseMediaProbe(await probe(buffer, allowed.ext).catch(() => ""));
    if (isUsableProbe(probed)) meta = mediaMetaFromProbe(url, probed);
  }

  return {
    ok: true,
    url,
    mediaKind: allowed.mediaKind,
    fileName: file.name || `upload.${allowed.ext}`,
    contentType: normalizedMime,
    sizeBytes: buffer.byteLength,
    ...(meta ? { meta } : {}),
  };
}
