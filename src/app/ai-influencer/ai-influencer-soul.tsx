"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// Create character → social → speak your content, styled after LandingUseCaseRow & LandingCast.
export function AiInfluencerSoul({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const points = [
    { title: t("aiInfluencerPage.soul.p1Title"), body: t("aiInfluencerPage.soul.p1Body") },
    { title: t("aiInfluencerPage.soul.p2Title"), body: t("aiInfluencerPage.soul.p2Body") },
    { title: t("aiInfluencerPage.soul.p3Title"), body: t("aiInfluencerPage.soul.p3Body") },
  ];

  return (
    <section id="soul" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("aiInfluencerPage.soul.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("aiInfluencerPage.soul.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("aiInfluencerPage.soul.body")}</p>
          <MotionStagger className="mt-8 space-y-4">
            {points.map((item, i) => (
              <MotionItem key={item.title}>
                <article className="flex items-start gap-4 rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-5 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.06)]">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#12141c] text-xs font-bold text-[#c6f24b]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[#12141c]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#5c6170]">{item.body}</p>
                  </div>
                </article>
              </MotionItem>
            ))}
          </MotionStagger>
          <SectionCtaRow
            primary={{
              href: signedIn ? "/app/characters" : "/sign-up",
              label: signedIn ? t("aiInfluencerPage.hero.ctaWorkspace") : t("aiInfluencerPage.hero.ctaStart"),
            }}
            secondary={{ href: "#ip", label: t("aiInfluencerPage.ip.cta") }}
          />
        </div>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white p-2 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
            <ParallaxLayer distance={14}>
              <img
                src="/landing/ai-influencer/inject.jpg"
                alt=""
                className="aspect-video w-full rounded-xl object-cover"
              />
            </ParallaxLayer>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white p-2 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
            <ParallaxLayer distance={14}>
              <img
                src="/landing/ai-influencer/social.jpg"
                alt=""
                className="aspect-video w-full rounded-xl object-cover"
              />
            </ParallaxLayer>
          </div>
        </div>
      </div>
    </section>
  );
}
