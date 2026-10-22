"use client";

import { FeatureHero } from "@/presentation/components/feature-hero";
import { useI18n } from "@/presentation/components/i18n-provider";

// Talking-head hero — brand first, script-to-clip promise; portrait still shown whole (caption bar included).
export function TalkingHeadHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <FeatureHero
      brand={t("talkingHeadPage.hero.brand")}
      kicker={t("talkingHeadPage.hero.kicker")}
      title={t("talkingHeadPage.hero.title")}
      subtitle={t("talkingHeadPage.hero.subtitle")}
      primary={{
        href: signedIn ? "/app" : "/sign-up",
        label: signedIn ? t("talkingHeadPage.hero.ctaWorkspace") : t("talkingHeadPage.hero.ctaStart"),
      }}
      secondary={{ href: "#steps", label: t("talkingHeadPage.hero.ctaSecondary") }}
      art={{ src: "/landing/talking-head/hero.jpg", width: 768, height: 1024, widthClass: "max-w-[22rem] lg:max-w-sm" }}
    />
  );
}
