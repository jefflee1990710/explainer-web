"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

// Attention → sell / ads / promote for others.
export function AiInfluencerEarn() {
  const { t } = useI18n();
  const items = [
    { title: t("aiInfluencerPage.earn.e1Title"), body: t("aiInfluencerPage.earn.e1Body") },
    { title: t("aiInfluencerPage.earn.e2Title"), body: t("aiInfluencerPage.earn.e2Body") },
    { title: t("aiInfluencerPage.earn.e3Title"), body: t("aiInfluencerPage.earn.e3Body") },
  ];

  return (
    <section id="earn" className="border-b border-white/10 bg-[#12141c] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
              {t("aiInfluencerPage.earn.eyebrow")}
            </p>
            <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl">
              {t("aiInfluencerPage.earn.title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-white/70">{t("aiInfluencerPage.earn.body")}</p>
            <MotionStagger className="mt-8 space-y-5">
              {items.map((item) => (
                <MotionItem key={item.title}>
                  <article className="border-l-2 border-[#c6f24b] pl-4">
                    <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/65">{item.body}</p>
                  </article>
                </MotionItem>
              ))}
            </MotionStagger>
          </div>
          <img src="/landing/ai-influencer/earn.jpg" alt="" className="aspect-[4/3] w-full rounded-2xl object-cover ring-1 ring-white/10" />
        </div>
      </div>
    </section>
  );
}
