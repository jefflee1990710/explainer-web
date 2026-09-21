import type { SceneTextLanguage } from "@/types/project";

export type SceneTextPreset = {
  id: SceneTextLanguage;
  label: string;
  sublabel: string;
  // Instruction appended to the director / frame prompt.
  skillHint: string;
};

export const SCENE_TEXT_PRESETS: Record<SceneTextLanguage, SceneTextPreset> = {
  en: {
    id: "en",
    label: "English",
    sublabel: "英文標籤",
    skillHint:
      "On-canvas text language: English. Every label is 1–2 short English words, spelled exactly, no other writing system.",
  },
  "zh-Hant": {
    id: "zh-Hant",
    label: "繁體中文",
    sublabel: "畫面文字",
    skillHint:
      "On-canvas text language: Traditional Chinese (繁體中文). Every label is 1–2 Traditional Chinese characters or a short word, spelled exactly, no Simplified Chinese or Latin letters unless the source uses a brand name.",
  },
  "zh-Hans": {
    id: "zh-Hans",
    label: "简体中文",
    sublabel: "画面文字",
    skillHint:
      "On-canvas text language: Simplified Chinese (简体中文). Every label is 1–2 Simplified Chinese characters or a short word, spelled exactly, no Traditional Chinese or Latin letters unless the source uses a brand name.",
  },
};

export const SCENE_TEXT_IDS = Object.keys(SCENE_TEXT_PRESETS) as SceneTextLanguage[];

// AliCloud / Qwen: steer away from lettering when scene text is off.
export const SCENE_TEXT_OFF_NEGATIVE_PROMPT =
  "text, words, letters, numbers, typography, captions, subtitles, signage, labels, watermark, logo";

export function isSceneTextLanguage(value: string): value is SceneTextLanguage {
  return SCENE_TEXT_IDS.includes(value as SceneTextLanguage);
}

export function resolveSceneText(input: {
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextLanguage;
}) {
  // Default closed: only an explicit `true` turns on-canvas labels on.
  const enabled = input.sceneTextEnabled === true;
  const language = input.sceneTextLanguage && isSceneTextLanguage(input.sceneTextLanguage)
    ? input.sceneTextLanguage
    : "en";
  return { enabled, language };
}

export function sceneTextSkillHint(enabled: boolean, language: SceneTextLanguage) {
  if (!enabled) {
    return "On-canvas text is OFF. explainerScene, visualWorld, and motionCamera must contain NO written words, labels, numbers, captions, signage, or lettering — not even in quotes. Communicate only with images, props, and composition.";
  }
  return [
    "When on-canvas text is ON, the ONLY writing in each still is that clip's englishVo voiceover line, spelled character-for-character, large and clearly readable.",
    SCENE_TEXT_PRESETS[language].skillHint,
    "explainerScene and motionCamera describe visuals and motion only — do not put other quotes, labels, or signage in those fields.",
  ].join(" ");
}

// Typography locale for lettering style; the quoted voiceover keeps its own script.
export function sceneTextTypographyHint(language: SceneTextLanguage) {
  return SCENE_TEXT_PRESETS[language].skillHint.replace(
    /Every label is .+$/,
    "Match this locale for hand-drawn caption styling when it fits the quoted line.",
  );
}

// Frame prompts: OFF = zero writing; ON = quote the clip narration (englishVo) exactly.
export function sceneTextFrameLines(
  enabled: boolean,
  language: SceneTextLanguage,
  narration?: string,
  typography?: string,
) {
  if (!enabled) {
    return [
      "No on-canvas text, labels, captions, letters, numbers, or written words of any kind. Communicate only with images, props, and composition.",
      "Ignore any mention of words, labels, signs, or lettering in the scene description below; do NOT render writing in the image.",
    ];
  }
  const line = narration?.trim();
  if (!line) {
    return [
      sceneTextTypographyHint(language),
      "On-canvas text must quote this clip's voiceover line exactly, but none was provided.",
    ];
  }
  const letterStyle = typography?.trim() || sceneTextTypographyHint(language);
  return [
    "MANDATORY ON-CANVAS TEXT (highest priority — the image is wrong without it):",
    `Draw this voiceover line large, legible, and fully readable on the canvas. ${letterStyle}`,
    `Exact text to render (only writing allowed in the image): "${line}"`,
    "Spell every character exactly; you may wrap across 2–3 lines but every word must appear.",
    "No other words, letters, numbers, or signage anywhere.",
    "If the scene description below mentions different words or labels, ignore that writing — only the quoted voiceover line may appear.",
  ];
}

export function sceneTextNegativePrompt(enabled: boolean) {
  return enabled ? undefined : SCENE_TEXT_OFF_NEGATIVE_PROMPT;
}
