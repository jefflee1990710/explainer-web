import { hasFalKey } from "@/service/fal/key";
import { falQueueSubscribe } from "@/service/fal/queue";
import {
  computeMaskInteriorAnchorPoint,
  decodeFalSparseRle,
  maskForegroundRatio,
  normalizedBBoxFromMask,
} from "@/service/fal/rle";
import { uploadFalBuffer } from "@/service/fal/storage";

export const FAL_SAM3_IMAGE_RLE_ENDPOINT = "fal-ai/sam-3/image-rle";

/** Minimum foreground pixel ratio (0.6% of canvas) to keep a detected person mask. */
const MIN_PERSON_MASK_AREA_RATIO = 0.006;

export type DetectedSourcePerson = {
  objectId: number;
  personIndex: number;
  label: string;
  rle: string;
  width: number;
  height: number;
  score: number;
  box: { x: number; y: number; width: number; height: number };
  anchorPoint: { x: number; y: number };
};

type FalSam3ImageRleResult = {
  rle?: string | string[];
  scores?: Array<number | null> | null;
  metadata?: Array<{ index: number; score?: number | null; box?: number[] | null }> | null;
};

type FetchOptions = {
  fetch?: typeof fetch;
  pollIntervalMs?: number;
  maxWaitMs?: number;
};

/**
 * Segment all people in a single frame using `fal-ai/sam-3/image-rle` and return
 * pixel-accurate RLE masks sorted left-to-right (`Person #1`, `Person #2`, ...).
 */
export async function detectPeopleWithFalSam3ImageRle(
  input: {
    imageBuffer: Buffer;
    width: number;
    height: number;
    maxMasks?: number;
  },
  options: FetchOptions = {},
): Promise<DetectedSourcePerson[]> {
  if (!hasFalKey() || input.width <= 0 || input.height <= 0) {
    return [];
  }

  const imageUrl = await uploadFalBuffer(
    {
      bytes: input.imageBuffer,
      fileName: "jutsu-frame0.jpg",
      contentType: "image/jpeg",
    },
    options,
  );

  const result = await falQueueSubscribe<FalSam3ImageRleResult>(
    FAL_SAM3_IMAGE_RLE_ENDPOINT,
    {
      image_url: imageUrl,
      prompt: "person",
      return_multiple_masks: true,
      max_masks: input.maxMasks ?? 6,
      include_scores: true,
      include_boxes: true,
      apply_mask: false,
    },
    options,
  );

  const rawRles = Array.isArray(result.rle)
    ? result.rle
    : typeof result.rle === "string"
      ? [result.rle]
      : [];

  const candidates: Array<Omit<DetectedSourcePerson, "personIndex" | "label">> = [];

  for (let idx = 0; idx < rawRles.length; idx++) {
    const rle = (rawRles[idx] || "").trim();
    if (!rle) continue;
    const mask = decodeFalSparseRle(rle, input.width, input.height);
    if (maskForegroundRatio(mask) < MIN_PERSON_MASK_AREA_RATIO) continue;

    const box = normalizedBBoxFromMask(mask, input.width, input.height);
    const anchorPoint = computeMaskInteriorAnchorPoint(mask, input.width, input.height);
    if (!box || !anchorPoint) continue;

    const metaEntry = result.metadata?.find((m) => m.index === idx) ?? result.metadata?.[idx];
    const objectId = typeof metaEntry?.index === "number" ? metaEntry.index : idx;
    const score =
      typeof metaEntry?.score === "number"
        ? metaEntry.score
        : typeof result.scores?.[idx] === "number"
          ? (result.scores[idx] as number)
          : 1;

    candidates.push({
      objectId,
      rle,
      width: input.width,
      height: input.height,
      score,
      box: {
        x: Math.round(box.x * 1000) / 1000,
        y: Math.round(box.y * 1000) / 1000,
        width: Math.round(box.width * 1000) / 1000,
        height: Math.round(box.height * 1000) / 1000,
      },
      anchorPoint,
    });
  }

  // Sort left-to-right by horizontal center of the person's RLE mask.
  candidates.sort(
    (a, b) => a.box.x + a.box.width / 2 - (b.box.x + b.box.width / 2),
  );

  return candidates.map((item, i) => ({
    ...item,
    personIndex: i + 1,
    label: `Person #${i + 1}`,
  }));
}
