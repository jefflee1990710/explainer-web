"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// Realistic phone whose screen is a popular KOL's Instagram: grid, followers, notifications.
export function LandingKol() {
  const { t } = useI18n();
  const points = [
    t("landing.kol.posts"),
    t("landing.kol.followers"),
    t("landing.kol.notifications"),
  ];

  return (
    <section id="kol" className="border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:gap-12 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)] lg:order-2">
          <ParallaxLayer distance={20}>
            <img
              src="/landing/kol-ig.webp"
              alt={t("landing.kol.title")}
              className="aspect-square w-full object-cover"
            />
          </ParallaxLayer>
        </div>
        <div className="lg:order-1">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("landing.kol.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("landing.kol.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("landing.kol.body")}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {points.map((label) => (
              <li
                key={label}
                className="rounded-full border border-[#e4e4e7] bg-white px-3.5 py-1 text-xs font-semibold text-[#12141c]"
              >
                {label}
              </li>
            ))}
          </ul>
          <SectionCtaRow
            primary={{ href: "/app/characters", label: t("landing.kol.cta") }}
            secondary={{ href: "/ai-influencer", label: t("aiInfluencerPage.hero.ctaStart") }}
          />
        </div>
      </div>
    </section>
  );
}
