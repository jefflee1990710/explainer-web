"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { CardCta, SectionCtaRow } from "@/presentation/components/section-cta-row";

// Dedicated 16:9 cast stills for /right-tool.
const FEATURE_ART = [
  "/landing/right-tool/character.jpg",
  "/landing/right-tool/life.jpg",
  "/landing/right-tool/video.jpg",
] as const;

// Virtual influencer toolkit — character, Life, shorts in one system, styled after LandingSteps.
export function RightToolInfluencer() {
  const { t } = useI18n();
  const features = [
    { step: "01", title: t("rightTool.influencer.f1Title"), body: t("rightTool.influencer.f1Body"), href: "/app/characters", cta: t("landing.cast.cta") },
    { step: "02", title: t("rightTool.influencer.f2Title"), body: t("rightTool.influencer.f2Body"), href: "/ai-influencer", cta: t("landing.ip.cta") },
    { step: "03", title: t("rightTool.influencer.f3Title"), body: t("rightTool.influencer.f3Body"), href: "/talking-head", cta: t("talkingHeadPage.hero.ctaStart") },
  ];

  return (
    <section id="influencer" className="border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("rightTool.influencer.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("rightTool.influencer.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("rightTool.influencer.body")}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map((item, index) => (
            <MotionItem key={item.title}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white text-center transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
                <img
                  src={FEATURE_ART[index]}
                  alt=""
                  className="aspect-video w-full border-b border-[#e4e4e7] bg-[#12141c] object-cover"
                />
                <div className="flex flex-1 flex-col items-center p-8">
                  <span className="-mt-14 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e4e4e7] bg-[#12141c] text-xs font-bold text-[#c6f24b]">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-[#12141c]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
                </div>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
        <SectionCtaRow
          align="center"
          primary={{ href: "/ai-influencer", label: t("aiInfluencerPage.hero.ctaStart") }}
          secondary={{ href: "/product-promo", label: t("productPromoPage.hero.ctaStart") }}
        />
      </div>
    </section>
  );
}
