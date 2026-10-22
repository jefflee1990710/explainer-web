"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// AI draft + human finish: editor, SFX, music — dark studio band styled after LandingDirector.
export function TalkingHeadFinish({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const points = [
    { title: t("talkingHeadPage.finish.p1Title"), body: t("talkingHeadPage.finish.p1Body") },
    { title: t("talkingHeadPage.finish.p2Title"), body: t("talkingHeadPage.finish.p2Body") },
    { title: t("talkingHeadPage.finish.p3Title"), body: t("talkingHeadPage.finish.p3Body") },
  ];

  return (
    <section id="finish" className="border-b border-white/10 bg-[#12141c] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-4 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-2">
              <ParallaxLayer distance={14}>
                <img
                  src="/landing/talking-head/balance.jpg"
                  alt=""
                  className="aspect-video w-full rounded-xl object-cover"
                />
              </ParallaxLayer>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-2">
              <img
                src="/landing/talking-head/editor-desk.png"
                alt={t("talkingHeadPage.finish.deskLabel")}
                className="block w-full rounded-xl"
              />
            </figure>
          </div>
          <div className="lg:order-1">
            <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
              {t("talkingHeadPage.finish.eyebrow")}
            </p>
            <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
              {t("talkingHeadPage.finish.title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-white/70">{t("talkingHeadPage.finish.body")}</p>
            <MotionStagger className="mt-8 space-y-4">
              {points.map((item, i) => (
                <MotionItem key={item.title}>
                  <article className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 text-xs font-bold text-[#c6f24b]">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/65">{item.body}</p>
                    </div>
                  </article>
                </MotionItem>
              ))}
            </MotionStagger>
            <SectionCtaRow
              tone="dark"
              primary={{
                href: signedIn ? "/app" : "/sign-up",
                label: t("talkingHeadPage.cta.cta"),
              }}
              secondary={{ href: "/cantonese", label: t("talkingHeadPage.cta.ctaCantonese") }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
