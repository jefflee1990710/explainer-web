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
 * 三支在有角色藍圖時都收 image_urls（多張參考圖）。
 * en：GPT Image 2.5 Flare，最多 16 張。
 * zh-Hant：GPT Image 2.5 Sunburst。Qwen Image 3 會把口字邊粵語字畫錯
 * （啲→哩、喎→啀、咪→米、喺→嗜），而且預設會改寫提示。
 * zh-Hans：GPT Image 2.5 Sunburst，最多 16 張。
 */
export const IMAGE_ROUTE_BY_SCENE_TEXT: Record<SceneTextLanguage, ImageRoute> = {
  en: {
    backend: "higgsfield",
    model: "marketing-studio/image/flare",
    editModel: "marketing-studio/image/flare",
  },
  "zh-Hant": {
    backend: "higgsfield",
    model: "marketing-studio/image/sunburst",
    editModel: "marketing-studio/image/sunburst",
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
