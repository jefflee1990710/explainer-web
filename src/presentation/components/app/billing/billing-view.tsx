"use client";

import Link from "next/link";
import type { PlanId } from "@/model/subscription";
import { PortalButton } from "@/presentation/components/app/billing/billing-actions";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { SavedPaymentCard } from "@/service/billing/customer-billing";

/**
 * Dedicated Billing & Payment Methods page (`/app/billing`):
 * Focused on credit cards, payment methods, and Stripe Billing Portal management.
 */
export function BillingView({
  checkoutSuccess,
  email,
  subscribed,
  activePlanId,
  subscriptionStatus,
  periodEnd,
  hasStripeCustomer,
  cards,
}: {
  checkoutSuccess: boolean;
  email: string;
  subscribed: boolean;
  activePlanId?: PlanId;
  subscriptionStatus?: string;
  periodEnd?: Date;
  hasStripeCustomer: boolean;
  cards: SavedPaymentCard[];
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const dateLocale =
    locale === "zh-Hant" ? "zh-TW" : locale === "zh-Hans" ? "zh-CN" : locale;

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
            {isEn ? "Billing & Payment Methods" : "信用卡與付款設定 Billing"}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            {isEn
              ? "Manage your saved credit cards, billing details, and active subscription renewal."
              : "管理你儲存嘅信用卡、付款方式同埋自動續訂設定。"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/usage"
            className="rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-xs font-bold text-foreground transition hover:border-accent-ink"
          >
            {isEn ? "← Usage & Top-up" : "← 用量與儲值 Usage"}
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

      {/* Saved Credit Cards & Payment Method Card */}
      <section className="rounded-[1.5rem] border-2 border-accent-ink bg-white p-6 shadow-[4px_4px_0_0_#12141c]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold">
              {isEn ? "Saved Credit Cards" : "已綁定信用卡與付款方式"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? "Cards are securely stored with Stripe. Click Manage Payment Methods to update or replace your card."
                : "信用卡資料由 Stripe 安全加密託管。點擊右側按鈕即可更換、新增或移除信用卡。"}
            </p>
          </div>
          {hasStripeCustomer ? (
            <PortalButton
              label={isEn ? "Manage Credit Cards in Stripe" : "管理信用卡與付款方式"}
            />
          ) : null}
        </div>

        <div className="mt-5">
          {cards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-accent-ink/15 bg-paper/75 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-14 place-items-center rounded-lg border border-accent-ink/15 bg-white font-mono text-xs font-extrabold text-foreground">
                      {card.brand}
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-foreground">
                        •••• •••• •••• {card.last4}
                      </p>
                      <p className="text-xs text-muted">
                        {isEn ? "Expires" : "到期日"} {String(card.expMonth).padStart(2, "0")}/
                        {card.expYear}
                      </p>
                    </div>
                  </div>
                  {card.isDefault ? (
                    <span className="rounded-full bg-lime px-2.5 py-0.5 text-[11px] font-bold text-accent-ink">
                      {isEn ? "Default" : "預設卡"}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-accent-ink/20 bg-paper/60 p-5">
              <div>
                <p className="text-sm font-bold text-foreground">
                  {isEn ? "No saved credit card yet" : "尚未儲存預設信用卡"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {isEn
                    ? "Your card will be saved automatically the first time you top up credits or subscribe."
                    : "當你首次儲值 Credits 或訂閱方案時，系統會透過 Stripe 安全記錄你嘅付款方式。"}
                </p>
              </div>
              <Link
                href="/app/usage"
                className="inline-flex min-h-[40px] items-center rounded-full bg-accent px-5 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c]"
              >
                {isEn ? "Top Up Credits →" : "前往儲值 Credits →"}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Account Billing Status & Subscription Management */}
      <section className="rounded-[1.5rem] border border-accent-ink/12 bg-paper/85 p-6 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)]">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {isEn ? "Billing Email" : "帳單通知電郵"}
            </p>
            <p className="mt-1 font-display text-base font-bold text-foreground">
              {email}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {t("billing.currentPlanLabel")}
            </p>
            <p className="mt-1 font-display text-base font-bold text-foreground">
              {planLabel}
            </p>
            {periodEnd ? (
              <p className="mt-1 text-xs text-muted">
                {t("billing.periodEndsStandalone", {
                  date: periodEnd.toLocaleDateString(dateLocale),
                })}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col justify-between gap-3">
            <p className="text-xs text-muted">
              {isEn
                ? "Need to top up credits, switch plans, or download past receipts?"
                : "需要加購 Credits、切換月費計劃或下載過往收據？"}
            </p>
            <div className="flex flex-wrap gap-2">
              {hasStripeCustomer ? (
                <PortalButton label={t("billing.billingPortal")} variant="ghost" />
              ) : null}
              <Link
                href="/app/usage"
                className="inline-flex min-h-[40px] items-center rounded-full border border-accent-ink/15 bg-white px-4 text-xs font-bold text-foreground transition hover:border-accent-ink"
              >
                {isEn ? "Go to Usage & Top-up" : "前往用量與儲值"}
              </Link>
              <Link
                href="/app/invoices"
                className="inline-flex min-h-[40px] items-center rounded-full border border-accent-ink/15 bg-white px-4 text-xs font-bold text-foreground transition hover:border-accent-ink"
              >
                {isEn ? "View Invoices" : "查看帳單紀錄"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
