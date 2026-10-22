"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

// Built-in popular AI directors — storyboard formats already packed in.
export function RightToolDirectors() {
  const { t } = useI18n();
  const directors = [
    { title: t("rightTool.directors.d1Title"), body: t("rightTool.directors.d1Body") },
    { title: t("rightTool.directors.d2Title"), body: t("rightTool.directors.d2Body") },
    { title: t("rightTool.directors.d3Title"), body: t("rightTool.directors.d3Body") },
    { title: t("rightTool.directors.d4Title"), body: t("rightTool.directors.d4Body") },
    { title: t("rightTool.directors.d5Title"), body: t("rightTool.directors.d5Body") },
    { title: t("rightTool.directors.d6Title"), body: t("rightTool.directors.d6Body") },
  ];

  return (
    <section id="directors" className="border-b border-white/10 bg-[#12141c] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("rightTool.directors.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t("rightTool.directors.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">{t("rightTool.directors.body")}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {directors.map((item, index) => (
            <MotionItem key={item.title}>
              <article className="border-t border-[#c6f24b]/35 pt-5">
                <p className="font-display text-xs font-bold tracking-[0.12em] text-[#c6f24b]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.body}</p>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
