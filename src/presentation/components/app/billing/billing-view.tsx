"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { EnterpriseCta } from "@/presentation/components/pricing/enterprise-cta";
import type { PlanDefinition } from "@/service/billing/plans";
import type { PlanId } from "@/model/subscription";
import { PortalButton } from "@/presentation/components/app/billing/billing-actions";
import { BillingPlanCard } from "@/presentation/components/app/billing/billing-plan-card";
import { CreditProgress } from "@/presentation/components/app/billing/credit-progress";

export function BillingView({
  checkoutSuccess,
  credits,
  creditLimit,
  monthlyCredits,
  bonusCredits,
  periodEnd,
  subscribed,
  activePlanId,
  subscriptionStatus,
  plans,
}: {
  checkoutSuccess: boolean;
  credits: number;
  creditLimit: number;
  monthlyCredits: number;
  bonusCredits: number;
  periodEnd?: Date;
  subscribed: boolean;
  activePlanId?: PlanId;
  subscriptionStatus?: string;
  plans: PlanDefinition[];
}) {
  const { locale, t } = useI18n();
  const dateLocale =
    locale === "zh-Hant" ? "zh-TW" : locale === "zh-Hans" ? "zh-CN" : locale;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("billing.title")}</h1>
      {checkoutSuccess ? (
        <p className="mt-4 rounded-[1rem] border border-accent-ink/10 bg-lime/50 px-4 py-3 text-sm font-medium">
          {t("billing.checkoutSuccess")}
        </p>
      ) : null}

      <CreditProgress
        credits={credits}
        creditLimit={creditLimit}
        monthlyCredits={monthlyCredits}
        bonusCredits={bonusCredits}
        periodEnd={periodEnd}
        subscribed={subscribed}
        dateLocale={dateLocale}
      />

      {subscribed && activePlanId && subscriptionStatus ? (
        <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
          <p className="font-display text-lg font-bold">
            {t("billing.currentPlan", {
              plan: t(`plans.${activePlanId}.name`),
              status: subscriptionStatus,
            })}
          </p>
          {periodEnd ? (
            <p className="mt-2 text-sm text-muted">
              {t("billing.periodInfo", {
                monthly: monthlyCredits,
                date: periodEnd.toLocaleDateString(dateLocale),
              })}
            </p>
          ) : null}
          <div className="mt-4">
            <PortalButton />
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <BillingPlanCard key={plan.id} plan={plan} />
        ))}
        <EnterpriseCta compact />
      </div>
    </div>
  );
}
