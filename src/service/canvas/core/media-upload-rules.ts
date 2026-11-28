// Shared canvas upload checks. The browser and the Server Action both use these
// so a rejected file shows the same sentence, even when Next.js drops the response body.

import type { CanvasMediaKind } from "@/model/canvas";
import { SIGN_IN_REQUIRED_MESSAGE } from "@/service/auth/server-action-auth";

export const CANVAS_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Thrown by the Next.js client when a Server Action response is not text/x-component.
export const CANVAS_UPLOAD_NON_RSC_MESSAGE =
  "An unexpected response was received from the server.";

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

export type CanvasMediaUploadCheck =
  | { ok: true; mediaKind: CanvasMediaKind; ext: string; contentType: string }
  | { ok: false; error: string };

export function checkCanvasMediaUpload(file: { type: string; size: number }): CanvasMediaUploadCheck {
  if (typeof file.size !== "number" || !Number.isFinite(file.size)) {
    return { ok: false, error: "檔案大小無效或超過 15 MB 上限" };
  }
  if (file.size <= 0) return { ok: false, error: "檔案內容不可為空" };
  if (file.size > CANVAS_MAX_UPLOAD_BYTES) return { ok: false, error: "檔案大小超過 15 MB 上限" };

  const contentType = (typeof file.type === "string" ? file.type : "").split(";")[0]?.trim().toLowerCase() || "";
  const allowed = ALLOWED_UPLOAD_MIME_MAP[contentType];
  if (!allowed) {
    return {
      ok: false,
      error: `不支援的檔案格式（${contentType || "unknown"}）。僅支援 PNG/JPEG/WebP、MP4/WebM/MOV、MP3/WAV/M4A/OGG。`,
    };
  }
  return { ok: true, mediaKind: allowed.mediaKind, ext: allowed.ext, contentType };
}

export type CanvasMediaUploadPlan =
  | {
      ok: true;
      mediaKind: CanvasMediaKind;
      ext: string;
      contentType: string;
      fileName: string;
      pathname: string;
      maximumSizeInBytes: number;
      allowedContentTypes: string[];
    }
  | { ok: false; error: string };

export function canvasUploadFileName(name: string, ext: string): string {
  const base = (typeof name === "string" ? name : "").split(/[/\\]/).pop()?.replace(/[\u0000-\u001f]/g, "").trim() ?? "";
  const clipped = base.slice(0, 180);
  return clipped || `upload.${ext}`;
}

// Path and limits baked into the client-upload token. Bytes never ride on the Server Action.
export function planCanvasMediaUpload(
  clerkUserId: string,
  file: { type: string; size: number; name: string },
  id: string,
): CanvasMediaUploadPlan {
  if (!clerkUserId || /[\\/]/.test(clerkUserId)) return { ok: false, error: SIGN_IN_REQUIRED_MESSAGE };
  const checked = checkCanvasMediaUpload(file);
  if (!checked.ok) return checked;
  if (!id || /[\\/]/.test(id)) return { ok: false, error: "上傳失敗，請再試一次" };
  return {
    ok: true,
    mediaKind: checked.mediaKind,
    ext: checked.ext,
    contentType: checked.contentType,
    fileName: canvasUploadFileName(file.name, checked.ext),
    pathname: `canvas/uploads/${clerkUserId}/${id}.${checked.ext}`,
    maximumSizeInBytes: CANVAS_MAX_UPLOAD_BYTES,
    allowedContentTypes: [checked.contentType],
  };
}

// Size and type are known before the request. A non-RSC body on a valid file is the sign-in HTML page.
export function explainCanvasUploadFailure(error: unknown, file: { type: string; size: number }): string {
  const checked = checkCanvasMediaUpload(file);
  if (!checked.ok) return checked.error;
  const message = error instanceof Error ? error.message.trim() : "";
  if (message === CANVAS_UPLOAD_NON_RSC_MESSAGE) return SIGN_IN_REQUIRED_MESSAGE;
  return message || "上傳失敗";
}
