"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  BUY_RATES,
  CONSUME_RATES,
  PAYOUT_MIN_CENTS,
  REFERRAL_COOKIE_DAYS,
} from "@/service/affiliate/rates";
import type { AffiliateTier } from "@/model/affiliate";

function pct(rate: number) {
  return String(Math.round(rate * 1000) / 10);
}

// Public pitch for creator mentors. Rates come from the live commission table.
export function AffiliateIntro({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const href = signedIn ? "/app/affiliate" : "/sign-in?next=/app/affiliate";
  const steps = [
    { step: "01", title: t("affiliatePage.step1Title"), body: t("affiliatePage.step1Body") },
    { step: "02", title: t("affiliatePage.step2Title"), body: t("affiliatePage.step2Body") },
    { step: "03", title: t("affiliatePage.step3Title"), body: t("affiliatePage.step3Body") },
  ];
  const levels: { tier: AffiliateTier; title: string }[] = [
    { tier: 1, title: t("affiliatePage.l1Title") },
    { tier: 2, title: t("affiliatePage.l2Title") },
    { tier: 3, title: t("affiliatePage.l3Title") },
  ];

  return (
    <main>
      <section className="bg-white px-4 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t("affiliatePage.eyebrow")}
          </p>
          <h1 className="mt-4 text-pretty text-4xl font-bold tracking-tight text-[#12141c] sm:text-5xl">
            {t("affiliatePage.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-zinc-600">
            {t("affiliatePage.body")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={href}
              className="rounded-full bg-[#12141c] px-5 py-2.5 text-sm font-semibold text-[#c6f24b] hover:bg-black"
            >
              {signedIn ? t("affiliatePage.ctaSignedIn") : t("affiliatePage.cta")}
            </Link>
            <Link
              href="/examples"
              className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-[#12141c] hover:bg-zinc-50"
            >
              {t("affiliatePage.secondary")}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-100 bg-zinc-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3 md:px-8">
          {steps.map((item) => (
            <article
              key={item.step}
              className="flex h-full flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#12141c] text-sm font-semibold text-[#c6f24b]">
                {item.step}
              </span>
              <h2 className="mt-4 text-xl font-semibold text-zinc-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-4 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-zinc-900">
            {t("affiliatePage.ratesTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-zinc-600">
            {t("affiliatePage.ratesBody", {
              days: String(REFERRAL_COOKIE_DAYS),
              min: String(PAYOUT_MIN_CENTS / 100),
            })}
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {levels.map((level) => (
              <article
                key={level.tier}
                className={`rounded-2xl border p-8 shadow-sm ${
                  level.tier === 1
                    ? "border-[#12141c] bg-[#12141c] text-white"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <h3 className="text-2xl font-bold">{level.title}</h3>
                <p
                  className={`mt-3 text-sm leading-6 ${
                    level.tier === 1 ? "text-white/80" : "text-zinc-600"
                  }`}
                >
                  {t("affiliatePage.levelBody", {
                    buy: pct(BUY_RATES[level.tier]),
                    spend: pct(CONSUME_RATES[level.tier]),
                  })}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50 px-4 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-zinc-900">{t("affiliatePage.whoTitle")}</h2>
          <p className="mt-4 text-lg leading-8 text-zinc-600">{t("affiliatePage.whoBody")}</p>
          <Link
            href={href}
            className="mt-8 inline-flex rounded-full bg-[#12141c] px-5 py-2.5 text-sm font-semibold text-[#c6f24b] hover:bg-black"
          >
            {signedIn ? t("affiliatePage.ctaSignedIn") : t("affiliatePage.cta")}
          </Link>
        </div>
      </section>
    </main>
  );
}
