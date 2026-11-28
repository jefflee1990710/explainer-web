"use client";

// Browser upload for a canvas media file.
// The Server Action only signs the path. Posting the file makes Next.js throw
// "An unexpected response was received from the server." when the reply is HTML or JSON.

import { put } from "@vercel/blob/client";
import {
  finishCanvasMediaUploadAction,
  prepareCanvasMediaUploadAction,
} from "@/presentation/actions/canvas";
import { checkCanvasMediaUpload, explainCanvasUploadFailure } from "@/service/canvas/core/media-upload-rules";
import type { UploadCanvasMediaResult } from "@/service/canvas/use-cases/media-upload";

const MULTIPART_FROM_BYTES = 8 * 1024 * 1024;

export async function uploadCanvasMediaFile(
  file: File,
  reportProgress: (percent: number) => void = () => {},
): Promise<UploadCanvasMediaResult> {
  const checked = checkCanvasMediaUpload({ type: file.type, size: file.size });
  if (!checked.ok) return checked;

  try {
    const prepared = await prepareCanvasMediaUploadAction({
      contentType: checked.contentType,
      size: file.size,
      fileName: file.name,
    });
    if (!prepared.ok) return prepared;

    reportProgress(0);
    const blob = await put(prepared.pathname, file, {
      access: "public",
      token: prepared.token,
      contentType: prepared.contentType,
      // One request for a short file. Larger files split into parallel 8MB parts.
      multipart: file.size > MULTIPART_FROM_BYTES,
      onUploadProgress: ({ percentage }) => {
        reportProgress(Math.min(100, Math.round(percentage)));
      },
    });
    return await finishCanvasMediaUploadAction({
      url: blob.url,
      fileName: file.name,
      contentType: prepared.contentType,
      sizeBytes: file.size,
    });
  } catch (error) {
    return {
      ok: false,
      error: explainCanvasUploadFailure(error, { type: file.type, size: file.size }),
    };
  }
}
