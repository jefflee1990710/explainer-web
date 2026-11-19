"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

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
import { useAdhocBonusPercent } from "@/presentation/components/adhoc-bonus";
import { packCreditUsdWithBonus } from "@/service/billing/promo";
import { formatUsd, formatUsdRate, toUsdUnits } from "@/service/billing/usd";
import {
  FRAME_COST_USD,
  TALKING_HEAD_COST_PER_SECOND_USD,
  VIDEO_COST_PER_SECOND_USD,
} from "@/service/credit-costs";
import {
  CREDIT_PACKS,
  localizedPackBlurb,
  localizedPackName,
} from "@/service/billing/packs";
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
  const { t, locale } = useI18n();
  const bonusPercent = useAdhocBonusPercent();
  const titleId = useId();
  const [currentPlanId, setCurrentPlanId] = useState<PlanId | null>(null);
  const [planLoading, setPlanLoading] = useState(subscribed);
  const [offer, setOffer] = useState<Offer>({ kind: "pack", id: "pack50" });
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    track("ux_blocker_insufficient_credits", {
      needed_credits: needed,
      subscribed,
    });
  }, [needed, subscribed]);

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
    let cancelled = false;
    void getCreditSnapshotAction()
      .then((snap) => {
        if (cancelled) return;
        if (snap.ok && snap.planId && isPlanId(snap.planId)) setCurrentPlanId(snap.planId);
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subscribed]);

  async function finishPaid(previous: CreditsChangedDetail) {
    const snap = await waitForGrant(previous);
    if (!snap.ok) {
      setError(snap.error);
      return;
    }
    notifyCreditsChanged(snap);
    if (!creditGrantLanded(previous, snap) && toUsdUnits(snap.creditUsd) < toUsdUnits(needed)) {
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
        item_name: localizedPackName(pack, locale),
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
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
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
          {locale === "en"
            ? subscribed
              ? `This action requires ${formatUsd(needed)} USD Credit. Top up or upgrade to continue automatically.`
              : `This action requires ${formatUsd(needed)} USD Credit. Top up or subscribe to continue automatically.`
            : locale === "zh-Hans"
              ? subscribed
                ? `这次需要 ${formatUsd(needed)} USD Credit。充值或升级方案后会自动继续生成。`
                : `这次需要 ${formatUsd(needed)} USD Credit。充值或订阅方案后会自动继续生成。`
              : subscribed
                ? `這次需要 ${formatUsd(needed)} USD Credit。加值或升級方案後會自動繼續產生。`
                : `這次需要 ${formatUsd(needed)} USD Credit。加值或訂閱方案後會自動繼續產生。`}
        </p>
        <p className="mt-1 text-xs text-muted">
          {locale === "en"
            ? `${formatUsd(FRAME_COST_USD)}/image · ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)} video · ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)} talking-head (voice included).`
            : locale === "zh-Hans"
              ? `图片 ${formatUsd(FRAME_COST_USD)}/张 · 标准影片 ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)} · 口播影片 ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)}（含语音）。`
              : `圖片 ${formatUsd(FRAME_COST_USD)}/張 · 標準影片 ${formatUsdRate(VIDEO_COST_PER_SECOND_USD)} · 口播影片 ${formatUsdRate(TALKING_HEAD_COST_PER_SECOND_USD)}（含語音）。`}
        </p>
        {bonusPercent > 0 ? (
          <p className="mt-1 text-xs font-semibold text-[#3d4a12]">
            {t("signupPromo.packBonus", { bonus: bonusPercent })}
          </p>
        ) : null}
        <form onSubmit={(event) => void onSubmit(event)} className="mt-5 space-y-5">
          <CreditOfferCards
            legend={t("billing.choosePack")}
            name="packId"
            value={offer.kind === "pack" ? offer.id : null}
            disabled={waiting}
            onChange={(id) => setOffer({ kind: "pack", id })}
            items={Object.values(CREDIT_PACKS).map((pack) => ({
              id: pack.id,
              title: `${localizedPackName(pack, locale)} · ${formatUsd(packCreditUsdWithBonus(pack.creditUsd, bonusPercent))} USD Credit`,
              blurb: localizedPackBlurb(pack, locale),
              price: `$${pack.amountUsd.toLocaleString("en-US")}`,
            }))}
          />
          {subscribed && planLoading ? (
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-semibold">{t("billing.chooseUpgrade")}</legend>
              <p className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted">
                <Spinner />
                {t("common.loading")}
              </p>
            </fieldset>
          ) : upgrades.length > 0 ? (
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
                  title: `${t(`plans.${plan.id}.name`)} · ${formatUsd(plan.monthlyCreditUsd)} USD Credit`,
                  blurb: t(`plans.${plan.id}.blurb`),
                  price: formatUsd(plan.amountUsd),
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
    </DialogBackdrop>
  );
}
