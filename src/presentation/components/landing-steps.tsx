"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

export function LandingSteps() {
  const { t } = useI18n();
  const steps = [
    { step: "01", title: t("landing.steps.step1Title"), body: t("landing.steps.step1Body") },
    { step: "02", title: t("landing.steps.step2Title"), body: t("landing.steps.step2Body") },
    { step: "03", title: t("landing.steps.step3Title"), body: t("landing.steps.step3Body") },
  ];

  return (
    <section className="w-full border-y border-zinc-100 bg-zinc-50 py-20">
      <MotionStagger className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3 md:px-8">
        {steps.map((item) => (
          <MotionItem key={item.step}>
            <article className="flex h-full flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#12141c] text-sm font-semibold text-[#c6f24b]">
                {item.step}
              </span>
              <h2 className="mt-4 text-xl font-semibold text-zinc-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
            </article>
          </MotionItem>
        ))}
      </MotionStagger>
    </section>
  );
}
