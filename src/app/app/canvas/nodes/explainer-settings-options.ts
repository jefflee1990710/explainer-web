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

// Still plus one-line blurb for the art-style picker. One frame per style, not the multi-style director strip.
export const ART_STYLE_PREVIEWS: Record<ExplainerSkillSlug, { previewUrl: string; blurb: Label }> = {
  "cartoon-explainer-video-director": {
    previewUrl: "/hero/styles/doodle.webp",
    blurb: { zh: "黑色馬克筆線條，白板解說。", en: "Black marker lines on a whiteboard." },
  },
  "paper-cutout-explainer-video-director": {
    previewUrl: "/hero/styles/paper-cutout.webp",
    blurb: { zh: "層疊色紙、手撕邊緣的停格拼貼。", en: "Layered cut paper with torn edges." },
  },
  "papercraft-diorama-director": {
    previewUrl: "/hero/styles/papercraft-diorama-preview.webp",
    blurb: { zh: "厚卡紙摺成的 3D 微縮場景。", en: "Folded cardstock 3D miniature scenes." },
  },
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
