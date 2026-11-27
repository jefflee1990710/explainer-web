// Turns a canvas file drop into media nodes.
// Image and video files show a placeholder immediately; other files keep the upload-then-place path.

import type { CanvasNodeData } from "@/model/canvas";
import { isUnsettledMediaUpload } from "@/model/canvas";
import type { UploadCanvasMediaResult } from "@/service/canvas/use-cases/media-upload";
import type { FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";

const SLOT_OFFSET = 44;

// Local preview URLs for placeholder cards. Created when the file is dropped.
const uploadPreviewUrls = new Map<string, string>();

export function rememberUploadPreview(id: string, file: File): void {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
  try {
    uploadPreviewUrls.set(id, URL.createObjectURL(file));
  } catch {
    // Non-browser tests can render the card without a local preview.
  }
}

export function peekUploadPreviewUrl(id: string): string | undefined {
  return uploadPreviewUrls.get(id);
}

export function forgetUploadPreview(id: string): void {
  const url = uploadPreviewUrls.get(id);
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  uploadPreviewUrls.delete(id);
}

export type CanvasFileUploader = (
  file: File,
  // Called with 0–100 only when the upload itself reports a percentage.
  reportProgress: (percent: number) => void,
) => Promise<UploadCanvasMediaResult>;

type DropPosition = { x: number; y: number };

export function droppedImageOrVideoKind(file: { type: string }): "image" | "video" | null {
  const mime = (file.type || "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

function clampProgress(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function placeholderNode(
  id: string,
  position: DropPosition,
  file: File,
  mediaKind: "image" | "video",
): FlowNode {
  const fileName = file.name || (mediaKind === "video" ? "video" : "image");
  rememberUploadPreview(id, file);
  return {
    id,
    type: "media",
    position,
    // Not a real output until the upload settles.
    connectable: false,
    data: {
      label: fileName,
      fileName,
      mediaKind,
      mediaUpload: { phase: "uploading" },
    },
  };
}

function settledMediaData(result: Extract<UploadCanvasMediaResult, { ok: true }>): CanvasNodeData {
  return {
    label: result.fileName,
    fileName: result.fileName,
    mediaKind: result.mediaKind,
    mediaUrl: result.url,
    ...(result.meta ? { outputMeta: result.meta } : {}),
  };
}

export type SettledCanvasDrop = {
  id: string;
  mediaKind: "image" | "video" | "audio";
  mediaUrl: string;
  fileName: string;
};

// Image/video placeholders first, then each file uploads. Audio and other files never get a placeholder.
export async function placeDroppedCanvasFiles(input: {
  files: ArrayLike<File> | File[];
  position: DropPosition;
  upload: CanvasFileUploader;
  onNodes: (update: (prev: FlowNode[]) => FlowNode[]) => void;
  onError: (message: string) => void;
  onSettled: () => void;
  // Fires once an image or video placeholder becomes a real media node.
  onVisualSettled?: (settled: SettledCanvasDrop) => void;
  createId?: () => string;
}): Promise<void> {
  const list = Array.from(input.files);
  if (list.length === 0) return;
  const createId = input.createId ?? (() => `media-${crypto.randomUUID().slice(0, 8)}`);

  if (!list.some((file) => droppedImageOrVideoKind(file))) {
    await placeOtherFiles(list, input.position, input);
    return;
  }

  let offset = 0;
  const jobs: Array<
    | { kind: "visual"; file: File; id: string }
    | { kind: "other"; file: File; position: DropPosition }
  > = [];
  const placeholders: FlowNode[] = [];

  // Each file keeps its drop-order slot so an audio file does not slide under an image placeholder.
  for (const file of list) {
    const position = { x: input.position.x + offset, y: input.position.y + offset };
    offset += SLOT_OFFSET;
    const mediaKind = droppedImageOrVideoKind(file);
    if (!mediaKind) {
      jobs.push({ kind: "other", file, position });
      continue;
    }
    const id = createId();
    placeholders.push(placeholderNode(id, position, file, mediaKind));
    jobs.push({ kind: "visual", file, id });
  }

  // Show every image and video before any upload request starts.
  input.onNodes((prev) => [...prev, ...placeholders]);

  for (const job of jobs) {
    if (job.kind === "other") {
      await placeOneOtherFile(job.file, job.position, input);
      continue;
    }
    await uploadVisualFile(job.id, job.file, input);
  }
}

// Same packed layout the canvas used before placeholders: a failed file does not take a slot.
async function placeOtherFiles(
  files: File[],
  origin: DropPosition,
  input: {
    upload: CanvasFileUploader;
    onNodes: (update: (prev: FlowNode[]) => FlowNode[]) => void;
    onError: (message: string) => void;
    onSettled: () => void;
    createId?: () => string;
  },
): Promise<void> {
  const createId = input.createId ?? (() => `media-${crypto.randomUUID().slice(0, 8)}`);
  let offset = 0;
  for (const file of files) {
    const position = { x: origin.x + offset, y: origin.y + offset };
    const result = await input.upload(file, () => {});
    if (!result.ok) {
      input.onError(result.error);
      continue;
    }
    const node: FlowNode = {
      id: createId(),
      type: "media",
      position,
      data: settledMediaData(result),
    };
    offset += SLOT_OFFSET;
    input.onNodes((prev) => [...prev, node]);
    input.onSettled();
  }
}

async function placeOneOtherFile(
  file: File,
  position: DropPosition,
  input: {
    upload: CanvasFileUploader;
    onNodes: (update: (prev: FlowNode[]) => FlowNode[]) => void;
    onError: (message: string) => void;
    onSettled: () => void;
    createId?: () => string;
  },
): Promise<boolean> {
  const createId = input.createId ?? (() => `media-${crypto.randomUUID().slice(0, 8)}`);
  let result: UploadCanvasMediaResult;
  try {
    result = await input.upload(file, () => {});
  } catch (err) {
    input.onError(err instanceof Error ? err.message : "Upload failed");
    return false;
  }
  if (!result.ok) {
    input.onError(result.error);
    return false;
  }
  input.onNodes((prev) => [
    ...prev,
    { id: createId(), type: "media", position, data: settledMediaData(result) },
  ]);
  input.onSettled();
  return true;
}

async function uploadVisualFile(
  id: string,
  file: File,
  input: {
    upload: CanvasFileUploader;
    onNodes: (update: (prev: FlowNode[]) => FlowNode[]) => void;
    onSettled: () => void;
    onVisualSettled?: (settled: SettledCanvasDrop) => void;
  },
): Promise<void> {
  const patchUploading = (progress: number) => {
    const next = clampProgress(progress);
    input.onNodes((prev) =>
      prev.map((node) => {
        if (node.id !== id || node.data.mediaUpload?.phase !== "uploading") return node;
        return {
          ...node,
          data: {
            ...node.data,
            mediaUpload: { ...node.data.mediaUpload, progress: next },
          },
        };
      }),
    );
  };

  let result: UploadCanvasMediaResult;
  try {
    result = await input.upload(file, patchUploading);
  } catch (err) {
    markUploadFailed(input.onNodes, id, err instanceof Error ? err.message : "Upload failed");
    return;
  }

  if (!result.ok) {
    markUploadFailed(input.onNodes, id, result.error);
    return;
  }

  const settled = settledMediaData(result);
  let stillThere = false;
  input.onNodes((prev) => {
    // Both strict-mode updater calls see the same list, so this flag stays stable.
    stillThere = prev.some((node) => node.id === id && isUnsettledMediaUpload(node.data));
    if (!stillThere) return prev;
    return prev.map((node) =>
      node.id === id ? { ...node, connectable: true, data: settled } : node,
    );
  });
  if (!stillThere || !settled.mediaUrl || !settled.mediaKind || !settled.fileName) return;
  input.onSettled();
  input.onVisualSettled?.({
    id,
    mediaKind: settled.mediaKind,
    mediaUrl: settled.mediaUrl,
    fileName: settled.fileName,
  });
}

function markUploadFailed(
  onNodes: (update: (prev: FlowNode[]) => FlowNode[]) => void,
  id: string,
  error: string,
): void {
  onNodes((prev) =>
    prev.map((node) => {
      if (node.id !== id || node.data.mediaUpload?.phase !== "uploading") return node;
      return {
        ...node,
        data: {
          ...node.data,
          mediaUpload: { phase: "failed", error },
        },
      };
    }),
  );
}
