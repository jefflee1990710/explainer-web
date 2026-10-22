"use client";

import { FeatureHero } from "@/presentation/components/feature-hero";
import { useI18n } from "@/presentation/components/i18n-provider";

// Right-tool hero — brand first, then one-shot shipping promise next to the director still.
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
      art={{ src: "/landing/director-scro.webp", width: 1024, height: 1024, widthClass: "max-w-md" }}
    />
  );
}
