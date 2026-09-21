import { hasAlicloudKey } from "@/lib/alicloud/dashscope";
import type { SceneTextLanguage } from "@/types/project";

export type ImageBackend = "alicloud" | "higgsfield";

/**
 * One place to pick the still-image provider from 畫面文字 language.
 * 繁／簡中文 → AliCloud Qwen 3.0（中文字幕穩）. English → Higgsfield.
 */
export const IMAGE_BACKEND_BY_SCENE_TEXT = {
  en: "higgsfield",
  "zh-Hant": "alicloud",
  "zh-Hans": "alicloud",
} as const satisfies Record<SceneTextLanguage, ImageBackend>;

export const ALICLOUD_SCENE_IMAGE_MODEL = "qwen-image-3.0-pro";

export function imageBackendForSceneText(language?: SceneTextLanguage): ImageBackend {
  if (language && language in IMAGE_BACKEND_BY_SCENE_TEXT) {
    return IMAGE_BACKEND_BY_SCENE_TEXT[language];
  }
  return "higgsfield";
}

export function resolveImageBackend(language?: SceneTextLanguage): ImageBackend {
  const backend = imageBackendForSceneText(language);
  if (backend === "alicloud" && !hasAlicloudKey()) {
    throw new Error("畫面文字為中文時需要 ALICLOUD_API_KEY（qwen-image-3.0-pro）");
  }
  return backend;
}

export function imageJobModel(
  backend: ImageBackend,
  higgsfieldModel: string,
) {
  return backend === "alicloud" ? ALICLOUD_SCENE_IMAGE_MODEL : higgsfieldModel;
}
