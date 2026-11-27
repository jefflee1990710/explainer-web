// Gemini Omni video on Google AI Studio Interactions API. Not OpenRouter.

import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import type { GenerationStatus } from "@/model/generation-job";
import { providerErrorMessage } from "@/service/generation/provider-error";
import { googleStudioApiKey, googleStudioInlineImageFromUrl } from "@/service/google/studio-image";
import {
  GOOGLE_STUDIO_VIDEO_MODELS,
  googleStudioBareModelId,
} from "@/service/google/studio-price";

const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_IMAGES = 6;

type FetchOptions = {
  fetch?: typeof fetch;
};

type InlineImage = {
  mimeType: string;
  data: string;
};

type VideoInput = {
  type: "text" | "image";
  text?: string;
  data?: string;
  mime_type?: string;
};

export function googleStudioVideoModel(model: string): string | undefined {
  const bare = googleStudioBareModelId(model);
  return GOOGLE_STUDIO_VIDEO_MODELS.some((item) => item.id === bare) ? bare : undefined;
}

function videoSpec(model: string) {
  return (
    GOOGLE_STUDIO_VIDEO_MODELS.find((item) => item.id === model) ?? GOOGLE_STUDIO_VIDEO_MODELS[0]
  );
}

// Whole seconds Omni will accept. Two frames cannot exceed 10s.
export function googleStudioVideoSeconds(input: {
  model: string;
  durationSeconds?: number;
  hasEndFrame?: boolean;
}): number {
  const spec = videoSpec(input.model);
  const requested =
    input.durationSeconds !== undefined && Number.isFinite(input.durationSeconds)
      ? Math.round(input.durationSeconds)
      : spec.defaultDurationSeconds;
  const capped = input.hasEndFrame ? Math.min(requested, 10) : requested;
  return Math.min(spec.maxDurationSeconds, Math.max(spec.minDurationSeconds, capped));
}

function aspectRatio(value?: string): "16:9" | "9:16" {
  return value === "9:16" ? "9:16" : "16:9";
}

// Interactions create body. Images are start, end, then references, six total.
export function googleStudioVideoRequest(input: {
  model: string;
  prompt: string;
  aspectRatio?: string;
  durationSeconds?: number;
  startImage?: InlineImage;
  endImage?: InlineImage;
  referenceImages?: InlineImage[];
}) {
  const model = googleStudioVideoModel(input.model) || GOOGLE_STUDIO_VIDEO_MODELS[0].id;
  const images: InlineImage[] = [];
  if (input.startImage) images.push(input.startImage);
  if (input.endImage) images.push(input.endImage);
  for (const image of input.referenceImages || []) {
    if (images.length >= MAX_IMAGES) break;
    images.push(image);
  }
  const content: VideoInput[] = [
    ...images.slice(0, MAX_IMAGES).map((image) => ({
      type: "image" as const,
      data: image.data,
      mime_type: image.mimeType,
    })),
    { type: "text", text: input.prompt },
  ];
  return {
    model,
    background: true,
    input: content,
    response_format: {
      type: "video",
      aspect_ratio: aspectRatio(input.aspectRatio),
      resolution: "720p",
      duration: `${googleStudioVideoSeconds({
        model,
        durationSeconds: input.durationSeconds,
        hasEndFrame: Boolean(input.endImage),
      })}s`,
      delivery: "uri",
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

// Google nests the reason on error.message, error.details, or a JSON string.
function errorText(body: Record<string, unknown>): string | undefined {
  return providerErrorMessage(body);
}

function videoPart(body: Record<string, unknown>): Record<string, unknown> | undefined {
  const steps = Array.isArray(body.steps) ? body.steps : [];
  const parts: Record<string, unknown>[] = [];
  for (const step of steps) {
    const content = asRecord(step).content;
    const items = Array.isArray(content) ? content : [];
    for (const item of items) {
      const record = asRecord(item);
      if (record.type === "video") parts.push(record);
    }
  }
  return parts.at(-1);
}

export function googleStudioVideoStatus(body: Record<string, unknown>): GenerationStatus {
  const status = typeof body.status === "string" ? body.status : "";
  if (status === "completed") return "completed";
  if (status === "failed" || status === "cancelled") {
    const message = errorText(body) || "";
    if (/safety|blocked|prohibited|nsfw/i.test(message)) return "nsfw";
    return "failed";
  }
  return "in_progress";
}

async function videoUrlFromPart(
  part: Record<string, unknown> | undefined,
  fetchFn: typeof fetch,
): Promise<string | undefined> {
  if (!part) return undefined;
  const mime = typeof part.mime_type === "string" && part.mime_type ? part.mime_type : "video/mp4";
  if (typeof part.data === "string" && part.data) return `data:${mime};base64,${part.data}`;
  const uri = typeof part.uri === "string" ? part.uri : "";
  if (!uri) return undefined;
  const key = googleStudioApiKey();
  const response = await fetchFn(uri, {
    headers: key ? { "x-goog-api-key": key } : undefined,
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`無法下載 Google 影片（${response.status}）`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const header = response.headers.get("content-type") || mime;
  return `data:${header.split(";")[0] || mime};base64,${bytes.toString("base64")}`;
}

export async function googleStudioVideoResult(
  body: Record<string, unknown>,
  fetchFn: typeof fetch,
): Promise<GenerationSubmitResult> {
  const id = typeof body.id === "string" && body.id ? body.id : crypto.randomUUID();
  const status = googleStudioVideoStatus(body);
  const error = errorText(body);
  if (status === "failed" || status === "nsfw") {
    return { request_id: id, status, error: error || "Google AI Studio 影片產生失敗", model: typeof body.model === "string" ? body.model : undefined };
  }
  if (status !== "completed") {
    return {
      request_id: id,
      status,
      status_url: `${INTERACTIONS_URL}/${id}`,
      model: typeof body.model === "string" ? body.model : undefined,
    };
  }
  const url = await videoUrlFromPart(videoPart(body), fetchFn);
  if (!url) {
    return { request_id: id, status: "failed", error: error || "Google AI Studio 未回傳影片" };
  }
  return { request_id: id, status: "completed", video: { url }, model: typeof body.model === "string" ? body.model : undefined };
}

export async function submitGoogleStudioVideo(
  input: {
    model: string;
    prompt?: string;
    aspectRatio?: string;
    durationSeconds?: number;
    startImageUrl?: string;
    endImageUrl?: string;
    referenceImageUrls?: Array<string | undefined>;
  },
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = googleStudioApiKey();
  if (!key) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  const model = googleStudioVideoModel(input.model);
  if (!model) throw new Error(`Google AI Studio 沒有這個影片模型（${input.model}）`);
  const fetchFn = options?.fetch ?? fetch;
  const startImage = input.startImageUrl
    ? await googleStudioInlineImageFromUrl(input.startImageUrl, fetchFn)
    : undefined;
  const endImage = input.endImageUrl
    ? await googleStudioInlineImageFromUrl(input.endImageUrl, fetchFn)
    : undefined;
  const referenceImages = [];
  for (const url of (input.referenceImageUrls || []).filter((item): item is string => Boolean(item))) {
    if (referenceImages.length >= MAX_IMAGES) break;
    referenceImages.push(await googleStudioInlineImageFromUrl(url, fetchFn));
  }
  const response = await fetchFn(INTERACTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(
      googleStudioVideoRequest({
        model,
        prompt: input.prompt || "",
        aspectRatio: input.aspectRatio,
        durationSeconds: input.durationSeconds,
        startImage,
        endImage,
        referenceImages,
      }),
    ),
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const parsed = await googleStudioVideoResult(body, fetchFn);
    throw new Error(parsed.error || `Google AI Studio 影片產生失敗（${response.status}）`);
  }
  return googleStudioVideoResult(body, fetchFn);
}

export async function fetchGoogleStudioVideo(
  interactionId: string,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = googleStudioApiKey();
  if (!key) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(`${INTERACTIONS_URL}/${encodeURIComponent(interactionId)}`, {
    headers: { "x-goog-api-key": key },
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const parsed = await googleStudioVideoResult(body, fetchFn);
    throw new Error(parsed.error || `Google AI Studio 影片查詢失敗（${response.status}）`);
  }
  return googleStudioVideoResult(body, fetchFn);
}
