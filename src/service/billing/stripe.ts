import Stripe from "stripe";
import { billingSettingsCollection } from "@/dao";
import { CREDIT_PACKS, PACK_IDS } from "@/service/billing/packs";
import { PLAN_IDS, PLANS } from "@/service/billing/plans";
import type { BillingSettings } from "@/model/billing-settings";
import type { PlanId } from "@/model/subscription";

let stripeClient: Stripe | null = null;

const PRICE_ENV: Record<PlanId, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  studio: process.env.STRIPE_PRICE_STUDIO,
  scale: process.env.STRIPE_PRICE_SCALE,
};

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

function emptyLegacy(): BillingSettings["legacyPriceIds"] {
  return {};
}

function emptyCreditPacks(): BillingSettings["creditPacks"] {
  return {
    pack30: { priceId: "", productId: "", amountUsd: 0 },
    pack90: { priceId: "", productId: "", amountUsd: 0 },
    pack200: { priceId: "", productId: "", amountUsd: 0 },
  };
}

async function ensureCreditPackPrices(
  stripe: Stripe,
  existing: BillingSettings["creditPacks"] | undefined,
): Promise<BillingSettings["creditPacks"]> {
  const packs = { ...emptyCreditPacks(), ...existing };
  for (const packId of PACK_IDS) {
    const pack = CREDIT_PACKS[packId];
    const stored = packs[packId];
    if (stored.priceId && stored.amountUsd === pack.amountUsd) continue;

    let productId = stored.productId;
    if (!productId) {
      const product = await stripe.products.create({
        name: `Explainer ${pack.nameZh} ${pack.credits} credits`,
        metadata: { app: "explainer-web", packId },
      });
      productId = product.id;
    }

    const price = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: pack.amountUsd * 100,
      metadata: {
        app: "explainer-web",
        packId,
        credits: String(pack.credits),
      },
    });
    packs[packId] = {
      priceId: price.id,
      productId,
      amountUsd: pack.amountUsd,
    };
  }
  return packs;
}

function rememberLegacy(
  legacy: BillingSettings["legacyPriceIds"],
  planId: PlanId,
  priceId: string | undefined,
) {
  if (!priceId) return;
  const list = legacy[planId] || [];
  if (!list.includes(priceId)) list.push(priceId);
  legacy[planId] = list;
}

function currentPriceId(doc: BillingSettings, planId: PlanId) {
  if (planId === "starter") return doc.starterPriceId;
  if (planId === "pro") return doc.proPriceId;
  if (planId === "studio") return doc.studioPriceId;
  return doc.scalePriceId;
}

function currentProductId(doc: BillingSettings, planId: PlanId) {
  if (planId === "starter") return doc.starterProductId;
  if (planId === "pro") return doc.proProductId;
  if (planId === "studio") return doc.studioProductId;
  return doc.scaleProductId;
}

function writeIds(
  doc: BillingSettings,
  planId: PlanId,
  priceId: string,
  productId: string,
) {
  if (planId === "starter") {
    doc.starterPriceId = priceId;
    doc.starterProductId = productId;
  } else if (planId === "pro") {
    doc.proPriceId = priceId;
    doc.proProductId = productId;
  } else if (planId === "studio") {
    doc.studioPriceId = priceId;
    doc.studioProductId = productId;
  } else {
    doc.scalePriceId = priceId;
    doc.scaleProductId = productId;
  }
}

function envOverridesComplete() {
  return PLAN_IDS.every((id) => Boolean(PRICE_ENV[id]));
}

// Create or reuse Explainer live products/prices and persist their ids.
export async function getOrCreateStripePrices(): Promise<BillingSettings> {
  const settingsCol = await billingSettingsCollection();
  const existing = await settingsCol.findOne({ _id: "billing" });
  const now = new Date();

  const stripe = getStripe();

  if (envOverridesComplete()) {
    const doc: BillingSettings = {
      _id: "billing",
      starterPriceId: PRICE_ENV.starter!,
      proPriceId: PRICE_ENV.pro!,
      studioPriceId: PRICE_ENV.studio!,
      scalePriceId: PRICE_ENV.scale!,
      starterProductId: existing?.starterProductId || "",
      proProductId: existing?.proProductId || "",
      studioProductId: existing?.studioProductId || "",
      scaleProductId: existing?.scaleProductId || "",
      amountsUsd: {
        starter: PLANS.starter.amountUsd,
        pro: PLANS.pro.amountUsd,
        studio: PLANS.studio.amountUsd,
        scale: PLANS.scale.amountUsd,
      },
      legacyPriceIds: existing?.legacyPriceIds || emptyLegacy(),
      creditPacks: await ensureCreditPackPrices(stripe, existing?.creditPacks),
      updatedAt: now,
    };
    await settingsCol.updateOne({ _id: "billing" }, { $set: doc }, { upsert: true });
    return doc;
  }

  const doc: BillingSettings = {
    _id: "billing",
    starterPriceId: existing?.starterPriceId || "",
    proPriceId: existing?.proPriceId || "",
    studioPriceId: existing?.studioPriceId || "",
    scalePriceId: existing?.scalePriceId || "",
    starterProductId: existing?.starterProductId || "",
    proProductId: existing?.proProductId || "",
    studioProductId: existing?.studioProductId || "",
    scaleProductId: existing?.scaleProductId || "",
    amountsUsd: existing?.amountsUsd || {
      starter: 0,
      pro: 0,
      studio: 0,
      scale: 0,
    },
    legacyPriceIds: existing?.legacyPriceIds || emptyLegacy(),
    creditPacks: existing?.creditPacks || emptyCreditPacks(),
    updatedAt: now,
  };

  for (const planId of PLAN_IDS) {
    const plan = PLANS[planId];
    const envPrice = PRICE_ENV[planId];
    if (envPrice) {
      rememberLegacy(doc.legacyPriceIds, planId, currentPriceId(doc, planId));
      writeIds(doc, planId, envPrice, currentProductId(doc, planId));
      doc.amountsUsd[planId] = plan.amountUsd;
      continue;
    }

    const storedAmount = doc.amountsUsd[planId];
    const storedPrice = currentPriceId(doc, planId);
    if (storedPrice && storedAmount === plan.amountUsd) continue;

    let productId = currentProductId(doc, planId);
    if (!productId) {
      const product = await stripe.products.create({
        name: `Explainer ${plan.name}`,
        metadata: { app: "explainer-web", planId },
      });
      productId = product.id;
    }

    const price = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: plan.amountUsd * 100,
      recurring: { interval: "month" },
      metadata: { app: "explainer-web", planId },
    });

    rememberLegacy(doc.legacyPriceIds, planId, storedPrice);
    writeIds(doc, planId, price.id, productId);
    doc.amountsUsd[planId] = plan.amountUsd;
  }

  doc.creditPacks = await ensureCreditPackPrices(stripe, doc.creditPacks);
  doc.updatedAt = now;
  await settingsCol.updateOne({ _id: "billing" }, { $set: doc }, { upsert: true });
  return doc;
}
