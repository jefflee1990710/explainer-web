import { hasAlicloudKey } from "@/service/alicloud/dashscope";
import type { SceneTextLanguage } from "@/model/project";

export type ImageBackend = "alicloud" | "higgsfield";

export type ImageRoute = {
  backend: ImageBackend;
  // Text-to-image model id sent to the provider.
  model: string;
  // Used when reference / edit images are attached; defaults to `model`.
  editModel: string;
};

/**
 * 畫面文字語系 → Higgsfield 產圖模型。生成時只讀呢張表。
 * en / zh-Hans 收多張 image_urls。zh-Hant 只收一張 image_url。
 * en：GPT Image 2.5 Flare，最多 16 張。
 * zh-Hant：Ideogram 4.0。它按提示裡的字來畫，唔會把粵語口字邊改成近形字
 * （Sunburst 會把喎畫成喝、搭座橋畫成別的字）。提示上限 2048，只收一張參考圖。
 * zh-Hans：GPT Image 2.5 Sunburst，最多 16 張。
 */
export const IDEOGRAM_V4_MODEL = "ideogram/v4.0";
export const IDEOGRAM_PROMPT_MAX = 2048;

export const IMAGE_ROUTE_BY_SCENE_TEXT: Record<SceneTextLanguage, ImageRoute> = {
  en: {
    backend: "higgsfield",
    model: "marketing-studio/image/flare",
    editModel: "marketing-studio/image/flare",
  },
  "zh-Hant": {
    backend: "higgsfield",
    model: IDEOGRAM_V4_MODEL,
    editModel: IDEOGRAM_V4_MODEL,
  },
  "zh-Hans": {
    backend: "higgsfield",
    model: "marketing-studio/image/sunburst",
    editModel: "marketing-studio/image/sunburst",
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
