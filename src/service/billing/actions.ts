import type Stripe from "stripe";
import { requireAppUser } from "@/service/auth";
import { checkoutUrls } from "@/service/billing/checkout-urls";
import { CREDIT_PACKS, isPackId } from "@/service/billing/packs";
import { isPlanId, PLAN_RANK, PLANS, priceIdForPlan } from "@/service/billing/plans";
import {
  getActiveSubscription,
  isSubscriptionActive,
  resetMonthlyCredits,
} from "@/service/billing/credits";
import { getOrCreateStripePrices, getStripe } from "@/service/billing/stripe";
import { syncStripeSubscription } from "@/service/billing/sync-subscription";
import { getAppUrl } from "@/util/app-url";
import { usersCollection } from "@/dao";
import type { PackId } from "@/model/billing-settings";
import type { PlanId } from "@/model/subscription";

export type CheckoutOptions = {
  // Open Stripe in a popup; success returns to /checkout/done.
  popup?: boolean;
};

export async function startCheckoutAction(planId: PlanId, options: CheckoutOptions = {}) {
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

  const urls = checkoutUrls({ planId }, options.popup);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: urls.success_url,
    cancel_url: urls.cancel_url,
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

function invoiceObject(invoice: Stripe.Subscription["latest_invoice"]) {
  return invoice && typeof invoice !== "string" ? invoice : null;
}

// Move an existing subscription to a higher plan and invoice the difference.
export async function startPlanUpgradeAction(planId: PlanId, options: CheckoutOptions = {}) {
  const user = await requireAppUser();
  if (!isPlanId(planId)) {
    return { ok: false as const, error: "找不到方案" };
  }

  const sub = await getActiveSubscription(user.clerkUserId);
  if (!sub || !isSubscriptionActive(sub)) {
    return startCheckoutAction(planId, options);
  }
  if (PLAN_RANK[planId] <= PLAN_RANK[sub.planId]) {
    return { ok: false as const, error: "請選擇更高的方案" };
  }

  const stripe = getStripe();
  const prices = await getOrCreateStripePrices();
  const priceId = priceIdForPlan(planId, prices);
  if (!priceId) {
    return { ok: false as const, error: "方案尚未開放訂閱" };
  }

  const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
  const itemId = stripeSub.items.data[0]?.id;
  if (!itemId) {
    return { ok: false as const, error: "找不到訂閱項目" };
  }

  try {
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      metadata: { clerkUserId: user.clerkUserId, planId },
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    });
    await syncStripeSubscription(updated);

    const invoice = invoiceObject(updated.latest_invoice);
    if (invoice?.status === "paid") {
      await resetMonthlyCredits(user.clerkUserId, PLANS[planId].monthlyCredits);
      return { ok: true as const, url: null };
    }
    if (invoice?.hosted_invoice_url) {
      return { ok: true as const, url: invoice.hosted_invoice_url };
    }
    return { ok: false as const, error: "升級尚未完成，請再試一次" };
  } catch {
    return { ok: false as const, error: "升級失敗，請再試一次" };
  }
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

export async function startPackCheckoutAction(packId: PackId, options: CheckoutOptions = {}) {
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

  const urls = checkoutUrls({ packId }, options.popup);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: urls.success_url,
    cancel_url: urls.cancel_url,
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

export type CreditSnapshotResult =
  | { ok: true; credits: number; creditLimit: number; subscribed: boolean; planId: PlanId | null }
  | { ok: false; error: string };

// Header meter poll: just the wallet, no page revalidate.
export async function getCreditSnapshotAction(): Promise<CreditSnapshotResult> {
  try {
    const user = await requireAppUser();
    const sub = await getActiveSubscription(user.clerkUserId);
    const subscribed = isSubscriptionActive(sub);
    return {
      ok: true,
      credits: user.credits,
      creditLimit: user.creditLimit || 0,
      subscribed,
      planId: subscribed && sub ? sub.planId : null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "讀取 credits 失敗",
    };
  }
}
