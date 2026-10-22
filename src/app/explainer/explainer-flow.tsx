"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Fast path: director → whiteboard style → approve & generate.
export function ExplainerFlow() {
  const { t } = useI18n();
  const steps = [
    { n: "01", title: t("explainerPage.flow.s1Title"), body: t("explainerPage.flow.s1Body") },
    { n: "02", title: t("explainerPage.flow.s2Title"), body: t("explainerPage.flow.s2Body") },
    { n: "03", title: t("explainerPage.flow.s3Title"), body: t("explainerPage.flow.s3Body") },
  ];

  return (
    <section id="flow" className="border-b border-white/10 bg-[#12141c] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("explainerPage.flow.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl">
            {t("explainerPage.flow.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">{t("explainerPage.flow.body")}</p>
        </div>
        <ol className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <li key={item.n} className="border-t border-[#c6f24b]/40 pt-5 text-center md:text-left">
              <p className="font-display text-xs font-bold tracking-[0.14em] text-[#c6f24b]">{item.n}</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
