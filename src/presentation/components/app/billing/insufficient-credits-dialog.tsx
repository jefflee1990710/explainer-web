"use client";

import { useEffect, useId, useState } from "react";
import {
  getCreditSnapshotAction,
  startCheckoutAction,
  startPackCheckoutAction,
  startPlanUpgradeAction,
} from "@/presentation/actions/billing";
import { track } from "@/presentation/components/analytics/track";
import { CreditOfferCards } from "@/presentation/components/app/billing/credit-offer-cards";
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
import { isPlanId, PLANS, upgradeablePlans } from "@/service/billing/plans";
import type { PackId } from "@/model/billing-settings";
import type { PlanId } from "@/model/subscription";

const POLL_MS = 1_500;
const POLL_TRIES = 20;

type Offer = { kind: "pack"; id: PackId } | { kind: "plan"; id: PlanId };

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
  const [currentPlanId, setCurrentPlanId] = useState<PlanId | null>(null);
  const [offer, setOffer] = useState<Offer>(
    subscribed ? { kind: "pack", id: "pack90" } : { kind: "plan", id: "studio" },
  );
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

  useEffect(() => {
    if (!subscribed) return;
    void getCreditSnapshotAction().then((snap) => {
      if (snap.ok && snap.planId && isPlanId(snap.planId)) setCurrentPlanId(snap.planId);
    });
  }, [subscribed]);

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

  async function startOffer() {
    if (offer.kind === "pack") {
      return startPackCheckoutAction(offer.id, { popup: true });
    }
    if (subscribed) return startPlanUpgradeAction(offer.id, { popup: true });
    return startCheckoutAction(offer.id, { popup: true });
  }

  function trackOffer() {
    if (offer.kind === "pack") {
      const pack = CREDIT_PACKS[offer.id];
      track("begin_checkout", {
        currency: "USD",
        value: pack.amountUsd,
        item_id: pack.id,
        item_name: pack.nameZh,
      });
      return;
    }
    const plan = PLANS[offer.id];
    track("begin_checkout", {
      currency: "USD",
      value: plan.amountUsd,
      item_id: plan.id,
      item_name: plan.name,
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWaiting(true);
    setError("");
    const previous = await getCreditSnapshotAction();
    const started = await startOffer();
    if (!started.ok) {
      setWaiting(false);
      setError(started.error);
      return;
    }
    trackOffer();
    if (!started.url) {
      if (previous.ok) await finishPaid(previous);
      else {
        const snap = await getCreditSnapshotAction();
        if (snap.ok) {
          notifyCreditsChanged(snap);
          onPaid(snap);
        }
      }
      setWaiting(false);
      return;
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

  // Wait for the current plan so we do not flash Starter/Pro as upgrades.
  const upgrades = subscribed
    ? currentPlanId
      ? upgradeablePlans(currentPlanId)
      : []
    : Object.values(PLANS);
  const cta =
    offer.kind === "pack"
      ? t("billing.payPack")
      : subscribed
        ? t("billing.upgradeCta")
        : t("billing.subscribeCta");

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
        <form onSubmit={(event) => void onSubmit(event)} className="mt-5 space-y-5">
          {subscribed ? (
            <CreditOfferCards
              legend={t("billing.choosePack")}
              name="packId"
              value={offer.kind === "pack" ? offer.id : null}
              disabled={waiting}
              onChange={(id) => setOffer({ kind: "pack", id })}
              items={Object.values(CREDIT_PACKS).map((pack) => ({
                id: pack.id,
                title: `${pack.nameZh} · ${pack.credits} credits`,
                price: `$${pack.amountUsd}`,
              }))}
            />
          ) : null}
          {upgrades.length > 0 ? (
            <div className="space-y-2">
              {subscribed && currentPlanId ? (
                <p className="text-xs text-muted">
                  {t("billing.currentPlanNote", { plan: t(`plans.${currentPlanId}.name`) })}
                </p>
              ) : null}
              <CreditOfferCards
                legend={subscribed ? t("billing.chooseUpgrade") : t("billing.choosePlan")}
                name="planId"
                value={offer.kind === "plan" ? offer.id : null}
                disabled={waiting}
                onChange={(id) => setOffer({ kind: "plan", id })}
                items={upgrades.map((plan) => ({
                  id: plan.id,
                  title: `${t(`plans.${plan.id}.name`)} · ${plan.monthlyCredits} credits`,
                  blurb: t(`plans.${plan.id}.blurb`),
                  price: `$${plan.amountUsd}`,
                  priceHint: t("common.perMonth"),
                }))}
              />
            </div>
          ) : null}
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
              {cta}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
