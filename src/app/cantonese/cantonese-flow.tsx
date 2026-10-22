"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Same talking-head path, Cantonese + polish framing.
export function CantoneseFlow() {
  const { t } = useI18n();
  const steps = [
    { n: "01", title: t("cantonesePage.flow.s1Title"), body: t("cantonesePage.flow.s1Body") },
    { n: "02", title: t("cantonesePage.flow.s2Title"), body: t("cantonesePage.flow.s2Body") },
    { n: "03", title: t("cantonesePage.flow.s3Title"), body: t("cantonesePage.flow.s3Body") },
  ];

  return (
    <section id="flow" className="border-b border-white/10 bg-[#12141c] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("cantonesePage.flow.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl">
            {t("cantonesePage.flow.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">{t("cantonesePage.flow.body")}</p>
          <ol className="mt-8 space-y-6">
            {steps.map((item) => (
              <li key={item.n} className="flex gap-4">
                <span className="font-display text-sm font-bold text-[#c6f24b]">{item.n}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/65">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative">
          <img
            src="/landing/cantonese/reel.jpg"
            alt=""
            className="aspect-[3/4] w-full max-w-md rounded-2xl object-cover lg:ml-auto"
          />
          <img
            src="/landing/talking-head/captions.jpg"
            alt=""
            className="absolute -bottom-6 -left-2 hidden w-[55%] rounded-xl border-4 border-[#12141c] object-cover shadow-2xl sm:block lg:-left-8"
          />
        </div>
      </div>
    </section>
  );
}
