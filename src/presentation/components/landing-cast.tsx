"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

// One character across three shorts: copy on the left, cut-out art card on the right.
export function LandingCast() {
  const { t } = useI18n();
  const uses = [
    t("landing.cast.product"),
    t("landing.cast.service"),
    t("landing.cast.knowledge"),
  ];

  return (
    <section id="characters" className="bg-[#f3f3f3] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3f9a16]">
            {t("landing.cast.eyebrow")}
          </p>
          <h2 className="mt-3 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("landing.cast.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#12141c]/75">{t("landing.cast.body")}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {uses.map((label) => (
              <li
                key={label}
                className="rounded-full border-2 border-[#12141c] bg-white px-3 py-1 text-xs font-semibold text-[#12141c]"
              >
                {label}
              </li>
            ))}
          </ul>
          <Link
            href="/app/characters"
            className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {t("landing.cast.cta")}
          </Link>
        </div>
        <div className="overflow-hidden rounded-3xl border-2 border-[#12141c] bg-white shadow-[6px_6px_0_0_#12141c]">
          <ParallaxLayer distance={20}>
            <img src="/landing/cast-scro.webp" alt="" className="aspect-[4/3] w-full scale-105 object-cover" />
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
