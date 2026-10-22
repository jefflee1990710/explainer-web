"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

const STEP_ART = [
  "/landing/talking-head/wardrobe.jpg",
  "/landing/talking-head/script.jpg",
  "/landing/talking-head/captions.jpg",
] as const;

// Outfit → script → captioned talking-head.
export function TalkingHeadSteps() {
  const { t } = useI18n();
  const steps = [
    { title: t("talkingHeadPage.steps.s1Title"), body: t("talkingHeadPage.steps.s1Body") },
    { title: t("talkingHeadPage.steps.s2Title"), body: t("talkingHeadPage.steps.s2Body") },
    { title: t("talkingHeadPage.steps.s3Title"), body: t("talkingHeadPage.steps.s3Body") },
  ];

  return (
    <section id="steps" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("talkingHeadPage.steps.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("talkingHeadPage.steps.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("talkingHeadPage.steps.body")}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-10 md:grid-cols-3">
          {steps.map((item, index) => (
            <MotionItem key={item.title}>
              <article>
                <img
                  src={STEP_ART[index]}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
                <p className="mt-5 font-display text-xs font-bold tracking-[0.14em] text-[#5c6170]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[#12141c]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
