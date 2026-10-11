"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { salesMailto } from "@/service/billing/plans";

// Enterprise sits under the plan cards, not inside the grid.
export function PricingEnterprise() {
  const { t } = useI18n();

  return (
    <section className="bg-[#f3f3f3] px-4 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-2xl border-2 border-[#12141c] bg-[#12141c] shadow-[6px_6px_0_0_#c6f24b] lg:grid-cols-[minmax(0,20rem)_1fr]">
        <img
          src="/pricing/enterprise-scro.webp"
          alt=""
          className="h-56 w-full border-b-2 border-[#12141c] bg-white object-cover object-center lg:h-full lg:border-b-0 lg:border-r-2"
        />
        <div className="flex flex-col justify-center px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b]">
            {t("landing.enterprise.cardLabel")}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{t("landing.enterprise.title")}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">{t("landing.enterprise.body")}</p>
          <a
            href={salesMailto()}
            className="mt-7 inline-flex w-fit items-center rounded-full bg-[#c6f24b] px-6 py-2.5 text-sm font-semibold text-[#12141c] transition hover:bg-[#d6ff5c]"
          >
            {t("landing.enterprise.cta")}
          </a>
        </div>
      </div>
    </section>
  );
}
