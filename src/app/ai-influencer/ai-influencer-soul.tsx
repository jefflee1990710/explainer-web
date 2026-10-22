"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

// Create character → social → speak your content.
export function AiInfluencerSoul() {
  const { t } = useI18n();
  const points = [
    { title: t("aiInfluencerPage.soul.p1Title"), body: t("aiInfluencerPage.soul.p1Body") },
    { title: t("aiInfluencerPage.soul.p2Title"), body: t("aiInfluencerPage.soul.p2Body") },
    { title: t("aiInfluencerPage.soul.p3Title"), body: t("aiInfluencerPage.soul.p3Body") },
  ];

  return (
    <section id="soul" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("aiInfluencerPage.soul.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl">
            {t("aiInfluencerPage.soul.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("aiInfluencerPage.soul.body")}</p>
          <MotionStagger className="mt-8 space-y-5">
            {points.map((item, i) => (
              <MotionItem key={item.title}>
                <article className="border-l-2 border-[#c6f24b] pl-4">
                  <p className="font-display text-xs font-bold tracking-[0.12em] text-[#5c6170]">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-[#12141c]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#5c6170]">{item.body}</p>
                </article>
              </MotionItem>
            ))}
          </MotionStagger>
        </div>
        {/* 16:9 + 3:4 side by side; column ratio (16/9 : 3/4) gives both the same height at native aspect. */}
        <div className="grid grid-cols-[2.37fr_1fr] gap-3">
          <img
            src="/landing/ai-influencer/inject.jpg"
            alt=""
            className="aspect-video w-full rounded-2xl object-cover ring-1 ring-[#e4e4e7]"
          />
          <img
            src="/landing/ai-influencer/social.jpg"
            alt=""
            className="aspect-[3/4] w-full rounded-2xl object-cover ring-1 ring-[#e4e4e7]"
          />
        </div>
      </div>
    </section>
  );
}
