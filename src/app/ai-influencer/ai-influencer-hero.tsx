"use client";

import { FeatureHero } from "@/presentation/components/feature-hero";
import { useI18n } from "@/presentation/components/i18n-provider";

// Soul-first AI Influencer hero — brand led, hero still shown uncropped.
export function AiInfluencerHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureHero
      brand={t("aiInfluencerPage.hero.brand")}
      kicker={t("aiInfluencerPage.hero.kicker")}
      title={t("aiInfluencerPage.hero.title")}
      subtitle={t("aiInfluencerPage.hero.subtitle")}
      primary={{
        href: signedIn ? "/app/characters" : "/sign-up",
        label: signedIn ? t("aiInfluencerPage.hero.ctaWorkspace") : t("aiInfluencerPage.hero.ctaStart"),
      }}
      secondary={{ href: "#earn", label: t("aiInfluencerPage.hero.ctaSecondary") }}
      art={{ src: "/landing/ai-influencer/hero.jpg", width: 1280, height: 720 }}
    />
  );
}
