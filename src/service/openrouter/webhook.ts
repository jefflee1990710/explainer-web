import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl, isPublicHttpUrl } from "@/util/app-url";

// OpenRouter rejects signatures older than five minutes.
const SIGNATURE_MAX_AGE_SECONDS = 300;

export type OpenRouterVideoWebhookUpdate = {
  requestId: string;
  status: "completed" | "failed" | "nsfw";
  outputUrl?: string;
  error?: string;
};

// Callback is sent only when OpenRouter can reach it and we can verify the POST.
export function openRouterVideoCallbackUrl(
  appUrl = getAppUrl(),
  secret = process.env.OPENROUTER_WEBHOOK_SECRET,
) {
  if (!(secret || "").trim()) return undefined;
  const url = `${appUrl.replace(/\/$/, "")}/api/webhooks/openrouter`;
  if (!isPublicHttpsUrl(url)) return undefined;
  return url;
}

function isPublicHttpsUrl(raw: string) {
  if (!isPublicHttpUrl(raw)) return false;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

// `X-OpenRouter-Signature` is `t=<unix>,v1=<hex>` over `${timestamp},${rawBody}`.
export function verifyOpenRouterWebhookSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowMs = Date.now(),
) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signature = parts.find((part) => part.startsWith("v1="))?.slice(3);
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;

  const age = Math.floor(nowMs / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > SIGNATURE_MAX_AGE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp},${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export function signOpenRouterWebhook(rawBody: string, secret: string, nowMs = Date.now()) {
  const timestamp = Math.floor(nowMs / 1000).toString();
  const signature = createHmac("sha256", secret).update(`${timestamp},${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function nsfwError(error?: string) {
  if (!error) return false;
  return /nsfw|sensitive|content.?policy|content.?moderat|safety|inappropriate|moderation/i.test(error);
}

function firstUrl(list: unknown) {
  if (!Array.isArray(list)) return undefined;
  for (const item of list) {
    if (typeof item === "string" && item.trim()) return item.trim();
  }
  return undefined;
}

// Terminal video events only. Polling still covers queued and in-progress jobs.
export function openRouterVideoWebhookUpdate(body: unknown): OpenRouterVideoWebhookUpdate | undefined {
  if (!body || typeof body !== "object") return undefined;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const requestId = typeof record.id === "string" ? record.id.trim() : "";
  const rawStatus = typeof record.status === "string" ? record.status.toLowerCase() : "";
  if (!requestId || !rawStatus) return undefined;

  const error = typeof record.error === "string" && record.error.trim() ? record.error.trim() : undefined;
  const outputUrl = firstUrl(record.unsigned_urls) || firstUrl(record.urls);
  if (nsfwError(error)) {
    return { requestId, status: "nsfw", outputUrl, error };
  }
  if (rawStatus === "completed") {
    return { requestId, status: "completed", outputUrl, error };
  }
  if (rawStatus === "failed" || rawStatus === "cancelled" || rawStatus === "expired") {
    return { requestId, status: "failed", outputUrl, error };
  }
  return undefined;
}
