import { hasAlicloudKey } from "@/service/alicloud/dashscope";
import { openRouterApiKey, OPENROUTER_IMAGE_MODEL } from "@/service/openrouter/generate";
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
 * 畫面文字語系 → 產圖 backend + model。生成時只讀呢張表。
 */
const OPENROUTER_ROUTE: ImageRoute = {
  backend: "openrouter",
  model: OPENROUTER_IMAGE_MODEL,
  editModel: OPENROUTER_IMAGE_MODEL,
};

export const IMAGE_ROUTE_BY_SCENE_TEXT: Record<SceneTextLanguage, ImageRoute> = {
  en: OPENROUTER_ROUTE,
  "zh-Hant": OPENROUTER_ROUTE,
  "zh-Hans": OPENROUTER_ROUTE,
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
  if (route.backend === "alicloud" && !hasAlicloudKey()) {
    throw new Error(`畫面文字為中文時需要 ALICLOUD_API_KEY（${route.model}）`);
  }
  if (route.backend === "openrouter" && !openRouterApiKey()) {
    throw new Error("尚未設定 OPENROUTER_API_KEY");
  }
  return route;
}

export function imageModelForSubmit(route: ImageRoute, hasReferenceImages: boolean) {
  return hasReferenceImages ? route.editModel : route.model;
}
