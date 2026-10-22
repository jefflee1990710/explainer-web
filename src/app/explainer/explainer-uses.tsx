"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

const USE_ART = [
  "/landing/explainer/present.jpg",
  "/landing/explainer/email.jpg",
  "/landing/explainer/social.jpg",
] as const;

// Promo / present / email / social — where explainers ship.
export function ExplainerUses() {
  const { t } = useI18n();
  const items = [
    { title: t("explainerPage.uses.u1Title"), body: t("explainerPage.uses.u1Body") },
    { title: t("explainerPage.uses.u2Title"), body: t("explainerPage.uses.u2Body") },
    { title: t("explainerPage.uses.u3Title"), body: t("explainerPage.uses.u3Body") },
  ];

  return (
    <section id="uses" className="border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("explainerPage.uses.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("explainerPage.uses.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("explainerPage.uses.body")}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-10 md:grid-cols-3">
          {items.map((item, index) => (
            <MotionItem key={item.title}>
              <article>
                <img src={USE_ART[index]} alt="" className="aspect-[4/3] w-full object-cover" />
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
