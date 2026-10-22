"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// Old on-camera model vs experience-as-soul — studio desk cards matching the landing page.
export function AiInfluencerShift({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <section id="shift" className="border-b border-[#e4e4e7] bg-[#fafafa] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("aiInfluencerPage.shift.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("aiInfluencerPage.shift.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("aiInfluencerPage.shift.body")}</p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white p-2 shadow-[0_8px_24px_rgba(22,24,35,0.06)]">
          <ParallaxLayer distance={16}>
            <img
              src="/landing/ai-influencer/offcamera.jpg"
              alt=""
              className="aspect-video w-full rounded-xl object-cover"
            />
          </ParallaxLayer>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-[#e4e4e7] bg-white p-6 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.06)] md:p-8">
            <span className="inline-flex items-center rounded-full border border-[#e4e4e7] bg-[#f4f4f5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6170]">
              {t("aiInfluencerPage.shift.oldLabel")}
            </span>
            <p className="mt-4 text-sm leading-6 text-[#5c6170]">{t("aiInfluencerPage.shift.oldBody")}</p>
          </article>
          <article className="rounded-2xl border border-[#12141c] bg-[#12141c] p-6 shadow-[0_12px_32px_rgba(18,20,28,0.14)] md:p-8">
            <span className="inline-flex items-center rounded-full border border-[#c6f24b]/40 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
              {t("aiInfluencerPage.shift.newLabel")}
            </span>
            <p className="mt-4 text-sm leading-6 text-white/85">{t("aiInfluencerPage.shift.newBody")}</p>
          </article>
        </div>
        <SectionCtaRow
          align="center"
          primary={{
            href: signedIn ? "/app/characters" : "/sign-up",
            label: t("aiInfluencerPage.cta.cta"),
          }}
          secondary={{ href: "/talking-head", label: t("talkingHeadPage.hero.ctaStart") }}
        />
      </div>
    </section>
  );
}
