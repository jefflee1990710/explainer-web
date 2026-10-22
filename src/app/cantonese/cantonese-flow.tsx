"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";
import { SectionCtaRow } from "@/presentation/components/section-cta-row";

// Pick Cantonese → spoken draft → captioned clip, styled with dark studio cards.
export function CantoneseFlow({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const steps = [
    { n: "01", title: t("cantonesePage.flow.s1Title"), body: t("cantonesePage.flow.s1Body") },
    { n: "02", title: t("cantonesePage.flow.s2Title"), body: t("cantonesePage.flow.s2Body") },
    { n: "03", title: t("cantonesePage.flow.s3Title"), body: t("cantonesePage.flow.s3Body") },
  ];

  return (
    <section id="flow" className="border-b border-white/10 bg-[#12141c] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("cantonesePage.flow.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t("cantonesePage.flow.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">{t("cantonesePage.flow.body")}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((item) => (
            <MotionItem key={item.n}>
              <article className="flex h-full flex-col rounded-2xl border border-white/12 bg-white/[0.04] p-6 transition-colors hover:border-[#c6f24b]/40">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 font-display text-xs font-bold text-[#c6f24b]">
                  {item.n}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.body}</p>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
        <SectionCtaRow
          align="center"
          tone="dark"
          primary={{
            href: signedIn ? "/app" : "/sign-up",
            label: t("cantonesePage.cta.cta"),
          }}
          secondary={{ href: "/pricing", label: t("cantonesePage.cta.ctaPricing") }}
        />
      </div>
    </section>
  );
}
