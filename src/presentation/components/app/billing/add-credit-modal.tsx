"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useEffect, useId, useState } from "react";
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

// Progress-bar trigger that opens the add-credit dialog.
export function AddCreditButton({ disabled = false }: { disabled?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={disabled ? t("billing.subscribeToTopUp") : undefined}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("billing.addCreditsHeading")}
      </button>
      {open ? <AddCreditModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Pack picker; submitting hands off to Stripe one-time checkout.
export function AddCreditModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const [packId, setPackId] = useState<PackId>(DEFAULT_PACK);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const packs = Object.values(CREDIT_PACKS);
  const bonusPercent = useAdhocBonusPercent();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await startPackCheckoutAction(packId);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    const pack = CREDIT_PACKS[packId];
    track("begin_checkout", {
      currency: "USD",
      value: pack.amountUsd,
      item_id: pack.id,
      item_name: localizedPackName(pack, locale),
    });
    window.location.href = result.url;
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-[var(--studio-line)] bg-[var(--studio-panel)] p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {t("billing.addCreditsHeading")}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {t("billing.addCreditsBlurb")}
        </p>
        {/* Same per-image / per-second rates as the billing page. */}
        <p className="mt-1 text-xs text-muted">{t("billing.clipCostNote")}</p>
        {bonusPercent > 0 ? (
          <p className="mt-1 text-xs font-semibold text-[#c6f24b]">
            {t("signupPromo.packBonus", { bonus: bonusPercent })}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <fieldset disabled={submitting} className="space-y-2">
            <legend className="mb-1.5 text-sm font-semibold">
              {t("billing.choosePack")}
            </legend>
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
                  name="packId"
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
                <span className="font-display text-lg font-bold">
                  ${pack.amountUsd}
                </span>
              </label>
            ))}
          </fieldset>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : null}
              {t("billing.continueCheckoutPack", {
                amount: CREDIT_PACKS[packId].amountUsd,
              })}
            </button>
          </div>
        </form>
      </div>
    </DialogBackdrop>
  );
}
