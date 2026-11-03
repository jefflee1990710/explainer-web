"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { PlanId } from "@/model/subscription";
import { track } from "@/presentation/components/analytics/track";
import { AddCreditButton } from "@/presentation/components/app/billing/add-credit-modal";
import { BillingPlanCard } from "@/presentation/components/app/billing/billing-plan-card";
import { BuyCreditsSection } from "@/presentation/components/app/billing/buy-credits-section";
import { PayAsYouGoCard } from "@/presentation/components/app/billing/pay-as-you-go-card";
import { useI18n } from "@/presentation/components/i18n-provider";
import { EnterpriseCta } from "@/presentation/components/pricing/enterprise-cta";
import { creditProgress } from "@/service/billing/credit-balance";
import type { PlanDefinition } from "@/service/billing/plans";

/**
 * Dedicated Usage & Credits page (`/app/usage`):
 * - Top section shows exact breakdown of Top-up capacity, Monthly Plan capacity, Used credits, and Remaining credits.
 * - Bottom section renders One-Time Credit Top-up packs ($10–$1,000) and Monthly Subscription plans.
 */
export function UsageView({
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
  purchase?: {
    sessionId: string;
    value: number;
    itemId: string;
    itemName: string;
  };
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";

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
  }, [purchase]);

  const dateLocale =
    locale === "zh-Hant" ? "zh-TW" : locale === "zh-Hans" ? "zh-CN" : locale;

  const totalCapacity = Math.max(creditLimit, monthlyCredits + bonusCredits, credits);
  const { remaining, ratio } = creditProgress(credits, totalCapacity);
  const percent = Math.round(ratio * 100);
  const used = Math.max(0, totalCapacity - remaining);
  const topUpIncluded = Math.max(0, bonusCredits);
  const monthlyIncluded = subscribed ? Math.max(0, monthlyCredits) : 0;

  const planLabel =
    subscribed && activePlanId
      ? t("billing.currentPlanBadge", {
          plan: t(`plans.${activePlanId}.name`),
          status: subscriptionStatus || "",
        })
      : t("billing.payAsYouGoPlan");

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Sub-navigation */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {isEn ? "Usage & Credits" : "用量與儲值 Usage"}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            {isEn
              ? "View your Top-up and Monthly Plan credit breakdown, used vs. remaining balance, and top up or subscribe below."
              : "查看你嘅 Top-up 儲值與月費計劃容量明細、已使用同剩餘 Credits，並喺下方隨時單次儲值或訂閱方案。"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/billing"
            className="rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-xs font-bold text-foreground transition hover:border-accent-ink"
          >
            {isEn ? "Billing & Card →" : "信用卡與付款設定 →"}
          </Link>
          <Link
            href="/app/invoices"
            className="rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-xs font-bold text-foreground transition hover:border-accent-ink"
          >
            {isEn ? "Invoices & Receipts →" : "帳單紀錄 Invoices →"}
          </Link>
        </div>
      </div>

      {checkoutSuccess ? (
        <p className="rounded-[1rem] border border-accent-ink/10 bg-lime/50 px-4 py-3 text-sm font-medium">
          {t("billing.checkoutSuccess")}
        </p>
      ) : null}

      {/* Top Capacity & Usage Breakdown Card */}
      <section className="rounded-[1.5rem] border-2 border-accent-ink bg-white p-6 shadow-[4px_4px_0_0_#12141c]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {t("billing.currentPlanLabel")}
            </p>
            <p className="mt-1 font-display text-lg font-bold">{planLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <AddCreditButton />
            <a
              href="#monthly-plans"
              className="inline-flex min-h-[44px] items-center rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold text-accent-ink transition hover:border-accent-ink"
            >
              {t("billing.seeCreditPlans")}
            </a>
          </div>
        </div>

        {/* 4-Metric Breakdown Grid: Top-up Capacity | Monthly Plan Capacity | Used | Remaining */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className="rounded-2xl border border-accent-ink/12 bg-paper/70 p-4">
            <p className="text-xs font-semibold text-muted">
              {isEn ? "Top-up Credits" : "Top-up 儲值容量"}
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold text-foreground">
              {topUpIncluded.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {isEn ? "Never expires · rolls over" : "單次加購 · 未用完永久保留"}
            </p>
          </div>

          <div className="rounded-2xl border border-accent-ink/12 bg-paper/70 p-4">
            <p className="text-xs font-semibold text-muted">
              {isEn ? "Monthly Plan Credits" : "月費計劃容量"}
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold text-foreground">
              {monthlyIncluded.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {periodEnd
                ? t("billing.periodEndsStandalone", {
                    date: periodEnd.toLocaleDateString(dateLocale),
                  })
                : isEn
                  ? "No active monthly plan"
                  : "目前未訂閱月費計劃"}
            </p>
          </div>

          <div className="rounded-2xl border border-accent-ink/12 bg-paper/70 p-4">
            <p className="text-xs font-semibold text-muted">
              {isEn ? "Used Credits" : "已使用 Credits"}
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold text-foreground">
              {used.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {isEn
                ? `Out of ${totalCapacity.toLocaleString()} total capacity`
                : `總容量 ${totalCapacity.toLocaleString()} credits`}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-accent-ink bg-lime/35 p-4">
            <p className="text-xs font-bold text-accent-ink">
              {isEn ? "Remaining Available" : "剩餘可用 Credits"}
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold text-accent-ink">
              {remaining.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-accent-ink/80">
              {percent}% {isEn ? "available" : "可用比例"}
            </p>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span>
              {isEn
                ? `Remaining: ${remaining.toLocaleString()} / ${totalCapacity.toLocaleString()} credits`
                : `剩餘可用：${remaining.toLocaleString()} / 總容量 ${totalCapacity.toLocaleString()} credits`}
            </span>
            <span className="text-muted">
              {isEn
                ? `Used: ${used.toLocaleString()} credits`
                : `已使用：${used.toLocaleString()} credits`}
            </span>
          </div>
          <div
            className="h-3.5 overflow-hidden rounded-full bg-accent-ink/10"
            role="progressbar"
            aria-label={t("billing.remainingAria")}
            aria-valuemin={0}
            aria-valuemax={totalCapacity}
            aria-valuenow={remaining}
          >
            <div
              className="h-full rounded-full bg-[var(--studio-teal)] transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted">{t("billing.clipCostNote")}</p>
        </div>
      </section>

      {/* Bottom 1: One-Time Top-Up Packs ($10 to $1,000) */}
      <BuyCreditsSection subscribed={subscribed} />

      {/* Bottom 2: Subscribe to Monthly Plans */}
      <section id="monthly-plans" className="scroll-mt-8">
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
