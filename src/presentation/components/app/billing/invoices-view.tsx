"use client";

import Link from "next/link";
import { PortalButton } from "@/presentation/components/app/billing/billing-actions";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { CustomerInvoiceRecord } from "@/service/billing/customer-billing";

/**
 * Dedicated Invoices & Payment History page (`/app/invoices`):
 * Shows total amount paid by the user and every invoice / one-time top-up record with receipt/PDF links.
 */
export function InvoicesView({
  records,
  totalPaidUsd,
  hasStripeCustomer,
}: {
  records: CustomerInvoiceRecord[];
  totalPaidUsd: number;
  hasStripeCustomer: boolean;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const dateLocale =
    locale === "zh-Hant" ? "zh-TW" : locale === "zh-Hans" ? "zh-CN" : locale;

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Sub-navigation */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {isEn ? "Invoices & Payment History" : "帳單與付款紀錄 Invoices"}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            {isEn
              ? "View all your payments, one-time credit top-ups, and downloadable invoices."
              : "查看你所有已付款嘅儲值與訂閱金額總計，並下載每一張 Invoice 收據。"}
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
            href="/app/billing"
            className="rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-xs font-bold text-foreground transition hover:border-accent-ink"
          >
            {isEn ? "Billing & Card →" : "信用卡與付款設定 →"}
          </Link>
        </div>
      </div>

      {/* Summary Bar */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border-2 border-accent-ink bg-white p-5 shadow-[4px_4px_0_0_#12141c]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {isEn ? "Total Paid" : "累計已付總額"}
          </p>
          <p className="mt-1.5 font-display text-3xl font-bold text-foreground">
            ${totalPaidUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
            <span className="text-sm font-semibold text-muted">USD</span>
          </p>
        </div>

        <div className="rounded-2xl border border-accent-ink/12 bg-paper/85 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {isEn ? "Total Transactions" : "交易與帳單筆數"}
          </p>
          <p className="mt-1.5 font-display text-3xl font-bold text-foreground">
            {records.length}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-accent-ink/12 bg-paper/85 p-5">
          <p className="text-xs font-semibold text-muted">
            {isEn ? "Stripe Official Receipts" : "Stripe 官方收據與發票"}
          </p>
          <div className="mt-2">
            {hasStripeCustomer ? (
              <PortalButton
                label={isEn ? "Open Stripe Invoice Portal" : "開啟 Stripe 發票中心"}
                variant="ghost"
              />
            ) : (
              <span className="text-xs text-muted">
                {isEn ? "Available after first payment" : "完成首次付款後即可開啟"}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Invoices Table */}
      <section className="overflow-hidden rounded-[1.5rem] border-2 border-accent-ink bg-white shadow-[4px_4px_0_0_#12141c]">
        {records.length === 0 ? (
          <div className="grid min-h-[14rem] place-items-center p-8 text-center">
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground">
                {isEn ? "No invoices or payments yet" : "尚無任何付款與 Invoice 紀錄"}
              </p>
              <p className="text-xs text-muted">
                {isEn
                  ? "When you top up credits or subscribe to a plan, your invoices and receipts will appear here."
                  : "當你儲值 Credits 或訂閱方案後，所有付款金額與可下載收據都會顯示喺呢度。"}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-accent-ink/10 bg-paper/80 text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3.5">{isEn ? "Date" : "日期"}</th>
                  <th className="px-5 py-3.5">{isEn ? "Description" : "項目說明"}</th>
                  <th className="px-5 py-3.5">{isEn ? "Type" : "類型"}</th>
                  <th className="px-5 py-3.5">{isEn ? "Status" : "狀態"}</th>
                  <th className="px-5 py-3.5 text-right">{isEn ? "Amount" : "金額"}</th>
                  <th className="px-5 py-3.5 text-right">{isEn ? "Invoice / Receipt" : "收據 / PDF"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent-ink/10">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-paper/40">
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-muted">
                      {new Date(rec.createdAt).toLocaleDateString(dateLocale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      <div>{rec.description}</div>
                      {rec.invoiceNumber ? (
                        <div className="font-mono text-[11px] font-normal text-muted">
                          #{rec.invoiceNumber}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                      <span className="rounded-full border border-accent-ink/15 bg-paper px-2.5 py-0.5 font-semibold">
                        {rec.kind === "topup"
                          ? isEn
                            ? "Top-up"
                            : "單次儲值"
                          : isEn
                            ? "Subscription"
                            : "月費訂閱"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-bold ${
                          rec.status === "paid"
                            ? "bg-lime/60 text-accent-ink"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {rec.status === "paid"
                          ? isEn
                            ? "Paid"
                            : "已付款"
                          : rec.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-display font-bold text-foreground">
                      ${rec.amountPaidUsd.toFixed(2)} {rec.currency}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs">
                      <div className="inline-flex items-center gap-2">
                        {rec.hostedUrl ? (
                          <a
                            href={rec.hostedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-accent-ink underline hover:text-accent"
                          >
                            {isEn ? "View" : "查看收據"}
                          </a>
                        ) : null}
                        {rec.pdfUrl ? (
                          <a
                            href={rec.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-accent-ink/20 px-2.5 py-1 font-bold text-foreground hover:border-accent-ink"
                          >
                            PDF
                          </a>
                        ) : null}
                        {!rec.hostedUrl && !rec.pdfUrl ? (
                          <span className="text-muted">✓</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
