import { apiError, apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import {
  startCheckoutAction,
  startPackCheckoutAction,
  startPlanUpgradeAction,
  startPortalAction,
} from "@/service/billing/actions";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import {
  getActiveSubscription,
  isSubscriptionActive,
  resolveSubscriptionMonthlyUsd,
} from "@/service/billing/credits";
import { CREDIT_PACKS, isPackId } from "@/service/billing/packs";
import { isPlanId, PLANS, upgradeablePlans } from "@/service/billing/plans";
import { adhocBonusPercent, packCreditUsdWithBonus } from "@/service/billing/promo";
import { publicSubscription } from "@/presentation/serialize";

// Wallet + plan catalog for the billing page.
export const GET = withApiUser(async ({ auth }) => {
  const { user } = auth;
  const balance = resolveUserUsdBalance(user);
  const sub = await getActiveSubscription(user.clerkUserId);
  const active = isSubscriptionActive(sub);
  const activePlanId = active && sub ? sub.planId : null;
  const bonusPercent = adhocBonusPercent();
  return apiJson({
    creditUsd: balance.creditUsd,
    creditLimitUsd: balance.creditLimitUsd,
    bonusCreditUsd: balance.bonusCreditUsd,
    monthlyCreditUsd: sub ? resolveSubscriptionMonthlyUsd(sub) : 0,
    subscribed: active,
    activePlanId,
    subscription: publicSubscription(sub),
    plans: Object.values(PLANS).map(
      ({ id, name, nameZh, monthlyCreditUsd, amountUsd, blurb, highlight }) => ({
        id,
        name,
        nameZh,
        monthlyCreditUsd,
        amountUsd,
        blurb,
        highlight: Boolean(highlight),
        upgradeable: upgradeablePlans(activePlanId).some((plan) => plan.id === id),
      }),
    ),
    packs: Object.values(CREDIT_PACKS).map((pack) => ({
      id: pack.id,
      creditUsd: packCreditUsdWithBonus(pack.creditUsd, bonusPercent),
      baseCreditUsd: pack.creditUsd,
      bonusPercent,
      amountUsd: pack.amountUsd,
      nameZh: pack.nameZh,
      blurb: pack.blurb,
    })),
    hasPaymentProfile: Boolean(user.stripeCustomerId),
  });
});

// Start a Stripe flow and return its hosted URL for the app to open in a browser.
// Body: { kind: "subscribe" | "upgrade", planId } | { kind: "pack", packId } | { kind: "portal" }.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<{ kind?: string; planId?: string; packId?: string }>(request);
  switch (body.kind) {
    case "subscribe":
      if (!isPlanId(body.planId)) return apiError("找不到方案", 404);
      return fromResult(await startCheckoutAction(body.planId));
    case "upgrade":
      if (!isPlanId(body.planId)) return apiError("找不到方案", 404);
      return fromResult(await startPlanUpgradeAction(body.planId));
    case "pack":
      if (!isPackId(body.packId)) return apiError("找不到加購包", 404);
      return fromResult(await startPackCheckoutAction(body.packId));
    case "portal":
      return fromResult(await startPortalAction());
    default:
      return apiError(`未知的 kind: ${String(body.kind ?? "")}`);
  }
});
