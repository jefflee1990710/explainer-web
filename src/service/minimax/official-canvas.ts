import type { GenerationStatus } from "@/model/generation-job";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { providerErrorMessage } from "@/service/generation/provider-error";
import { mapMinimaxVideoStatus, minimaxApiKey } from "@/service/minimax/talking-head-reference";

// Canvas MiniMax models call api.minimax.io. OpenRouter currently lists these
// ids with an empty provider list, so a canvas run there returns "No endpoints found".

const MINIMAX_API = "https://api.minimax.io";

const CANVAS_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"] as const;

// OpenRouter snapshot id → official model name sent to MiniMax.
const OFFICIAL_MODEL_BY_SLUG: Record<string, string> = {
  "minimax/hailuo-3": "MiniMax-H3",
  "minimax/hailuo-3-max": "MiniMax-H3-Max",
  "minimax/hailuo-2.3": "MiniMax-Hailuo-2.3",
  "minimax/minimax-h3-image": "MiniMax-H3-Image",
  "minimax/minimax-h3-image-highspeed": "MiniMax-H3-Image-Highspeed",
};

const BILLING_SLUG_BY_OFFICIAL: Record<string, string> = Object.fromEntries(
  Object.entries(OFFICIAL_MODEL_BY_SLUG).map(([slug, official]) => [official, slug]),
);

// Existing canvases still store the OpenRouter id. Execution resolves to the official spec.
export const MINIMAX_CANVAS_LEGACY_IDS: Record<string, string> = Object.fromEntries(
  Object.entries(OFFICIAL_MODEL_BY_SLUG).map(([slug, official]) => [
    `openrouter:${slug}`,
    `minimax:${official}`,
  ]),
);

export const EXPLAINER_HAILUO_CANVAS_MODEL_ID = "minimax:MiniMax-H3";

type FetchOptions = { fetch?: typeof fetch; apiKey?: string };

export type MinimaxCanvasImageInput = {
  model: string;
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  referenceImageUrls?: Array<string | undefined>;
};

export type MinimaxCanvasVideoInput = {
  model: string;
  prompt?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  resolution?: string;
  startImageUrl?: string;
  endImageUrl?: string;
  referenceImageUrls?: Array<string | undefined>;
  audioUrl?: string;
  videoUrl?: string;
};

type MinimaxContentItem = {
  type: "text" | "image_url" | "video_url" | "audio_url";
  text?: string;
  image_url?: { url: string };
  video_url?: { url: string };
  audio_url?: { url: string };
  role?: "first_frame" | "last_frame" | "reference_image" | "reference_video" | "reference_audio";
};

export function officialMinimaxCanvasModel(openRouterOrOfficialId: string): string | undefined {
  return OFFICIAL_MODEL_BY_SLUG[openRouterOrOfficialId] ?? (
    Object.values(OFFICIAL_MODEL_BY_SLUG).includes(openRouterOrOfficialId)
      ? openRouterOrOfficialId
      : undefined
  );
}

// Pricing stays on the existing OpenRouter SKU table (provider cost × 1.5).
export function minimaxCanvasBillingSlug(officialOrSlug: string): string {
  return BILLING_SLUG_BY_OFFICIAL[officialOrSlug] ?? officialOrSlug;
}

function apiKey(options?: FetchOptions): string {
  return (options?.apiKey ?? minimaxApiKey()).trim();
}

function cleanUrls(urls: Array<string | undefined> | undefined, limit: number): string[] {
  const out: string[] = [];
  for (const url of urls ?? []) {
    const trimmed = url?.trim();
    if (!trimmed) continue;
    out.push(trimmed);
    if (out.length >= limit) break;
  }
  return out;
}

function canvasRatio(value: string | undefined, fallback: (typeof CANVAS_RATIOS)[number]) {
  return CANVAS_RATIOS.find((ratio) => ratio === value) ?? fallback;
}

function imageArea(resolution: string | undefined): "1K" | "2K" | "4K" {
  const key = resolution?.trim().toLowerCase();
  if (key === "1k") return "1K";
  if (key === "4k") return "4K";
  return "2K";
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  const rounded = value !== undefined && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, rounded));
}

function videoPrompt(prompt: string | undefined): string {
  const text = prompt?.trim() || "Animate the picture with natural motion.";
  return text.slice(0, 7000);
}

function h3Resolution(model: string, resolution: string | undefined): "480P" | "768P" | "2K" {
  const asked = resolution?.trim().toLowerCase();
  if (model === "MiniMax-H3") {
    return asked === "1k" || asked === "768p" ? "768P" : "2K";
  }
  return asked === "480p" || asked === "1k" ? "480P" : "768P";
}

// MiniMax puts the reason on task.error, body.error, or base_resp. A bare status is not a reason.
function errorMessage(body: unknown): string | undefined {
  return providerErrorMessage(body);
}

function sensitive(message: string | undefined): boolean {
  return Boolean(message && /sensitive|safety|nsfw|1026|1027/i.test(message));
}

// Text-to-image, or image edit when reference stills are wired.
export function minimaxCanvasImageRequest(input: MinimaxCanvasImageInput): {
  url: string;
  body: Record<string, unknown>;
} {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("MiniMax 圖片需要提示詞");
  const refs = cleanUrls(input.referenceImageUrls, 16);
  const body: Record<string, unknown> = {
    model: input.model,
    prompt: prompt.slice(0, 32000),
    n: 1,
    size: "auto",
    aspect_ratio: canvasRatio(input.aspectRatio, "1:1"),
    area: imageArea(input.resolution),
    response_format: "url",
  };
  if (refs.length > 0) {
    body.images = refs.map((url) => ({ image_url: url }));
    return { url: `${MINIMAX_API}/v1/images/edits`, body };
  }
  return { url: `${MINIMAX_API}/v1/images/generations`, body };
}

// V2 content array. First/last frames and reference media cannot be mixed.
export function minimaxCanvasVideoBody(input: MinimaxCanvasVideoInput): Record<string, unknown> {
  const model = input.model;
  if (model === "MiniMax-Hailuo-2.3") {
    const duration = (input.durationSeconds ?? 6) >= 8 ? 10 : 6;
    const asked = input.resolution?.trim().toLowerCase();
    const resolution = duration === 10 || asked === "1k" || asked === "768p" ? "768P" : "1080P";
    const start = input.startImageUrl?.trim();
    return {
      model,
      prompt: videoPrompt(input.prompt).slice(0, 2000),
      duration,
      resolution,
      prompt_optimizer: false,
      ...(start ? { first_frame_image: start } : {}),
    };
  }

  const minDuration = model === "MiniMax-H3-Max" ? 5 : 4;
  const duration = clampInt(input.durationSeconds, minDuration, 15, 5);
  const start = input.startImageUrl?.trim();
  const end = input.endImageUrl?.trim();
  const refs = cleanUrls(input.referenceImageUrls, 9);
  const video = input.videoUrl?.trim();
  const audio = input.audioUrl?.trim();
  const content: MinimaxContentItem[] = [{ type: "text", text: videoPrompt(input.prompt) }];
  let ratio: string;

  if (start || end) {
    // A lone end still is sent as the first frame; V2 rejects last_frame without first_frame.
    if (start) content.push({ type: "image_url", image_url: { url: start }, role: "first_frame" });
    if (end && start) content.push({ type: "image_url", image_url: { url: end }, role: "last_frame" });
    else if (end) content.push({ type: "image_url", image_url: { url: end }, role: "first_frame" });
    ratio = "adaptive";
  } else if (refs.length > 0 || video || audio) {
    for (const url of refs) {
      content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
    }
    if (video) content.push({ type: "video_url", video_url: { url: video }, role: "reference_video" });
    if (audio) content.push({ type: "audio_url", audio_url: { url: audio }, role: "reference_audio" });
    ratio = input.aspectRatio ? canvasRatio(input.aspectRatio, "16:9") : "adaptive";
  } else {
    ratio = canvasRatio(input.aspectRatio, "16:9");
  }

  return {
    model,
    content,
    resolution: h3Resolution(model, input.resolution),
    duration,
    ratio,
    generate_audio: true,
  };
}

async function postJson(
  url: string,
  body: unknown,
  options?: FetchOptions,
): Promise<unknown> {
  const key = apiKey(options);
  if (!key) throw new Error("尚未設定 MINIMAX_API_KEY，無法提交 MiniMax 生成");
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: url.includes("/v1/images/") ? AbortSignal.timeout(600_000) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(errorMessage(payload) || `MiniMax 提交失敗（${response.status}）`);
  }
  const apiError = errorMessage(payload);
  if (apiError) throw new Error(apiError);
  return payload;
}

export async function submitMinimaxCanvasImage(
  input: MinimaxCanvasImageInput,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const request = minimaxCanvasImageRequest(input);
  const payload = (await postJson(request.url, request.body, options)) as {
    request_id?: string;
    data?: Array<{ url?: string; error?: { message?: string } | string }>;
  };
  const first = payload.data?.[0];
  const failed = typeof first?.error === "string"
    ? first.error
    : first?.error?.message;
  const url = first?.url;
  if (!url) {
    const message = failed || "MiniMax 圖片生成失敗";
    return {
      request_id: payload.request_id || "minimax-image",
      status: sensitive(message) ? "nsfw" : "failed",
      error: message,
    };
  }
  return {
    request_id: payload.request_id || "minimax-image",
    status: "completed",
    images: [{ url }],
  };
}

export async function submitMinimaxCanvasVideo(
  input: MinimaxCanvasVideoInput,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const body = minimaxCanvasVideoBody(input);
  const url = input.model === "MiniMax-Hailuo-2.3"
    ? `${MINIMAX_API}/v1/video_generation`
    : `${MINIMAX_API}/v2/video_generation`;
  const payload = (await postJson(url, body, options)) as { task_id?: string };
  if (!payload.task_id) throw new Error("MiniMax 未回傳影片任務 id");
  const statusUrl = input.model === "MiniMax-Hailuo-2.3"
    ? `${MINIMAX_API}/v1/query/video_generation?task_id=${encodeURIComponent(payload.task_id)}`
    : `${MINIMAX_API}/v2/query/video_generation/${encodeURIComponent(payload.task_id)}`;
  return {
    request_id: payload.task_id,
    status_url: statusUrl,
    status: "queued",
    model: input.model,
  };
}

function mapV1Status(status: string): GenerationStatus {
  const normalized = status.toLowerCase();
  if (normalized === "success") return "completed";
  if (normalized === "fail" || normalized === "failed") return "failed";
  if (normalized === "processing" || normalized === "preparing") return "in_progress";
  return "queued";
}

async function fetchMinimaxV1Video(
  statusUrl: string,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = apiKey(options);
  if (!key) throw new Error("尚未設定 MINIMAX_API_KEY，無法查詢 MiniMax 影片狀態");
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(statusUrl, { headers: { Authorization: `Bearer ${key}` } });
  const body = (await response.json().catch(() => ({}))) as {
    task_id?: string;
    status?: string;
    file_id?: string;
  };
  if (!response.ok) {
    throw new Error(errorMessage(body) || `MiniMax 影片狀態查詢失敗（${response.status}）`);
  }
  const status = mapV1Status(body.status || "");
  const taskId = body.task_id || new URL(statusUrl).searchParams.get("task_id") || "";
  if (status !== "completed") {
    return {
      request_id: taskId,
      status_url: statusUrl,
      status,
      ...(status === "failed" ? { error: errorMessage(body) || body.status || "failed" } : {}),
    };
  }
  if (!body.file_id) {
    return { request_id: taskId, status_url: statusUrl, status: "in_progress" };
  }
  const fileResponse = await fetchFn(
    `${MINIMAX_API}/v1/files/retrieve?file_id=${encodeURIComponent(body.file_id)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  const fileBody = (await fileResponse.json().catch(() => ({}))) as {
    file?: { download_url?: string };
  };
  const videoUrl = fileBody.file?.download_url;
  if (!fileResponse.ok || !videoUrl) {
    throw new Error(errorMessage(fileBody) || "MiniMax 影片已完成但未回傳下載網址");
  }
  return {
    request_id: taskId,
    status_url: statusUrl,
    status: "completed",
    video: { url: videoUrl },
  };
}

async function fetchMinimaxV2Video(
  statusUrl: string,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  const key = apiKey(options);
  if (!key) throw new Error("尚未設定 MINIMAX_API_KEY，無法查詢 MiniMax 影片狀態");
  const fetchFn = options?.fetch ?? fetch;
  const response = await fetchFn(statusUrl, { headers: { Authorization: `Bearer ${key}` } });
  const body = (await response.json().catch(() => ({}))) as {
    task?: { id?: string; status?: string; content?: { url?: string } };
  };
  if (!response.ok) {
    throw new Error(errorMessage(body) || `MiniMax 影片狀態查詢失敗（${response.status}）`);
  }
  const task = body.task;
  const status = mapMinimaxVideoStatus(task?.status || "");
  const taskId = statusUrl.split("/").pop() || task?.id || "";
  return {
    request_id: taskId,
    status_url: statusUrl,
    status,
    ...(task?.content?.url ? { video: { url: task.content.url } } : {}),
    ...(status === "failed" ? { error: errorMessage(body) || task?.status || "failed" } : {}),
  };
}

// Hailuo 2.3 stays on the V1 query. H3 and H3 Max use the V2 task object.
export function fetchMinimaxCanvasVideo(
  statusUrl: string,
  options?: FetchOptions,
): Promise<GenerationSubmitResult> {
  if (statusUrl.includes("/v1/query/video_generation")) {
    return fetchMinimaxV1Video(statusUrl, options);
  }
  return fetchMinimaxV2Video(statusUrl, options);
}
