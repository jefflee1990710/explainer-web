"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// One character across three shorts: copy on the left, cut-out art card on the right.
export function LandingCast() {
  const { t } = useI18n();
  const uses = [
    t("landing.cast.product"),
    t("landing.cast.service"),
    t("landing.cast.knowledge"),
  ];

  return (
    <section id="characters" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("landing.cast.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("landing.cast.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("landing.cast.body")}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {uses.map((label) => (
              <li
                key={label}
                className="rounded-full border border-[#e4e4e7] bg-[#f4f4f5] px-3.5 py-1 text-xs font-semibold text-[#12141c]"
              >
                {label}
              </li>
            ))}
          </ul>
          <SectionCtaRow
            primary={{ href: "/app/characters", label: t("landing.cast.cta") }}
            secondary={{ href: "/product-promo", label: t("productPromoPage.hero.ctaStart") }}
          />
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
          <ParallaxLayer distance={20}>
            <img src="/landing/cast-scro.webp" alt="" className="aspect-square w-full object-cover" />
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
