import { falQueueSubscribe } from "@/service/fal/queue";
import { uploadFalBuffer } from "@/service/fal/storage";

export const FAL_SAM3_VIDEO_RLE_ENDPOINT = "fal-ai/sam-3/video-rle";

export type FalSam3BoxPrompt = {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  frame_index?: number;
  object_id?: number;
};

export type FalSam3PointPrompt = {
  x: number;
  y: number;
  label: 0 | 1;
  frame_index?: number;
  object_id?: number;
};

export type FalSam3VideoRleResult = {
  rle: string[] | { url: string };
  metadata?: Array<{ index: number; score?: number | null; box?: number[] | null }>;
  boxes?: Array<number[] | null>;
  boundingbox_frames_zip?: { url?: string } | null;
};

type FetchOptions = { fetch?: typeof fetch };

/** Resolve per-frame RLE strings (inline list or downloaded JSON file URL). */
export async function resolveFalSam3RleFrames(
  rle: FalSam3VideoRleResult["rle"],
  options: FetchOptions = {},
): Promise<string[]> {
  if (Array.isArray(rle)) {
    return rle.map((entry) => (typeof entry === "string" ? entry : ""));
  }
  if (rle && typeof rle === "object" && typeof rle.url === "string") {
    const fetchFn = options.fetch ?? fetch;
    const res = await fetchFn(rle.url);
    if (!res.ok) {
      throw new Error(`fal RLE JSON download failed (${res.status})`);
    }
    const body = (await res.json()) as unknown;
    if (Array.isArray(body)) {
      return body.map((entry) => (typeof entry === "string" ? entry : ""));
    }
    if (body && typeof body === "object" && Array.isArray((body as { rle?: unknown }).rle)) {
      return ((body as { rle: unknown[] }).rle).map((entry) =>
        typeof entry === "string" ? entry : "",
      );
    }
  }
  throw new Error("fal sam-3/video-rle returned an unexpected rle payload");
}

/** Upload a section clip and run fal SAM 3 video RLE segmentation. */
export async function segmentVideoWithFalSam3Rle(
  input: {
    videoBuffer: Buffer;
    fileName?: string;
    prompt?: string;
    detectionThreshold?: number;
    boxPrompts?: FalSam3BoxPrompt[];
    pointPrompts?: FalSam3PointPrompt[];
  },
  options: FetchOptions & { pollIntervalMs?: number; maxWaitMs?: number } = {},
): Promise<{ rleFrames: string[] }> {
  const videoUrl = await uploadFalBuffer(
    {
      bytes: input.videoBuffer,
      fileName: input.fileName || "sam3-section.mp4",
      contentType: "video/mp4",
    },
    options,
  );

  const prompt = (input.prompt || "person").trim() || "person";
  const result = await falQueueSubscribe<FalSam3VideoRleResult>(
    FAL_SAM3_VIDEO_RLE_ENDPOINT,
    {
      video_url: videoUrl,
      prompt,
      detection_threshold: input.detectionThreshold ?? 0.5,
      point_prompts: input.pointPrompts || [],
      box_prompts: input.boxPrompts || [],
    },
    options,
  );

  const rleFrames = await resolveFalSam3RleFrames(result.rle, options);
  return { rleFrames };
}
