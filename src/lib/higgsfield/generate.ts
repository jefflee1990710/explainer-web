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

function imageRefs(urls: Array<string | undefined>) {
  const clean = urls.filter((url): url is string => Boolean(url));
  return clean.length
    ? {
        image_references: clean.map((url) => ({
          type: "image_url" as const,
          image_url: url,
        })),
      }
    : {};
}

// OpenAI GPT Image on Higgsfield only accepts 1:1 / 3:2 / 2:3.
// Map the project ratio to the closest supported frame; video keeps the true ratio.
function imageAspectRatio(model: string, ratio: AspectRatio): string {
  if (!/gpt-image/i.test(model)) return ratio;
  if (ratio === "16:9") return "3:2";
  if (ratio === "9:16") return "2:3";
  return "1:1";
}

// Text-to-image (GPT Image 1.5 etc.). Used for the character still and
// every storyboard frame; optional references keep the character locked.
//
// Higgsfield's `openai/gpt-image-*` endpoint is text-only and silently drops
// unknown fields, so references must go to `<model>/edit`, whose schema is
// `prompt` + `image_urls: string[]` + `aspect_ratio` + `quality` (no `resolution`).
export async function submitImage(input: {
  model: string;
  prompt: string;
  aspectRatio: AspectRatio;
  quality?: "low" | "medium" | "high";
  resolution?: "1k" | "2k" | "4k";
  referenceImageUrls?: Array<string | undefined>;
}) {
  const client = assertHiggsfieldConfigured();
  const refs = (input.referenceImageUrls || []).filter(
    (url): url is string => Boolean(url),
  );
  const common = {
    prompt: input.prompt,
    aspect_ratio: imageAspectRatio(input.model, input.aspectRatio),
    quality: input.quality || "low",
  };

  if (refs.length && /gpt-image/i.test(input.model)) {
    return client.subscribe(`${input.model}/edit`, {
      input: { ...common, image_urls: refs },
      withPolling: false,
      webhook: webhookOptions(),
    });
  }

  return client.subscribe(input.model, {
    input: {
      ...common,
      resolution: input.resolution || "1k",
      ...imageRefs(refs),
    },
    withPolling: false,
    webhook: webhookOptions(),
  });
}

// Backwards-compatible alias.
export const submitCharacterStill = submitImage;

export async function submitClipVideo(input: {
  model: string;
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  // Approved start frame drives image-to-video; extra refs keep continuity.
  startImageUrl?: string;
  referenceImageUrls?: Array<string | undefined>;
}) {
  const client = assertHiggsfieldConfigured();
  const duration = Math.min(8, Math.max(3, Math.round(input.durationSeconds)));
  // Wan 3.0 image-to-video (alibaba/wan-3.0/image-to-video): `image_url` is the
  // required first frame; resolution ∈ 480p/720p/1080p. Extra refs are optional.
  return client.subscribe(input.model, {
    input: {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      duration,
      resolution: "720p",
      ...(input.startImageUrl ? { image_url: input.startImageUrl } : {}),
      ...imageRefs(input.referenceImageUrls || []),
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
