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
        <img
          src="/hero/studio-backdrop.webp"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        {/* Keep drama on the sides; soft vignette so center copy stays readable. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(10,12,16,0.28)_0%,rgba(10,12,16,0.55)_55%,rgba(10,12,16,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_40%,rgba(198,242,75,0.22),transparent_42%),radial-gradient(ellipse_at_88%_60%,rgba(198,242,75,0.12),transparent_40%)]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </ParallaxLayer>

      <div className="relative mx-auto grid h-full max-w-[96rem] grid-cols-1 lg:grid-cols-[minmax(16rem,28%)_minmax(0,1fr)_minmax(17rem,30%)]">
        <ParallaxLayer distance={28} className="relative z-[1] hidden lg:block">
          <LandingHeroCastRail />
        </ParallaxLayer>

        <div className="hidden lg:block" />

        <ParallaxLayer distance={20} className="relative z-[1] hidden lg:block">
          <LandingHeroOutputs />
        </ParallaxLayer>

        <div className="relative z-[1] grid grid-cols-[1.05fr_1.1fr] items-stretch gap-0 lg:hidden">
          <LandingHeroCastRail />
          <LandingHeroOutputs />
        </div>
      </div>
    </div>
  );
}
