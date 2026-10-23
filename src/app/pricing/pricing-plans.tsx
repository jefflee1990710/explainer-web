"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { PLANS } from "@/service/billing/plans";
import { PricingPlanCard } from "./pricing-plan-card";

// Dark studio header, then four plan cards on the same light desk as the landing sections.
export function PricingPlans({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const plans = Object.values(PLANS);

  return (
    <>
      <section className="border-b border-black/40 bg-[#0a0c10] px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border border-[#c6f24b]/35 bg-[#12141c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("landing.pricing.eyebrow")}
          </p>
          <h1 className="mt-4 font-display text-pretty text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
            {t("landing.pricing.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/70">{t("landing.pricing.subtitle")}</p>
        </div>
      </section>
      <section id="plans" className="bg-[#fafafa] px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PricingPlanCard key={plan.id} plan={plan} signedIn={signedIn} />
          ))}
        </div>
      </section>
    </>
  );
}
