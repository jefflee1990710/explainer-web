"use client";

import { canvasLaunchHref } from "@/presentation/components/canvas-launch-href";
import { FeatureHero } from "@/presentation/components/feature-hero";
import { useI18n } from "@/presentation/components/i18n-provider";

// Examples page hero. Same ink + lime stage as the other feature pages: brand, kicker, two actions, framed still.
export function ExamplesHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureHero
      brand="Scro"
      kicker={t("examples.title")}
      title={t("examples.heroTitle")}
      subtitle={t("examples.subtitle")}
      primary={{
        href: canvasLaunchHref(signedIn),
        label: signedIn ? t("landing.hero.ctaWorkspace") : t("landing.hero.ctaStart"),
      }}
      secondary={{ href: "#clips", label: t("examples.cta") }}
      art={{ src: "/showcase/scro-deck.png", width: 1280, height: 716 }}
    />
  );
}
