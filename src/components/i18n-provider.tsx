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
  getMessages,
  type LocaleId,
  type TranslateFn,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: LocaleId;
  setLocale: (locale: LocaleId) => void;
  t: TranslateFn;
};

const I18nContext = createContext<I18nContextValue | null>(null);

// Client-side UI locale: localStorage preference, else browser language.
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(() =>
    resolveLocale(readStoredLocale(), typeof navigator !== "undefined" ? [...navigator.languages, navigator.language] : []),
  );

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
