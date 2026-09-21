import { hasAlicloudKey } from "@/lib/alicloud/dashscope";
import type { SceneTextLanguage } from "@/types/project";

export type ImageBackend = "alicloud" | "higgsfield";

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
export const IMAGE_ROUTE_BY_SCENE_TEXT: Record<SceneTextLanguage, ImageRoute> = {
  en: {
    backend: "higgsfield",
    model: "alibaba/qwen-image-3/text-to-image",
    editModel: "alibaba/qwen-image-3/edit",
  },
  "zh-Hant": {
    backend: "alicloud",
    model: "qwen-image-3.0-pro",
    editModel: "qwen-image-3.0-pro",
  },
  "zh-Hans": {
    backend: "alicloud",
    model: "qwen-image-3.0-pro",
    editModel: "qwen-image-3.0-pro",
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
  if (route.backend === "alicloud" && !hasAlicloudKey()) {
    throw new Error(`畫面文字為中文時需要 ALICLOUD_API_KEY（${route.model}）`);
  }
  return route;
}

export function imageModelForSubmit(route: ImageRoute, hasReferenceImages: boolean) {
  return hasReferenceImages ? route.editModel : route.model;
}
