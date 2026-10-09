import { getAppUrl, isPublicHttpUrl } from "@/util/app-url";
import { isAlicloudStatusUrl } from "@/service/alicloud/dashscope";
import { fetchAlicloudStatus, submitAlicloudImage } from "@/service/alicloud/generate";
import { clipVideoProvider } from "@/service/generation/video-backend";
import {
  IDEOGRAM_PROMPT_MAX,
  imageModelForSubmit,
  resolveImageRoute,
} from "@/service/generation/image-backend";
import {
  assertHiggsfieldConfigured,
  mediaUrlFromResponse,
} from "@/service/higgsfield/client";
import { referenceUrlsForModel } from "@/service/higgsfield/reference-sheet";
import {
  SEEDANCE_2_VIDEO_MODEL,
  clipVideoModel,
  h3ClipVideoInput,
  seedanceClipVideoInput,
} from "@/service/higgsfield/clip-keyframes";
import type { AspectRatio, SceneTextLanguage } from "@/model/project";

/** Stored on skills / jobs; `/edit` is chosen automatically when references are present. */
export const QWEN_IMAGE_MODEL = "alibaba/qwen-image-3/text-to-image";
export const QWEN_IMAGE_EDIT_MODEL = "alibaba/qwen-image-3/edit";

function isQwenImage3(model: string) {
  return /qwen-image-3/i.test(model);
}

function isMarketingStudio(model: string) {
  return model.startsWith("marketing-studio/image");
}

function isIdeogram(model: string) {
  return model.startsWith("ideogram/");
}

function webhookOptions() {
  const secret = process.env.HF_WEBHOOK_SECRET;
  if (!secret) return undefined;
  const url = `${getAppUrl()}/api/webhooks/higgsfield`;
  // Local / private APP_URL is rejected by Higgsfield; poller covers those jobs.
  if (!isPublicHttpUrl(url)) return undefined;
  return { url, secret };
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
function imageAspectRatio(model: string, ratio: AspectRatio | "2:3"): string {
  if (ratio === "2:3") return "2:3";
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
  aspectRatio: AspectRatio | "2:3";
  quality?: "low" | "medium" | "high";
  resolution?: "1k" | "2k" | "4k";
  referenceImageUrls?: Array<string | undefined>;
  negativePrompt?: string;
  // 畫面文字語系；model 以 IMAGE_ROUTE_BY_SCENE_TEXT 為準。
  sceneTextLanguage?: SceneTextLanguage;
}, options: { webhook?: boolean } = {}) {
  const route = resolveImageRoute(input.sceneTextLanguage);
  const refs = (input.referenceImageUrls || []).filter(
    (url): url is string => Boolean(url),
  );
  const model = imageModelForSubmit(route, refs.length > 0);
  // Ideogram takes one image. The first URL is the composition lock, or the
  // character blueprint when this still has no lock yet. A contact sheet would
  // be drawn as a row of pictures.
  const imageUrls = isIdeogram(model)
    ? refs.slice(0, 1)
    : await referenceUrlsForModel(model, refs);

  if (route.backend === "alicloud") {
    if (input.aspectRatio === "2:3") {
      throw new Error("這條產圖路由不接受 2:3");
    }
    return submitAlicloudImage({
      model,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      referenceImageUrls: input.referenceImageUrls,
      negativePrompt: input.negativePrompt,
    });
  }

  const client = assertHiggsfieldConfigured();
  const webhook = options.webhook === false ? undefined : webhookOptions();

  if (isQwenImage3(model)) {
    return client.subscribe(model, {
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        quality: input.quality || "medium",
        ...(imageUrls.length ? { image_urls: imageUrls } : {}),
      },
      withPolling: false,
      webhook,
    });
  }

  // One reference, no extra fields. rendering_speed QUALITY keeps the glyphs.
  if (isIdeogram(model)) {
    const prompt =
      input.prompt.length > IDEOGRAM_PROMPT_MAX
        ? input.prompt.slice(0, IDEOGRAM_PROMPT_MAX)
        : input.prompt;
    const imageUrl = imageUrls[0];
    return client.subscribe(model, {
      input: {
        prompt,
        aspect_ratio: input.aspectRatio,
        rendering_speed: "QUALITY",
        ...(imageUrl ? { image_url: imageUrl, image_weight: 45 } : {}),
      },
      withPolling: false,
      webhook,
    });
  }

  // Flare / Sunburst: omit image_urls to generate; pass every blueprint to edit.
  // enhance_prompt stays off so the storyboard wording is not rewritten.
  if (isMarketingStudio(model)) {
    return client.subscribe(model, {
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        quality: input.quality || "medium",
        resolution: input.resolution || "1k",
        enhance_prompt: false,
        ...(imageUrls.length ? { image_urls: imageUrls } : {}),
      },
      withPolling: false,
      webhook,
    });
  }

  const common = {
    prompt: input.prompt,
    aspect_ratio: imageAspectRatio(model, input.aspectRatio),
    quality: input.quality || "medium",
    ...(/gpt-image/i.test(model) ? { background: "opaque" } : {}),
  };

  if (refs.length && /gpt-image/i.test(model)) {
    return client.subscribe(`${model}/edit`, {
      input: { ...common, image_urls: refs },
      withPolling: false,
      webhook,
    });
  }

  return client.subscribe(model, {
    input: {
      ...common,
      resolution: input.resolution || "1k",
      ...imageRefs(refs),
    },
    withPolling: false,
    webhook,
  });
}

// Backwards-compatible alias.
export const submitCharacterStill = submitImage;

export async function submitClipVideo(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  startImageUrl: string;
  endImageUrl: string;
  styleId?: string;
}) {
  if (clipVideoProvider() !== "higgsfield") {
    throw new Error("clip video must use Higgsfield first and last frames");
  }

  const client = assertHiggsfieldConfigured();
  const model = clipVideoModel(input.styleId);
  // Cinematic realistic is Seedance 2.0. Every other style stays on MiniMax H3.
  const body =
    model === SEEDANCE_2_VIDEO_MODEL
      ? seedanceClipVideoInput(input)
      : h3ClipVideoInput(input);
  return client.subscribe(model, {
    input: body,
    withPolling: false,
    webhook: webhookOptions(),
  });
}

export async function fetchHiggsfieldStatus(statusUrl: string) {
  if (isAlicloudStatusUrl(statusUrl)) {
    return fetchAlicloudStatus(statusUrl);
  }

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
