import { mediaSrc } from "@/lib/media-src";
import type { AspectRatio, ClipFrame } from "@/types/project";

// Higgsfield Wan 3.0 I2V: `image_url` = first frame, `end_image_url` = last
// frame (console.higgsfield.ai/models/alibaba/wan-3.0/image-to-video).

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

export function wanClipVideoInput(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  startImageUrl: string;
  endImageUrl: string;
}) {
  return {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio,
    duration: Math.min(8, Math.max(3, Math.round(input.durationSeconds))),
    resolution: "720p" as const,
    image_url: input.startImageUrl,
    end_image_url: input.endImageUrl,
    generate_audio: true,
  };
}
