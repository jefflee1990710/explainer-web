import type { VoLanguage } from "@/model/project";

export type LanguagePreset = {
  id: VoLanguage;
  label: string;
  sublabel: string;
  // Instruction appended to the director system prompt.
  skillHint: string;
  // Phase A planning fields (narrativeJob, explainerScene, etc.) use this language.
  planningSkillHint: string;
};

export const LANGUAGE_PRESETS: Record<VoLanguage, LanguagePreset> = {
  en: {
    id: "en",
    label: "English",
    sublabel: "美式英文口語",
    skillHint:
      "Voiceover language: natural American English. Keep the exact word budget from the duration preset.",
    planningSkillHint:
      "Planning explanations (narrativeJob, explainerScene, startScene, endScene, motionCamera, hookStrategy, coreMessage, localizedTitle, narrativeArc, visualWorld, narrator, palette, bgmDirection, and every clip bgmSfx note) must be written in clear English. This overrides any skill line that says to write Phase A in the user's language. Scene descriptions stay in English even when the source is another language.",
  },
  yue: {
    id: "yue",
    label: "廣東話",
    sublabel: "香港口語白話",
    skillHint:
      "Voiceover language: Hong Kong Cantonese colloquial speech (香港廣東話口語／白話), written in Traditional Chinese characters with authentic spoken particles such as 啦、囉、喎、咩、㖭, and Hong Kong vocabulary. Do NOT write formal written Chinese or Mandarin phrasing in englishVo. On-canvas subtitles are rewritten into Traditional Chinese 書面語; do not paint colloquial particles on the picture. Roughly 2.5 Chinese characters per second of speech.",
    planningSkillHint:
      "Planning explanations (narrativeJob, explainerScene, startScene, endScene, motionCamera, hookStrategy, coreMessage, localizedTitle, narrativeArc, visualWorld, narrator, palette, bgmDirection, and every clip bgmSfx note) must be Hong Kong Cantonese colloquial (香港廣東話口語), written in Traditional Chinese characters with natural spoken particles — not Mandarin or formal written Chinese. This overrides any skill line that says to write Phase A in the user's language.",
  },
  zh: {
    id: "zh",
    label: "中文",
    sublabel: "繁體中文（國語）",
    skillHint:
      "Voiceover language: Traditional Chinese for Mandarin narration (繁體中文，國語口語). Keep sentences short and speakable. Roughly 3 Chinese characters per second of speech.",
    planningSkillHint:
      "Planning explanations (narrativeJob, explainerScene, startScene, endScene, motionCamera, hookStrategy, coreMessage, localizedTitle, narrativeArc, visualWorld, narrator, palette, bgmDirection, and every clip bgmSfx note) must be Traditional Chinese (繁體中文，國語口語，簡短可讀). This overrides any skill line that says to write Phase A in the user's language.",
  },
};

export const LANGUAGE_IDS = Object.keys(LANGUAGE_PRESETS) as VoLanguage[];

export function isVoLanguage(value: string): value is VoLanguage {
  return LANGUAGE_IDS.includes(value as VoLanguage);
}

// Labels that wrap a clip's start and end still inside one scene paragraph.
export function sceneStateLabels(language?: VoLanguage) {
  if (language === "en") {
    return { start: "Start", end: "End", endTimed: "End (Ns later)" };
  }
  return { start: "起始", end: "結尾", endTimed: "結尾（N秒後）" };
}

// Last instruction in Phase A so scene prose follows the language setting,
// not the skill's "user's language" line or a Chinese example.
export function sceneDescriptionLanguageLock(language?: VoLanguage) {
  const preset = LANGUAGE_PRESETS[language || "en"];
  return `${preset.planningSkillHint} Spoken lines stay in englishVo. Do not write the scene description in a different language from this setting.`;
}
