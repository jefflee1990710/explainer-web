import { DEFAULT_LOCALE, type LocaleId, isLocaleId } from "@/util/i18n/locales";

// Map a BCP-47 tag (browser / OS language) to a supported locale id.
export function localeFromTag(tag: string): LocaleId | null {
  const normalized = tag.trim().replace(/_/g, "-").toLowerCase();
  if (!normalized) return null;

  if (normalized.startsWith("zh")) {
    if (
      normalized.includes("hant") ||
      normalized.endsWith("-tw") ||
      normalized.endsWith("-hk") ||
      normalized.endsWith("-mo")
    ) {
      return "zh-Hant";
    }
    if (
      normalized.includes("hans") ||
      normalized.endsWith("-cn") ||
      normalized.endsWith("-sg") ||
      normalized === "zh"
    ) {
      return "zh-Hans";
    }
    return "zh-Hans";
  }

  const primary = normalized.split("-")[0];
  const map: Record<string, LocaleId> = {
    en: "en",
    ja: "ja",
    ko: "ko",
    es: "es",
    fr: "fr",
    de: "de",
    pt: "pt",
    ru: "ru",
    id: "id",
  };
  return map[primary] ?? null;
}

// Stored preference wins; otherwise pick the first supported browser language.
export function resolveLocale(stored: string | null | undefined, browserTags?: string[]): LocaleId {
  if (isLocaleId(stored)) return stored;
  for (const tag of browserTags ?? []) {
    const match = localeFromTag(tag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export function detectBrowserLocale(): LocaleId {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const tags = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean) as string[];
  return resolveLocale(null, tags);
}
