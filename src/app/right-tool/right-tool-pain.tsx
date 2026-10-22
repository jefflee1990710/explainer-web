"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// Contrast: expensive DIY learning loop vs Scro one-shot path, styled with Studio desk cards.
export function RightToolPain({ signedIn = false }: { signedIn?: boolean }) {
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
            <div className="h-full rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-6 transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(22,24,35,0.06)] md:p-8">
              <span className="inline-flex items-center rounded-full border border-[#e4e4e7] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6170]">
                {t("rightTool.pain.diyLabel")}
              </span>
              <ol className="mt-6 space-y-4">
                {diy.map((line, i) => (
                  <li key={line} className="flex items-start gap-3.5 text-sm leading-6 text-[#5c6170]">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e4e4e7] bg-white font-display text-xs font-bold text-[#5c6170]">
                      0{i + 1}
                    </span>
                    <span className="pt-0.5">{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          </MotionItem>
          <MotionItem>
            <div className="h-full rounded-2xl border border-[#12141c] bg-[#12141c] p-6 shadow-[0_12px_32px_rgba(18,20,28,0.14)] md:p-8">
              <span className="inline-flex items-center rounded-full border border-[#c6f24b]/40 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
                {t("rightTool.pain.scroLabel")}
              </span>
              <ol className="mt-6 space-y-4">
                {scro.map((line, i) => (
                  <li key={line} className="flex items-start gap-3.5 text-sm leading-6 text-white/85">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c6f24b] font-display text-xs font-bold text-[#12141c]">
                      0{i + 1}
                    </span>
                    <span className="pt-0.5">{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          </MotionItem>
        </MotionStagger>
        <SectionCtaRow
          align="center"
          primary={{
            href: signedIn ? "/app" : "/sign-up",
            label: signedIn ? t("rightTool.hero.ctaWorkspace") : t("rightTool.hero.ctaStart"),
          }}
          secondary={{ href: "/pricing", label: t("rightTool.cta.ctaPricing") }}
        />
      </div>
    </section>
  );
}
