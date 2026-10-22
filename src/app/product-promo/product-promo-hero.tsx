"use client";

import { FeatureHero } from "@/presentation/components/feature-hero";
import { useI18n } from "@/presentation/components/i18n-provider";

// Product promo hero — virtual host can sell anywhere.
export function ProductPromoHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureHero
      brand={t("productPromoPage.hero.brand")}
      kicker={t("productPromoPage.hero.kicker")}
      title={t("productPromoPage.hero.title")}
      subtitle={t("productPromoPage.hero.subtitle")}
      primary={{
        href: signedIn ? "/app" : "/sign-up",
        label: signedIn ? t("productPromoPage.hero.ctaWorkspace") : t("productPromoPage.hero.ctaStart"),
      }}
      secondary={{ href: "#wild", label: t("productPromoPage.hero.ctaSecondary") }}
      art={{ src: "/landing/product-promo/hero.jpg", width: 1440, height: 810 }}
    />
  );
}
