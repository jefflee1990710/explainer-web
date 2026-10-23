"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Enterprise closer, same lime stage and white desk card as the landing sign-up band.
export function PricingEnterprise() {
  const { t } = useI18n();

  return (
    <section className="border-t border-[#e4e4e7] bg-[#f4fcd4] px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-[0_8px_24px_rgba(22,24,35,0.06)] md:p-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#12141c]">
          <img src="/pricing/enterprise-scro.webp" alt="" className="aspect-[4/3] w-full object-cover object-center lg:aspect-square" />
        </div>
        <div>
          <p className="inline-flex items-center rounded-full bg-[#12141c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("landing.enterprise.cardLabel")}
          </p>
          <h2 className="mt-4 font-display text-pretty text-3xl font-bold tracking-tight text-[#12141c] md:text-4xl">
            {t("landing.enterprise.title")}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#5c6170]">{t("landing.enterprise.body")}</p>
          <Link
            href="/contact"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
          >
            {t("landing.enterprise.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
