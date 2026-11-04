"use client";

import { useState } from "react";
import { startPackCheckoutAction } from "@/presentation/actions/billing";
import { track } from "@/presentation/components/analytics/track";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useAdhocBonusPercent } from "@/presentation/components/adhoc-bonus";
import { packCreditsWithBonus } from "@/service/billing/promo";
import { CREDIT_PACKS } from "@/service/billing/packs";
import { Spinner } from "@/presentation/components/spinner";
import type { PackId } from "@/model/billing-settings";

const DEFAULT_PACK: PackId = "pack50";

/** Inline one-time credit pack picker (available to all accounts, with or without a subscription). */
export function BuyCreditsSection(_?: { subscribed?: boolean }) {
  const { t } = useI18n();
  const [packId, setPackId] = useState<PackId>(DEFAULT_PACK);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const packs = Object.values(CREDIT_PACKS);
  const bonusPercent = useAdhocBonusPercent();
  const selected = CREDIT_PACKS[packId];

  async function onCheckout() {
    setSubmitting(true);
    setError("");
    const result = await startPackCheckoutAction(packId);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    track("begin_checkout", {
      currency: "USD",
      value: selected.amountUsd,
      item_id: selected.id,
      item_name: selected.nameZh,
    });
    window.location.href = result.url;
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-bold">{t("billing.buyCreditsTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("billing.buyCreditsSubtitle")}</p>

      <div className="mt-4 rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <p className="text-sm font-semibold">{t("billing.addCreditsHeading")}</p>
        <p className="mt-1 text-sm text-muted">{t("billing.addCreditsBlurb")}</p>

        <fieldset disabled={submitting} className="mt-4 space-y-2">
          <legend className="sr-only">{t("billing.choosePack")}</legend>
          {packs.map((pack) => (
            <label
              key={pack.id}
              className={`flex cursor-pointer items-center gap-3 rounded-[1.25rem] border px-4 py-3 transition ${
                packId === pack.id
                  ? "border-accent-ink bg-lime/40"
                  : "border-accent-ink/15 bg-paper hover:border-accent-ink/30"
              }`}
            >
              <input
                type="radio"
                name="billingPackId"
                value={pack.id}
                checked={packId === pack.id}
                onChange={() => setPackId(pack.id)}
                className="h-4 w-4 accent-accent"
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold">
                  {pack.nameZh} · {packCreditsWithBonus(pack.credits, bonusPercent).toLocaleString()} credits
                </span>
                <span className="mt-0.5 block text-xs text-muted">{pack.blurb}</span>
              </span>
              <span className="font-display text-lg font-bold">${pack.amountUsd}</span>
            </label>
          ))}
        </fieldset>

        {bonusPercent > 0 ? (
          <p className="mt-2 text-xs font-semibold text-[#3d4a12]">
            {t("signupPromo.packBonus", { bonus: bonusPercent })}
          </p>
        ) : null}

        {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}

        <button
          type="button"
          disabled={submitting}
          onClick={() => void onCheckout()}
          className="mt-5 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? <Spinner className="h-4 w-4" /> : null}
          {t("billing.continueCheckoutPack", { amount: selected.amountUsd })}
        </button>
      </div>
    </section>
  );
}
