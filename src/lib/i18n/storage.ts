import { LOCALE_STORAGE_KEY, type LocaleId } from "./locales";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Persist UI locale in localStorage and mirror to a cookie for SSR hints.
export function readStoredLocale(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: LocaleId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode or blocked storage — cookie still works this session.
  }
  document.cookie = `${LOCALE_STORAGE_KEY}=${encodeURIComponent(locale)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
