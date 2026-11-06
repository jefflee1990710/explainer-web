"use client";

import { useState } from "react";
import { startPackCheckoutAction } from "@/presentation/actions/billing";
import { track } from "@/presentation/components/analytics/track";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useAdhocBonusPercent } from "@/presentation/components/adhoc-bonus";
import { packCreditsWithBonus } from "@/service/billing/promo";
import {
  CREDIT_PACKS,
  localizedPackBlurb,
  localizedPackName,
} from "@/service/billing/packs";
import { Spinner } from "@/presentation/components/spinner";
import type { PackId } from "@/model/billing-settings";

const DEFAULT_PACK: PackId = "pack50";

/** Inline one-time credit pack picker (available to all accounts, with or without a subscription). */
export function BuyCreditsSection(_?: { subscribed?: boolean }) {
  const { t, locale } = useI18n();
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
      item_name: localizedPackName(selected, locale),
    });
    window.location.href = result.url;
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-bold">{t("billing.buyCreditsTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("billing.buyCreditsSubtitle")}</p>

      <div className="mt-4 rounded-[1.5rem] border border-[var(--studio-line)] bg-[var(--studio-panel)] p-6">
        <p className="text-sm font-semibold">{t("billing.addCreditsHeading")}</p>
        <p className="mt-1 text-sm text-muted">{t("billing.addCreditsBlurb")}</p>

        <fieldset disabled={submitting} className="mt-4 space-y-2">
          <legend className="sr-only">{t("billing.choosePack")}</legend>
          {packs.map((pack) => (
            <label
              key={pack.id}
              className={`flex cursor-pointer items-center gap-3 rounded-[1.25rem] border px-4 py-3 transition ${
                packId === pack.id
                  ? "border-[#c6f24b] bg-[var(--studio-cyan-soft)]"
                  : "border-[var(--studio-line)] bg-[var(--studio-fill)]/60 hover:border-[#c6f24b]/40"
              }`}
            >
              <input
                type="radio"
                name="billingPackId"
                value={pack.id}
                checked={packId === pack.id}
                onChange={() => setPackId(pack.id)}
                className="h-4 w-4 accent-[#c6f24b]"
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold">
                  {localizedPackName(pack, locale)} ·{" "}
                  {packCreditsWithBonus(pack.credits, bonusPercent).toLocaleString()} credits
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {localizedPackBlurb(pack, locale)}
                </span>
              </span>
              <span className="font-display text-lg font-bold">${pack.amountUsd}</span>
            </label>
          ))}
        </fieldset>

        {bonusPercent > 0 ? (
          <p className="mt-2 text-xs font-semibold text-[#c6f24b]">
            {t("signupPromo.packBonus", { bonus: bonusPercent })}
          </p>
        ) : null}

        {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}

        <button
          type="button"
          disabled={submitting}
          onClick={() => void onCheckout()}
          className="mt-5 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? <Spinner className="h-4 w-4" /> : null}
          {t("billing.continueCheckoutPack", { amount: selected.amountUsd })}
        </button>
      </div>
    </section>
  );
}
