import { subscriptionsCollection, usersCollection } from "@/lib/collections";
import type { AppUser } from "@/types/user";
import type { Subscription } from "@/types/subscription";

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
    throw new Error("credits 不足，請升級方案或等下個週期重置");
  }
  return sub;
}

export async function consumeCredits(clerkUserId: string, cost: number) {
  const users = await usersCollection();
  const result = await users.updateOne(
    { clerkUserId, credits: { $gte: cost } },
    { $inc: { credits: -cost }, $set: { updatedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) {
    throw new Error("credits 不足，無法扣款");
  }
}

export async function refundCredits(clerkUserId: string, cost: number) {
  const users = await usersCollection();
  await users.updateOne(
    { clerkUserId },
    { $inc: { credits: cost }, $set: { updatedAt: new Date() } },
  );
}

export async function resetMonthlyCredits(
  clerkUserId: string,
  monthlyCredits: number,
) {
  const users = await usersCollection();
  await users.updateOne(
    { clerkUserId },
    { $set: { credits: monthlyCredits, updatedAt: new Date() } },
  );
}
