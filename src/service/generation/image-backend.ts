import { hasAlicloudKey } from "@/service/alicloud/dashscope";
import { isDiagramExplainerSkill } from "@/service/director/explainer-family";
import {
  hasOpenRouterKey,
  OPENROUTER_GPT_5_IMAGE_MODEL,
  OPENROUTER_NANO_BANANA_2_1_IMAGE_MODEL,
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
 * 畫面文字語系與導演類型 → 產圖模型。生成時只讀呢張表。
 * - Explainer 類型影片（白板、剪紙拼貼、3D 摺紙微縮模型）的分鏡畫格使用 Google Nano Banana 2.1（`google/gemini-nano-banana-2.1`），走 OpenRouter（最多 14 張參考圖）。
 * - 其餘導演分鏡、場景鎖、封面、生活照、姿勢編輯與角色藍圖一律使用 Seedream 5.0 Pro（`bytedance-seed/seedream-5-0-pro`），走 OpenRouter（最多 14 張參考圖）。
 */
export const SEEDREAM_5_PRO_IMAGE_MODEL = OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL;
export const NANO_BANANA_2_1_IMAGE_MODEL = OPENROUTER_NANO_BANANA_2_1_IMAGE_MODEL;
export const GPT_5_IMAGE_MODEL = OPENROUTER_GPT_5_IMAGE_MODEL;
export const GROK_IMAGE_MODEL = "xai/grok-imagine-image-2.0";
export const IDEOGRAM_V4_MODEL = "ideogram/v4.0";
export const IDEOGRAM_PROMPT_MAX = 2048;

export const EXPLAINER_FRAME_IMAGE_ROUTE: ImageRoute = {
  backend: "openrouter",
  model: NANO_BANANA_2_1_IMAGE_MODEL,
  editModel: NANO_BANANA_2_1_IMAGE_MODEL,
};

export const IMAGE_ROUTE_BY_SCENE_TEXT: Record<SceneTextLanguage, ImageRoute> = {
  en: {
    backend: "openrouter",
    model: SEEDREAM_5_PRO_IMAGE_MODEL,
    editModel: SEEDREAM_5_PRO_IMAGE_MODEL,
  },
  "zh-Hant": {
    backend: "openrouter",
    model: SEEDREAM_5_PRO_IMAGE_MODEL,
    editModel: SEEDREAM_5_PRO_IMAGE_MODEL,
  },
  "zh-Hans": {
    backend: "openrouter",
    model: SEEDREAM_5_PRO_IMAGE_MODEL,
    editModel: SEEDREAM_5_PRO_IMAGE_MODEL,
  },
  ja: {
    backend: "openrouter",
    model: SEEDREAM_5_PRO_IMAGE_MODEL,
    editModel: SEEDREAM_5_PRO_IMAGE_MODEL,
  },
  ko: {
    backend: "openrouter",
    model: SEEDREAM_5_PRO_IMAGE_MODEL,
    editModel: SEEDREAM_5_PRO_IMAGE_MODEL,
  },
};

const DEFAULT_ROUTE = IMAGE_ROUTE_BY_SCENE_TEXT.en;

export function imageRouteForSceneText(
  language?: SceneTextLanguage,
  skillSlug?: string,
): ImageRoute {
  if (isDiagramExplainerSkill(skillSlug)) {
    return EXPLAINER_FRAME_IMAGE_ROUTE;
  }
  if (language && language in IMAGE_ROUTE_BY_SCENE_TEXT) {
    return IMAGE_ROUTE_BY_SCENE_TEXT[language];
  }
  return DEFAULT_ROUTE;
}

export function resolveImageRoute(
  language?: SceneTextLanguage,
  skillSlug?: string,
): ImageRoute {
  const route = imageRouteForSceneText(language, skillSlug);
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

// Scene stills, realistic or illustrated, use Seedream 5.0 Pro.
export function imageModelForRealism(realistic: boolean) {
  return realistic ? SEEDREAM_5_PRO_IMAGE_MODEL : SEEDREAM_5_PRO_IMAGE_MODEL;
}
