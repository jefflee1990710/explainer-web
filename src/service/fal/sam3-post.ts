import sharp from "sharp";
import type { DetectedPostElement, PostElementCategory } from "@/model/post";
import { hasFalKey } from "@/service/fal/key";
import { falQueueSubscribe } from "@/service/fal/queue";
import {
  binaryMaskIoU,
  computeMaskInteriorAnchorPoint,
  decodeFalSparseRle,
  maskForegroundRatio,
  normalizedBBoxFromMask,
} from "@/service/fal/rle";
import { FAL_SAM3_IMAGE_RLE_ENDPOINT } from "@/service/fal/sam3-image";
import { uploadFalBuffer } from "@/service/fal/storage";
import { OPENROUTER_JUTSU_VLM_MODEL } from "@/service/jutsu/describer";
import { OPENROUTER_BASE_URL, openRouterApiKey } from "@/service/openrouter/generate";

export type DiscoveredPostObject = {
  prompt: string;
  labelEn: string;
  labelZh: string;
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

const FALLBACK_DISCOVERED_OBJECTS: DiscoveredPostObject[] = [
  {
    prompt: "foreground object, product, item",
    labelEn: "Object",
    labelZh: "物件",
  },
];

const VLM_POST_INVENTORY_SYSTEM_PROMPT = `You inspect a social media poster or promotional image and list up to 4 distinct foreground objects/props/products (excluding people and text) that a user might want to select and edit, plus whether the image contains visible text/typography.
Return ONLY valid JSON with this exact shape:
{"objects":[{"prompt":"short English noun for SAM segmentation, e.g. coffee cup","labelEn":"Coffee Cup","labelZh":"咖啡杯"}],"hasText":true}`;

/**
 * Use OpenRouter VLM to list up to 4 foreground objects in the post image so SAM 3 can segment
 * each with a specific prompt and human-friendly English + Traditional Chinese label.
 */
export async function discoverPostObjectsWithVlm(
  imageBuffer: Buffer,
  options: FetchOptions = {},
): Promise<{ objects: DiscoveredPostObject[]; hasText: boolean }> {
  const key = openRouterApiKey();
  if (!key) {
    return { objects: FALLBACK_DISCOVERED_OBJECTS, hasText: true };
  }

  const fetchImpl = options.fetch ?? fetch;
  try {
    const thumbBuf = await sharp(imageBuffer)
      .resize(768, 768, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer()
      .catch(() => imageBuffer);

    const res = await fetchImpl(`${OPENROUTER_BASE_URL}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_JUTSU_VLM_MODEL,
        messages: [
          { role: "system", content: VLM_POST_INVENTORY_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${thumbBuf.toString("base64")}`,
                },
              },
              {
                type: "text",
                text: "List up to 4 distinct non-person, non-text foreground objects and whether visible text exists.",
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 350,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      return { objects: FALLBACK_DISCOVERED_OBJECTS, hasText: true };
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawText = (body.choices?.[0]?.message?.content || "").trim();
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      objects?: Array<{ prompt?: string; labelEn?: string; labelZh?: string }>;
      hasText?: boolean;
    };

    const objects: DiscoveredPostObject[] = [];
    for (const item of parsed.objects ?? []) {
      const prompt = (item.prompt || "").trim();
      if (!prompt) continue;
      objects.push({
        prompt,
        labelEn: (item.labelEn || prompt).trim(),
        labelZh: (item.labelZh || item.labelEn || prompt).trim(),
      });
      if (objects.length >= 4) break;
    }

    return {
      objects: objects.length > 0 ? objects : FALLBACK_DISCOVERED_OBJECTS,
      hasText: parsed.hasText !== false,
    };
  } catch {
    return { objects: FALLBACK_DISCOVERED_OBJECTS, hasText: true };
  }
}

type RawMaskCandidate = {
  category: PostElementCategory;
  baseLabelEn: string;
  baseLabelZh: string;
  rle: string;
  mask: Uint8Array;
  score: number;
  box: { x: number; y: number; width: number; height: number };
  anchorPoint: { x: number; y: number };
};

async function querySam3Prompt(
  imageUrl: string,
  prompt: string,
  maxMasks: number,
  options: FetchOptions,
): Promise<FalSam3ImageRleResult> {
  return falQueueSubscribe<FalSam3ImageRleResult>(
    FAL_SAM3_IMAGE_RLE_ENDPOINT,
    {
      image_url: imageUrl,
      prompt,
      return_multiple_masks: true,
      max_masks: maxMasks,
      include_scores: true,
      include_boxes: true,
      apply_mask: false,
    },
    options,
  ).catch(() => ({}));
}

function parseCandidatesFromResult(input: {
  result: FalSam3ImageRleResult;
  category: PostElementCategory;
  baseLabelEn: string;
  baseLabelZh: string;
  width: number;
  height: number;
  minAreaRatio: number;
}): RawMaskCandidate[] {
  const { result, category, baseLabelEn, baseLabelZh, width, height, minAreaRatio } = input;
  const rawRles = Array.isArray(result.rle)
    ? result.rle
    : typeof result.rle === "string"
      ? [result.rle]
      : [];

  const out: RawMaskCandidate[] = [];
  for (let idx = 0; idx < rawRles.length; idx++) {
    const rle = (rawRles[idx] || "").trim();
    if (!rle) continue;
    const mask = decodeFalSparseRle(rle, width, height);
    if (maskForegroundRatio(mask) < minAreaRatio) continue;
    const box = normalizedBBoxFromMask(mask, width, height);
    const anchorPoint = computeMaskInteriorAnchorPoint(mask, width, height);
    if (!box || !anchorPoint) continue;

    const metaEntry = result.metadata?.find((m) => m.index === idx) ?? result.metadata?.[idx];
    const score =
      typeof metaEntry?.score === "number"
        ? metaEntry.score
        : typeof result.scores?.[idx] === "number"
          ? (result.scores[idx] as number)
          : 1;

    out.push({
      category,
      baseLabelEn,
      baseLabelZh,
      rle,
      mask,
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
  return out;
}

function deduplicateCandidates(
  candidates: RawMaskCandidate[],
  iouThreshold: number,
  excludeMasks: readonly Uint8Array[] = [],
): RawMaskCandidate[] {
  const kept: RawMaskCandidate[] = [];
  for (const cand of candidates) {
    if (excludeMasks.some((ex) => binaryMaskIoU(cand.mask, ex) > 0.6)) {
      continue;
    }
    if (kept.some((k) => binaryMaskIoU(cand.mask, k.mask) > iouThreshold)) {
      continue;
    }
    kept.push(cand);
  }
  kept.sort((a, b) => a.box.x + a.box.width / 2 - (b.box.x + b.box.width / 2));
  return kept;
}

/**
 * Segment people, foreground objects, and typography/text in a Post image via
 * VLM object inventory + parallel `fal-ai/sam-3/image-rle` calls.
 */
export async function detectPostElementsWithFalSam3(
  input: {
    imageBuffer: Buffer;
    width: number;
    height: number;
  },
  options: FetchOptions = {},
): Promise<DetectedPostElement[]> {
  if (!hasFalKey() || input.width <= 0 || input.height <= 0) {
    return [];
  }

  const [imageUrl, inventory] = await Promise.all([
    uploadFalBuffer(
      {
        bytes: input.imageBuffer,
        fileName: "post-frame.jpg",
        contentType: "image/jpeg",
      },
      options,
    ),
    discoverPostObjectsWithVlm(input.imageBuffer, options),
  ]);

  const objectQueries = inventory.objects.slice(0, 4);

  const [personResult, textResult, ...objectResults] = await Promise.all([
    querySam3Prompt(imageUrl, "person", 6, options),
    inventory.hasText
      ? querySam3Prompt(imageUrl, "text, title, headline, typography, logo", 6, options)
      : Promise.resolve({} as FalSam3ImageRleResult),
    ...objectQueries.map((obj) => querySam3Prompt(imageUrl, obj.prompt, 2, options)),
  ]);

  const personRaw = parseCandidatesFromResult({
    result: personResult,
    category: "person",
    baseLabelEn: "Person",
    baseLabelZh: "人物",
    width: input.width,
    height: input.height,
    minAreaRatio: 0.005,
  });
  const people = deduplicateCandidates(personRaw, 0.65);

  const textRaw = parseCandidatesFromResult({
    result: textResult,
    category: "text",
    baseLabelEn: "Text",
    baseLabelZh: "文字",
    width: input.width,
    height: input.height,
    minAreaRatio: 0.002,
  });
  const texts = deduplicateCandidates(textRaw, 0.65);

  const objectRaw: RawMaskCandidate[] = [];
  for (let i = 0; i < objectQueries.length; i++) {
    const spec = objectQueries[i]!;
    const res = objectResults[i] ?? {};
    objectRaw.push(
      ...parseCandidatesFromResult({
        result: res,
        category: "object",
        baseLabelEn: spec.labelEn,
        baseLabelZh: spec.labelZh,
        width: input.width,
        height: input.height,
        minAreaRatio: 0.004,
      }),
    );
  }

  const nonObjectMasks = [...people.map((p) => p.mask), ...texts.map((t) => t.mask)];
  const objects = deduplicateCandidates(objectRaw, 0.65, nonObjectMasks);

  const finalize = (list: RawMaskCandidate[], category: PostElementCategory): DetectedPostElement[] =>
    list.map((item, idx) => {
      const categoryIndex = idx + 1;
      const isGeneric =
        category === "person" ||
        category === "text" ||
        item.baseLabelEn.toLowerCase() === "object";
      const label = isGeneric ? `${item.baseLabelEn} #${categoryIndex}` : item.baseLabelEn;
      const labelZh = isGeneric ? `${item.baseLabelZh} #${categoryIndex}` : item.baseLabelZh;
      return {
        id: `${category}-${categoryIndex}`,
        category,
        categoryIndex,
        label,
        labelZh,
        rle: item.rle,
        width: input.width,
        height: input.height,
        score: item.score,
        box: item.box,
        anchorPoint: item.anchorPoint,
      };
    });

  return [
    ...finalize(people, "person"),
    ...finalize(objects, "object"),
    ...finalize(texts, "text"),
  ];
}
