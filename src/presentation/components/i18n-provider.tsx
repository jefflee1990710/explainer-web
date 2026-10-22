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
import { usePathname } from "next/navigation";
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
import { marketingSeoTitle } from "@/util/i18n/marketing-seo-paths";

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
  const pathname = usePathname() ?? "";
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
    return { locale, setLocale, t: createTranslate(messages), messages };
  }, [locale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    // Feature SEO landings keep their own title when the user switches locale.
    document.title =
      marketingSeoTitle(value.messages, pathname) ?? value.t("meta.title");
  }, [locale, pathname, value]);

  return (
    <I18nContext.Provider value={{ locale: value.locale, setLocale: value.setLocale, t: value.t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
