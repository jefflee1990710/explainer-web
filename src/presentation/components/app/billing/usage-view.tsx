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
import { creditProgressUsd } from "@/service/billing/credit-balance";
import type { PlanDefinition } from "@/service/billing/plans";
import { addUsd, formatUsd, formatUsdRate, subUsd, toUsdUnits } from "@/service/billing/usd";
import {
  FRAME_COST_USD,
  TALKING_HEAD_COST_PER_SECOND_USD,
  VIDEO_COST_PER_SECOND_USD,
} from "@/service/credit-costs";

/**
 * Dedicated Usage & USD Credit page (`/app/usage`):
 * - Top section shows current plan and a clean remaining USD credit progress bar.
 * - Middle section renders One-Time USD Credit Top-up packs ($10–$1,000) localized by selected language.
 * - Bottom section renders Monthly Subscription plans in a horizontal scrolling strip with Seedream 5.0 Pro artwork.
 */
export function UsageView({
  checkoutSuccess,
  creditUsd,
  creditLimitUsd,
  monthlyCreditUsd,
  bonusCreditUsd,
  periodEnd,
  subscribed,
  activePlanId,
  subscriptionStatus,
  plans,
  purchase,
}: {
  checkoutSuccess: boolean;
  creditUsd: number;
  creditLimitUsd: number;
  monthlyCreditUsd: number;
  bonusCreditUsd: number;
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

  const combinedCapacity = addUsd(monthlyCreditUsd, bonusCreditUsd);
  const totalCapacity = Math.max(creditLimitUsd, combinedCapacity, creditUsd);
  const { remaining, ratio } = creditProgressUsd(creditUsd, totalCapacity);
  const percent = Math.round(ratio * 100);
  const used = Math.max(0, subUsd(totalCapacity, remaining));
  const hasBonus = toUsdUnits(bonusCreditUsd) > 0;
  const hasMonthly = toUsdUnits(monthlyCreditUsd) > 0;

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
        : "Usage & USD Credit";

  const headerSubtitle =
    locale === "zh-Hant"
      ? "查看你的剩餘 USD Credit 餘額，並在下方隨時單次加值（永久保留）或訂閱每月重置方案。"
      : locale === "zh-Hans"
        ? "查看你的剩余 USD Credit 余额，并在下方随时单次充值（永久保留）或订阅每月重置方案。"
        : "View your remaining USD Credit balance, buy never-expiring top-up packs, or subscribe to a monthly refill plan below.";

  const rateNote =
    locale === "zh-Hant"
      ? `每張 2K 圖片／畫格／海報 ${formatUsd(FRAME_COST_USD)}；標準影片 ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)}；對嘴口播影片 ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)}（已含語音）。月費方案每月重置補滿至方案金額，單次加值永久保留。`
      : locale === "zh-Hans"
        ? `每张 2K 图片／画格／海报 ${formatUsd(FRAME_COST_USD)}；标准影片 ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)}；对嘴口播影片 ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)}（已含语音）。月费方案每月重置补满至方案金额，单次充值永久保留。`
        : `${formatUsd(FRAME_COST_USD)} per 2K image/frame/poster · ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)} standard video · ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)} talking-head video (voice included). Monthly plans refill each cycle; one-time top-ups never expire.`;

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
                ? `Remaining: ${formatUsd(remaining)} / ${formatUsd(totalCapacity)} USD Credit (${percent}%)`
                : locale === "zh-Hans"
                  ? `剩余可用：${formatUsd(remaining)} / ${formatUsd(totalCapacity)} USD Credit (${percent}%)`
                  : `剩餘可用：${formatUsd(remaining)} / ${formatUsd(totalCapacity)} USD Credit (${percent}%)`}
            </span>
            <span className="text-muted">
              {isEn
                ? `Used: ${formatUsd(used)}`
                : locale === "zh-Hans"
                  ? `已使用：${formatUsd(used)}`
                  : `已使用：${formatUsd(used)}`}
            </span>
          </div>
          <div
            className="h-3.5 overflow-hidden rounded-full bg-[var(--studio-fill)]"
            role="progressbar"
            aria-label={t("billing.remainingAria")}
            aria-valuemin={0}
            aria-valuemax={toUsdUnits(totalCapacity)}
            aria-valuenow={toUsdUnits(remaining)}
          >
            <div
              className="h-full rounded-full bg-[var(--studio-teal)] transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          {hasMonthly || hasBonus ? (
            <p className="mt-2.5 text-xs font-medium text-foreground/80">
              {isEn
                ? `${hasMonthly ? `Monthly refill: ${formatUsd(monthlyCreditUsd)}/mo` : ""}${hasMonthly && hasBonus ? " · " : ""}${hasBonus ? `Permanent top-up balance: ${formatUsd(bonusCreditUsd)}` : ""}`
                : locale === "zh-Hans"
                  ? `${hasMonthly ? `每月重置额度：${formatUsd(monthlyCreditUsd)}/月` : ""}${hasMonthly && hasBonus ? " · " : ""}${hasBonus ? `单次充值永久余额：${formatUsd(bonusCreditUsd)}` : ""}`
                  : `${hasMonthly ? `每月重置額度：${formatUsd(monthlyCreditUsd)}/月` : ""}${hasMonthly && hasBonus ? " · " : ""}${hasBonus ? `單次加值永久餘額：${formatUsd(bonusCreditUsd)}` : ""}`}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted">{rateNote}</p>
        </div>
      </section>

      {/* Middle: One-Time Top-Up Packs ($10 to $1,000) */}
      <BuyCreditsSection />

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
