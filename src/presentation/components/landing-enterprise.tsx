"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { salesMailto } from "@/service/billing/plans";

// Enterprise sits under the plan scroller, not inside it.
export function LandingEnterprise() {
  const { t } = useI18n();

  return (
    <section className="bg-white px-4 pb-16 sm:pb-20 lg:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <img
          src="/pricing/enterprise.png"
          alt=""
          className="h-48 w-full object-cover object-center sm:h-56 lg:h-full"
        />
        <div className="flex flex-col justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Enterprise
          </p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">{t("landing.enterprise.title")}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">{t("landing.enterprise.body")}</p>
          <a
            href={salesMailto()}
            className="mt-7 inline-flex w-fit items-center rounded-full bg-[#12141c] px-5 py-2.5 text-sm font-medium text-[#c6f24b] transition hover:bg-black"
          >
            {t("landing.enterprise.cta")}
          </a>
        </div>
      </div>
    </section>
  );
}
