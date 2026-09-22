"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { BUY_RATES, CONSUME_RATES, maxStackPct } from "@/service/affiliate/rates";
import { requestPayoutAction } from "@/presentation/actions/affiliate";
import { AffiliateWalletCard } from "@/presentation/components/app/affiliate/affiliate-wallet-card";

type DownlineRow = {
  id: string;
  email: string;
  name: string;
  tier: 1 | 2 | 3;
  boughtUsd: string;
  consumedCredits: number;
  earnedUsd: string;
};

export function AffiliateView({
  code,
  link,
  pendingUsd,
  paidUsd,
  thisMonthUsd,
  canPayout,
  payoutPending,
  pendingCents,
  downline,
}: {
  code: string;
  link: string;
  pendingUsd: string;
  paidUsd: string;
  thisMonthUsd: string;
  canPayout: boolean;
  payoutPending: boolean;
  pendingCents: number;
  downline: DownlineRow[];
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [payoutDone, setPayoutDone] = useState(payoutPending);

  async function copy(kind: "code" | "link", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  function requestPayout() {
    setError(null);
    startTransition(async () => {
      const result = await requestPayoutAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPayoutDone(true);
    });
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("affiliate.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("affiliate.subtitle")}</p>

      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <h2 className="font-display text-lg font-bold">{t("affiliate.codeTitle")}</h2>
        <p className="mt-3 font-mono text-2xl font-bold tracking-widest">{code}</p>
        <p className="mt-2 break-all text-sm text-muted">{link}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy("code", code)}
            className="rounded-full bg-accent-ink px-4 py-2 text-sm font-semibold text-lime"
          >
            {copied === "code" ? t("affiliate.copied") : t("affiliate.copyCode")}
          </button>
          <button
            type="button"
            onClick={() => copy("link", link)}
            className="rounded-full border border-accent-ink/15 px-4 py-2 text-sm font-semibold"
          >
            {copied === "link" ? t("affiliate.copied") : t("affiliate.copyLink")}
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <AffiliateWalletCard label={t("affiliate.pending", { amount: pendingUsd })} />
        <AffiliateWalletCard label={t("affiliate.paid", { amount: paidUsd })} />
        <AffiliateWalletCard label={t("affiliate.thisMonth", { amount: thisMonthUsd })} />
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6">
        <h2 className="font-display text-lg font-bold">{t("affiliate.ratesTitle")}</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {([1, 2, 3] as const).map((level) => (
            <li key={level}>
              {t("affiliate.rateBuy", {
                level: String(level),
                pct: String(BUY_RATES[level] * 100),
              })}
              {" · "}
              {t("affiliate.rateConsume", {
                level: String(level),
                pct: String(CONSUME_RATES[level] * 100),
              })}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-medium">
          {t("affiliate.rateTotal", { pct: String(maxStackPct()) })}
        </p>
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6">
        <h2 className="font-display text-lg font-bold">{t("affiliate.downlineTitle")}</h2>
        {downline.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("affiliate.downlineEmpty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2 font-medium">{t("affiliate.colUser")}</th>
                  <th className="pb-2 font-medium">Tier</th>
                  <th className="pb-2 font-medium">{t("affiliate.colBought")}</th>
                  <th className="pb-2 font-medium">{t("affiliate.colConsumed")}</th>
                  <th className="pb-2 font-medium">{t("affiliate.colEarned")}</th>
                </tr>
              </thead>
              <tbody>
                {downline.map((row) => (
                  <tr key={row.id} className="border-t border-accent-ink/10">
                    <td className="py-2">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted">{row.email}</div>
                    </td>
                    <td className="py-2">L{row.tier}</td>
                    <td className="py-2">{row.boughtUsd}</td>
                    <td className="py-2">{row.consumedCredits}</td>
                    <td className="py-2 font-semibold">{row.earnedUsd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6">
        <h2 className="font-display text-lg font-bold">{t("affiliate.payoutTitle")}</h2>
        <p className="mt-2 text-sm text-muted">{t("affiliate.payoutHint")}</p>
        {payoutDone ? (
          <p className="mt-4 text-sm font-medium text-accent-ink">
            {t("affiliate.payoutPending")}
          </p>
        ) : (
          <>
            {!canPayout ? (
              <p className="mt-3 text-sm text-muted">
                {t("affiliate.payoutMin", {
                  amount: `$${(pendingCents / 100).toFixed(2)}`,
                })}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canPayout || pending}
              onClick={requestPayout}
              className="mt-4 rounded-full bg-accent-ink px-4 py-2 text-sm font-semibold text-lime disabled:opacity-40"
            >
              {pending ? t("common.loading") : t("affiliate.payoutRequest")}
            </button>
          </>
        )}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
