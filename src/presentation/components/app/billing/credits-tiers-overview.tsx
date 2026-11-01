"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { creditProgress } from "@/service/billing/credit-balance";
import { AddCreditButton } from "@/presentation/components/app/billing/add-credit-modal";
import { PortalButton } from "@/presentation/components/app/billing/billing-actions";
import type { PlanId } from "@/model/subscription";

/** Top overview card: plan, balance, period usage summary, Stripe portal links. */
export function CreditsTiersOverview({
  credits,
  creditLimit,
  monthlyCredits,
  bonusCredits,
  periodEnd,
  subscribed,
  activePlanId,
  subscriptionStatus,
  dateLocale,
}: {
  credits: number;
  creditLimit: number;
  monthlyCredits: number;
  bonusCredits: number;
  periodEnd?: Date;
  subscribed: boolean;
  activePlanId?: PlanId;
  subscriptionStatus?: string;
  dateLocale: string;
}) {
  const { t } = useI18n();
  const limit = Math.max(creditLimit, monthlyCredits, credits);
  const { remaining, ratio } = creditProgress(credits, limit);
  const percent = Math.round(ratio * 100);
  const used = Math.max(0, limit - remaining);

  const planLabel = subscribed && activePlanId
    ? t("billing.currentPlanBadge", {
        plan: t(`plans.${activePlanId}.name`),
        status: subscriptionStatus || "",
      })
    : t("billing.payAsYouGoPlan");

  return (
    <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {t("billing.currentPlanLabel")}
          </p>
          <p className="font-display mt-1 text-lg font-bold">{planLabel}</p>
        </div>
        <a
          href="#monthly-plans"
          className="rounded-full border border-accent-ink/15 bg-transparent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-ink/5"
        >
          {t("billing.seeCreditPlans")}
        </a>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {t("billing.currentBalanceLabel")}
          </p>
          <p className="font-display mt-2 text-3xl font-bold">
            {remaining}
            <span className="text-lg font-medium text-muted"> / {limit}</span>
          </p>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full bg-accent-ink/10"
            role="progressbar"
            aria-label={t("billing.remainingAria")}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={remaining}
          >
            <div
              className="h-full rounded-full bg-[var(--studio-teal)] transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-4">
            <AddCreditButton disabled={!subscribed} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {subscribed ? t("billing.bonusRollsOver") : t("billing.subscribeToTopUp")}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {t("billing.usageThisMonthLabel")}
          </p>
          <p className="font-display mt-2 text-3xl font-bold">{used}</p>
          <p className="mt-2 text-sm text-muted">
            {monthlyCredits > 0
              ? t("billing.usageMonthlyDetail", { monthly: monthlyCredits, bonus: bonusCredits })
              : t("billing.usageFreeDetail")}
          </p>
          {periodEnd ? (
            <p className="mt-1 text-xs text-muted">
              {t("billing.periodEndsStandalone", {
                date: periodEnd.toLocaleDateString(dateLocale),
              })}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-5 text-xs text-muted">{t("billing.clipCostNote")}</p>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-accent-ink/10 pt-5">
        <PortalButton label={t("billing.billingPortal")} />
        <PortalButton label={t("billing.invoicesPortal")} variant="ghost" />
      </div>
    </section>
  );
}
