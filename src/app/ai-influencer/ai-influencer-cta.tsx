"use client";

import { FeatureCtaCard } from "@/presentation/components/feature-cta-card";
import { useI18n } from "@/presentation/components/i18n-provider";

export function AiInfluencerCta({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureCtaCard
      eyebrow={t("aiInfluencerPage.cta.eyebrow")}
      title={t("aiInfluencerPage.cta.title")}
      body={t("aiInfluencerPage.cta.body")}
      artSrc="/landing/ai-influencer/hero.jpg"
      primary={{
        href: signedIn ? "/app/characters" : "/sign-up",
        label: t("aiInfluencerPage.cta.cta"),
      }}
      secondary={{
        href: "/pricing",
        label: t("aiInfluencerPage.cta.ctaPricing"),
      }}
    />
  );
}
