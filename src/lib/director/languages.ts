import type { VoLanguage } from "@/types/project";

export type LanguagePreset = {
  id: VoLanguage;
  label: string;
  sublabel: string;
  // Instruction appended to the director system prompt.
  skillHint: string;
  // Which language the reference translation column should use.
  translationHint: string;
};

export const LANGUAGE_PRESETS: Record<VoLanguage, LanguagePreset> = {
  en: {
    id: "en",
    label: "English",
    sublabel: "美式英文旁白",
    skillHint:
      "Voiceover language: natural American English. Keep the exact word budget from the duration preset.",
    translationHint:
      "The referenceTranslation field must be a Traditional Chinese (繁體中文) reference translation of the voiceover.",
  },
  yue: {
    id: "yue",
    label: "廣東話",
    sublabel: "香港口語白話",
    skillHint:
      "Voiceover language: Hong Kong Cantonese colloquial speech (香港廣東話口語／白話), written in Traditional Chinese characters with authentic spoken particles such as 啦、囉、喎、咩、㖭, and Hong Kong vocabulary. Do NOT write formal written Chinese or Mandarin phrasing. Roughly 2.5 Chinese characters per second of speech.",
    translationHint:
      "The referenceTranslation field must be a natural American English translation of the Cantonese voiceover.",
  },
  zh: {
    id: "zh",
    label: "中文",
    sublabel: "繁體中文（國語）",
    skillHint:
      "Voiceover language: Traditional Chinese for Mandarin narration (繁體中文，國語口語). Keep sentences short and speakable. Roughly 3 Chinese characters per second of speech.",
    translationHint:
      "The referenceTranslation field must be a natural American English translation of the Chinese voiceover.",
  },
};

export const LANGUAGE_IDS = Object.keys(LANGUAGE_PRESETS) as VoLanguage[];

export function isVoLanguage(value: string): value is VoLanguage {
  return LANGUAGE_IDS.includes(value as VoLanguage);
}
