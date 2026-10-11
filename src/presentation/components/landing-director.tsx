"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

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
        <div className="overflow-hidden rounded-3xl border-2 border-white bg-white shadow-[6px_6px_0_0_#c6f24b] lg:order-1">
          <ParallaxLayer distance={20}>
            <img src="/landing/director-scro.webp" alt="" className="aspect-[4/3] w-full scale-105 object-cover" />
          </ParallaxLayer>
        </div>
        <div className="lg:order-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b]">
            {t("landing.director.eyebrow")}
          </p>
          <h2 className="mt-3 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t("landing.director.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">{t("landing.director.body")}</p>
          {/* Idea → a few takes → lower cost, read left to right. */}
          <ol className="mt-6 flex flex-wrap items-center gap-2">
            {points.map((label, index) => (
              <li key={label} className="flex items-center gap-2">
                <span className="rounded-full border-2 border-[#c6f24b] px-3 py-1 text-xs font-semibold text-[#c6f24b]">
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
          <Link
            href="/app"
            className="mt-8 inline-flex rounded-full bg-[#c6f24b] px-8 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-[#d6ff5c]"
          >
            {t("landing.director.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
