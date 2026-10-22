"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

// AI draft + human finish: editor, SFX, music — no third-party product name.
export function TalkingHeadFinish() {
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
          <div>
            <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
              {t("talkingHeadPage.finish.eyebrow")}
            </p>
            <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl">
              {t("talkingHeadPage.finish.title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-white/70">{t("talkingHeadPage.finish.body")}</p>
            <MotionStagger className="mt-8 space-y-5">
              {points.map((item) => (
                <MotionItem key={item.title}>
                  <article className="border-l-2 border-[#c6f24b] pl-4">
                    <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/65">{item.body}</p>
                  </article>
                </MotionItem>
              ))}
            </MotionStagger>
          </div>
          <div className="space-y-4">
            <img
              src="/landing/talking-head/balance.jpg"
              alt=""
              className="aspect-video w-full rounded-2xl object-cover"
            />
            <figure className="overflow-hidden rounded-2xl border border-white/15 bg-white">
              <img
                src="/landing/talking-head/editor-desk.png"
                alt={t("talkingHeadPage.finish.deskLabel")}
                className="block w-full"
              />
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
