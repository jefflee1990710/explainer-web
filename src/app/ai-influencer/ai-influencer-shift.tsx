"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Old on-camera model vs experience-as-soul — attention is valuable.
export function AiInfluencerShift() {
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

        <img
          src="/landing/ai-influencer/offcamera.jpg"
          alt=""
          className="mx-auto mt-12 aspect-video w-full max-w-4xl rounded-2xl object-cover"
        />

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="border-l-4 border-zinc-300 bg-white px-6 py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {t("aiInfluencerPage.shift.oldLabel")}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{t("aiInfluencerPage.shift.oldBody")}</p>
          </div>
          <div className="border-l-4 border-[#c6f24b] bg-[#12141c] px-6 py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
              {t("aiInfluencerPage.shift.newLabel")}
            </p>
            <p className="mt-3 text-sm leading-6 text-white/85">{t("aiInfluencerPage.shift.newBody")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
