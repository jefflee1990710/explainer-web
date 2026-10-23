"use client";

import Link from "next/link";
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

// One plan. Studio is the ink card; the others stay white studio desks.
export function PricingPlanCard({ plan, signedIn = false }: { plan: PlanDefinition; signedIn?: boolean }) {
  const { t } = useI18n();
  const id = plan.id as PlanId;
  const name = t(`plans.${id}.name`);
  const dark = Boolean(plan.highlight);
  const href = signedIn ? "/app/billing" : "/sign-up";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border transition-shadow duration-200 ${
        dark
          ? "border-[#12141c] bg-[#12141c] text-white shadow-[0_8px_24px_rgba(22,24,35,0.16)]"
          : "border-[#e4e4e7] bg-white text-[#12141c] hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]"
      }`}
    >
      <div className="aspect-[4/3] overflow-hidden border-b border-[#e4e4e7] bg-[#fafafa]">
        <img src={PLAN_ART[id]} alt="" className="h-full w-full object-cover object-center" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        {/* Same row height on every card so names and prices line up. */}
        <div className="h-7">
          {dark ? (
            <p className="inline-flex items-center rounded-full bg-[#c6f24b] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#12141c]">
              {t("common.popular")}
            </p>
          ) : null}
        </div>
        <h2 className="font-display mt-3 text-2xl font-bold">{name}</h2>
        <p className="font-display mt-3 text-4xl font-bold tracking-tight">
          ${plan.amountUsd}
          <span className={`text-base font-medium ${dark ? "text-white/70" : "text-[#5c6170]"}`}>
            {" "}
            {t("common.perMonth")}
          </span>
        </p>
        <p className={`mt-3 text-sm font-semibold ${dark ? "text-[#c6f24b]" : "text-[#12141c]"}`}>
          {t("billing.creditsClips", { credits: plan.monthlyCredits.toLocaleString() })}
        </p>
        <p className={`mt-3 flex-1 text-sm leading-6 ${dark ? "text-white/75" : "text-[#5c6170]"}`}>
          {t(`plans.${id}.blurb`)}
        </p>
        <Link
          href={href}
          className={`mt-7 inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
            dark
              ? "bg-[#c6f24b] text-[#12141c] hover:bg-[#b6e23a]"
              : "bg-[#12141c] text-[#c6f24b] hover:bg-black"
          }`}
        >
          {t("landing.pricing.subscribePlan", { plan: name })}
        </Link>
      </div>
    </article>
  );
}
