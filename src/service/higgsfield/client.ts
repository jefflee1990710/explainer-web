import { config, higgsfield } from "@higgsfield/client/v2";

let configured = false;

export function getHiggsfieldCredentials() {
  if (process.env.HF_CREDENTIALS) return process.env.HF_CREDENTIALS;
  const id = process.env.HF_API_KEY_ID;
  const secret = process.env.HF_API_KEY_SECRET;
  if (id && secret) return `${id}:${secret}`;
  return "";
}

export function assertHiggsfieldConfigured() {
  const credentials = getHiggsfieldCredentials();
  if (!credentials) {
    throw new Error("尚未設定影片產生服務 API key");
  }
  if (!configured) {
    config({ credentials });
    configured = true;
  }
  return higgsfield;
}

function firstUrl(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "url" in value) {
    const url = (value as { url?: unknown }).url;
    if (typeof url === "string" && url) return url;
  }
  return undefined;
}

// Higgsfield's documented V2 shape is images[0].url / video.url. Webhooks and
// some models also send a string, a videos[] list, or nest the same fields.
export function mediaUrlFromResponse(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const body = result as Record<string, unknown>;
  const fromImages = Array.isArray(body.images) ? firstUrl(body.images[0]) : undefined;
  const fromVideo = firstUrl(body.video);
  const fromVideos = Array.isArray(body.videos) ? firstUrl(body.videos[0]) : undefined;
  const direct = fromImages || fromVideo || fromVideos;
  if (direct) return direct;
  if (body.data && typeof body.data === "object") {
    return mediaUrlFromResponse(body.data);
  }
  return undefined;
}
