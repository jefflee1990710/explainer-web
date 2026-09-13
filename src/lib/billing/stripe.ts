import Stripe from "stripe";
import { billingSettingsCollection } from "@/lib/collections";
import { PLANS } from "@/lib/billing/plans";
import type { BillingSettings } from "@/types/billing-settings";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Create or reuse Explainer live products/prices and persist their ids.
export async function getOrCreateStripePrices(): Promise<BillingSettings> {
  const envStarter = process.env.STRIPE_PRICE_STARTER;
  const envPro = process.env.STRIPE_PRICE_PRO;
  const settingsCol = await billingSettingsCollection();
  const existing = await settingsCol.findOne({ _id: "billing" });

  if (envStarter && envPro) {
    const doc: BillingSettings = {
      _id: "billing",
      starterPriceId: envStarter,
      proPriceId: envPro,
      starterProductId: existing?.starterProductId || "",
      proProductId: existing?.proProductId || "",
      updatedAt: new Date(),
    };
    await settingsCol.updateOne(
      { _id: "billing" },
      { $set: doc },
      { upsert: true },
    );
    return doc;
  }

  if (existing?.starterPriceId && existing.proPriceId) {
    return existing;
  }

  const stripe = getStripe();
  const starterProduct = await stripe.products.create({
    name: "Explainer Starter",
    metadata: { app: "explainer-web", planId: "starter" },
  });
  const proProduct = await stripe.products.create({
    name: "Explainer Pro",
    metadata: { app: "explainer-web", planId: "pro" },
  });
  const starterPrice = await stripe.prices.create({
    product: starterProduct.id,
    currency: "usd",
    unit_amount: PLANS.starter.amountUsd * 100,
    recurring: { interval: "month" },
    metadata: { app: "explainer-web", planId: "starter" },
  });
  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    currency: "usd",
    unit_amount: PLANS.pro.amountUsd * 100,
    recurring: { interval: "month" },
    metadata: { app: "explainer-web", planId: "pro" },
  });

  const doc: BillingSettings = {
    _id: "billing",
    starterPriceId: starterPrice.id,
    proPriceId: proPrice.id,
    starterProductId: starterProduct.id,
    proProductId: proProduct.id,
    updatedAt: new Date(),
  };
  await settingsCol.updateOne(
    { _id: "billing" },
    { $set: doc },
    { upsert: true },
  );
  return doc;
}
