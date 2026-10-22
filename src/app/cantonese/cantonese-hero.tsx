"use client";

import { FeatureHero } from "@/presentation/components/feature-hero";
import { useI18n } from "@/presentation/components/i18n-provider";

// Cantonese page hero — native HK phrasing + 16:9 Hong Kong boutique studio scene.
export function CantoneseHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureHero
      brand={t("cantonesePage.hero.brand")}
      kicker={t("cantonesePage.hero.kicker")}
      title={t("cantonesePage.hero.title")}
      subtitle={t("cantonesePage.hero.subtitle")}
      primary={{
        href: signedIn ? "/app" : "/sign-up",
        label: signedIn ? t("cantonesePage.hero.ctaWorkspace") : t("cantonesePage.hero.ctaStart"),
      }}
      secondary={{ href: "#fit", label: t("cantonesePage.hero.ctaSecondary") }}
      art={{ src: "/landing/cantonese/hero.jpg", width: 1440, height: 810 }}
    />
  );
}
