"use client";

import { canvasLaunchHref } from "@/presentation/components/canvas-launch-href";
import { FeatureHero } from "@/presentation/components/feature-hero";
import { useI18n } from "@/presentation/components/i18n-provider";

// Explainer hero — whiteboard director promise, hero still shown uncropped.
export function ExplainerHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureHero
      brand={t("explainerPage.hero.brand")}
      kicker={t("explainerPage.hero.kicker")}
      title={t("explainerPage.hero.title")}
      subtitle={t("explainerPage.hero.subtitle")}
      primary={{
        href: canvasLaunchHref(signedIn, "explainer"),
        label: signedIn ? t("explainerPage.hero.ctaWorkspace") : t("explainerPage.hero.ctaStart"),
      }}
      secondary={{ href: "#uses", label: t("explainerPage.hero.ctaSecondary") }}
      art={{ src: "/landing/explainer/hero.jpg", width: 1440, height: 810 }}
    />
  );
}
