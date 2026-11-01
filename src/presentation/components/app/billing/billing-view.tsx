"use client";

import { useEffect } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { track } from "@/presentation/components/analytics/track";
import { EnterpriseCta } from "@/presentation/components/pricing/enterprise-cta";
import type { PlanDefinition } from "@/service/billing/plans";
import type { PlanId } from "@/model/subscription";
import { BillingPlanCard } from "@/presentation/components/app/billing/billing-plan-card";
import { BuyCreditsSection } from "@/presentation/components/app/billing/buy-credits-section";
import { CreditsTiersOverview } from "@/presentation/components/app/billing/credits-tiers-overview";
import { PayAsYouGoCard } from "@/presentation/components/app/billing/pay-as-you-go-card";

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
  purchase,
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
  // Set after Stripe returns, so GA can record the subscribe conversion once.
  purchase?: {
    sessionId: string;
    value: number;
    itemId: string;
    itemName: string;
  };
}) {
  const { locale, t } = useI18n();

  useEffect(() => {
    if (!purchase?.sessionId) return;
    const key = `ga-purchase-${purchase.sessionId}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    track("purchase", {
      transaction_id: purchase.sessionId,
      currency: "USD",
      value: purchase.value,
      items: [{ item_id: purchase.itemId, item_name: purchase.itemName, price: purchase.value, quantity: 1 }],
    });
    track("subscribe", {
      transaction_id: purchase.sessionId,
      currency: "USD",
      value: purchase.value,
      item_id: purchase.itemId,
      item_name: purchase.itemName,
    });
  }, [purchase]);

  const dateLocale =
    locale === "zh-Hant" ? "zh-TW" : locale === "zh-Hans" ? "zh-CN" : locale;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("billing.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("billing.subtitle")}</p>

      {checkoutSuccess ? (
        <p className="mt-4 rounded-[1rem] border border-accent-ink/10 bg-lime/50 px-4 py-3 text-sm font-medium">
          {t("billing.checkoutSuccess")}
        </p>
      ) : null}

      <CreditsTiersOverview
        credits={credits}
        creditLimit={creditLimit}
        monthlyCredits={monthlyCredits}
        bonusCredits={bonusCredits}
        periodEnd={periodEnd}
        subscribed={subscribed}
        activePlanId={activePlanId}
        subscriptionStatus={subscriptionStatus}
        dateLocale={dateLocale}
      />

      <BuyCreditsSection subscribed={subscribed} />

      <section id="monthly-plans" className="mt-10 scroll-mt-8">
        <h2 className="font-display text-2xl font-bold">{t("billing.monthlyPlansTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("billing.monthlyPlansSubtitle")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!subscribed ? <PayAsYouGoCard /> : null}
          {plans.map((plan) => (
            <BillingPlanCard key={plan.id} plan={plan} />
          ))}
          <EnterpriseCta compact />
        </div>
      </section>
    </div>
  );
}
