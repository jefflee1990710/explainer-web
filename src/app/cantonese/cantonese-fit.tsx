"use client";

import { ArtFrame } from "@/presentation/components/art-frame";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionItem, MotionStagger } from "@/presentation/components/motion-reveal";

const FIT_ART = [
  "/landing/cantonese/sme.jpg",
  "/landing/cantonese/product.jpg",
  "/landing/cantonese/reel.jpg",
] as const;

// Why HK Cantonese talking-heads fit SMEs and solo founders.
export function CantoneseFit() {
  const { t } = useI18n();
  const items = [
    { title: t("cantonesePage.fit.f1Title"), body: t("cantonesePage.fit.f1Body") },
    { title: t("cantonesePage.fit.f2Title"), body: t("cantonesePage.fit.f2Body") },
    { title: t("cantonesePage.fit.f3Title"), body: t("cantonesePage.fit.f3Body") },
  ];

  return (
    <section id="fit" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("cantonesePage.fit.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-5xl">
            {t("cantonesePage.fit.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("cantonesePage.fit.body")}</p>
        </div>

        <MotionStagger className="mt-14 grid gap-10 md:grid-cols-3">
          {items.map((item, index) => (
            <MotionItem key={item.title}>
              <article>
                <ArtFrame src={FIT_ART[index]} className="aspect-[4/3] w-full rounded-2xl" />
                <h3 className="mt-5 font-display text-xl font-semibold text-[#12141c]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c6170]">{item.body}</p>
              </article>
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
