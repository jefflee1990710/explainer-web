"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LandingPricingTrack } from "@/presentation/components/landing-pricing-track";
import { MotionReveal } from "@/presentation/components/motion-reveal";
import { PLANS, type PlanDefinition } from "@/service/billing/plans";
import type { PlanId } from "@/model/subscription";

// Art in /public/pricing. Regenerate in development with GOOGLE_GENERATIVE_AI_API_KEY (Gemini).
const PLAN_ART: Record<PlanId, string> = {
  starter: "/pricing/starter.png",
  pro: "/pricing/pro.png",
  studio: "/pricing/studio.png",
  scale: "/pricing/scale.png",
};

export function LandingPricing() {
  const { t } = useI18n();
  const plans = Object.values(PLANS);

  function planName(plan: PlanDefinition) {
    return t(`plans.${plan.id as PlanId}.name`);
  }

  return (
    <section id="pricing" className="bg-gradient-to-b from-[#fff7d6] via-white to-white px-4 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
      <MotionReveal>
        <h2 className="text-center text-3xl font-bold text-zinc-900">{t("landing.pricing.title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-600">{t("landing.pricing.subtitle")}</p>
      </MotionReveal>

      <LandingPricingTrack>
        {plans.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-8 shadow-sm ${
                plan.highlight
                  ? "border-[#12141c] bg-[#12141c] text-white"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="-mx-8 -mt-8 mb-6 h-44 overflow-hidden rounded-t-2xl bg-white">
                <img
                  src={PLAN_ART[plan.id]}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              </div>
              {plan.highlight ? (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b]">
                  {t("common.popular")}
                </p>
              ) : null}
              <h3 className="font-display mt-1 text-2xl font-bold">{planName(plan)}</h3>
              <p className="mt-3 font-display text-4xl font-bold">
                ${plan.amountUsd}
                <span
                  className={`text-base font-medium ${
                    plan.highlight ? "text-white/70" : "text-zinc-500"
                  }`}
                >
                  {" "}
                  {t("common.perMonth")}
                </span>
              </p>
              <p
                className={`mt-3 flex-1 text-sm leading-6 ${
                  plan.highlight ? "text-white/80" : "text-zinc-600"
                }`}
              >
                {t(`plans.${plan.id as PlanId}.blurb`)}
              </p>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="mt-7 inline-flex"
              >
                <Link
                  href="/app/billing"
                  className={`rounded-full px-5 py-2.5 text-sm font-medium ${
                    plan.highlight
                      ? "bg-[#c6f24b] text-[#12141c]"
                      : "bg-[#12141c] text-[#c6f24b] hover:bg-black"
                  }`}
                >
                  {t("landing.pricing.subscribePlan", { plan: planName(plan) })}
                </Link>
              </motion.div>
            </article>
        ))}
      </LandingPricingTrack>
      </div>
    </section>
  );
}
