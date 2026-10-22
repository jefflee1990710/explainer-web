"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

const FEATURE_ART = [
  "/landing/steps/character.webp",
  "/landing/steps/life.webp",
  "/landing/steps/video.webp",
] as const;

// Virtual influencer toolkit — character, Life, shorts in one system.
export function RightToolInfluencer() {
  const { t } = useI18n();
  const features = [
    { title: t("rightTool.influencer.f1Title"), body: t("rightTool.influencer.f1Body") },
    { title: t("rightTool.influencer.f2Title"), body: t("rightTool.influencer.f2Body") },
    { title: t("rightTool.influencer.f3Title"), body: t("rightTool.influencer.f3Body") },
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

        <MotionStagger className="mt-14 grid gap-8 md:grid-cols-3">
          {features.map((item, index) => (
            <MotionItem key={item.title}>
              <article>
                <img
                  src={FEATURE_ART[index]}
                  alt=""
                  className="aspect-[4/5] w-full object-cover"
                />
                <h3 className="mt-5 font-display text-xl font-semibold text-[#12141c]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
