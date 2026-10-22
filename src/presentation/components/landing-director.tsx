"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// The cost of retries. The one dark band on the page: white copy, green accents, paper art card.
export function LandingDirector() {
  const { t } = useI18n();
  const points = [
    t("landing.director.idea"),
    t("landing.director.takes"),
    t("landing.director.cost"),
  ];

  return (
    <section id="cost" className="bg-[#12141c] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:gap-12 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white lg:order-1">
          <ParallaxLayer distance={20}>
            <img src="/landing/director-scro.webp" alt="" className="aspect-square w-full object-cover" />
          </ParallaxLayer>
        </div>
        <div className="lg:order-2">
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("landing.director.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t("landing.director.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">{t("landing.director.body")}</p>
          {/* Idea → a few takes → lower cost, read left to right. */}
          <ol className="mt-6 flex flex-wrap items-center gap-2">
            {points.map((label, index) => (
              <li key={label} className="flex items-center gap-2">
                <span className="rounded-full border border-[#c6f24b]/40 bg-white/5 px-3.5 py-1 text-xs font-semibold text-[#c6f24b]">
                  {label}
                </span>
                {index < points.length - 1 ? (
                  <span aria-hidden className="text-sm font-bold text-[#c6f24b]">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <SectionCtaRow
            tone="dark"
            primary={{ href: "/app", label: t("landing.director.cta") }}
            secondary={{ href: "/right-tool", label: t("rightTool.hero.ctaStart") }}
          />
        </div>
      </div>
    </section>
  );
}
