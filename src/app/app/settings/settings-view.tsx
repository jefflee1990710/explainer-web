"use client";

import { LOCALE_OPTIONS } from "@/util/i18n";
import { useI18n } from "@/presentation/components/i18n-provider";

// Workspace settings. Language used to live on the rail; it lives here now.
export function SettingsView() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("settings.title")}</h1>
      <section className="mt-6 max-w-xl rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <h2 className="font-display text-lg font-bold">{t("nav.language")}</h2>
        <p className="mt-1 text-sm text-muted">{t("settings.languageHint")}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {LOCALE_OPTIONS.map((option) => {
            const selected = option.id === locale;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setLocale(option.id)}
                  className={`flex w-full cursor-pointer items-center rounded-xl px-4 py-2.5 text-left text-sm font-medium ${
                    selected
                      ? "bg-[#12141c] text-[#c6f24b]"
                      : "bg-[var(--studio-fill)] text-[var(--studio-ink)] hover:bg-zinc-100"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
