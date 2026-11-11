"use client";

import { useState } from "react";
import Link from "next/link";
import { LOCALE_OPTIONS } from "@/util/i18n";
import { updateMarketingConsentAction } from "@/presentation/actions/legal";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useStudioTheme, type StudioTheme } from "@/presentation/studio/studio-theme";

// Workspace settings: Appearance (Dark / Light mode, default Dark), Language, and Email Preferences.
export function SettingsView({
  initialMarketingOptIn = false,
  acceptedTermsVersion = null,
}: {
  initialMarketingOptIn?: boolean;
  acceptedTermsVersion?: string | null;
}) {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useStudioTheme();
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [savingMarketing, setSavingMarketing] = useState(false);

  async function onToggleMarketing(nextVal: boolean) {
    setMarketingOptIn(nextVal);
    setSavingMarketing(true);
    try {
      await updateMarketingConsentAction(nextVal);
    } finally {
      setSavingMarketing(false);
    }
  }

  const themeHeading =
    locale === "zh-Hant"
      ? "外觀主題 · Appearance"
      : locale === "zh-Hans"
        ? "外观主题 · Appearance"
        : "Appearance";
  const themeHint =
    locale === "zh-Hant"
      ? "切換工作台深色或淺色模式（預設為深色模式）。"
      : locale === "zh-Hans"
        ? "切换工作台深色或浅色模式（默认为深色模式）。"
        : "Switch the portal between Dark Mode (default) and Light Mode.";

  const themeOptions: Array<{
    id: StudioTheme;
    label: string;
    badge?: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "dark",
      label:
        locale === "zh-Hant"
          ? "深色模式 (Dark)"
          : locale === "zh-Hans"
            ? "深色模式 (Dark)"
            : "Dark Mode",
      badge:
        locale === "zh-Hant"
          ? "預設"
          : locale === "zh-Hans"
            ? "默认"
            : "Default",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      ),
    },
    {
      id: "light",
      label:
        locale === "zh-Hant"
          ? "淺色模式 (Light)"
          : locale === "zh-Hans"
            ? "淺色模式 (Light)"
            : "Light Mode",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("settings.title")}</h1>

      <section className="max-w-xl rounded-[1.5rem] border border-[var(--studio-line)] bg-[var(--studio-panel)] p-6">
        <h2 className="font-display text-lg font-bold">{themeHeading}</h2>
        <p className="mt-1 text-sm text-[var(--studio-muted)]">{themeHint}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {themeOptions.map((option) => {
            const selected = option.id === theme;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTheme(option.id)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                    selected
                      ? "border-[#c6f24b] bg-[#12141c] text-[#c6f24b]"
                      : "border-[var(--studio-line)] bg-[var(--studio-fill)] text-[var(--studio-ink)] hover: opacity-90"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </span>
                  {option.badge ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selected
                          ? "bg-[#c6f24b] text-[#12141c]"
                          : "bg-[var(--studio-line)] text-[var(--studio-muted)]"
                      }`}
                    >
                      {option.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="max-w-xl rounded-[1.5rem] border border-[var(--studio-line)] bg-[var(--studio-panel)] p-6">
        <h2 className="font-display text-lg font-bold">{t("nav.language")}</h2>
        <p className="mt-1 text-sm text-[var(--studio-muted)]">{t("settings.languageHint")}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {LOCALE_OPTIONS.map((option) => {
            const selected = option.id === locale;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setLocale(option.id)}
                  className={`flex w-full cursor-pointer items-center rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                    selected
                      ? "border-[#c6f24b] bg-[#12141c] text-[#c6f24b]"
                      : "border-[var(--studio-line)] bg-[var(--studio-fill)] text-[var(--studio-ink)] hover:opacity-90"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="max-w-xl rounded-[1.5rem] border border-[var(--studio-line)] bg-[var(--studio-panel)] p-6">
        <h2 className="font-display text-lg font-bold">
          {locale === "zh-Hant"
            ? "行銷電郵與條款 · Email & Legal"
            : locale === "zh-Hans"
              ? "营销电邮与条款 · Email & Legal"
              : "Marketing Emails & Legal"}
        </h2>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-[var(--studio-ink)]">
          <input
            type="checkbox"
            disabled={savingMarketing}
            checked={marketingOptIn}
            onChange={(event) => void onToggleMarketing(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#c6f24b]"
          />
          <span>{t("legal.acceptMarketing")}</span>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--studio-line)] pt-4 text-xs text-[var(--studio-muted)]">
          <Link href="/terms" target="_blank" className="font-semibold underline">
            {t("legal.terms")}
          </Link>
          <Link href="/privacy" target="_blank" className="font-semibold underline">
            {t("legal.privacy")}
          </Link>
          {acceptedTermsVersion ? (
            <span>
              {locale === "zh-Hant"
                ? `已同意版本：${acceptedTermsVersion}`
                : `Accepted version: ${acceptedTermsVersion}`}
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
