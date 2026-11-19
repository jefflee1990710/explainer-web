import { randomBytes } from "crypto";
import { subscriptionsCollection, usersCollection } from "@/dao";
import {
  applyMonthlyRefillUsd,
  applyPackPurchaseUsd,
  applySpendUsd,
  resolveUserUsdBalance,
} from "@/service/billing/credit-balance";
import { PLANS } from "@/service/billing/plans";
import { addUsd, roundUsd4, toUsdUnits } from "@/service/billing/usd";
import {
  recordConsumeCommission,
  reverseConsumeCommission,
} from "@/service/affiliate/engine";
import type { AppUser } from "@/model/user";
import type { Subscription } from "@/model/subscription";
import { hasUnlimitedCredits } from "@/service/billing/unlimited-credits";

const ACTIVE_STATUSES = new Set(["trialing", "active"]);
// Max retries when an optimistic balance filter loses a concurrent write race.
const MAX_WALLET_RETRIES = 5;

export function isSubscriptionActive(sub: Subscription | null) {
  return Boolean(sub && ACTIVE_STATUSES.has(sub.status));
}

export async function getActiveSubscription(
  clerkUserId: string,
): Promise<Subscription | null> {
  const subscriptions = await subscriptionsCollection();
  return subscriptions.findOne({
    clerkUserId,
    status: { $in: ["trialing", "active", "past_due"] },
  });
}

// Resolves canonical monthly USD credit allowance for a subscription record.
export function resolveSubscriptionMonthlyUsd(sub: Subscription): number {
  if (typeof sub.monthlyCreditUsd === "number" && Number.isFinite(sub.monthlyCreditUsd)) {
    return roundUsd4(sub.monthlyCreditUsd);
  }
  return PLANS[sub.planId].monthlyCreditUsd;
}

// Pure USD credit & subscription gate check so unit tests can verify welcome-credit behavior without DB calls.
export function evaluateCreditSpendGate({
  email,
  creditUsd,
  costUsd,
  sub,
}: {
  email?: string | null;
  creditUsd: number;
  costUsd: number;
  sub: Subscription | null;
}): Subscription | null {
  if (hasUnlimitedCredits(email)) {
    return sub;
  }
  // Users who have enough USD credit in their wallet (including the $6.00 free welcome grant)
  // can spend it on affordable actions (blueprint $0.30, image $0.15, preview clip $0.50+).
  if (toUsdUnits(creditUsd) >= toUsdUnits(costUsd)) {
    return sub;
  }
  if (!sub || !isSubscriptionActive(sub)) {
    throw new Error("請先訂閱方案才能產片");
  }
  throw new Error("USD Credit 餘額不足，請加值或升級方案");
}

// True when the user has an active subscription, has purchased a top-up pack, or has USD credit available.
export function hasPaidOrCreditAccess(
  user: Pick<
    AppUser,
    | "email"
    | "creditUsd"
    | "bonusCreditUsd"
    | "creditLimitUsd"
    | "credits"
    | "bonusCredits"
    | "creditLimit"
    | "processedCheckoutIds"
  >,
  sub: Subscription | null,
): boolean {
  if (hasUnlimitedCredits(user.email)) return true;
  if (isSubscriptionActive(sub)) return true;
  const balance = resolveUserUsdBalance(user);
  if (toUsdUnits(balance.bonusCreditUsd) > 0) return true;
  if (user.processedCheckoutIds && user.processedCheckoutIds.length > 0) return true;
  if (toUsdUnits(balance.creditUsd) > 0) return true;
  return false;
}

// Accounts with an active subscription, a USD credit top-up, or an already-paid clip may render any clip.
export function assertFreeTrialClipAllowed({
  email,
  sub,
  clipNumber,
  bonusCreditUsd,
  processedCheckoutIds,
  hasPaidForClip,
}: {
  email?: string | null;
  sub: Subscription | null;
  clipNumber: number;
  bonusCreditUsd?: number;
  processedCheckoutIds?: string[];
  hasPaidForClip?: boolean;
}): void {
  if (hasUnlimitedCredits(email)) return;
  if (isSubscriptionActive(sub)) return;
  if (toUsdUnits(bonusCreditUsd ?? 0) > 0) return;
  if (processedCheckoutIds && processedCheckoutIds.length > 0) return;
  if (hasPaidForClip) return;
  if (clipNumber <= 1) return;
  throw new Error(
    "免費體驗僅支援預覽第 1 段動態影片，請先加值 USD Credit 或訂閱方案以解鎖完整影片",
  );
}

export async function assertCanSpendCreditUsd(
  user: AppUser,
  costUsd: number,
): Promise<Subscription | null> {
  const sub = await getActiveSubscription(user.clerkUserId);
  const balance = resolveUserUsdBalance(user);
  return evaluateCreditSpendGate({
    email: user.email,
    creditUsd: balance.creditUsd,
    costUsd,
    sub,
  });
}

function newSpendEventKey(clerkUserId: string) {
  return `spend:${clerkUserId}:${Date.now()}:${randomBytes(4).toString("hex")}`;
}

function isMigratedUser(user: Pick<AppUser, "creditUsd">): boolean {
  return typeof user.creditUsd === "number" && Number.isFinite(user.creditUsd);
}

// Optimistic filter matching the exact wallet snapshot read before mutation (prevents ABA races & supports lazy migration).
export function walletConcurrencyFilter(
  user: Pick<AppUser, "clerkUserId" | "creditUsd" | "bonusCreditUsd" | "credits">,
) {
  if (isMigratedUser(user)) {
    return {
      clerkUserId: user.clerkUserId,
      creditUsd: user.creditUsd,
      ...(typeof user.bonusCreditUsd === "number"
        ? { bonusCreditUsd: user.bonusCreditUsd }
        : { bonusCreditUsd: { $exists: false } }),
    };
  }
  return {
    clerkUserId: user.clerkUserId,
    creditUsd: { $exists: false },
    ...(typeof user.credits === "number"
      ? { credits: user.credits }
      : { credits: { $exists: false } }),
  };
}

// Deduct USD credit atomically (with optimistic concurrency retries & lazy migration) and pay consume commissions.
export async function consumeCreditUsd(
  clerkUserId: string,
  costUsd: number,
): Promise<string> {
  const cost = Math.max(0, roundUsd4(costUsd));
  const users = await usersCollection();

  for (let attempt = 0; attempt <= MAX_WALLET_RETRIES; attempt++) {
    const user = await users.findOne({ clerkUserId });
    if (!user) {
      throw new Error("USD Credit 餘額不足，無法扣款");
    }
    // Unlimited operator account is never billed and generates no affiliate commission.
    if (hasUnlimitedCredits(user.email)) {
      return newSpendEventKey(clerkUserId);
    }

    const balance = resolveUserUsdBalance(user);
    if (toUsdUnits(balance.creditUsd) < toUsdUnits(cost)) {
      throw new Error("USD Credit 餘額不足，無法扣款");
    }

    const isMigrated = isMigratedUser(user);
    if (toUsdUnits(cost) === 0 && isMigrated) {
      return newSpendEventKey(clerkUserId);
    }

    const next = applySpendUsd(balance, cost);
    const now = new Date();
    const result = await users.updateOne(walletConcurrencyFilter(user), {
      $set: {
        ...next,
        ...(isMigrated ? {} : { creditMigratedAt: now }),
        updatedAt: now,
      },
    });

    if (result.modifiedCount === 1) {
      const eventKey = newSpendEventKey(clerkUserId);
      if (toUsdUnits(cost) > 0) {
        try {
          await recordConsumeCommission(clerkUserId, cost, eventKey);
        } catch (error) {
          console.error("affiliate consume commission failed", error);
        }
      }
      return eventKey;
    }
  }

  throw new Error("USD Credit 餘額不足，無法扣款");
}

// Refund USD credit atomically (with optimistic retries & lazy migration) and reverse affiliate commission.
export async function refundCreditUsd(
  clerkUserId: string,
  costUsd: number,
  spendEventKey?: string,
): Promise<void> {
  const cost = Math.max(0, roundUsd4(costUsd));
  if (toUsdUnits(cost) <= 0) return;

  const users = await usersCollection();
  let refunded = false;

  for (let attempt = 0; attempt <= MAX_WALLET_RETRIES; attempt++) {
    const user = await users.findOne({ clerkUserId });
    if (!user) return;
    // Nothing was deducted for unlimited accounts, so a failure must not add balance either.
    if (hasUnlimitedCredits(user.email)) return;

    const balance = resolveUserUsdBalance(user);
    const nextCreditUsd = addUsd(balance.creditUsd, cost);
    const now = new Date();
    const isMigrated = isMigratedUser(user);

    const result = await users.updateOne(walletConcurrencyFilter(user), {
      $set: isMigrated
        ? { creditUsd: nextCreditUsd, updatedAt: now }
        : {
            creditUsd: nextCreditUsd,
            bonusCreditUsd: balance.bonusCreditUsd,
            creditLimitUsd: balance.creditLimitUsd,
            creditMigratedAt: now,
            updatedAt: now,
          },
    });

    if (result.modifiedCount === 1) {
      refunded = true;
      break;
    }
  }

  if (!refunded) {
    throw new Error(
      `refundCreditUsd failed after ${MAX_WALLET_RETRIES + 1} attempts due to concurrent wallet updates (user=${clerkUserId})`,
    );
  }

  if (spendEventKey) {
    try {
      await reverseConsumeCommission(clerkUserId, cost, spendEventKey);
    } catch (error) {
      console.error("affiliate reverse commission failed", error);
    }
  }
}

// Reset monthly USD credit allowance while preserving unspent permanent bonusCreditUsd.
export async function resetMonthlyCreditUsd(
  clerkUserId: string,
  monthlyCreditUsd: number,
): Promise<void> {
  const users = await usersCollection();

  for (let attempt = 0; attempt <= MAX_WALLET_RETRIES; attempt++) {
    const user = await users.findOne({ clerkUserId });
    if (!user) return;

    const balance = resolveUserUsdBalance(user);
    const next = applyMonthlyRefillUsd({
      monthlyCreditUsd,
      bonusCreditUsd: balance.bonusCreditUsd,
    });
    const now = new Date();
    const result = await users.updateOne(walletConcurrencyFilter(user), {
      $set: {
        ...next,
        creditMigratedAt: user.creditMigratedAt ?? now,
        updatedAt: now,
      },
    });
    if (result.modifiedCount === 1 || result.matchedCount === 1) return;
  }

  throw new Error(
    `resetMonthlyCreditUsd failed after ${MAX_WALLET_RETRIES + 1} attempts due to concurrent wallet updates (user=${clerkUserId})`,
  );
}

// Idempotently grant a one-time top-up pack in USD credit and record the processed checkout id.
export async function grantPackCreditUsd(
  clerkUserId: string,
  packCreditUsd: number,
  checkoutId: string,
): Promise<void> {
  const users = await usersCollection();

  for (let attempt = 0; attempt <= MAX_WALLET_RETRIES; attempt++) {
    const user = await users.findOne({
      clerkUserId,
      processedCheckoutIds: { $nin: [checkoutId] },
    });
    if (!user) return;

    const balance = resolveUserUsdBalance(user);
    const next = applyPackPurchaseUsd(balance, packCreditUsd);
    const now = new Date();
    const result = await users.updateOne(
      {
        ...walletConcurrencyFilter(user),
        processedCheckoutIds: { $nin: [checkoutId] },
      },
      {
        $set: {
          ...next,
          creditMigratedAt: user.creditMigratedAt ?? now,
          updatedAt: now,
        },
        $addToSet: { processedCheckoutIds: checkoutId },
      },
    );
    if (result.modifiedCount === 1 || result.matchedCount === 1) return;
  }

  throw new Error(
    `grantPackCreditUsd failed after ${MAX_WALLET_RETRIES + 1} attempts due to concurrent wallet updates (user=${clerkUserId}, checkout=${checkoutId})`,
  );
}
