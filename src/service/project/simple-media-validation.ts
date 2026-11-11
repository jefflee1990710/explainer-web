export const SIMPLE_MEDIA_MAX_BYTES = 50 * 1024 * 1024; // 50MB

export const ALLOWED_SIMPLE_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export const ALLOWED_SIMPLE_AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
  "audio/ogg",
]);

export type SimpleMediaValidationInput = {
  type?: string | null;
  size?: number | null;
  name?: string | null;
};

export type SimpleMediaValidationResult =
  | { ok: true; mediaKind: "video" | "audio" }
  | { ok: false; error: string };

export function validateSimpleMediaFile(
  file: SimpleMediaValidationInput,
): SimpleMediaValidationResult {
  const size = Number(file?.size);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "檔案不能為空" };
  }
  if (size > SIMPLE_MEDIA_MAX_BYTES) {
    return { ok: false, error: "檔案大小不可超過 50MB" };
  }

  const rawType = (file?.type || "").split(";")[0]?.trim().toLowerCase();
  if (rawType && ALLOWED_SIMPLE_VIDEO_MIMES.has(rawType)) {
    return { ok: true, mediaKind: "video" };
  }
  if (rawType && ALLOWED_SIMPLE_AUDIO_MIMES.has(rawType)) {
    return { ok: true, mediaKind: "audio" };
  }

  if (file?.name) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "mp4" || ext === "mov" || ext === "webm") {
      return { ok: true, mediaKind: "video" };
    }
    if (ext === "mp3" || ext === "wav" || ext === "m4a" || ext === "aac" || ext === "ogg") {
      return { ok: true, mediaKind: "audio" };
    }
  }

  return {
    ok: false,
    error: "僅支援 MP4/MOV/WebM 影片或 MP3/WAV/M4A 音訊檔案",
  };
}
