"use client";

import { FeatureCtaCard } from "@/presentation/components/feature-cta-card";
import { useI18n } from "@/presentation/components/i18n-provider";

export function ExplainerCta({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureCtaCard
      eyebrow={t("explainerPage.cta.eyebrow")}
      title={t("explainerPage.cta.title")}
      body={t("explainerPage.cta.body")}
      artSrc="/landing/explainer/social.jpg"
      primary={{
        href: signedIn ? "/app" : "/sign-up",
        label: t("explainerPage.cta.cta"),
      }}
      secondary={{
        href: "/right-tool",
        label: t("explainerPage.cta.ctaFeatures"),
      }}
      tertiary={{
        href: "/pricing",
        label: t("explainerPage.cta.ctaPricing"),
      }}
    />
  );
}
