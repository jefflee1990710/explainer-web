import { randomBytes } from "crypto";
import { subscriptionsCollection, usersCollection } from "@/dao";
import {
  applyMonthlyRefill,
  applyPackPurchase,
  applySpend,
} from "@/service/billing/credit-balance";
import {
  recordConsumeCommission,
  reverseConsumeCommission,
} from "@/service/affiliate/engine";
import type { AppUser } from "@/model/user";
import type { Subscription } from "@/model/subscription";

const ACTIVE_STATUSES = new Set(["trialing", "active"]);

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

export async function assertCanSpendCredits(
  user: AppUser,
  cost: number,
): Promise<Subscription> {
  const sub = await getActiveSubscription(user.clerkUserId);
  if (!sub || !isSubscriptionActive(sub)) {
    throw new Error("請先訂閱方案才能產片");
  }
  if (user.credits < cost) {
    throw new Error("credits 不足，請加購或升級方案");
  }
  return sub;
}

function balanceOf(user: Pick<AppUser, "credits" | "bonusCredits" | "creditLimit">) {
  return {
    credits: user.credits,
    bonusCredits: user.bonusCredits || 0,
    creditLimit: user.creditLimit || 0,
  };
}

function newSpendEventKey(clerkUserId: string) {
  return `spend:${clerkUserId}:${Date.now()}:${randomBytes(4).toString("hex")}`;
}

// Deduct credits and pay consume commissions. Returns eventKey for refunds.
export async function consumeCredits(
  clerkUserId: string,
  cost: number,
): Promise<string> {
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId, credits: { $gte: cost } });
  if (!user) {
    throw new Error("credits 不足，無法扣款");
  }
  const next = applySpend(balanceOf(user), cost);
  const result = await users.updateOne(
    { clerkUserId, credits: user.credits },
    { $set: { ...next, updatedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) {
    throw new Error("credits 不足，無法扣款");
  }

  const eventKey = newSpendEventKey(clerkUserId);
  if (cost > 0) {
    try {
      await recordConsumeCommission(clerkUserId, cost, eventKey);
    } catch (error) {
      console.error("affiliate consume commission failed", error);
    }
  }
  return eventKey;
}

export async function refundCredits(
  clerkUserId: string,
  cost: number,
  spendEventKey?: string,
) {
  const users = await usersCollection();
  await users.updateOne(
    { clerkUserId },
    { $inc: { credits: cost }, $set: { updatedAt: new Date() } },
  );

  if (cost > 0 && spendEventKey) {
    try {
      await reverseConsumeCommission(clerkUserId, cost, spendEventKey);
    } catch (error) {
      console.error("affiliate reverse commission failed", error);
    }
  }
}

export async function resetMonthlyCredits(
  clerkUserId: string,
  monthlyCredits: number,
) {
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId });
  const next = applyMonthlyRefill({
    monthlyCredits,
    bonusCredits: user?.bonusCredits || 0,
  });
  await users.updateOne(
    { clerkUserId },
    { $set: { ...next, updatedAt: new Date() } },
  );
}

export async function grantPackCredits(
  clerkUserId: string,
  packCredits: number,
  checkoutId: string,
) {
  const users = await usersCollection();
  const user = await users.findOne({
    clerkUserId,
    processedCheckoutIds: { $nin: [checkoutId] },
  });
  if (!user) return;
  const next = applyPackPurchase(balanceOf(user), packCredits);
  await users.updateOne(
    { clerkUserId, processedCheckoutIds: { $nin: [checkoutId] } },
    {
      $set: { ...next, updatedAt: new Date() },
      $addToSet: { processedCheckoutIds: checkoutId },
    },
  );
}
