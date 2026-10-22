"use client";

import { FeatureCtaCard } from "@/presentation/components/feature-cta-card";
import { useI18n } from "@/presentation/components/i18n-provider";

export function ProductPromoCta({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureCtaCard
      eyebrow={t("productPromoPage.cta.eyebrow")}
      title={t("productPromoPage.cta.title")}
      body={t("productPromoPage.cta.body")}
      artSrc="/landing/product-promo/iceberg.jpg"
      primary={{
        href: signedIn ? "/app" : "/sign-up",
        label: t("productPromoPage.cta.cta"),
      }}
      secondary={{
        href: "/pricing",
        label: t("productPromoPage.cta.ctaPricing"),
      }}
    />
  );
}
