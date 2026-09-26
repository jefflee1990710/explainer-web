"use client";

import { LOCALE_OPTIONS, type LocaleId } from "@/util/i18n";
import { useI18n } from "@/presentation/components/i18n-provider";

// Compact locale picker; preference persists in localStorage + cookie.
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="sr-only">{t("nav.language")}</span>
      <GlobeIcon />
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleId)}
        aria-label={t("nav.language")}
        className="min-h-[36px] max-w-[9rem] cursor-pointer rounded-full border border-accent-ink/15 bg-paper/80 py-1 pl-2 pr-7 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:max-w-none"
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function GlobeIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3 12h18M12 3c2.5 2.8 3.8 6 3.8 9s-1.3 6.2-3.8 9M12 3c-2.5 2.8-3.8 6-3.8 9s1.3 6.2 3.8 9"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}
