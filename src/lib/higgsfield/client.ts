import { config, higgsfield } from "@higgsfield/client/v2";
import type { V2Response } from "@higgsfield/client/v2";

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

export function mediaUrlFromResponse(
  result: Pick<V2Response, "images" | "video">,
) {
  return result.images?.[0]?.url || result.video?.url;
}
