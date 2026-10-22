"use client";

import { FeatureHero } from "@/presentation/components/feature-hero";
import { useI18n } from "@/presentation/components/i18n-provider";

// Right-tool hero — dedicated creative director artwork for the right-tool page.
export function RightToolHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureHero
      brand={t("rightTool.hero.brand")}
      kicker={t("rightTool.hero.kicker")}
      title={t("rightTool.hero.title")}
      subtitle={t("rightTool.hero.subtitle")}
      primary={{
        href: signedIn ? "/app" : "/sign-up",
        label: signedIn ? t("rightTool.hero.ctaWorkspace") : t("rightTool.hero.ctaStart"),
      }}
      secondary={{ href: "#edit", label: t("rightTool.hero.ctaSecondary") }}
      art={{ src: "/landing/right-tool/hero.jpg", width: 1440, height: 810 }}
    />
  );
}
