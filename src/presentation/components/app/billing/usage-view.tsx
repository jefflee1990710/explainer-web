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
 * - Top section shows current plan and a clean remaining credits progress bar.
 * - Middle section renders One-Time Credit Top-up packs ($10–$1,000) localized by selected language.
 * - Bottom section renders Monthly Subscription plans in a horizontal scrolling strip with Seedream 5.0 Pro artwork.
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

  const planLabel =
    subscribed && activePlanId
      ? t("billing.currentPlanBadge", {
          plan: t(`plans.${activePlanId}.name`),
          status: subscriptionStatus || "",
        })
      : t("billing.payAsYouGoPlan");

  const headerTitle =
    locale === "zh-Hant"
      ? "用量與儲值 Usage"
      : locale === "zh-Hans"
        ? "用量与充值 Usage"
        : "Usage & Credits";

  const headerSubtitle =
    locale === "zh-Hant"
      ? "查看你的剩餘可用 Credits，並在下方隨時單次儲值或訂閱每月方案。"
      : locale === "zh-Hans"
        ? "查看你的剩余可用 Credits，并在下方随时单次充值或订阅每月方案。"
        : "View your remaining credits balance, and top up or subscribe to a monthly plan below.";

  const billingBtnLabel =
    locale === "zh-Hant"
      ? "信用卡與付款設定 →"
      : locale === "zh-Hans"
        ? "信用卡与付款设置 →"
        : "Billing & Card →";

  const invoicesBtnLabel =
    locale === "zh-Hant"
      ? "帳單紀錄 Invoices →"
      : locale === "zh-Hans"
        ? "账单记录 Invoices →"
        : "Invoices & Receipts →";

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Sub-navigation */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{headerTitle}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{headerSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/billing"
            className="rounded-full border border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-2 text-xs font-bold text-foreground transition hover:border-[#c6f24b]"
          >
            {billingBtnLabel}
          </Link>
          <Link
            href="/app/invoices"
            className="rounded-full border border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-2 text-xs font-bold text-foreground transition hover:border-[#c6f24b]"
          >
            {invoicesBtnLabel}
          </Link>
        </div>
      </div>

      {checkoutSuccess ? (
        <p className="rounded-[1rem] border border-[var(--studio-line)] bg-lime/50 px-4 py-3 text-sm font-medium">
          {t("billing.checkoutSuccess")}
        </p>
      ) : null}

      {/* Top Plan & Remaining Bar Card */}
      <section className="rounded-[1.5rem] border border-[var(--studio-line)] bg-[var(--studio-panel)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--studio-line)] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {t("billing.currentPlanLabel")}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
              <p className="font-display text-lg font-bold">{planLabel}</p>
              {periodEnd ? (
                <span className="text-xs text-muted">
                  ·{" "}
                  {t("billing.periodEndsStandalone", {
                    date: periodEnd.toLocaleDateString(dateLocale),
                  })}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddCreditButton />
            <a
              href="#monthly-plans"
              className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--studio-line)] bg-[var(--studio-fill)] px-4 text-sm font-semibold text-foreground transition hover:border-[#c6f24b]"
            >
              {t("billing.seeCreditPlans")}
            </a>
          </div>
        </div>

        {/* Clean Remaining Progress Bar */}
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-sm font-bold text-foreground">
              {isEn
                ? `Remaining: ${remaining.toLocaleString()} / ${totalCapacity.toLocaleString()} credits (${percent}%)`
                : locale === "zh-Hans"
                  ? `剩余可用：${remaining.toLocaleString()} / ${totalCapacity.toLocaleString()} credits (${percent}%)`
                  : `剩餘可用：${remaining.toLocaleString()} / ${totalCapacity.toLocaleString()} credits (${percent}%)`}
            </span>
            <span className="text-muted">
              {isEn
                ? `Used: ${used.toLocaleString()} credits`
                : locale === "zh-Hans"
                  ? `已使用：${used.toLocaleString()} credits`
                  : `已使用：${used.toLocaleString()} credits`}
            </span>
          </div>
          <div
            className="h-3.5 overflow-hidden rounded-full bg-[var(--studio-fill)]"
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

      {/* Middle: One-Time Top-Up Packs ($10 to $1,000) */}
      <BuyCreditsSection subscribed={subscribed} />

      {/* Bottom: Subscribe to Monthly Plans (Horizontal Scrolling Strip with Seedream 5.0 Pro Art) */}
      <section id="monthly-plans" className="scroll-mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold">{t("billing.monthlyPlansTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("billing.monthlyPlansSubtitle")}</p>
          </div>
        </div>
        <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1">
          {!subscribed ? (
            <PayAsYouGoCard className="w-[290px] shrink-0 snap-start sm:w-[310px]" />
          ) : null}
          {plans.map((plan) => (
            <BillingPlanCard
              key={plan.id}
              plan={plan}
              className="w-[290px] shrink-0 snap-start sm:w-[310px]"
            />
          ))}
          <EnterpriseCta
            compact
            imageSrc="/pricing/enterprise-scro.png"
            className="w-[290px] shrink-0 snap-start sm:w-[310px]"
          />
        </div>
      </section>
    </div>
  );
}
