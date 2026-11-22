import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import type { AspectRatio } from "@/model/project";
import {
  GOOGLE_STUDIO_IMAGE_MODELS,
  GOOGLE_STUDIO_NANO_BANANA,
  googleStudioBareModelId,
} from "@/service/google/studio-price";

// Nano Banana 2.1 on Google AI Studio. Explainer stills call this directly.
export const GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL = "gemini-nano-banana-2.1";
const STUDIO_IMAGE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

type FetchOptions = {
  fetch?: typeof fetch;
};

type InlineImage = {
  mimeType: string;
  data: string;
};

export function googleStudioApiKey() {
  return (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();
}

export function hasGoogleStudioKey() {
  return Boolean(googleStudioApiKey());
}

const STUDIO_IMAGE_IDS = new Set(GOOGLE_STUDIO_IMAGE_MODELS.map((model) => model.id));

// Canvas and OpenRouter slugs for the same Google AI Studio image model.
export function googleStudioImageModel(model: string): string | undefined {
  const bare = googleStudioBareModelId(model);
  return STUDIO_IMAGE_IDS.has(bare) ? bare : undefined;
}

function referenceLimit(model: string): number {
  return GOOGLE_STUDIO_IMAGE_MODELS.find((item) => item.id === model)?.referenceImages ?? 14;
}

function imageSize(resolution?: "1k" | "2k" | "4k") {
  if (resolution === "4k") return "4K";
  if (resolution === "2k") return "2K";
  return "1K";
}

// Request body for Gemini generateContent image output.
export function googleStudioImageRequest(input: {
  model?: string;
  prompt: string;
  aspectRatio: AspectRatio | "2:3" | "3:4";
  resolution?: "1k" | "2k" | "4k";
  referenceImages?: InlineImage[];
}) {
  const model = googleStudioImageModel(input.model || "") || GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL;
  const references = (input.referenceImages || []).slice(0, referenceLimit(model));
  // Gemini 2.5 Flash Image only documents images up to 1024px and rejects imageSize.
  const legacy = model === GOOGLE_STUDIO_NANO_BANANA;
  const size = legacy ? "1K" : imageSize(input.resolution);
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text: input.prompt },
          ...references.map((image) => ({
            inlineData: { mimeType: image.mimeType, data: image.data },
          })),
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: legacy
        ? { aspectRatio: input.aspectRatio }
        : { aspectRatio: input.aspectRatio, imageSize: size },
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function googleError(body: Record<string, unknown>): string | undefined {
  const err = asRecord(body.error);
  if (typeof err.message === "string" && err.message.trim()) return err.message.trim();
  const feedback = asRecord(body.promptFeedback);
  if (typeof feedback.blockReason === "string" && feedback.blockReason.trim()) {
    return feedback.blockReason.trim();
  }
  return undefined;
}

function inlineImage(part: Record<string, unknown>): InlineImage | undefined {
  const raw = asRecord(part.inlineData || part.inline_data);
  const data = typeof raw.data === "string" ? raw.data : "";
  if (!data) return undefined;
  const mimeType =
    (typeof raw.mimeType === "string" && raw.mimeType) ||
    (typeof raw.mime_type === "string" && raw.mime_type) ||
    "image/png";
  return { mimeType, data };
}

// Thought previews are not the delivered still. Keep the last real image.
export function googleStudioImageFromResponse(body: Record<string, unknown>): InlineImage | undefined {
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const images: InlineImage[] = [];
  for (const candidate of candidates) {
    const content = asRecord(asRecord(candidate).content);
    const parts = Array.isArray(content.parts) ? content.parts : [];
    for (const part of parts) {
      const record = asRecord(part);
      if (record.thought === true) continue;
      const image = inlineImage(record);
      if (image) images.push(image);
    }
  }
  return images.at(-1);
}

function dataUrlImage(url: string): InlineImage | undefined {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(url);
  if (!match) return undefined;
  return { mimeType: match[1] || "image/png", data: match[2].replace(/\s/g, "") };
}

export async function googleStudioInlineImageFromUrl(
  url: string,
  fetchFn: typeof fetch,
): Promise<InlineImage> {
  const inline = dataUrlImage(url);
  if (inline) return inline;
  const response = await fetchFn(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`無法下載參考圖（${response.status}）`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const header = response.headers.get("content-type") || "";
  const mimeType = header.split(";")[0]?.trim() || "image/jpeg";
  return { mimeType, data: bytes.toString("base64") };
}

// Synchronous image: Google returns the still in this response.
export async function submitGoogleStudioImage(
  input: {
    model?: string;
    prompt: string;
    aspectRatio: AspectRatio | "2:3" | "3:4";
    resolution?: "1k" | "2k" | "4k";
    referenceImageUrls?: Array<string | undefined>;
  },
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = googleStudioApiKey();
  if (!key) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  const requested = input.model?.trim();
  const model = requested
    ? googleStudioImageModel(requested)
    : GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL;
  if (!model) throw new Error(`Google AI Studio 沒有這個圖片模型（${requested}）`);
  const fetchFn = options?.fetch ?? fetch;
  const urls = (input.referenceImageUrls || []).filter((url): url is string => Boolean(url));
  const referenceImages: InlineImage[] = [];
  for (const url of urls.slice(0, referenceLimit(model))) {
    referenceImages.push(await googleStudioInlineImageFromUrl(url, fetchFn));
  }
  const response = await fetchFn(`${STUDIO_IMAGE_URL}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(
      googleStudioImageRequest({
        model,
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        referenceImages,
      }),
    ),
    signal: AbortSignal.timeout(180_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const error = googleError(body);
  if (!response.ok) {
    throw new Error(error || `Google AI Studio 圖片產生失敗（${response.status}）`);
  }
  const image = googleStudioImageFromResponse(body);
  if (!image) throw new Error(error || "Google AI Studio 未回傳圖片");
  const requestId =
    (typeof body.responseId === "string" && body.responseId) ||
    (typeof body.response_id === "string" && body.response_id) ||
    crypto.randomUUID();
  return {
    request_id: requestId,
    status: "completed",
    model,
    images: [{ url: `data:${image.mimeType};base64,${image.data}` }],
  };
}
