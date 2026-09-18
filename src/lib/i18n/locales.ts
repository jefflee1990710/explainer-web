// Supported UI locales (separate from VoLanguage used for video narration).
export type LocaleId =
  | "en"
  | "zh-Hant"
  | "zh-Hans"
  | "ja"
  | "ko"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ru"
  | "id";

export const LOCALE_IDS: LocaleId[] = [
  "en",
  "zh-Hant",
  "zh-Hans",
  "ja",
  "ko",
  "es",
  "fr",
  "de",
  "pt",
  "ru",
  "id",
];

export const DEFAULT_LOCALE: LocaleId = "en";

export const LOCALE_STORAGE_KEY = "explainer.locale";

export type LocaleOption = {
  id: LocaleId;
  /** Endonym shown in the language switcher. */
  label: string;
};

export const LOCALE_OPTIONS: LocaleOption[] = [
  { id: "en", label: "English" },
  { id: "zh-Hant", label: "繁體中文" },
  { id: "zh-Hans", label: "简体中文" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "pt", label: "Português" },
  { id: "ru", label: "Русский" },
  { id: "id", label: "Bahasa Indonesia" },
];

export function isLocaleId(value: string | null | undefined): value is LocaleId {
  return Boolean(value && LOCALE_IDS.includes(value as LocaleId));
}
