"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PlanDefinition } from "@/service/billing/plans";
import type { PlanId } from "@/model/subscription";
import { CheckoutButton } from "@/presentation/components/app/billing/billing-actions";

export const PLAN_CARD_ART: Record<PlanId, string> = {
  starter: "/pricing/starter-scro.png",
  pro: "/pricing/pro-scro.png",
  studio: "/pricing/studio-scro.png",
  scale: "/pricing/scale-scro.png",
};

export function BillingPlanCard({
  plan,
  className = "",
}: {
  plan: PlanDefinition;
  className?: string;
}) {
  const { t } = useI18n();
  const id = plan.id as PlanId;
  const planName = t(`plans.${id}.name`);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[1.5rem] border transition ${
        plan.highlight
          ? "border-[#c6f24b] bg-[#12141c] text-white"
          : "border-[var(--studio-line)] bg-[var(--studio-panel)] text-[var(--studio-ink)]"
      } ${className}`}
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden border-b border-[var(--studio-line)] bg-[#12141c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PLAN_CARD_ART[id]}
          alt={planName}
          loading="lazy"
          className="h-full w-full object-cover object-center transition duration-300 hover:scale-105"
        />
        {plan.highlight ? (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-[#c6f24b] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#12141c] shadow-sm">
            {t("common.popular")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h2 className="font-display text-xl font-bold">{planName}</h2>
        <p className="mt-2 font-display text-3xl font-bold">
          ${plan.amountUsd}
          <span
            className={`text-base font-medium ${
              plan.highlight ? "text-white/70" : "text-muted"
            }`}
          >
            {" "}
            {t("common.perMonth")}
          </span>
        </p>
        <p
          className={`mt-2 flex-1 text-sm ${
            plan.highlight ? "text-white/80" : "text-muted"
          }`}
        >
          {t(`plans.${id}.blurb`)}
        </p>
        <p
          className={`mt-2 text-xs font-semibold ${
            plan.highlight ? "text-[#c6f24b]" : "text-muted"
          }`}
        >
          {t("billing.creditsClips", { credits: plan.monthlyCredits.toLocaleString() })}
        </p>
        <div className="mt-5">
          <CheckoutButton
            planId={plan.id}
            label={t("billing.subscribePlan", { plan: planName })}
            variant={plan.highlight ? "lime" : "accent"}
          />
        </div>
      </div>
    </article>
  );
}
