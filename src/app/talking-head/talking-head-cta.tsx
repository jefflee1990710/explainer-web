"use client";

import { FeatureCtaCard } from "@/presentation/components/feature-cta-card";
import { useI18n } from "@/presentation/components/i18n-provider";

export function TalkingHeadCta({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureCtaCard
      eyebrow={t("talkingHeadPage.cta.eyebrow")}
      title={t("talkingHeadPage.cta.title")}
      body={t("talkingHeadPage.cta.body")}
      artSrc="/landing/talking-head/captions.jpg"
      primary={{
        href: signedIn ? "/app" : "/sign-up",
        label: t("talkingHeadPage.cta.cta"),
      }}
      secondary={{
        href: "/cantonese",
        label: t("talkingHeadPage.cta.ctaCantonese"),
      }}
      tertiary={{
        href: "/pricing",
        label: t("talkingHeadPage.cta.ctaPricing"),
      }}
    />
  );
}
