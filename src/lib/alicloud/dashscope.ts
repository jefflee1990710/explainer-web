import { lockWanVideoPrompt } from "@/lib/generation/wan-video-prompt";
import type { AspectRatio } from "@/types/project";
import type { GenerationStatus } from "@/types/generation-job";

const INTL_BASE = "https://dashscope-intl.aliyuncs.com/api/v1";

export const ALICLOUD_IMAGE_MODEL = "qwen-image-3.0-pro";
export const ALICLOUD_IMAGE_EDIT_MODEL = "qwen-image-3.0-pro";
export const ALICLOUD_VIDEO_MODEL = "wan3.0-video";

export function alicloudApiKey() {
  return process.env.ALICLOUD_API_KEY || process.env.DASHSCOPE_API_KEY || "";
}

export function hasAlicloudKey() {
  return Boolean(alicloudApiKey());
}

export function imageSizeForRatio(ratio: AspectRatio) {
  // Qwen-Image 3.0: total pixels 512*512–2048*2048.
  if (ratio === "9:16") return "1080*1920";
  if (ratio === "1:1") return "1328*1328";
  return "1920*1080";
}

export function wanDurationSeconds(durationSeconds: number) {
  return Math.min(30, Math.max(2, Math.round(durationSeconds)));
}

// Wan 3.0 first+last frame: native speech when audio is on; adaptive follows the stills.
export function wanClipVideoParameters(durationSeconds: number) {
  return {
    resolution: "720P" as const,
    ratio: "adaptive" as const,
    duration: wanDurationSeconds(durationSeconds),
    audio: true,
    prompt_extend: false,
    watermark: false,
  };
}

export function wan3ClipVideoBody(input: {
  prompt: string;
  durationSeconds: number;
  startImageUrl: string;
  endImageUrl: string;
}) {
  return {
    model: ALICLOUD_VIDEO_MODEL,
    input: {
      prompt: lockWanVideoPrompt(input.prompt),
      media: [
        { type: "first_frame", url: input.startImageUrl },
        { type: "last_frame", url: input.endImageUrl },
      ],
    },
    parameters: wanClipVideoParameters(input.durationSeconds),
  };
}

export function mapDashscopeStatus(status: string): GenerationStatus {
  const value = status.toUpperCase();
  if (value === "SUCCEEDED") return "completed";
  if (value === "FAILED" || value === "CANCELED" || value === "UNKNOWN") return "failed";
  if (value === "RUNNING") return "in_progress";
  return "queued";
}

export function dashscopeTaskUrl(base: string, taskId: string) {
  return `${base.replace(/\/$/, "")}/tasks/${taskId}`;
}

export function isAlicloudStatusUrl(url: string) {
  return /dashscope(-intl)?\.aliyuncs\.com\/api\/v1\/tasks\//.test(url);
}

function firstUrl(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "url" in value) {
    const url = (value as { url?: unknown }).url;
    if (typeof url === "string" && url) return url;
  }
  return undefined;
}

// DashScope success payloads: results[].url, video_url, or multimodal choices[].image.
export function mediaUrlFromDashscope(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const body = payload as Record<string, unknown>;
  const output =
    body.output && typeof body.output === "object"
      ? (body.output as Record<string, unknown>)
      : body;

  if (typeof output.video_url === "string" && output.video_url) return output.video_url;
  if (Array.isArray(output.results)) return firstUrl(output.results[0]);

  const choices = output.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const message = (choices[0] as { message?: { content?: unknown } }).message;
    const content = message?.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part && typeof part === "object") {
          const image = (part as { image?: unknown }).image;
          if (typeof image === "string" && image) return image;
        }
      }
    }
  }
  return undefined;
}

export function dashscopeError(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const body = payload as {
    message?: unknown;
    code?: unknown;
    output?: { message?: unknown; code?: unknown };
  };
  const message =
    (typeof body.output?.message === "string" && body.output.message) ||
    (typeof body.message === "string" && body.message) ||
    undefined;
  const code =
    (typeof body.output?.code === "string" && body.output.code) ||
    (typeof body.code === "string" && body.code) ||
    undefined;
  if (code && message) return `${code}: ${message}`;
  return message || code;
}

function candidateBases() {
  const override = process.env.ALICLOUD_BASE_URL || process.env.DASHSCOPE_BASE_URL;
  if (override) return [override.replace(/\/$/, "")];
  // Singapore Model Studio only; CN / HK keys are not interchangeable.
  return [INTL_BASE];
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

export async function dashscopeRequest(
  path: string,
  init: RequestInit & { async?: boolean; timeoutMs?: number } = {},
) {
  const key = alicloudApiKey();
  if (!key) throw new Error("尚未設定 AliCloud API key");

  const { async: enableAsync, timeoutMs, ...rest } = init;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(enableAsync ? { "X-DashScope-Async": "enable" } : {}),
    ...(rest.headers as Record<string, string> | undefined),
  };

  let lastError: Error | undefined;
  for (const base of candidateBases()) {
    const attempts = timeoutMs ? 2 : 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await fetch(`${base}${path}`, {
          ...rest,
          headers,
          ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
        });
        const body = await readJson(response).catch(() => ({}) as Record<string, unknown>);
        if (response.ok) {
          return { base, body };
        }
        const message = dashscopeError(body) || `AliCloud 請求失敗（${response.status}）`;
        lastError = new Error(message);
        if (response.status !== 401 && response.status !== 403 && !/apikey|unauthorized|forbidden/i.test(message)) {
          throw lastError;
        }
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < attempts && /fetch failed|aborted|timeout/i.test(lastError.message)) {
          continue;
        }
        throw lastError;
      }
    }
  }
  throw lastError || new Error("AliCloud 請求失敗");
}
