"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

// After generation: keep editing the cut in the same pipeline (no third-party name).
export function RightToolEdit() {
  const { t } = useI18n();
  const points = [
    { title: t("rightTool.edit.p1Title"), body: t("rightTool.edit.p1Body") },
    { title: t("rightTool.edit.p2Title"), body: t("rightTool.edit.p2Body") },
    { title: t("rightTool.edit.p3Title"), body: t("rightTool.edit.p3Body") },
  ];

  return (
    <section id="edit" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("rightTool.edit.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("rightTool.edit.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("rightTool.edit.body")}</p>
        </div>

        {/* Full desk print-screen — product UI, not a card collage. */}
        <figure className="mt-12 overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#f4f4f5] shadow-[0_16px_48px_rgba(18,20,28,0.08)]">
          <img
            src="/landing/right-tool/editor-desk.png"
            alt={t("rightTool.edit.deskLabel")}
            className="block w-full"
          />
        </figure>

        <MotionStagger className="mt-10 grid gap-8 md:grid-cols-3">
          {points.map((item) => (
            <MotionItem key={item.title}>
              <article className="border-t border-[#c6f24b] pt-5">
                <h3 className="font-display text-lg font-semibold text-[#12141c]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>

        <figure className="mt-12 overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#fafafa]">
          <img
            src="/landing/right-tool/editor-timeline.png"
            alt={t("rightTool.edit.timelineLabel")}
            className="block w-full"
          />
          <figcaption className="border-t border-[#e4e4e7] px-4 py-3 text-center text-xs font-medium text-[#5c6170]">
            {t("rightTool.edit.timelineLabel")}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
