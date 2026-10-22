"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// High production cost vs upload-and-pitch on Scro.
export function ProductPromoCost() {
  const { t } = useI18n();

  return (
    <section id="cost" className="border-b border-[#e4e4e7] bg-white px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="inline-flex items-center rounded-full bg-[#f4fcd4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
            {t("productPromoPage.cost.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl">
            {t("productPromoPage.cost.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("productPromoPage.cost.body")}</p>
        </div>
        <img
          src="/landing/product-promo/cost.jpg"
          alt=""
          className="aspect-video w-full rounded-2xl object-cover"
        />
      </div>
    </section>
  );
}
