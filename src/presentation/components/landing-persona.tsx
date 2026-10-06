"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

// Full-width band: rich plan-style art on the left, copy on the right.
export function LandingPersona() {
  const { t } = useI18n();

  return (
    // Watercolour paper cream with a soft sky wash.
    <section id="persona" className="bg-gradient-to-r from-[#f6efe3] via-[#f6efe3] to-[#dcecf7]">
      <div className="grid w-full items-center lg:grid-cols-2">
        <ParallaxLayer distance={40} className="order-1 overflow-hidden">
          <video
            src="/landing/character-persona-watercolor-loop.mp4"
            poster="/landing/character-persona-watercolor.png"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
            className="h-72 w-full object-contain sm:h-96 lg:h-full lg:min-h-[32rem] lg:p-8 motion-reduce:hidden"
          />
          <img
            src="/landing/character-persona-watercolor.png"
            alt=""
            className="hidden h-72 w-full object-contain motion-reduce:block sm:h-96 lg:h-full lg:min-h-[32rem] lg:p-8"
          />
        </ParallaxLayer>
        <div className="order-2 px-6 py-12 text-right sm:px-10 sm:py-16 lg:py-24 lg:pl-10 lg:pr-16">
          <div className="mx-auto max-w-lg lg:ml-auto lg:mr-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f7bbf]">
              {t("landing.persona.eyebrow")}
            </p>
            <h2 className="mt-3 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
              {t("landing.persona.title")}
            </h2>
            <p className="mt-4 text-base text-zinc-600">{t("landing.persona.body")}</p>
            <Link
              href="/app/characters"
              className="mt-8 inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
            >
              {t("landing.persona.cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
