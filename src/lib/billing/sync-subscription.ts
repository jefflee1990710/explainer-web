import type Stripe from "stripe";
import {
  getOrCreateStripePrices,
  getStripe,
} from "@/lib/billing/stripe";
import { isPlanId, planByPriceId, PLANS } from "@/lib/billing/plans";
import { grantPackCredits, resetMonthlyCredits } from "@/lib/billing/credits";
import { CREDIT_PACKS, isPackId } from "@/lib/billing/packs";
import { recordPurchaseCommission } from "@/lib/affiliate/engine";
import {
  subscriptionsCollection,
  usersCollection,
} from "@/lib/collections";
import type { SubscriptionStatus } from "@/types/subscription";

function periodDates(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const start = firstItem?.current_period_start || subscription.start_date;
  const end = firstItem?.current_period_end || subscription.start_date;
  return {
    currentPeriodStart: new Date(start * 1000),
    currentPeriodEnd: new Date(end * 1000),
  };
}

function resolvePlan(
  subscription: Stripe.Subscription,
  prices: Awaited<ReturnType<typeof getOrCreateStripePrices>>,
) {
  const priceId = subscription.items.data[0]?.price.id || "";
  const metaPlan = subscription.metadata.planId;
  return isPlanId(metaPlan) ? PLANS[metaPlan] : planByPriceId(priceId, prices);
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
) {
  const clerkUserId =
    subscription.metadata.clerkUserId ||
    (typeof subscription.customer === "string" ? "" : "");
  const users = await usersCollection();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  let user = clerkUserId
    ? await users.findOne({ clerkUserId })
    : await users.findOne({ stripeCustomerId: customerId });

  if (!user && customerId) {
    user = await users.findOne({ stripeCustomerId: customerId });
  }
  if (!user) return;

  if (!user.stripeCustomerId) {
    await users.updateOne(
      { _id: user._id },
      { $set: { stripeCustomerId: customerId, updatedAt: new Date() } },
    );
  }

  const prices = await getOrCreateStripePrices();
  const priceId = subscription.items.data[0]?.price.id || "";
  const plan = resolvePlan(subscription, prices);
  const { currentPeriodStart, currentPeriodEnd } = periodDates(subscription);
  const status = subscription.status as SubscriptionStatus;

  const subscriptions = await subscriptionsCollection();
  await subscriptions.updateOne(
    { stripeSubscriptionId: subscription.id },
    {
      $set: {
        userId: user._id,
        clerkUserId: user.clerkUserId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        planId: plan.id,
        status,
        monthlyCredits: plan.monthlyCredits,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  if (status === "active" || status === "trialing") {
    const current = await users.findOne({ _id: user._id });
    if (current && current.credits < plan.monthlyCredits && current.credits === 0) {
      await resetMonthlyCredits(user.clerkUserId, plan.monthlyCredits);
    }
  }
}

export async function grantCreditsFromInvoice(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const users = await usersCollection();
  const user = await users.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  const parentSub = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof parentSub === "string" ? parentSub : parentSub?.id;
  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncStripeSubscription(subscription);

  const prices = await getOrCreateStripePrices();
  const plan = resolvePlan(subscription, prices);
  await resetMonthlyCredits(user.clerkUserId, plan.monthlyCredits);

  // Commission + FIFO lot from the paid invoice amount.
  const amountPaidCents = invoice.amount_paid || Math.round(plan.amountUsd * 100);
  await recordPurchaseCommission({
    buyerClerkUserId: user.clerkUserId,
    amountPaidCents,
    credits: plan.monthlyCredits,
    lot: {
      source: "subscription",
      sourceId: invoice.id || `sub:${subscriptionId}:${invoice.created}`,
      credits: plan.monthlyCredits,
      amountPaidCents,
    },
    eventKey: `invoice:${invoice.id || `${subscriptionId}:${invoice.created}`}`,
  });
}

export async function grantPackFromCheckout(session: Stripe.Checkout.Session) {
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;
  const packId = session.metadata?.packId;
  const clerkUserId = session.metadata?.clerkUserId;
  if (!isPackId(packId) || !clerkUserId) return;
  const pack = CREDIT_PACKS[packId];
  await grantPackCredits(clerkUserId, pack.credits, session.id);

  const amountPaidCents =
    typeof session.amount_total === "number"
      ? session.amount_total
      : Math.round(pack.amountUsd * 100);
  await recordPurchaseCommission({
    buyerClerkUserId: clerkUserId,
    amountPaidCents,
    credits: pack.credits,
    lot: {
      source: "pack",
      sourceId: session.id,
      credits: pack.credits,
      amountPaidCents,
    },
    eventKey: `pack:${session.id}`,
  });
}
