"use server";

import { requireAppUser } from "@/lib/auth";
import { getOrCreateStripePrices, getStripe } from "@/lib/billing/stripe";
import { PLANS } from "@/lib/billing/plans";
import { getAppUrl } from "@/lib/app-url";
import { usersCollection } from "@/lib/collections";
import type { PlanId } from "@/types/subscription";

export async function startCheckoutAction(planId: PlanId) {
  const user = await requireAppUser();
  const plan = PLANS[planId];
  if (!plan) {
    return { ok: false as const, error: "找不到方案" };
  }

  const stripe = getStripe();
  const prices = await getOrCreateStripePrices();
  const priceId =
    planId === "pro" ? prices.proPriceId : prices.starterPriceId;

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
