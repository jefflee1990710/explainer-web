// Canvas media upload. The browser sends bytes straight to Vercel Blob.
// A Server Action only checks the file and signs the path: posting the file
// itself is rejected by the platform (or answered with an HTML page), and
// Next.js then hides the real status behind a generic message.

import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import type { CanvasMediaKind, CanvasMediaMeta } from "@/model/canvas";
import { acceptedCanvasAgentImageUrl } from "@/service/canvas-agent/chat-images";
import {
  type CanvasMediaUploadPlan,
  CANVAS_MAX_UPLOAD_BYTES,
  checkCanvasMediaUpload,
  planCanvasMediaUpload,
  canvasUploadFileName,
} from "@/service/canvas/core/media-upload-rules";
import { isUsableProbe, mediaMetaFromProbe, parseMediaProbe } from "@/service/canvas/core/media-meta";
import { persistBuffer } from "@/service/higgsfield/persist";
import { ffmpegStderr } from "@/service/reel/concat";
import { probeMediaBuffer } from "@/service/canvas/use-cases/media-meta";

export { CANVAS_MAX_UPLOAD_BYTES, ALLOWED_UPLOAD_MIME_MAP } from "@/service/canvas/core/media-upload-rules";

const PROBE_TIMEOUT_MS = 20_000;

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

type PrepareDeps = {
  randomId?: () => string;
  mintToken?: (plan: Extract<CanvasMediaUploadPlan, { ok: true }>) => Promise<string>;
  readWriteToken?: string | undefined;
};

export type PreparedCanvasMediaUpload =
  | {
      ok: true;
      token: string;
      pathname: string;
      mediaKind: CanvasMediaKind;
      contentType: string;
      fileName: string;
    }
  | { ok: false; error: string };

// Validates a FormData `file` entry and uploads it to `canvas/uploads/<uid>/<uuid>.<ext>`.
// Browser uploads use prepareCanvasMediaUpload instead, so the file is not the request body.
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
  const checked = checkCanvasMediaUpload({ type: file.type, size: file.size });
  if (!checked.ok) return checked;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength <= 0 || buffer.byteLength > CANVAS_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "檔案大小無效或超過 15 MB 上限" };
  }

  const id = deps?.randomId ? deps.randomId() : crypto.randomUUID();
  const plan = planCanvasMediaUpload(clerkUserId, { type: file.type, size: file.size, name: file.name }, id);
  if (!plan.ok) return plan;

  const persist = deps?.persistBuffer ?? persistBuffer;
  const url = await persist(buffer, plan.pathname, plan.contentType);
  const meta = await probeUploadedMedia(plan.mediaKind, plan.ext, url, {
    probeBuffer: async () => (deps?.probeBuffer ?? probeMediaBuffer)(buffer, plan.ext),
  });

  return {
    ok: true,
    url,
    mediaKind: plan.mediaKind,
    fileName: plan.fileName,
    contentType: plan.contentType,
    sizeBytes: buffer.byteLength,
    ...(meta ? { meta } : {}),
  };
}

// Signs one upload. The browser then puts the file on Blob and calls finishCanvasMediaUpload.
export async function prepareCanvasMediaUpload(
  clerkUserId: string,
  input: { contentType: string; size: number; fileName: string },
  deps?: PrepareDeps,
): Promise<PreparedCanvasMediaUpload> {
  const id = deps?.randomId ? deps.randomId() : crypto.randomUUID();
  const plan = planCanvasMediaUpload(
    clerkUserId,
    { type: input.contentType, size: input.size, name: input.fileName },
    id,
  );
  if (!plan.ok) return plan;

  const token = deps?.readWriteToken ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!deps?.mintToken && !token) return { ok: false, error: "尚未設定 Vercel Blob" };

  try {
    const clientToken = deps?.mintToken
      ? await deps.mintToken(plan)
      : await generateClientTokenFromReadWriteToken({
          ...(token ? { token } : {}),
          pathname: plan.pathname,
          maximumSizeInBytes: plan.maximumSizeInBytes,
          allowedContentTypes: plan.allowedContentTypes,
          validUntil: Date.now() + 15 * 60 * 1000,
          addRandomSuffix: false,
        });
    return {
      ok: true,
      token: clientToken,
      pathname: plan.pathname,
      mediaKind: plan.mediaKind,
      contentType: plan.contentType,
      fileName: plan.fileName,
    };
  } catch (error) {
    console.error(
      "[canvas-upload] client token failed",
      error instanceof Error ? error.message : "error",
    );
    return { ok: false, error: "上傳失敗，請再試一次" };
  }
}

type FinishDeps = {
  probeUrl?: (url: string) => Promise<string>;
};

// Confirms the Blob URL is this user's upload, then probes video and audio length.
export async function finishCanvasMediaUpload(
  clerkUserId: string,
  input: { url: string; fileName: string; contentType: string; sizeBytes: number },
  deps?: FinishDeps,
): Promise<UploadCanvasMediaResult> {
  const checked = checkCanvasMediaUpload({ type: input.contentType, size: input.sizeBytes });
  if (!checked.ok) return checked;
  if (!ownedUploadUrl(input.url, clerkUserId, checked.ext)) {
    return { ok: false, error: "上傳結果無效，請再試一次" };
  }

  const meta = await probeUploadedMedia(checked.mediaKind, checked.ext, input.url, {
    probeUrl: deps?.probeUrl,
  });
  return {
    ok: true,
    url: input.url,
    mediaKind: checked.mediaKind,
    fileName: canvasUploadFileName(input.fileName, checked.ext),
    contentType: checked.contentType,
    sizeBytes: input.sizeBytes,
    ...(meta ? { meta } : {}),
  };
}

function ownedUploadUrl(url: string, clerkUserId: string, ext: string): boolean {
  if (!acceptedCanvasAgentImageUrl(url, clerkUserId)) return false;
  try {
    const path = decodeURIComponent(new URL(url).pathname).toLowerCase();
    return path.endsWith(`.${ext}`) && !path.includes("..");
  } catch {
    return false;
  }
}

async function probeUploadedMedia(
  mediaKind: CanvasMediaKind,
  ext: string,
  url: string,
  deps: { probeBuffer?: (ext: string) => Promise<string>; probeUrl?: (url: string) => Promise<string> },
): Promise<CanvasMediaMeta | undefined> {
  if (mediaKind === "image") return undefined;
  const probe = deps.probeBuffer
    ? deps.probeBuffer(ext)
    : (deps.probeUrl ?? ((target: string) => ffmpegStderr(process.cwd(), ["-i", target], PROBE_TIMEOUT_MS)))(url);
  const probed = parseMediaProbe(await probe.catch(() => ""));
  if (!isUsableProbe(probed)) return undefined;
  return mediaMetaFromProbe(url, probed);
}
