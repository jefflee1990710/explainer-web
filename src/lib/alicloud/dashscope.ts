import type { AspectRatio } from "@/types/project";
import type { GenerationStatus } from "@/types/generation-job";

const INTL_BASE = "https://dashscope-intl.aliyuncs.com/api/v1";
const CN_BASE = "https://dashscope.aliyuncs.com/api/v1";

export const ALICLOUD_IMAGE_MODEL = "qwen-image-plus";
export const ALICLOUD_IMAGE_EDIT_MODEL = "qwen-image-edit-plus";
export const ALICLOUD_VIDEO_MODEL = "wan2.7-i2v";

export function alicloudApiKey() {
  return process.env.ALICLOUD_API_KEY || process.env.DASHSCOPE_API_KEY || "";
}

export function hasAlicloudKey() {
  return Boolean(alicloudApiKey());
}

export function imageSizeForRatio(ratio: AspectRatio) {
  if (ratio === "9:16") return "928*1664";
  if (ratio === "1:1") return "1328*1328";
  return "1664*928";
}

export function wanDurationSeconds(durationSeconds: number) {
  return Math.min(15, Math.max(2, Math.round(durationSeconds)));
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

let resolvedBase: string | undefined;

function candidateBases() {
  const override = process.env.ALICLOUD_BASE_URL || process.env.DASHSCOPE_BASE_URL;
  if (override) return [override.replace(/\/$/, "")];
  if (resolvedBase) return [resolvedBase];
  return [INTL_BASE, CN_BASE];
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

export async function dashscopeRequest(
  path: string,
  init: RequestInit & { async?: boolean } = {},
) {
  const key = alicloudApiKey();
  if (!key) throw new Error("尚未設定 AliCloud API key");

  const { async: enableAsync, ...rest } = init;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(enableAsync ? { "X-DashScope-Async": "enable" } : {}),
    ...(rest.headers as Record<string, string> | undefined),
  };

  let lastError: Error | undefined;
  for (const base of candidateBases()) {
    const response = await fetch(`${base}${path}`, { ...rest, headers });
    const body = await readJson(response).catch(() => ({}) as Record<string, unknown>);
    if (response.ok) {
      resolvedBase = base;
      return { base, body };
    }
    const message = dashscopeError(body) || `AliCloud 請求失敗（${response.status}）`;
    lastError = new Error(message);
    // Wrong region usually comes back as an auth / invalid-key error.
    if (response.status !== 401 && response.status !== 403 && !/apikey|unauthorized|forbidden/i.test(message)) {
      throw lastError;
    }
  }
  throw lastError || new Error("AliCloud 請求失敗");
}
