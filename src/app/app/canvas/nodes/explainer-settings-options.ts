// Dropdown labels for the Explainer Settings node (art style, on-screen text language, presenter).

import type {
  EXPLAINER_SCENE_TEXT_CHOICES,
  ExplainerPresenterPosition,
  ExplainerSkillSlug,
} from "@/model/explainer-settings";

type Label = { zh: string; en: string };
type ExplainerSceneTextChoice = (typeof EXPLAINER_SCENE_TEXT_CHOICES)[number];

// Wire and handle color for the Explainer Settings node.
export const EXPLAINER_SETTINGS_COLOR = "#f472b6";

export const ART_STYLE_LABELS: Record<ExplainerSkillSlug, Label> = {
  "cartoon-explainer-video-director": { zh: "白板手繪", en: "Whiteboard" },
  "paper-cutout-explainer-video-director": { zh: "剪紙拼貼", en: "Paper cutout" },
  "papercraft-diorama-director": { zh: "3D 摺紙微縮", en: "Papercraft" },
};

export const SCENE_TEXT_LABELS: Record<ExplainerSceneTextChoice, Label> = {
  "zh-Hant": { zh: "繁體中文", en: "Traditional Chinese" },
  "zh-Hans": { zh: "簡體中文", en: "Simplified Chinese" },
  en: { zh: "英文", en: "English" },
  ja: { zh: "日文", en: "Japanese" },
  ko: { zh: "韓文", en: "Korean" },
  none: { zh: "不顯示文字", en: "No on-screen text" },
};

export const PRESENTER_LABELS: Record<ExplainerPresenterPosition, Label> = {
  auto: { zh: "自動（跟分鏡）", en: "Auto (follow the plan)" },
  "lower-left": { zh: "左下角", en: "Lower left" },
  "lower-right": { zh: "右下角", en: "Lower right" },
};
