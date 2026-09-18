"use client";

import { useI18n } from "@/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/components/motion-reveal";

export function LandingSteps() {
  const { t } = useI18n();
  const steps = [
    {
      step: "01",
      title: t("landing.steps.step1Title"),
      body: t("landing.steps.step1Body"),
      tint: "bg-lime",
    },
    {
      step: "02",
      title: t("landing.steps.step2Title"),
      body: t("landing.steps.step2Body"),
      tint: "bg-sky",
    },
    {
      step: "03",
      title: t("landing.steps.step3Title"),
      body: t("landing.steps.step3Body"),
      tint: "bg-accent text-white",
    },
  ] as const;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <MotionStagger className="grid gap-5 md:grid-cols-3">
        {steps.map((item) => (
          <MotionItem key={item.step}>
            <article className="h-full rounded-[1.5rem] border border-accent-ink/10 bg-paper/80 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)] backdrop-blur">
              <span
                className={`inline-flex rounded-full px-3 py-1 font-display text-xs font-bold tracking-wide ${item.tint}`}
              >
                {item.step}
              </span>
              <h2 className="font-display mt-4 text-2xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{item.body}</p>
            </article>
          </MotionItem>
        ))}
      </MotionStagger>
    </section>
  );
}
