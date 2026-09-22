import { requireAppUser } from "@/service/auth";
import { CREDIT_PACKS, isPackId } from "@/service/billing/packs";
import { isPlanId, priceIdForPlan } from "@/service/billing/plans";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { getOrCreateStripePrices, getStripe } from "@/service/billing/stripe";
import { getAppUrl } from "@/util/app-url";
import { usersCollection } from "@/dao";
import type { PackId } from "@/model/billing-settings";
import type { PlanId } from "@/model/subscription";

export async function startCheckoutAction(planId: PlanId) {
  const user = await requireAppUser();
  if (!isPlanId(planId)) {
    return { ok: false as const, error: "找不到方案" };
  }

  const stripe = getStripe();
  const prices = await getOrCreateStripePrices();
  const priceId = priceIdForPlan(planId, prices);
  if (!priceId) {
    return { ok: false as const, error: "方案尚未開放訂閱" };
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { clerkUserId: user.clerkUserId },
    });
    customerId = customer.id;
    const users = await usersCollection();
    await users.updateOne(
      { _id: user._id },
      { $set: { stripeCustomerId: customerId, updatedAt: new Date() } },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getAppUrl()}/app/billing?checkout=success`,
    cancel_url: `${getAppUrl()}/app/billing?checkout=cancel`,
    metadata: { clerkUserId: user.clerkUserId, planId },
    subscription_data: {
      metadata: { clerkUserId: user.clerkUserId, planId },
    },
  });

  if (!session.url) {
    return { ok: false as const, error: "無法建立付款頁" };
  }
  return { ok: true as const, url: session.url };
}

export async function startPortalAction() {
  const user = await requireAppUser();
  if (!user.stripeCustomerId) {
    return { ok: false as const, error: "尚未有付款資料" };
  }
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl()}/app/billing`,
  });
  return { ok: true as const, url: session.url };
}

export async function startPackCheckoutAction(packId: PackId) {
  const user = await requireAppUser();
  if (!isPackId(packId)) {
    return { ok: false as const, error: "找不到加購包" };
  }

  const sub = await getActiveSubscription(user.clerkUserId);
  if (!isSubscriptionActive(sub)) {
    return { ok: false as const, error: "請先訂閱方案才能加購 credits" };
  }

  const pack = CREDIT_PACKS[packId];
  const stripe = getStripe();
  const prices = await getOrCreateStripePrices();
  const priceId = prices.creditPacks[packId]?.priceId;
  if (!priceId) {
    return { ok: false as const, error: "加購尚未開放" };
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { clerkUserId: user.clerkUserId },
    });
    customerId = customer.id;
    const users = await usersCollection();
    await users.updateOne(
      { _id: user._id },
      { $set: { stripeCustomerId: customerId, updatedAt: new Date() } },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getAppUrl()}/app/billing?checkout=success`,
    cancel_url: `${getAppUrl()}/app/billing?checkout=cancel`,
    metadata: {
      clerkUserId: user.clerkUserId,
      packId,
      credits: String(pack.credits),
    },
  });

  if (!session.url) {
    return { ok: false as const, error: "無法建立付款頁" };
  }
  return { ok: true as const, url: session.url };
}
