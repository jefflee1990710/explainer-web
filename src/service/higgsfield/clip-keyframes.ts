import {
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_SEEDANCE_2_FAST_VIDEO_MODEL,
} from "@/service/openrouter/generate";
import { isRealisticStyle } from "@/service/style/realistic-light";
import { mediaSrc } from "@/util/media-src";
import type { AspectRatio, ClipFrame, FramePosition } from "@/model/project";

// Mentalok harness uses Higgsfield MiniMax H3 first+last-frame I2V.
// Production V2 slug (H3 Max CLI job_type is OAuth-only).
export const MINIMAX_H3_VIDEO_MODEL = "minimax/h3/image-to-video";

// Cinematic realistic uses MiniMax Hailuo 3 (2K + audio + first/last frame) on OpenRouter; non-realistic styles use Seedance 2.0 Fast.
export const SEEDANCE_2_VIDEO_MODEL = OPENROUTER_HAILUO_3_VIDEO_MODEL;
export const SEEDANCE_2_FAST_VIDEO_MODEL = OPENROUTER_SEEDANCE_2_FAST_VIDEO_MODEL;

export function clipVideoModel(
  styleOrId?: string | { id?: string; baseStyleId?: string } | null,
) {
  const style = typeof styleOrId === "string" ? { id: styleOrId } : styleOrId;
  return isRealisticStyle(style) ? SEEDANCE_2_VIDEO_MODEL : SEEDANCE_2_FAST_VIDEO_MODEL;
}

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

// The still a clip video lands on: this clip's end, or the next clip's start
// when `endFromNextStart` (talking-head clips before the last one).
export function videoEndFrame(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
  endFromNextStart?: boolean,
) {
  return endFromNextStart
    ? frames?.find((frame) => frame.clipNumber === clipNumber + 1 && frame.position === "start")
    : frames?.find((frame) => frame.clipNumber === clipNumber && frame.position === "end");
}

// Video sends the clean still, unless this clip burns the subtitle onto the still first.
// `merged` then returns only the composited file, never the clean one.
export function videoKeyframeUrls(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
  options?: { merged?: boolean; endFromNextStart?: boolean },
) {
  const startFrame = frames?.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === "start",
  );
  const endFrame = videoEndFrame(frames, clipNumber, options?.endFromNextStart);
  const pick = (frame?: ClipFrame) => (options?.merged ? frame?.mergedUrl : mediaSrc(frame));
  return { start: pick(startFrame), end: pick(endFrame) };
}

// Which completed still this frame must continue from. End always prefers
// this clip's start; start prefers the previous clip's end, then this clip's
// end (a start redo after the end already exists).
// When `anchorToFirstClip` is true (locked-camera talking-head clips 2+), start
// and end frames anchor to Clip 1's clean frame so multi-clip edits never suffer
// multi-generation daisy-chain degradation across 8+ clips.
export function clipFrameAnchor(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
  position: FramePosition,
  options?: { anchorToFirstClip?: boolean },
): { url: string; kind: FrameAnchorKind } | undefined {
  const rows = frames || [];
  if (position === "start" && options?.anchorToFirstClip && clipNumber > 1) {
    const clip1StartUrl = completedUrl(
      rows.find((frame) => frame.clipNumber === 1 && frame.position === "start"),
    );
    return clip1StartUrl ? { url: clip1StartUrl, kind: "clip-start" } : undefined;
  }
  if (position === "end") {
    const start = rows.find(
      (frame) => frame.clipNumber === clipNumber && frame.position === "start",
    );
    const url = completedUrl(start);
    if (url) return { url, kind: "clip-start" };
    if (options?.anchorToFirstClip && clipNumber > 1) {
      const clip1Start = rows.find(
        (frame) => frame.clipNumber === 1 && frame.position === "start",
      );
      const clip1StartUrl = completedUrl(clip1Start);
      if (clip1StartUrl) return { url: clip1StartUrl, kind: "clip-start" };
      const clip1End = rows.find(
        (frame) => frame.clipNumber === 1 && frame.position === "end",
      );
      const clip1EndUrl = completedUrl(clip1End);
      if (clip1EndUrl) return { url: clip1EndUrl, kind: "clip-start" };
    }
    return undefined;
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

function frameStillRunning(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
  position: FramePosition,
) {
  const frame = frames?.find(
    (item) => item.clipNumber === clipNumber && item.position === position,
  );
  return frame?.status === "queued" || frame?.status === "in_progress";
}

// End stills wait until this clip's start file exists. Later start stills wait
// until the previous clip's end file exists, so the new shot can keep that place.
// `startsFollowFirstClip` (talking-head): later starts wait for Clip 1's start instead.
export function planFrameSubmissions<T extends FrameSubmitTarget>(
  targets: T[],
  frames: ClipFrame[] | undefined,
  options?: { startsFollowFirstClip?: boolean },
) {
  const ready: T[] = [];
  const deferred: T[] = [];
  for (const target of targets) {
    if (target.position === "end" && !clipKeyframeUrls(frames, target.clipNumber).start) {
      deferred.push(target);
      continue;
    }
    if (options?.startsFollowFirstClip) {
      const waitsForFirst =
        target.position === "start" &&
        target.clipNumber > 1 &&
        !clipKeyframeUrls(frames, 1).start &&
        (targets.some((item) => item.clipNumber === 1 && item.position === "start") ||
          frameStillRunning(frames, 1, "start"));
      (waitsForFirst ? deferred : ready).push(target);
      continue;
    }
    const prevClip = target.clipNumber - 1;
    const prevEndInBatch = targets.some(
      (item) => item.clipNumber === prevClip && item.position === "end",
    );
    if (
      target.position === "start" &&
      prevClip >= 1 &&
      !clipKeyframeUrls(frames, prevClip).end &&
      (prevEndInBatch || frameStillRunning(frames, prevClip, "end"))
    ) {
      deferred.push(target);
      continue;
    }
    ready.push(target);
  }
  return { ready, deferred };
}

// Video must have both files, unless this clip sends the start image only.
// A completed row without a URL is not ready.
export function assertClipKeyframes(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
  options?: { startOnly?: boolean },
) {
  const { start, end } = clipKeyframeUrls(frames, clipNumber);
  if (!start || (!options?.startOnly && !end)) {
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
  // Omitted for start-only directors: the end scene stays text, not a frame.
  endImageUrl?: string;
}) {
  return {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio,
    duration: h3DurationSeconds(input.durationSeconds),
    resolution: "2K" as const,
    image_url: input.startImageUrl,
    ...(input.endImageUrl ? { end_image_url: input.endImageUrl } : {}),
    aigc_watermark: false,
  };
}

// Seedance 2.0 rejects unknown fields. Framing follows the start still.
// Native audio stays on so dialogue in the prompt is spoken in the clip.
export function seedanceClipVideoInput(input: {
  prompt: string;
  durationSeconds: number;
  startImageUrl: string;
  // Omitted for Cinematic realistic whiteboard: the end scene is text, not a frame.
  endImageUrl?: string;
}) {
  return {
    prompt: input.prompt,
    duration: h3DurationSeconds(input.durationSeconds),
    resolution: "1080p" as const,
    image_url: input.startImageUrl,
    ...(input.endImageUrl ? { end_image_url: input.endImageUrl } : {}),
    generate_audio: true,
  };
}
