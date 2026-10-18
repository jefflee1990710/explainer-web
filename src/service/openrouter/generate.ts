import type { GenerationStatus } from "@/model/generation-job";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { openRouterVideoCallbackUrl } from "@/service/openrouter/callback-url";

export const OPENROUTER_BASE_URL = "https://openrouter.ai";
export const OPENROUTER_IMAGES_URL = `${OPENROUTER_BASE_URL}/api/v1/images`;
export const OPENROUTER_VIDEOS_URL = `${OPENROUTER_BASE_URL}/api/v1/videos`;

export const OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL = "bytedance-seed/seedream-5-0-pro";
export const OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL = "bytedance-seed/seedream-5-0-lite";
export const OPENROUTER_GPT_5_IMAGE_MODEL = "openai/gpt-5-image";
export const OPENROUTER_HAILUO_3_VIDEO_MODEL = "minimax/hailuo-3";
export const OPENROUTER_SEEDANCE_2_VIDEO_MODEL = "bytedance/seedance-2.0";
export const OPENROUTER_SEEDANCE_2_FAST_VIDEO_MODEL = "bytedance/seedance-2.0-fast";
export const OPENROUTER_SEEDANCE_2_MINI_VIDEO_MODEL = "bytedance/seedance-2.0-mini";

type FetchOptions = {
  fetch?: typeof fetch;
};

export function openRouterApiKey() {
  return (process.env.OPENROUTER_API_KEY || "").trim();
}

export function hasOpenRouterKey() {
  return Boolean(openRouterApiKey());
}

export function assertOpenRouterKey() {
  const key = openRouterApiKey();
  if (!key) {
    throw new Error("尚未設定 OPENROUTER_API_KEY");
  }
  return key;
}

export function isOpenRouterStatusUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^https:\/\/openrouter\.ai\/api\/v1\/videos\//i.test(url);
}

export function openRouterAuthHeaders(url?: string | null): Record<string, string> | undefined {
  if (!isOpenRouterStatusUrl(url)) return undefined;
  const key = openRouterApiKey();
  return key ? { Authorization: `Bearer ${key}` } : undefined;
}

// OpenAI GPT Image models on OpenRouter accept 1:1 / 3:2 / 2:3 / auto.
// Map 16:9 -> 3:2 and 9:16 -> 2:3; video keeps the true 16:9 / 9:16 ratio.
export function openRouterImageAspectRatio(
  model: string,
  ratio: AspectRatio | "2:3",
): string {
  if (ratio === "2:3") return "2:3";
  if (!/gpt-5-image|gpt-image-1/i.test(model)) return ratio;
  if (ratio === "16:9") return "3:2";
  if (ratio === "9:16") return "2:3";
  return "1:1";
}

export const OPENROUTER_VIDEO_PROMPT_MAX = 6800;

function clampVideoDurationSeconds(seconds: number) {
  return Math.min(15, Math.max(5, Math.round(seconds)));
}

// MiniMax Hailuo 3 enforces a 7000-char limit on prompt text. Preserve the opening
// choreography/voice lock and the closing dialogue/pronunciation lock when trimming.
export function capOpenRouterVideoPrompt(prompt: string, maxChars = OPENROUTER_VIDEO_PROMPT_MAX): string {
  if (prompt.length <= maxChars) return prompt;
  const tailBudget = Math.min(1950, Math.floor(maxChars * 0.3));
  const headBudget = maxChars - tailBudget - 1;
  return `${prompt.slice(0, headBudget).trimEnd()}\n${prompt.slice(prompt.length - tailBudget).trimStart()}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function openRouterError(body: Record<string, unknown>): string | undefined {
  const err = body.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message.trim();
    if (typeof rec.code === "string" && rec.code.trim()) return rec.code.trim();
  }
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  return undefined;
}

function nsfwFrom(error?: string): GenerationStatus | undefined {
  if (!error) return undefined;
  if (/nsfw|sensitive|content.?policy|content.?moderat|safety|inappropriate|moderation/i.test(error)) {
    return "nsfw";
  }
  return undefined;
}

export function openRouterImageBody(input: {
  model: string;
  prompt: string;
  aspectRatio: AspectRatio | "2:3";
  quality?: "low" | "medium" | "high";
  resolution?: "1k" | "2k" | "4k";
  referenceImageUrls?: Array<string | undefined>;
}) {
  const refs = (input.referenceImageUrls || []).filter((url): url is string => Boolean(url));
  const isOpenAiImage = /^openai\//i.test(input.model);
  // Seedream 5.0 Lite only accepts 2K / 4K; Seedream 5.0 Pro accepts 1K / 2K.
  const isSeedreamLite = input.model === OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL;
  const resolution = isSeedreamLite
    ? input.resolution === "4k"
      ? ("4K" as const)
      : ("2K" as const)
    : input.resolution === "2k" || input.resolution === "4k"
      ? ("2K" as const)
      : ("1K" as const);
  return {
    model: input.model,
    prompt: input.prompt,
    aspect_ratio: openRouterImageAspectRatio(input.model, input.aspectRatio),
    ...(isOpenAiImage
      ? {
          quality: input.quality || "medium",
          background: "opaque" as const,
        }
      : {
          resolution,
        }),
    ...(refs.length > 0
      ? {
          input_references: refs.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        }
      : {}),
  };
}

export async function submitOpenRouterImage(
  input: {
    model: string;
    prompt: string;
    aspectRatio: AspectRatio | "2:3";
    quality?: "low" | "medium" | "high";
    resolution?: "1k" | "2k" | "4k";
    referenceImageUrls?: Array<string | undefined>;
  },
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = assertOpenRouterKey();
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(OPENROUTER_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(openRouterImageBody(input)),
    signal: AbortSignal.timeout(8 * 60_000),
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const error = openRouterError(body);
  if (!response.ok) {
    throw new Error(error || `OpenRouter 圖片產生失敗（${response.status}）`);
  }

  const data = Array.isArray(body.data) ? body.data : [];
  const first = asRecord(data[0]);
  const b64 = typeof first.b64_json === "string" && first.b64_json ? first.b64_json : undefined;
  const directUrl = typeof first.url === "string" && first.url ? first.url : undefined;
  const mediaType =
    typeof first.media_type === "string" && first.media_type ? first.media_type : "image/png";
  const imageUrl = directUrl || (b64 ? `data:${mediaType};base64,${b64}` : undefined);

  if (!imageUrl) {
    throw new Error(error || "OpenRouter 未回傳圖片");
  }

  return {
    request_id:
      (typeof body.id === "string" && body.id) ||
      (typeof body.generation_id === "string" && body.generation_id) ||
      crypto.randomUUID(),
    status: nsfwFrom(error) || "completed",
    images: [{ url: imageUrl }],
    ...(error ? { error } : {}),
  };
}

export const DEFAULT_VIDEO_GENERATION_RESOLUTION = "720p";

// Clip video generation resolution (e.g. 720p, 1080p, 2K). Defaults to 720p and can be overridden via VIDEO_GENERATION_RESOLUTION in .env.
export function clipVideoResolution(
  envValue = process.env.VIDEO_GENERATION_RESOLUTION,
): string {
  const trimmed = (envValue || "").trim();
  return trimmed || DEFAULT_VIDEO_GENERATION_RESOLUTION;
}

export function openRouterClipVideoBody(input: {
  model?: string;
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  startImageUrl: string;
  endImageUrl?: string;
  // Public HTTPS receiver. Omitted for localhost; the refresh cron still polls.
  callbackUrl?: string;
}) {
  const model = input.model || OPENROUTER_SEEDANCE_2_FAST_VIDEO_MODEL;
  const configured = clipVideoResolution();
  // OpenRouter's minimax/hailuo-3 endpoint only accepts "2K" in supported_resolutions;
  // Seedance models and Higgsfield endpoints use clipVideoResolution() (default "720p").
  const resolution =
    model === OPENROUTER_HAILUO_3_VIDEO_MODEL && configured !== "2K"
      ? "2K"
      : configured;
  return {
    model,
    prompt: capOpenRouterVideoPrompt(input.prompt),
    aspect_ratio: input.aspectRatio,
    duration: clampVideoDurationSeconds(input.durationSeconds),
    resolution,
    generate_audio: true,
    ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
    frame_images: [
      {
        type: "image_url" as const,
        image_url: { url: input.startImageUrl },
        frame_type: "first_frame" as const,
      },
      ...(input.endImageUrl
        ? [
            {
              type: "image_url" as const,
              image_url: { url: input.endImageUrl },
              frame_type: "last_frame" as const,
            },
          ]
        : []),
    ],
  };
}

function mapOpenRouterVideoStatus(status: string, error?: string): GenerationStatus {
  const nsfw = nsfwFrom(error);
  if (nsfw) return nsfw;
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "completed";
  if (normalized === "in_progress" || normalized === "processing" || normalized === "running") {
    return "in_progress";
  }
  if (normalized === "failed" || normalized === "cancelled" || normalized === "expired") {
    return "failed";
  }
  return "queued";
}

function resolvePollingUrl(rawPollingUrl: unknown, jobId: string): string {
  if (typeof rawPollingUrl === "string" && rawPollingUrl.trim()) {
    return new URL(rawPollingUrl.trim(), OPENROUTER_BASE_URL).toString();
  }
  return `${OPENROUTER_VIDEOS_URL}/${encodeURIComponent(jobId)}`;
}

function firstStringUrl(list: unknown): string | undefined {
  if (!Array.isArray(list)) return undefined;
  for (const item of list) {
    if (typeof item === "string" && item.trim()) return item.trim();
  }
  return undefined;
}

function resultFromVideoJob(
  body: Record<string, unknown>,
  fallbackStatusUrl?: string,
): GenerationSubmitResult {
  const id =
    (typeof body.id === "string" && body.id) ||
    (typeof body.generation_id === "string" && body.generation_id) ||
    crypto.randomUUID();
  const statusUrl =
    (typeof body.polling_url === "string" && body.polling_url
      ? resolvePollingUrl(body.polling_url, id)
      : fallbackStatusUrl) || resolvePollingUrl(undefined, id);
  const rawStatus = typeof body.status === "string" ? body.status : "pending";
  const error = openRouterError(body);
  const status = mapOpenRouterVideoStatus(rawStatus, error);
  const signedUrl = firstStringUrl(body.urls);
  const unsignedUrl = firstStringUrl(body.unsigned_urls);
  const videoUrl =
    signedUrl ||
    unsignedUrl ||
    (status === "completed" && typeof body.id === "string" && body.id
      ? `${OPENROUTER_VIDEOS_URL}/${encodeURIComponent(body.id)}/content?index=0`
      : undefined);

  return {
    request_id: id,
    status_url: statusUrl,
    status,
    ...(videoUrl ? { video: { url: videoUrl } } : {}),
    ...(error ? { error } : {}),
  };
}

export async function submitOpenRouterClipVideo(
  input: {
    model?: string;
    prompt: string;
    aspectRatio: AspectRatio;
    durationSeconds: number;
    startImageUrl: string;
    endImageUrl?: string;
  },
  options?: FetchOptions & { callbackUrl?: string | null },
): Promise<GenerationSubmitResult> {
  const key = assertOpenRouterKey();
  const fetchFn = options?.fetch ?? fetch;
  const callbackUrl =
    options && "callbackUrl" in options
      ? options.callbackUrl || undefined
      : openRouterVideoCallbackUrl();
  const response = await fetchFn(OPENROUTER_VIDEOS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(openRouterClipVideoBody({ ...input, callbackUrl })),
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(openRouterError(body) || `OpenRouter 影片產生送出失敗（${response.status}）`);
  }
  if (typeof body.id !== "string" || !body.id) {
    throw new Error(openRouterError(body) || "OpenRouter 未回傳影片任務 id");
  }
  return resultFromVideoJob(body);
}

export async function fetchOpenRouterStatus(
  statusUrl: string,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = assertOpenRouterKey();
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(statusUrl, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(openRouterError(body) || `OpenRouter 影片狀態查詢失敗（${response.status}）`);
  }
  return resultFromVideoJob(body, statusUrl);
}
