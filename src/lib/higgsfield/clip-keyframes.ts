import { mediaSrc } from "@/lib/media-src";
import type { AspectRatio, ClipFrame, FramePosition } from "@/types/project";

// Mentalok harness uses Higgsfield MiniMax H3 first+last-frame I2V.
// Production V2 slug (H3 Max CLI job_type is OAuth-only).
export const MINIMAX_H3_VIDEO_MODEL = "minimax/h3/image-to-video";

export type FrameAnchorKind = "clip-start" | "prev-end" | "clip-end";

export type FrameSubmitTarget = {
  clipNumber: number;
  position: FramePosition;
};

function completedUrl(frame: ClipFrame | undefined) {
  return mediaSrc(frame);
}

// Higgsfield MiniMax H3 I2V: `image_url` = first frame, `end_image_url` = last
// frame (console.higgsfield.ai/models/minimax/h3/image-to-video).

export function clipKeyframeUrls(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
) {
  const start = mediaSrc(
    frames?.find((frame) => frame.clipNumber === clipNumber && frame.position === "start"),
  );
  const end = mediaSrc(
    frames?.find((frame) => frame.clipNumber === clipNumber && frame.position === "end"),
  );
  return { start, end };
}

// Which completed still this frame must continue from. End always prefers
// this clip's start; start prefers the previous clip's end, then this clip's
// end (a start redo after the end already exists).
export function clipFrameAnchor(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
  position: FramePosition,
): { url: string; kind: FrameAnchorKind } | undefined {
  const rows = frames || [];
  if (position === "end") {
    const start = rows.find(
      (frame) => frame.clipNumber === clipNumber && frame.position === "start",
    );
    const url = completedUrl(start);
    return url ? { url, kind: "clip-start" } : undefined;
  }
  const prevEnd = rows.find(
    (frame) => frame.clipNumber === clipNumber - 1 && frame.position === "end",
  );
  const prevUrl = completedUrl(prevEnd);
  if (prevUrl) return { url: prevUrl, kind: "prev-end" };
  const ownEnd = rows.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === "end",
  );
  const endUrl = completedUrl(ownEnd);
  return endUrl ? { url: endUrl, kind: "clip-end" } : undefined;
}

// End stills wait until this clip's start file exists, so Qwen can lock
// camera and placement to the real start pixels instead of inventing a new shot.
export function planFrameSubmissions<T extends FrameSubmitTarget>(
  targets: T[],
  frames: ClipFrame[] | undefined,
) {
  const ready: T[] = [];
  const deferred: T[] = [];
  for (const target of targets) {
    if (target.position === "end" && !clipKeyframeUrls(frames, target.clipNumber).start) {
      deferred.push(target);
      continue;
    }
    ready.push(target);
  }
  return { ready, deferred };
}

// Video must have both files. A completed row without a URL is not ready.
export function assertClipKeyframes(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
) {
  const { start, end } = clipKeyframeUrls(frames, clipNumber);
  if (!start || !end) {
    throw new Error("這段的起點或終點畫格還沒有檔案，無法產片");
  }
  return { start, end };
}

// MiniMax H3 duration is 5–15s; Explainer clips are 3–8s so short ones lift to 5.
function h3DurationSeconds(seconds: number) {
  return Math.min(15, Math.max(5, Math.round(seconds)));
}

export function h3ClipVideoInput(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  startImageUrl: string;
  endImageUrl: string;
}) {
  return {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio,
    duration: h3DurationSeconds(input.durationSeconds),
    resolution: "2K" as const,
    image_url: input.startImageUrl,
    end_image_url: input.endImageUrl,
    aigc_watermark: false,
  };
}
