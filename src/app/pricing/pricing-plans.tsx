"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionReveal } from "@/presentation/components/motion-reveal";
import { PLANS } from "@/service/billing/plans";
import { PricingPlanCard } from "./pricing-plan-card";

// Page header and the four plan cards. Four across on wide screens, then two, then one.
export function PricingPlans() {
  const { t } = useI18n();
  const plans = Object.values(PLANS);

  return (
    <section id="plans" className="bg-[#f3f3f3] px-4 pb-16 pt-16 md:px-8 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <MotionReveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3f9a16]">
            {t("landing.pricing.eyebrow")}
          </p>
          <h1 className="mt-3 text-pretty text-4xl font-bold leading-[1.1] tracking-tight text-[#12141c] sm:text-5xl">
            {t("landing.pricing.title")}
          </h1>
          <p className="mt-4 text-base text-[#12141c]/75">{t("landing.pricing.subtitle")}</p>
        </MotionReveal>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PricingPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
