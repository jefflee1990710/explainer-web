import { getAppUrl } from "@/lib/app-url";
import {
  assertHiggsfieldConfigured,
  mediaUrlFromResponse,
} from "@/lib/higgsfield/client";
import type { AspectRatio } from "@/types/project";

function webhookOptions() {
  const secret = process.env.HF_WEBHOOK_SECRET;
  if (!secret) return undefined;
  return {
    url: `${getAppUrl()}/api/webhooks/higgsfield`,
    secret,
  };
}

export async function submitCharacterStill(input: {
  model: string;
  prompt: string;
  aspectRatio: AspectRatio;
  quality?: "low" | "medium" | "high";
  resolution?: "1k" | "2k" | "4k";
  referenceImageUrl?: string;
}) {
  const client = assertHiggsfieldConfigured();
  return client.subscribe(input.model, {
    input: {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      quality: input.quality || "low",
      resolution: input.resolution || "1k",
      ...(input.referenceImageUrl
        ? {
            image_references: [
              { type: "image_url", image_url: input.referenceImageUrl },
            ],
          }
        : {}),
    },
    withPolling: false,
    webhook: webhookOptions(),
  });
}

export async function submitClipVideo(input: {
  model: string;
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  referenceImageUrl?: string;
}) {
  const client = assertHiggsfieldConfigured();
  const duration = Math.min(8, Math.max(3, Math.round(input.durationSeconds)));
  // Wan 3 / Wan 2.x image-to-video: first frame plus optional Omni-style refs.
  return client.subscribe(input.model, {
    input: {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      duration,
      ...(input.referenceImageUrl
        ? {
            start_image: input.referenceImageUrl,
            image_references: [
              { type: "image_url", image_url: input.referenceImageUrl },
            ],
          }
        : {}),
    },
    withPolling: false,
    webhook: webhookOptions(),
  });
}

export async function fetchHiggsfieldStatus(statusUrl: string) {
  const credentials = process.env.HF_CREDENTIALS ||
    (process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET
      ? `${process.env.HF_API_KEY_ID}:${process.env.HF_API_KEY_SECRET}`
      : "");
  const response = await fetch(statusUrl, {
    headers: credentials
      ? { Authorization: `Key ${credentials}` }
      : undefined,
  });
  if (!response.ok) {
    throw new Error(`影片產生狀態查詢失敗（${response.status}）`);
  }
  return response.json() as Promise<{
    status: string;
    request_id: string;
    status_url?: string;
    images?: Array<{ url: string }>;
    video?: { url: string };
  }>;
}

export { mediaUrlFromResponse };
