"use client";

import { FeatureCtaCard } from "@/presentation/components/feature-cta-card";
import { useI18n } from "@/presentation/components/i18n-provider";

export function CantoneseCta({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureCtaCard
      eyebrow={t("cantonesePage.cta.eyebrow")}
      title={t("cantonesePage.cta.title")}
      body={t("cantonesePage.cta.body")}
      artSrc="/landing/cantonese/reel.jpg"
      primary={{
        href: signedIn ? "/app" : "/sign-up",
        label: t("cantonesePage.cta.cta"),
      }}
      secondary={{
        href: "/talking-head",
        label: t("cantonesePage.cta.ctaTalkingHead"),
      }}
      tertiary={{
        href: "/pricing",
        label: t("cantonesePage.cta.ctaPricing"),
      }}
    />
  );
}
