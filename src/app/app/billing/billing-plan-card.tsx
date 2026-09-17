"use client";

import { CheckoutButton } from "./billing-actions";
import type { PlanDefinition } from "@/lib/billing/plans";

export function BillingPlanCard({ plan }: { plan: PlanDefinition }) {
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
          最受歡迎
        </p>
      ) : null}
      <h2 className="font-display mt-1 text-xl font-bold">{plan.nameZh}</h2>
      <p className="mt-2 font-display text-3xl font-bold">
        ${plan.amountUsd}
        <span
          className={`text-base font-medium ${
            plan.highlight ? "text-paper/70" : "text-muted"
          }`}
        >
          {" "}
          / 月
        </span>
      </p>
      <p className={`mt-2 flex-1 text-sm ${plan.highlight ? "text-paper/75" : "text-muted"}`}>
        {plan.blurb}
      </p>
      <p className={`mt-2 text-xs ${plan.highlight ? "text-paper/60" : "text-muted"}`}>
        {plan.monthlyCredits} credits · 約 {Math.floor(plan.monthlyCredits / 3)} 段 clips
      </p>
      <div className="mt-5">
        <CheckoutButton
          planId={plan.id}
          label={`訂閱 ${plan.nameZh}`}
          variant={plan.highlight ? "lime" : "accent"}
        />
      </div>
    </article>
  );
}
