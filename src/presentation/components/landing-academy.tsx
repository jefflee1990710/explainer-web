"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Intro band under the hero: Scro Academy teaches reel growth; register to unlock every course.
export function LandingAcademy({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const cards = [
    { title: t("landing.academy.card1Title"), body: t("landing.academy.card1Body") },
    { title: t("landing.academy.card2Title"), body: t("landing.academy.card2Body") },
    { title: t("landing.academy.card3Title"), body: t("landing.academy.card3Body") },
  ];
  const points = [
    t("landing.academy.point1"),
    t("landing.academy.point2"),
    t("landing.academy.point3"),
  ];

  return (
    <section
      id="academy"
      className="border-b border-black/40 bg-[#12141c] px-4 py-20 md:px-8 md:py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/35 bg-[#c6f24b]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
            {t("landing.academy.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t("landing.academy.title")}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/70">
            {t("landing.academy.body")}
          </p>
          <ul className="mt-6 space-y-2.5">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-white/85">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#c6f24b]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 inline-flex rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-[#c6f24b]">
            {t("landing.academy.freeBadge")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/academy"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#c6f24b] px-7 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-[#b6e23a] sm:w-auto"
            >
              {signedIn ? t("landing.academy.ctaContinue") : t("landing.academy.ctaBrowse")}
            </Link>
            {signedIn ? null : (
              <Link
                href="/sign-up?next=/academy"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15 sm:w-auto"
              >
                {t("landing.academy.ctaRegister")}
              </Link>
            )}
          </div>
        </div>

        <ol className="grid gap-3">
          {cards.map((card, index) => (
            <li
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c6f24b]">
                0{index + 1}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-white/65">{card.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
