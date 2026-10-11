"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

// Paper cut-out art for each step: pick a style, approve the storyboard, export.
const STEP_ART = ["/landing/steps/style.webp", "/landing/steps/storyboard.webp", "/landing/steps/export.webp"] as const;

export function LandingSteps() {
  const { t } = useI18n();
  const steps = [
    { step: "01", title: t("landing.steps.step1Title"), body: t("landing.steps.step1Body") },
    { step: "02", title: t("landing.steps.step2Title"), body: t("landing.steps.step2Body") },
    { step: "03", title: t("landing.steps.step3Title"), body: t("landing.steps.step3Body") },
  ];

  return (
    <section className="w-full bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3f9a16]">
            {t("landing.steps.eyebrow")}
          </p>
          <h2 className="mt-3 text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("landing.steps.title")}
          </h2>
        </div>
        <MotionStagger className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((item, index) => (
            <MotionItem key={item.step}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-[#12141c] bg-[#f3f3f3] text-center shadow-[5px_5px_0_0_#12141c]">
                <img src={STEP_ART[index]} alt="" className="aspect-video w-full border-b-2 border-[#12141c] object-cover" />
                <div className="flex flex-1 flex-col items-center p-8">
                  <span className="-mt-14 inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#12141c] bg-[#c6f24b] text-sm font-semibold text-[#12141c]">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-[#12141c]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#12141c]/70">{item.body}</p>
                </div>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
