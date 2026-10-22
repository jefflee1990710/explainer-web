"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

// Contrast: expensive DIY learning loop vs Scro one-shot path.
export function RightToolPain() {
  const { t } = useI18n();
  const diy = [t("rightTool.pain.diy1"), t("rightTool.pain.diy2"), t("rightTool.pain.diy3")];
  const scro = [t("rightTool.pain.scro1"), t("rightTool.pain.scro2"), t("rightTool.pain.scro3")];

  return (
    <section id="pain" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("rightTool.pain.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("rightTool.pain.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("rightTool.pain.body")}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-6 lg:grid-cols-2">
          <MotionItem>
            <div className="h-full border-l-4 border-zinc-300 bg-zinc-50 px-6 py-8 md:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {t("rightTool.pain.diyLabel")}
              </p>
              <ol className="mt-5 space-y-4">
                {diy.map((line, i) => (
                  <li key={line} className="flex gap-3 text-sm leading-6 text-zinc-600">
                    <span className="mt-0.5 font-display text-sm font-bold text-zinc-400">0{i + 1}</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          </MotionItem>
          <MotionItem>
            <div className="h-full border-l-4 border-[#c6f24b] bg-[#12141c] px-6 py-8 md:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
                {t("rightTool.pain.scroLabel")}
              </p>
              <ol className="mt-5 space-y-4">
                {scro.map((line, i) => (
                  <li key={line} className="flex gap-3 text-sm leading-6 text-white/85">
                    <span className="mt-0.5 font-display text-sm font-bold text-[#c6f24b]">0{i + 1}</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          </MotionItem>
        </MotionStagger>
      </div>
    </section>
  );
}
