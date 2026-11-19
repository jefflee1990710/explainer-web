"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { creditProgressUsd } from "@/service/billing/credit-balance";
import { addUsd, formatUsd, formatUsdRate, subUsd, toUsdUnits } from "@/service/billing/usd";
import {
  FRAME_COST_USD,
  TALKING_HEAD_COST_PER_SECOND_USD,
  VIDEO_COST_PER_SECOND_USD,
} from "@/service/credit-costs";
import { AddCreditButton } from "@/presentation/components/app/billing/add-credit-modal";
import { PortalButton } from "@/presentation/components/app/billing/billing-actions";
import type { PlanId } from "@/model/subscription";

/** Top overview card: plan, USD credit balance, period usage summary, Stripe portal links. */
export function CreditsTiersOverview({
  creditUsd,
  creditLimitUsd,
  monthlyCreditUsd,
  bonusCreditUsd,
  periodEnd,
  subscribed,
  activePlanId,
  subscriptionStatus,
  dateLocale,
}: {
  creditUsd: number;
  creditLimitUsd: number;
  monthlyCreditUsd: number;
  bonusCreditUsd: number;
  periodEnd?: Date;
  subscribed: boolean;
  activePlanId?: PlanId;
  subscriptionStatus?: string;
  dateLocale: string;
}) {
  const { t, locale } = useI18n();
  const limit = Math.max(creditLimitUsd, addUsd(monthlyCreditUsd, bonusCreditUsd), creditUsd);
  const { remaining, ratio } = creditProgressUsd(creditUsd, limit);
  const percent = Math.round(ratio * 100);
  const used = Math.max(0, subUsd(limit, remaining));

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
            {formatUsd(remaining)}
            <span className="text-lg font-medium text-muted"> / {formatUsd(limit)}</span>
          </p>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full bg-accent-ink/10"
            role="progressbar"
            aria-label={t("billing.remainingAria")}
            aria-valuemin={0}
            aria-valuemax={toUsdUnits(limit)}
            aria-valuenow={toUsdUnits(remaining)}
          >
            <div
              className="h-full rounded-full bg-[var(--studio-teal)] transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-4">
            <AddCreditButton />
          </div>
          <p className="mt-2 text-xs text-muted">
            {locale === "en"
              ? "One-time top-up USD Credit never expires and rolls over permanently."
              : locale === "zh-Hans"
                ? "单次充值的 USD Credit 永久保留，不会随月费周期清零。"
                : "單次加值的 USD Credit 永久保留，不會隨月費週期清零。"}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {t("billing.usageThisMonthLabel")}
          </p>
          <p className="font-display mt-2 text-3xl font-bold">{formatUsd(used)}</p>
          <p className="mt-2 text-sm text-muted">
            {toUsdUnits(monthlyCreditUsd) > 0
              ? locale === "en"
                ? `Monthly refill: ${formatUsd(monthlyCreditUsd)} · Permanent top-up: ${formatUsd(bonusCreditUsd)}`
                : locale === "zh-Hans"
                  ? `每月重置额度 ${formatUsd(monthlyCreditUsd)} · 单次充值余额 ${formatUsd(bonusCreditUsd)}`
                  : `每月重置額度 ${formatUsd(monthlyCreditUsd)} · 單次加值餘額 ${formatUsd(bonusCreditUsd)}`
              : locale === "en"
                ? "Pay-as-you-go balance only."
                : locale === "zh-Hans"
                  ? "未订阅时仅计算账户内剩余 USD Credit。"
                  : "未訂閱時僅計算帳戶內剩餘 USD Credit。"}
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

      <p className="mt-5 text-xs text-muted">
        {locale === "en"
          ? `${formatUsd(FRAME_COST_USD)}/image · ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)} standard video · ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)} talking-head video (voice included).`
          : locale === "zh-Hans"
            ? `图片 ${formatUsd(FRAME_COST_USD)}/张 · 标准影片 ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)} · 口播影片 ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)}（含语音）。`
            : `圖片 ${formatUsd(FRAME_COST_USD)}/張 · 標準影片 ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)} · 口播影片 ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)}（含語音）。`}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-accent-ink/10 pt-5">
        <PortalButton label={t("billing.billingPortal")} />
        <PortalButton label={t("billing.invoicesPortal")} variant="ghost" />
      </div>
    </section>
  );
}
