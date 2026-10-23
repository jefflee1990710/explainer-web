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

function makeForeignLanguagePreset(input: {
  id: VoLanguage;
  label: string;
  sublabel: string;
  englishName: string;
  paceHint: string;
}): LanguagePreset {
  return {
    id: input.id,
    label: input.label,
    sublabel: input.sublabel,
    skillHint: `Voiceover language: natural conversational ${input.englishName}. Keep sentences concise and speakable (${input.paceHint}).`,
    planningSkillHint: `Planning explanations (narrativeJob, explainerScene, startScene, endScene, motionCamera, hookStrategy, coreMessage, localizedTitle, narrativeArc, visualWorld, narrator, palette, bgmDirection, and every clip bgmSfx note) must be written in clear English, while spoken lines in englishVo / startVo / endVo are written in natural conversational ${input.englishName}.`,
  };
}

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
  ja: makeForeignLanguagePreset({
    id: "ja",
    label: "日本語",
    sublabel: "日文自然口語",
    englishName: "Japanese (日本語)",
    paceHint: "roughly 4–5 Japanese characters/kana per second of speech",
  }),
  ko: makeForeignLanguagePreset({
    id: "ko",
    label: "한국어",
    sublabel: "韓文自然口語",
    englishName: "Korean (한국어)",
    paceHint: "roughly 3.5–4.5 Korean syllables per second of speech",
  }),
  id: makeForeignLanguagePreset({
    id: "id",
    label: "Bahasa Indonesia",
    sublabel: "印尼文自然口語",
    englishName: "Indonesian (Bahasa Indonesia)",
    paceHint: "roughly 2–2.5 words per second of speech",
  }),
  es: makeForeignLanguagePreset({
    id: "es",
    label: "Español",
    sublabel: "西班牙文自然口語",
    englishName: "Spanish (Español)",
    paceHint: "roughly 2.5 words per second of speech",
  }),
  pt: makeForeignLanguagePreset({
    id: "pt",
    label: "Português",
    sublabel: "葡萄牙文自然口語",
    englishName: "Portuguese (Português)",
    paceHint: "roughly 2.5 words per second of speech",
  }),
  fr: makeForeignLanguagePreset({
    id: "fr",
    label: "Français",
    sublabel: "法文自然口語",
    englishName: "French (Français)",
    paceHint: "roughly 2.5 words per second of speech",
  }),
  de: makeForeignLanguagePreset({
    id: "de",
    label: "Deutsch",
    sublabel: "德文自然口語",
    englishName: "German (Deutsch)",
    paceHint: "roughly 2–2.3 words per second of speech",
  }),
  ru: makeForeignLanguagePreset({
    id: "ru",
    label: "Русский",
    sublabel: "俄文自然口語",
    englishName: "Russian (Русский)",
    paceHint: "roughly 2–2.3 words per second of speech",
  }),
  vi: makeForeignLanguagePreset({
    id: "vi",
    label: "Tiếng Việt",
    sublabel: "越南文自然口語",
    englishName: "Vietnamese (Tiếng Việt)",
    paceHint: "roughly 3–3.5 syllables/words per second of speech",
  }),
  th: makeForeignLanguagePreset({
    id: "th",
    label: "ไทย",
    sublabel: "泰文自然口語",
    englishName: "Thai (ภาษาไทย)",
    paceHint: "roughly 3.5–4.5 Thai syllables per second of speech",
  }),
  ms: makeForeignLanguagePreset({
    id: "ms",
    label: "Bahasa Melayu",
    sublabel: "馬來文自然口語",
    englishName: "Malay (Bahasa Melayu)",
    paceHint: "roughly 2–2.5 words per second of speech",
  }),
  fil: makeForeignLanguagePreset({
    id: "fil",
    label: "Filipino",
    sublabel: "菲律賓文自然口語",
    englishName: "Filipino / Tagalog",
    paceHint: "roughly 2–2.5 words per second of speech",
  }),
  hi: makeForeignLanguagePreset({
    id: "hi",
    label: "हिन्दी",
    sublabel: "印地文自然口語",
    englishName: "Hindi (हिन्दी)",
    paceHint: "roughly 2.5 words per second of speech",
  }),
  ar: makeForeignLanguagePreset({
    id: "ar",
    label: "العربية",
    sublabel: "阿拉伯文自然口語",
    englishName: "Arabic (العربية)",
    paceHint: "roughly 2–2.3 words per second of speech",
  }),
  it: makeForeignLanguagePreset({
    id: "it",
    label: "Italiano",
    sublabel: "義大利文自然口語",
    englishName: "Italian (Italiano)",
    paceHint: "roughly 2.5 words per second of speech",
  }),
  nl: makeForeignLanguagePreset({
    id: "nl",
    label: "Nederlands",
    sublabel: "荷蘭文自然口語",
    englishName: "Dutch (Nederlands)",
    paceHint: "roughly 2.3–2.5 words per second of speech",
  }),
  pl: makeForeignLanguagePreset({
    id: "pl",
    label: "Polski",
    sublabel: "波蘭文自然口語",
    englishName: "Polish (Polski)",
    paceHint: "roughly 2–2.3 words per second of speech",
  }),
  tr: makeForeignLanguagePreset({
    id: "tr",
    label: "Türkçe",
    sublabel: "土耳其文自然口語",
    englishName: "Turkish (Türkçe)",
    paceHint: "roughly 2–2.3 words per second of speech",
  }),
};

export const LANGUAGE_IDS = Object.keys(LANGUAGE_PRESETS) as VoLanguage[];

export function isVoLanguage(value: string): value is VoLanguage {
  return LANGUAGE_IDS.includes(value as VoLanguage);
}

export function isChineseVoLanguage(language?: VoLanguage): boolean {
  return language === "yue" || language === "zh";
}

// Labels that wrap a clip's start and end still inside one scene paragraph.
export function sceneStateLabels(language?: VoLanguage) {
  if (isChineseVoLanguage(language)) {
    return { start: "起始", end: "結尾", endTimed: "結尾（N秒後）" };
  }
  return { start: "Start", end: "End", endTimed: "End (Ns later)" };
}

// Last instruction in Phase A so scene prose follows the language setting,
// not the skill's "user's language" line or a Chinese example.
export function sceneDescriptionLanguageLock(language?: VoLanguage) {
  const preset = LANGUAGE_PRESETS[language || "en"];
  return `${preset.planningSkillHint} Spoken lines stay in englishVo. Do not write the scene description in a different language from this setting.`;
}
