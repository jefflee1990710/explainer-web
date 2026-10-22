"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

const STEP_ART = [
  "/landing/talking-head/wardrobe.jpg",
  "/landing/talking-head/script.jpg",
  "/landing/talking-head/captions.jpg",
] as const;

// Outfit → script → captioned talking-head, styled after LandingSteps cards.
export function TalkingHeadSteps({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const steps = [
    { step: "01", title: t("talkingHeadPage.steps.s1Title"), body: t("talkingHeadPage.steps.s1Body") },
    { step: "02", title: t("talkingHeadPage.steps.s2Title"), body: t("talkingHeadPage.steps.s2Body") },
    { step: "03", title: t("talkingHeadPage.steps.s3Title"), body: t("talkingHeadPage.steps.s3Body") },
  ];

  return (
    <section id="steps" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("talkingHeadPage.steps.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("talkingHeadPage.steps.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("talkingHeadPage.steps.body")}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((item, index) => (
            <MotionItem key={item.title}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4e4e7] bg-[#fafafa] text-center transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
                <img
                  src={STEP_ART[index]}
                  alt=""
                  className="aspect-video w-full border-b border-[#e4e4e7] bg-[#12141c] object-cover"
                />
                <div className="flex flex-1 flex-col items-center p-8">
                  <span className="-mt-14 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e4e4e7] bg-[#12141c] text-xs font-bold text-[#c6f24b]">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-[#12141c]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
                </div>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
        <SectionCtaRow
          align="center"
          primary={{
            href: signedIn ? "/app" : "/sign-up",
            label: t("talkingHeadPage.hero.ctaStart"),
          }}
          secondary={{ href: "/cantonese", label: t("cantonesePage.hero.ctaStart") }}
        />
      </div>
    </section>
  );
}
