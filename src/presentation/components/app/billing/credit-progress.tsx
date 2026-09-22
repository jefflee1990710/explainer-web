"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { creditProgress } from "@/service/billing/credit-balance";
import { AddCreditButton } from "@/presentation/components/app/billing/add-credit-modal";

export function CreditProgress({
  credits,
  creditLimit,
  monthlyCredits,
  bonusCredits,
  periodEnd,
  subscribed,
  dateLocale,
}: {
  credits: number;
  creditLimit: number;
  monthlyCredits: number;
  bonusCredits: number;
  periodEnd?: Date;
  subscribed: boolean;
  dateLocale: string;
}) {
  const { t } = useI18n();
  const limit = Math.max(creditLimit, monthlyCredits, credits);
  const { remaining, ratio } = creditProgress(credits, limit);
  const percent = Math.round(ratio * 100);

  let summary = t("billing.remainingSummary", { remaining });
  if (monthlyCredits > 0) {
    summary += t("billing.monthlyAllowance", { monthly: monthlyCredits });
  }
  if (bonusCredits > 0) {
    summary += t("billing.bonusUnused", { bonus: bonusCredits });
  }
  if (periodEnd) {
    summary += t("billing.periodEnds", {
      date: periodEnd.toLocaleDateString(dateLocale),
    });
  }

  return (
    <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {t("billing.periodLabel")}
          </p>
          <p className="font-display mt-2 text-3xl font-bold">
            {remaining}
            <span className="text-lg font-medium text-muted"> / {limit}</span>
          </p>
        </div>
        <AddCreditButton disabled={!subscribed} />
      </div>
      <div
        className="mt-4 h-3 overflow-hidden rounded-full bg-accent-ink/10"
        role="progressbar"
        aria-label={t("billing.remainingAria")}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={remaining}
      >
        <div
          className="h-full rounded-full bg-lime transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted">{summary}</p>
      <p className="mt-1 text-xs text-muted">
        {t("billing.clipCostNote")}
        {subscribed ? t("billing.bonusRollsOver") : t("billing.subscribeToTopUp")}
      </p>
    </section>
  );
}
