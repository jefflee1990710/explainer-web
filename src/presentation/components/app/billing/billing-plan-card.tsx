"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PlanDefinition } from "@/service/billing/plans";
import type { PlanId } from "@/model/subscription";
import { CheckoutButton } from "@/presentation/components/app/billing/billing-actions";

export function BillingPlanCard({ plan }: { plan: PlanDefinition }) {
  const { t } = useI18n();
  const planName = t(`plans.${plan.id as PlanId}.name`);

  return (
    <article
      className={`flex flex-col rounded-[1.5rem] border p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)] ${
        plan.highlight
          ? "border-accent-ink bg-accent-ink text-paper"
          : "border-accent-ink/10 bg-paper/85"
      }`}
    >
      {plan.highlight ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          {t("common.popular")}
        </p>
      ) : null}
      <h2 className="font-display mt-1 text-xl font-bold">{planName}</h2>
      <p className="mt-2 font-display text-3xl font-bold">
        ${plan.amountUsd}
        <span
          className={`text-base font-medium ${
            plan.highlight ? "text-paper/70" : "text-muted"
          }`}
        >
          {" "}
          {t("common.perMonth")}
        </span>
      </p>
      <p className={`mt-2 flex-1 text-sm ${plan.highlight ? "text-paper/75" : "text-muted"}`}>
        {t(`plans.${plan.id as PlanId}.blurb`)}
      </p>
      <p className={`mt-2 text-xs ${plan.highlight ? "text-paper/60" : "text-muted"}`}>
        {t("billing.creditsClips", {
          credits: plan.monthlyCredits,
          clips: Math.floor(plan.monthlyCredits / 3),
        })}
      </p>
      <div className="mt-5">
        <CheckoutButton
          planId={plan.id}
          label={t("billing.subscribePlan", { plan: planName })}
          variant={plan.highlight ? "lime" : "accent"}
        />
      </div>
    </article>
  );
}
