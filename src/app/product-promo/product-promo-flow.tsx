"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Upload → virtual host → promo short.
export function ProductPromoFlow() {
  const { t } = useI18n();
  const steps = [
    { n: "01", title: t("productPromoPage.flow.s1Title"), body: t("productPromoPage.flow.s1Body") },
    { n: "02", title: t("productPromoPage.flow.s2Title"), body: t("productPromoPage.flow.s2Body") },
    { n: "03", title: t("productPromoPage.flow.s3Title"), body: t("productPromoPage.flow.s3Body") },
  ];

  return (
    <section id="flow" className="border-b border-white/10 bg-[#12141c] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("productPromoPage.flow.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl">
            {t("productPromoPage.flow.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">{t("productPromoPage.flow.body")}</p>
          <ol className="mt-8 space-y-6">
            {steps.map((item) => (
              <li key={item.n} className="flex gap-4">
                <span className="font-display text-sm font-bold text-[#c6f24b]">{item.n}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/65">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <img
          src="/landing/product-promo/upload.jpg"
          alt=""
          className="aspect-video w-full object-cover"
        />
      </div>
    </section>
  );
}
