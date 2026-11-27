// ArgoLink video API (ARGOLINK_API_KEY): async jobs on POST /v1/videos/generations,
// polled through GET /v1/videos/{request_id} or settled by the signed webhook.
// Kept free of node:crypto so catalog code can import model ids from here.

import type { GenerationStatus } from "@/model/generation-job";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { providerErrorMessage } from "@/service/generation/provider-error";
import { getAppUrl, isPublicHttpUrl } from "@/util/app-url";

export const ARGOLINK_API = "https://argolink.io";
export const ARGOLINK_VIDEOS_URL = `${ARGOLINK_API}/v1/videos`;
export const ARGOLINK_WEBHOOK_PATH = "/api/webhooks/argolink";

// Sand AI MAGI-2: prompt + optional reference images / audio, 4–30s, 1080p only.
export const ARGOLINK_MAGI_2 = "magi-2";

export const MAGI_2_LIMITS = {
  minDurationSeconds: 4,
  maxDurationSeconds: 30,
  defaultDurationSeconds: 5,
  maxReferenceImages: 10,
  maxReferenceAudios: 5,
  maxPromptChars: 15_000,
} as const;

// Ratios MAGI-2 accepts that the canvas can also store (21:9 has no canvas ratio).
export const MAGI_2_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;

type FetchOptions = { fetch?: typeof fetch; apiKey?: string };

export type ArgolinkCanvasVideoInput = {
  model: string;
  prompt?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  referenceImageUrls?: Array<string | undefined>;
  videoUrl?: string;
  audioUrl?: string;
  callbackUrl?: string;
};

export function argolinkApiKey(): string {
  return (process.env.ARGOLINK_API_KEY || "").trim();
}

export function hasArgolinkKey(): boolean {
  return Boolean(argolinkApiKey());
}

// Webhook address sent as callback_url. Only set when the signing secret exists and the app is public HTTPS.
export function argolinkCallbackUrl(
  appUrl = getAppUrl(),
  secret = process.env.ARGOLINK_WEBHOOK_SECRET,
): string | undefined {
  if (!(secret || "").trim()) return undefined;
  const url = `${appUrl.replace(/\/$/, "")}${ARGOLINK_WEBHOOK_PATH}`;
  if (!isPublicHttpUrl(url)) return undefined;
  try {
    return new URL(url).protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function cleanUrls(urls: Array<string | undefined> | undefined, limit: number): string[] {
  const out: string[] = [];
  for (const url of urls ?? []) {
    const trimmed = url?.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= limit) break;
  }
  return out;
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  const rounded = value !== undefined && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, rounded));
}

export function magi2DurationSeconds(requested?: number): number {
  return clampInt(
    requested,
    MAGI_2_LIMITS.minDurationSeconds,
    MAGI_2_LIMITS.maxDurationSeconds,
    MAGI_2_LIMITS.defaultDurationSeconds,
  );
}

// Request body for POST /v1/videos/generations. MAGI-2 rejects start/end frames, seed, and watermark.
export function argolinkCanvasVideoBody(input: ArgolinkCanvasVideoInput): Record<string, unknown> {
  const prompt = input.prompt?.trim();
  if (!prompt) throw new Error("MAGI-2 需要提示詞");
  const refs = cleanUrls(input.referenceImageUrls, MAGI_2_LIMITS.maxReferenceImages);
  const video = input.videoUrl?.trim();
  const audio = input.audioUrl?.trim();
  const ratio = MAGI_2_RATIOS.find((value) => value === input.aspectRatio) ?? "16:9";
  return {
    model: input.model,
    prompt: prompt.slice(0, MAGI_2_LIMITS.maxPromptChars),
    duration: magi2DurationSeconds(input.durationSeconds),
    resolution: "1080p",
    aspect_ratio: ratio,
    ...(refs.length > 0 ? { reference_images: refs.map((url) => ({ url })) } : {}),
    // One motion clip. MAGI-2 rejects start_image / end_image, so stills stay in reference_images.
    ...(video ? { reference_videos: [{ url: video }] } : {}),
    ...(audio ? { reference_audios: [{ url: audio }] } : {}),
    ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
  };
}

function errorText(value: unknown): string | undefined {
  return providerErrorMessage(value);
}

function moderated(message: string | undefined): boolean {
  return Boolean(message && /nsfw|sensitive|safety|moderat|content.?policy|inappropriate/i.test(message));
}

function mapStatus(raw: string): GenerationStatus {
  const status = raw.trim().toLowerCase();
  if (status === "done") return "completed";
  if (status === "failed" || status === "expired") return "failed";
  if (status === "pending") return "in_progress";
  return "queued";
}

// Parses a status document. The webhook body is the same document, so both paths share this.
export function parseArgolinkVideoStatus(body: unknown, statusUrl?: string): GenerationSubmitResult {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const requestId = typeof record.request_id === "string" ? record.request_id : "";
  const status = mapStatus(typeof record.status === "string" ? record.status : "");
  const video = record.video && typeof record.video === "object"
    ? (record.video as { url?: unknown })
    : undefined;
  const videoUrl = typeof video?.url === "string" && video.url.trim() ? video.url.trim() : undefined;
  const model = typeof record.model === "string" ? record.model : undefined;
  const base = {
    request_id: requestId,
    ...(statusUrl ? { status_url: statusUrl } : {}),
    ...(model ? { model } : {}),
  };
  if (status === "failed") {
    const message =
      errorText(record) ||
      (record.status === "expired" ? "ArgoLink 任務已過期" : "ArgoLink 影片生成失敗");
    return { ...base, status: moderated(message) ? "nsfw" : "failed", error: message };
  }
  if (status === "completed") {
    return { ...base, status, ...(videoUrl ? { video: { url: videoUrl } } : {}) };
  }
  return { ...base, status };
}

export function argolinkStatusUrl(requestId: string): string {
  return `${ARGOLINK_VIDEOS_URL}/${encodeURIComponent(requestId)}`;
}

function requireKey(options?: FetchOptions): string {
  const key = (options?.apiKey ?? argolinkApiKey()).trim();
  if (!key) throw new Error("尚未設定 ARGOLINK_API_KEY，無法使用 ArgoLink 模型");
  return key;
}

async function postGeneration(
  body: Record<string, unknown>,
  key: string,
  fetchFn: typeof fetch,
): Promise<{ ok: boolean; status: number; payload: Record<string, unknown> }> {
  const response = await fetchFn(`${ARGOLINK_VIDEOS_URL}/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, payload };
}

// Submits one video job. A 503 while registering callback_url is retried once without it; polling still settles the job.
export async function submitArgolinkCanvasVideo(
  input: ArgolinkCanvasVideoInput,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = requireKey(options);
  const fetchFn = options?.fetch ?? fetch;
  const body = argolinkCanvasVideoBody(input);
  let result = await postGeneration(body, key, fetchFn);
  if (result.status === 503 && body.callback_url) {
    const withoutCallback = { ...body };
    delete withoutCallback.callback_url;
    result = await postGeneration(withoutCallback, key, fetchFn);
  }
  if (!result.ok) {
    const message = errorText(result.payload.error) || errorText(result.payload) || `ArgoLink 提交失敗（${result.status}）`;
    return {
      request_id: "argolink-video",
      status: moderated(message) ? "nsfw" : "failed",
      error: message,
    };
  }
  const requestId = typeof result.payload.request_id === "string" ? result.payload.request_id.trim() : "";
  if (!requestId) throw new Error("ArgoLink 未回傳影片任務 request_id");
  return {
    request_id: requestId,
    status_url: argolinkStatusUrl(requestId),
    status: "queued",
    model: input.model,
  };
}

// One status read. Non-2xx answers throw so the poller keeps the job running and retries.
export async function fetchArgolinkCanvasVideo(
  statusUrl: string,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = requireKey(options);
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(statusUrl, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(errorText(body) || `ArgoLink 影片狀態查詢失敗（${response.status}）`);
  }
  return parseArgolinkVideoStatus(body, statusUrl);
}
