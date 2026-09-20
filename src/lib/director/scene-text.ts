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
    return "On-canvas text is OFF. explainerScene, visualWorld, and motionCamera must contain NO written words, labels, numbers, captions, signage, or lettering. Communicate only with images, props, and composition.";
  }
  return `${SCENE_TEXT_PRESETS[language].skillHint} No captions or subtitles of the voiceover.`;
}

export function sceneTextFrameLines(enabled: boolean, language: SceneTextLanguage) {
  if (!enabled) {
    return [
      "No on-canvas text, labels, captions, letters, numbers, or written words of any kind. Communicate only with images, props, and composition.",
    ];
  }
  return [
    SCENE_TEXT_PRESETS[language].skillHint,
    "Any on-canvas text must be spelled exactly as written in the scene description.",
  ];
}
