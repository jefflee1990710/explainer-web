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
    SCENE_TEXT_PRESETS[language].skillHint,
    "When on-canvas text is ON, the ONLY writing in each still is that clip's englishVo voiceover line, spelled character-for-character on the canvas.",
    "explainerScene and motionCamera describe visuals and motion only — do not put other quotes, labels, or signage in those fields.",
    "Do not add separate subtitle bars; the voiceover line is integrated as short on-canvas lettering.",
  ].join(" ");
}

// Frame prompts: OFF = zero writing; ON = quote the clip narration (englishVo) exactly.
export function sceneTextFrameLines(
  enabled: boolean,
  language: SceneTextLanguage,
  narration?: string,
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
      SCENE_TEXT_PRESETS[language].skillHint,
      "On-canvas text must quote this clip's voiceover line exactly, but none was provided.",
    ];
  }
  return [
    SCENE_TEXT_PRESETS[language].skillHint,
    `On-canvas text (the only writing allowed in the image): "${line}" — spell exactly, no other words or letters anywhere.`,
  ];
}
