"use client";

import { useEffect, useId, useState } from "react";
import {
  getCreditSnapshotAction,
  startCheckoutAction,
  startPackCheckoutAction,
} from "@/presentation/actions/billing";
import { track } from "@/presentation/components/analytics/track";
import {
  notifyCreditsChanged,
  type CreditsChangedDetail,
} from "@/presentation/components/app/billing/credits-changed";
import {
  openCheckoutPopup,
  waitForCheckoutPopup,
} from "@/presentation/components/app/billing/checkout-popup";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { creditGrantLanded } from "@/service/billing/credit-gate";
import { CREDIT_PACKS } from "@/service/billing/packs";
import { PLANS } from "@/service/billing/plans";
import type { PackId } from "@/model/billing-settings";
import type { PlanId } from "@/model/subscription";

const POLL_MS = 1_500;
const POLL_TRIES = 20;

async function waitForGrant(previous: CreditsChangedDetail) {
  for (let i = 0; i < POLL_TRIES; i++) {
    const snap = await getCreditSnapshotAction();
    if (snap.ok && creditGrantLanded(previous, snap)) return snap;
    await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
  }
  return getCreditSnapshotAction();
}

// Overlay when a paid generate cannot run. Checkout stays in a popup so the
// current page (and the pending action) never unmount.
export function InsufficientCreditsDialog({
  needed,
  subscribed,
  onClose,
  onPaid,
}: {
  needed: number;
  subscribed: boolean;
  onClose: () => void;
  onPaid: (snapshot: CreditsChangedDetail) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [planId, setPlanId] = useState<PlanId>("studio");
  const [packId, setPackId] = useState<PackId>("pack90");
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || waiting) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, waiting]);

  async function finishPaid(previous: CreditsChangedDetail) {
    const snap = await waitForGrant(previous);
    if (!snap.ok) {
      setError(snap.error);
      return;
    }
    notifyCreditsChanged(snap);
    if (!creditGrantLanded(previous, snap) && snap.credits < needed) {
      setError(t("billing.checkoutPending"));
      return;
    }
    onPaid(snap);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWaiting(true);
    setError("");
    const previous = await getCreditSnapshotAction();
    const started = subscribed
      ? await startPackCheckoutAction(packId, { popup: true })
      : await startCheckoutAction(planId, { popup: true });
    if (!started.ok) {
      setWaiting(false);
      setError(started.error);
      return;
    }
    if (subscribed) {
      const pack = CREDIT_PACKS[packId];
      track("begin_checkout", {
        currency: "USD",
        value: pack.amountUsd,
        item_id: pack.id,
        item_name: pack.nameZh,
      });
    } else {
      const plan = PLANS[planId];
      track("begin_checkout", {
        currency: "USD",
        value: plan.amountUsd,
        item_id: plan.id,
        item_name: plan.name,
      });
    }
    const popup = openCheckoutPopup(started.url);
    if (!popup) {
      setWaiting(false);
      setError(t("billing.popupBlocked"));
      return;
    }
    const status = await waitForCheckoutPopup(popup);
    if (status === "cancel") {
      setWaiting(false);
      return;
    }
    if (status === "closed") {
      const snap = await getCreditSnapshotAction();
      if (snap.ok && previous.ok && creditGrantLanded(previous, snap)) {
        notifyCreditsChanged(snap);
        onPaid(snap);
      }
      setWaiting(false);
      return;
    }
    if (previous.ok) await finishPaid(previous);
    else {
      const snap = await getCreditSnapshotAction();
      if (snap.ok) {
        notifyCreditsChanged(snap);
        onPaid(snap);
      }
    }
    setWaiting(false);
  }

  const plans = Object.values(PLANS);
  const packs = Object.values(CREDIT_PACKS);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={(event) => {
        event.stopPropagation();
        if (!waiting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-xl font-bold">
          {subscribed ? t("billing.topUpTitle") : t("billing.subscribeTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {subscribed
            ? t("billing.topUpBody", { credits: needed })
            : t("billing.subscribeBody", { credits: needed })}
        </p>
        <p className="mt-1 text-xs text-muted">{t("billing.clipCostNote")}</p>
        <form onSubmit={(event) => void onSubmit(event)} className="mt-5 space-y-4">
          {subscribed ? (
            <fieldset disabled={waiting} className="space-y-2">
              <legend className="mb-1.5 text-sm font-semibold">{t("billing.choosePack")}</legend>
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
                    name="packId"
                    value={pack.id}
                    checked={packId === pack.id}
                    onChange={() => setPackId(pack.id)}
                    className="h-4 w-4 accent-accent"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">
                      {pack.nameZh} · {pack.credits} credits
                    </span>
                  </span>
                  <span className="font-display text-lg font-bold">${pack.amountUsd}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <fieldset disabled={waiting} className="space-y-2">
              <legend className="mb-1.5 text-sm font-semibold">{t("billing.choosePlan")}</legend>
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-[1.25rem] border px-4 py-3 transition ${
                    planId === plan.id
                      ? "border-accent-ink bg-lime/40"
                      : "border-accent-ink/15 bg-paper hover:border-accent-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="planId"
                    value={plan.id}
                    checked={planId === plan.id}
                    onChange={() => setPlanId(plan.id)}
                    className="h-4 w-4 accent-accent"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">
                      {t(`plans.${plan.id}.name`)} · {plan.monthlyCredits} credits
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {t(`plans.${plan.id}.blurb`)}
                    </span>
                  </span>
                  <span className="font-display text-lg font-bold">
                    ${plan.amountUsd}
                    <span className="text-xs font-medium text-muted">{t("common.perMonth")}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {waiting ? (
            <p className="text-sm text-muted">{t("billing.waitingCheckout")}</p>
          ) : null}
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={waiting}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
            >
              {t("billing.videoUpgradeDismiss")}
            </button>
            <button
              type="submit"
              disabled={waiting}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {waiting ? <Spinner className="h-4 w-4" /> : null}
              {subscribed ? t("billing.payPack") : t("billing.subscribeCta")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
