"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  resolveLocale,
  readStoredLocale,
  writeStoredLocale,
  createTranslate,
  DEFAULT_LOCALE,
  getMessages,
  type LocaleId,
  type TranslateFn,
} from "@/util/i18n";

type I18nContextValue = {
  locale: LocaleId;
  setLocale: (locale: LocaleId) => void;
  t: TranslateFn;
};

const I18nContext = createContext<I18nContextValue | null>(null);

// First paint uses the cookie locale so server and client render the same words.
// localStorage or the browser language is applied after mount.
export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: LocaleId;
}) {
  const [locale, setLocaleState] = useState<LocaleId>(initialLocale);

  useEffect(() => {
    const resolved = resolveLocale(readStoredLocale(), [
      ...(navigator.languages ?? []),
      navigator.language,
    ]);
    if (resolved === initialLocale) return;
    setLocaleState(resolved);
    writeStoredLocale(resolved);
  }, [initialLocale]);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  const value = useMemo(() => {
    const messages = getMessages(locale);
    return { locale, setLocale, t: createTranslate(messages) };
  }, [locale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = value.t("meta.title");
  }, [locale, value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
