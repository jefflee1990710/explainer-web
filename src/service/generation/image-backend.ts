import { hasAlicloudKey } from "@/service/alicloud/dashscope";
import {
  hasOpenRouterKey,
  OPENROUTER_GPT_5_IMAGE_MODEL,
  OPENROUTER_NANO_BANANA_PRO_IMAGE_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
} from "@/service/openrouter/generate";
import type { SceneTextLanguage } from "@/model/project";

export type ImageBackend = "alicloud" | "higgsfield" | "openrouter";

export type ImageRoute = {
  backend: ImageBackend;
  // Text-to-image model id sent to the provider.
  model: string;
  // Used when reference / edit images are attached; defaults to `model`.
  editModel: string;
};

/**
 * 畫面文字語系 → OpenRouter 產圖模型。生成時只讀呢張表。
 * 分鏡、場景鎖、封面、寫實角色藍圖與生活照用 Nano Banana Pro（`google/gemini-3-pro-image`）。
 * 這顆模型打 Google AI Studio（`GOOGLE_API_KEY`），1K / 2K，最多 14 張參考圖。
 * 其他畫風的角色藍圖用 Seedream 5.0 Pro，仍走 OpenRouter。
 */
export const NANO_BANANA_PRO_IMAGE_MODEL = OPENROUTER_NANO_BANANA_PRO_IMAGE_MODEL;
export const SEEDREAM_5_PRO_IMAGE_MODEL = OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL;
export const GPT_5_IMAGE_MODEL = OPENROUTER_GPT_5_IMAGE_MODEL;
export const GROK_IMAGE_MODEL = "xai/grok-imagine-image-2.0";
export const IDEOGRAM_V4_MODEL = "ideogram/v4.0";
export const IDEOGRAM_PROMPT_MAX = 2048;

export const IMAGE_ROUTE_BY_SCENE_TEXT: Record<SceneTextLanguage, ImageRoute> = {
  en: {
    backend: "openrouter",
    model: NANO_BANANA_PRO_IMAGE_MODEL,
    editModel: NANO_BANANA_PRO_IMAGE_MODEL,
  },
  "zh-Hant": {
    backend: "openrouter",
    model: NANO_BANANA_PRO_IMAGE_MODEL,
    editModel: NANO_BANANA_PRO_IMAGE_MODEL,
  },
  "zh-Hans": {
    backend: "openrouter",
    model: NANO_BANANA_PRO_IMAGE_MODEL,
    editModel: NANO_BANANA_PRO_IMAGE_MODEL,
  },
};

const DEFAULT_ROUTE = IMAGE_ROUTE_BY_SCENE_TEXT.en;

export function imageRouteForSceneText(language?: SceneTextLanguage): ImageRoute {
  if (language && language in IMAGE_ROUTE_BY_SCENE_TEXT) {
    return IMAGE_ROUTE_BY_SCENE_TEXT[language];
  }
  return DEFAULT_ROUTE;
}

export function resolveImageRoute(language?: SceneTextLanguage): ImageRoute {
  const route = imageRouteForSceneText(language);
  if (route.backend === "openrouter" && !hasOpenRouterKey()) {
    throw new Error(`尚未設定 OPENROUTER_API_KEY（${route.model}）`);
  }
  if (route.backend === "alicloud" && !hasAlicloudKey()) {
    throw new Error(`畫面文字為中文時需要 ALICLOUD_API_KEY（${route.model}）`);
  }
  return route;
}

export function imageModelForSubmit(route: ImageRoute, hasReferenceImages: boolean) {
  return hasReferenceImages ? route.editModel : route.model;
}

// Cinematic realistic stills use Nano Banana Pro. Illustrated styles stay on Seedream.
export function imageModelForRealism(realistic: boolean) {
  return realistic ? NANO_BANANA_PRO_IMAGE_MODEL : SEEDREAM_5_PRO_IMAGE_MODEL;
}
