import type { GenerationStatus } from "@/model/generation-job";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { submitGoogleStudioImage } from "@/service/google/studio-image";
import { openRouterVideoCallbackUrl } from "@/service/openrouter/callback-url";

export const OPENROUTER_BASE_URL = "https://openrouter.ai";
export const OPENROUTER_IMAGES_URL = `${OPENROUTER_BASE_URL}/api/v1/images`;
export const OPENROUTER_VIDEOS_URL = `${OPENROUTER_BASE_URL}/api/v1/videos`;

export const OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL = "bytedance-seed/seedream-5-0-pro";
export const OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL = "bytedance-seed/seedream-5-0-lite";
// Google Nano Banana Pro (legacy image model). Scene stills and pose edits use Seedream.
export const OPENROUTER_NANO_BANANA_PRO_IMAGE_MODEL = "google/gemini-3-pro-image";
export const OPENROUTER_GPT_5_IMAGE_MODEL = "openai/gpt-5-image";
export const OPENROUTER_HAILUO_3_VIDEO_MODEL = "minimax/hailuo-3";
export const OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL = "heygen/avatar-iv";
export const OPENROUTER_HEYGEN_VIDEO_1_MODEL = "heygen/heygen-video-1";
export const OPENROUTER_SEEDANCE_2_VIDEO_MODEL = "bytedance/seedance-2.0";
export const OPENROUTER_SEEDANCE_2_FAST_VIDEO_MODEL = "bytedance/seedance-2.0-fast";
export const OPENROUTER_SEEDANCE_2_MINI_VIDEO_MODEL = "bytedance/seedance-2.0-mini";
export const OPENROUTER_WAN_3_VIDEO_MODEL = "alibaba/wan-3.0";

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
// Map 16:9 -> 3:2 and 9:16 / 3:4 -> 2:3; Seedream and video keep the exact ratio.
export function openRouterImageAspectRatio(
  model: string,
  ratio: AspectRatio | "2:3" | "3:4",
): string {
  if (!/gpt-5-image|gpt-image-1/i.test(model)) return ratio;
  if (ratio === "16:9") return "3:2";
  if (ratio === "9:16" || ratio === "2:3" || ratio === "3:4") return "2:3";
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

// ByteDance Seedance rejects input frames whose character face triggers its
// real-person privacy filter (`InputImageSensitiveContentDetected.PrivacyInformation`).
export function isSeedanceRealPersonRejection(error?: string): boolean {
  if (!error) return false;
  return /InputImageSensitiveContentDetected|PrivacyInformation|may contain real person/i.test(error);
}

export function openRouterImageBody(input: {
  model: string;
  prompt: string;
  aspectRatio: AspectRatio | "2:3" | "3:4";
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
    aspectRatio: AspectRatio | "2:3" | "3:4";
    quality?: "low" | "medium" | "high";
    resolution?: "1k" | "2k" | "4k";
    referenceImageUrls?: Array<string | undefined>;
  },
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  // Nano Banana Pro bills the Google AI Studio key, not OpenRouter.
  if (input.model === OPENROUTER_NANO_BANANA_PRO_IMAGE_MODEL) {
    return submitGoogleStudioImage(input, options);
  }
  const key = assertOpenRouterKey();
  const fetchFn = options?.fetch ?? fetch;
  const payload = JSON.stringify(openRouterImageBody(input));
  let response: Response;
  try {
    response = await fetchFn(OPENROUTER_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: payload,
      signal: AbortSignal.timeout(8 * 60_000),
    });
  } catch (error) {
    if (options?.fetch) throw error;
    const fallbackBody = openRouterImageBody({
      ...input,
      resolution: "1k",
    });
    response = await fetchFn(OPENROUTER_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fallbackBody),
      signal: AbortSignal.timeout(8 * 60_000),
    });
  }

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

export type OpenRouterVideoInputReference =
  | { type: "image_url"; image_url: { url: string } }
  | { type: "video_url"; video_url: { url: string } }
  | { type: "audio_url"; audio_url: { url: string } };

export type OpenRouterVideoFrameImage = {
  type: "image_url";
  image_url: { url: string };
  frame_type: "first_frame" | "last_frame";
};

export type OpenRouterClipVideoRequestBody = {
  model: string;
  prompt: string;
  aspect_ratio: AspectRatio;
  duration?: number;
  resolution: string;
  generate_audio?: boolean;
  callback_url?: string;
  frame_images?: OpenRouterVideoFrameImage[];
  input_references?: OpenRouterVideoInputReference[];
};

export const HEYGEN_AVATAR_IV_MOTION_PROMPT =
  "Keep the exact framing, lighting, background, and the on-screen subtitle card from the reference image completely fixed and visible from 0.0s through the final frame — never erase, hide, fade, or alter the on-screen subtitle text. The speaker talks directly to the camera at natural conversational speed in sync with the audio, maintaining steady eye contact with the lens, natural gentle blinks, and a calm, relaxed facial expression. Use restrained, natural lip and jaw articulation (~30–40% conversational mouth opening) with clean lip closure during pauses and bilabial (m/b/p) sounds; never exaggerate wide rounded O-mouth shapes, never grimace, and never squint the eyes shut into an exaggerated laugh or grin. Keep shoulders and seated posture grounded and steady, with hands resting calmly on the lap and only brief, subtle co-speech hand motion on key emphasis.";

export function openRouterVideoAudioLipSyncBody(input: {
  model?: string;
  prompt?: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  videoUrl: string;
  audioUrl: string;
  callbackUrl?: string;
}): OpenRouterClipVideoRequestBody {
  const model = input.model || OPENROUTER_HEYGEN_VIDEO_1_MODEL;
  return {
    model,
    prompt:
      input.prompt ||
      "Synchronize the speaker lip movement to the reference audio while keeping the source video framing, motion from start to end, lighting, and on-screen subtitle unchanged.",
    aspect_ratio: input.aspectRatio,
    duration: clampVideoDurationSeconds(input.durationSeconds),
    resolution: "2K",
    ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
    input_references: [
      {
        type: "video_url" as const,
        video_url: { url: input.videoUrl },
      },
      {
        type: "audio_url" as const,
        audio_url: { url: input.audioUrl },
      },
    ],
  };
}

export function openRouterHeyGenAudioVideoBody(input: {
  model?: string;
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds?: number;
  startImageUrl: string;
  audioUrl: string;
  callbackUrl?: string;
}): OpenRouterClipVideoRequestBody {
  const model = input.model || OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL;
  const configured = clipVideoResolution();
  const isAvatarIv = model === OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL;
  const effectivePrompt = isAvatarIv
    ? HEYGEN_AVATAR_IV_MOTION_PROMPT
    : capOpenRouterVideoPrompt(input.prompt);
  return {
    model,
    prompt: effectivePrompt,
    aspect_ratio: input.aspectRatio,
    ...(isAvatarIv
      ? {}
      : { duration: clampVideoDurationSeconds(input.durationSeconds ?? 5) }),
    resolution: isAvatarIv
      ? configured === "720p" && process.env.VIDEO_GENERATION_RESOLUTION === "720p"
        ? "720p"
        : "1080p"
      : configured === "480p"
        ? "480p"
        : configured === "720p"
          ? "768p"
          : "2K",
    ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
    input_references: [
      {
        type: "image_url" as const,
        image_url: { url: input.startImageUrl },
      },
      {
        type: "audio_url" as const,
        audio_url: { url: input.audioUrl },
      },
    ],
  };
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
  const model = input.model || OPENROUTER_WAN_3_VIDEO_MODEL;
  const configured = clipVideoResolution();
  // OpenRouter's minimax/hailuo-3 endpoint only accepts "2K" in supported_resolutions;
  // Wan 3.0 uses "480p" ($0.05/s).
  const resolution =
    model === OPENROUTER_HAILUO_3_VIDEO_MODEL && configured !== "2K"
      ? "2K"
      : model === OPENROUTER_WAN_3_VIDEO_MODEL
        ? "480p"
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
  model?: string,
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
    ...(model ? { model } : {}),
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
    audioUrl?: string;
  },
  options?: FetchOptions & { callbackUrl?: string | null },
): Promise<GenerationSubmitResult> {
  const key = assertOpenRouterKey();
  const fetchFn = options?.fetch ?? fetch;
  const callbackUrl =
    options && "callbackUrl" in options
      ? options.callbackUrl || undefined
      : openRouterVideoCallbackUrl();
  const useHeyGenAudio =
    Boolean(input.audioUrl) &&
    (input.model === OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL ||
      input.model === OPENROUTER_HEYGEN_VIDEO_1_MODEL);
  const reqBody =
    useHeyGenAudio && input.audioUrl
      ? openRouterHeyGenAudioVideoBody({
          model: input.model,
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          durationSeconds: input.durationSeconds,
          startImageUrl: input.startImageUrl,
          audioUrl: input.audioUrl,
          callbackUrl,
        })
      : openRouterClipVideoBody({ ...input, callbackUrl });
  let response = await fetchFn(OPENROUTER_VIDEOS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
  });

  let body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  let fallbackUsed = false;
  if (
    !response.ok &&
    !useHeyGenAudio &&
    /^bytedance\/seedance/i.test(reqBody.model) &&
    isSeedanceRealPersonRejection(openRouterError(body))
  ) {
    const fallbackBody = openRouterClipVideoBody({
      ...input,
      model: OPENROUTER_WAN_3_VIDEO_MODEL,
      callbackUrl,
    });
    fallbackUsed = true;
    response = await fetchFn(OPENROUTER_VIDEOS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fallbackBody),
    });
    body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  }
  if (!response.ok) {
    throw new Error(openRouterError(body) || `OpenRouter 影片產生送出失敗（${response.status}）`);
  }
  if (typeof body.id !== "string" || !body.id) {
    throw new Error(openRouterError(body) || "OpenRouter 未回傳影片任務 id");
  }
  return resultFromVideoJob(
    body,
    undefined,
    fallbackUsed ? OPENROUTER_WAN_3_VIDEO_MODEL : undefined,
  );
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
