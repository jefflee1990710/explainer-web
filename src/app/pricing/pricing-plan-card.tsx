"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PlanDefinition } from "@/service/billing/plans";
import type { PlanId } from "@/model/subscription";

// Paper cut-out art per plan, in /public/pricing.
const PLAN_ART: Record<PlanId, string> = {
  starter: "/pricing/starter-scro.webp",
  pro: "/pricing/pro-scro.webp",
  studio: "/pricing/studio-scro.webp",
  scale: "/pricing/scale-scro.webp",
};

// One plan. The highlighted plan is the black card with a green shadow.
export function PricingPlanCard({ plan }: { plan: PlanDefinition }) {
  const { t } = useI18n();
  const id = plan.id as PlanId;
  const name = t(`plans.${id}.name`);
  const dark = Boolean(plan.highlight);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border-2 border-[#12141c] ${
        dark ? "bg-[#12141c] text-white shadow-[6px_6px_0_0_#c6f24b]" : "bg-white text-[#12141c] shadow-[6px_6px_0_0_#12141c]"
      }`}
    >
      <div className="aspect-[4/3] overflow-hidden border-b-2 border-[#12141c] bg-white">
        <img src={PLAN_ART[id]} alt="" className="h-full w-full object-cover object-center" />
      </div>
      <div className="flex flex-1 flex-col p-7">
        {/* Label row kept on every card so names and prices line up across the grid. */}
        <p
          className={`text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b] ${dark ? "" : "hidden sm:invisible sm:block"}`}
          aria-hidden={!dark}
        >
          {t("common.popular")}
        </p>
        <h2 className="font-display mt-1 text-2xl font-bold">{name}</h2>
        <p className="font-display mt-3 text-4xl font-bold">
          ${plan.amountUsd}
          <span className={`text-base font-medium ${dark ? "text-white/70" : "text-[#12141c]/60"}`}>
            {" "}
            {t("common.perMonth")}
          </span>
        </p>
        <p className={`mt-3 flex-1 text-sm leading-6 ${dark ? "text-white/80" : "text-[#12141c]/70"}`}>
          {t(`plans.${id}.blurb`)}
        </p>
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="mt-7 inline-flex">
          <Link
            href="/app/billing"
            className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
              dark ? "bg-[#c6f24b] text-[#12141c] hover:bg-[#d6ff5c]" : "bg-[#12141c] text-[#c6f24b] hover:bg-black"
            }`}
          >
            {t("landing.pricing.subscribePlan", { plan: name })}
          </Link>
        </motion.div>
      </div>
    </article>
  );
}
