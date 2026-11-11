"use client";

import { LandingHeroCastRail } from "@/presentation/components/landing-hero-cast-rail";
import { LandingHeroOutputs } from "@/presentation/components/landing-hero-outputs";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";
import { useI18n } from "@/presentation/components/i18n-provider";

// Ink + lime stage: dense cast left, explainer + Life posts right (not a lone phone).
export function LandingHeroArt() {
  const { t } = useI18n();

  return (
    <div
      className="pointer-events-none relative isolate min-h-[24rem] w-full lg:absolute lg:inset-0 lg:min-h-0"
      role="img"
      aria-label={t("landing.hero.artLabel")}
    >
      <ParallaxLayer distance={10} className="absolute inset-0">
        {/* Portal-matched dark studio canvas (#0d0e13) + top radial olive-lime ambient glow */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[#0d0e13]"
          style={{
            backgroundImage: [
              "radial-gradient(ellipse 75% 48% at 50% 12%, rgba(198, 242, 75, 0.20), rgba(198, 242, 75, 0.05) 45%, transparent 72%)",
              "radial-gradient(ellipse 42% 45% at 14% 50%, rgba(198, 242, 75, 0.10), transparent 65%)",
              "radial-gradient(ellipse 42% 45% at 86% 50%, rgba(198, 242, 75, 0.10), transparent 65%)",
              "linear-gradient(180deg, rgba(22, 24, 33, 0.65) 0%, #0d0e13 78%)",
            ].join(", "),
          }}
        />
        {/* Subtle portal studio architectural grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(39,42,54,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,42,54,0.55) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 35%, #000 25%, transparent 80%)",
          }}
        />
      </ParallaxLayer>

      {/* Equal side tracks so the cast rail and the output rail share width, height, and gutter. */}
      <div className="relative mx-auto grid h-full max-w-[96rem] grid-cols-1 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,32rem)_minmax(15rem,1fr)] xl:grid-cols-[minmax(16rem,1fr)_minmax(0,36rem)_minmax(16rem,1fr)]">
        <div className="relative z-[1] hidden h-full min-h-0 lg:block">
          <LandingHeroCastRail />
        </div>

        <div className="hidden lg:block" />

        <div className="relative z-[1] hidden h-full min-h-0 lg:block">
          <LandingHeroOutputs />
        </div>

        {/* Stacked on phones (< 640px) so 4-column cast cards stay readable; 2 columns on sm/md tablets. */}
        <div className="relative z-[1] mx-auto grid w-full max-w-3xl grid-cols-1 items-start gap-2 px-1 pb-4 sm:grid-cols-2 sm:items-stretch sm:gap-2 sm:px-3 lg:hidden">
          <LandingHeroCastRail />
          <LandingHeroOutputs />
        </div>
      </div>
    </div>
  );
}
