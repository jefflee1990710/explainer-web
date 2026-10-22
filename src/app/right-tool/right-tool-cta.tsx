"use client";

import { FeatureCtaCard } from "@/presentation/components/feature-cta-card";
import { useI18n } from "@/presentation/components/i18n-provider";

// Closing band — pick the right tool and ship, styled after LandingFreeCredit.
export function RightToolCta({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureCtaCard
      eyebrow={t("rightTool.cta.eyebrow")}
      title={t("rightTool.cta.title")}
      body={t("rightTool.cta.body")}
      artSrc="/landing/right-tool/video.jpg"
      primary={{
        href: signedIn ? "/app/characters" : "/sign-up",
        label: t("rightTool.cta.cta"),
      }}
      secondary={{
        href: "/pricing",
        label: t("rightTool.cta.ctaPricing"),
      }}
    />
  );
}
