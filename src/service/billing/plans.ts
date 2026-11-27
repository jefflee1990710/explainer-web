import type { BillingSettings } from "@/model/billing-settings";
import type { PlanId } from "@/model/subscription";
import { typicalGrossMargin } from "@/service/billing/unit-economics";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  nameZh: string;
  // USD Credit refilled each cycle: 1.1× the Stripe price (`amountUsd`).
  monthlyCreditUsd: number;
  amountUsd: number;
  blurb: string;
  highlight?: boolean;
};

export const PLAN_IDS: PlanId[] = ["starter", "pro", "studio", "scale"];

export const PLAN_RANK: Record<PlanId, number> = {
  starter: 0,
  pro: 1,
  studio: 2,
  scale: 3,
};

// Monthly plans charge `amountUsd` and refill 1.1× that price in USD Credit.
export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    nameZh: "入門",
    monthlyCreditUsd: 64.9,
    amountUsd: 59,
    blurb: "適合先試用 Scro。",
  },
  pro: {
    id: "pro",
    name: "Pro",
    nameZh: "專業",
    monthlyCreditUsd: 141.9,
    amountUsd: 129,
    blurb: "適合自己在做生意的人。",
  },
  studio: {
    id: "studio",
    name: "Studio",
    nameZh: "工作室",
    monthlyCreditUsd: 273.9,
    amountUsd: 249,
    blurb: "適合用 Scro 接案賺錢的人。",
    highlight: true,
  },
  scale: {
    id: "scale",
    name: "Scale",
    nameZh: "規模",
    monthlyCreditUsd: 438.9,
    amountUsd: 399,
    blurb: "適合幫很多客戶做片的團隊。",
  },
};

// USD Credit a paid invoice refills from the live catalog.
export function invoiceRefillCreditUsd(planId: PlanId): number {
  return PLANS[planId].monthlyCreditUsd;
}

// Higher monthly plans a subscriber can move to from `current`.
export function upgradeablePlans(current?: PlanId | null) {
  if (!current) return Object.values(PLANS);
  const rank = PLAN_RANK[current];
  return PLAN_IDS.filter((id) => PLAN_RANK[id] > rank).map((id) => PLANS[id]);
}

export const ENTERPRISE = {
  name: "Enterprise",
  nameZh: "企業",
  blurb: "自訂 USD Credit、發票請款、專人支援與用量合約。",
};

export function salesEmail() {
  return process.env.NEXT_PUBLIC_SALES_EMAIL || "hello@explainer.io";
}

export function salesMailto() {
  const subject = encodeURIComponent("Scro 企業方案");
  return `mailto:${salesEmail()}?subject=${subject}`;
}

export function planMarginPct(plan: PlanDefinition) {
  return Math.round(typicalGrossMargin(plan.amountUsd, plan.monthlyCreditUsd) * 100);
}

export function priceIdForPlan(planId: PlanId, prices: BillingSettings) {
  if (planId === "starter") return prices.starterPriceId;
  if (planId === "pro") return prices.proPriceId;
  if (planId === "studio") return prices.studioPriceId;
  return prices.scalePriceId;
}

export function planByPriceId(priceId: string, prices: BillingSettings): PlanDefinition {
  if (priceId === prices.starterPriceId) return PLANS.starter;
  if (priceId === prices.proPriceId) return PLANS.pro;
  if (priceId === prices.studioPriceId) return PLANS.studio;
  if (priceId === prices.scalePriceId) return PLANS.scale;
  for (const id of PLAN_IDS) {
    if (prices.legacyPriceIds?.[id]?.includes(priceId)) return PLANS[id];
  }
  return PLANS.starter;
}

export function isPlanId(value: string | undefined): value is PlanId {
  return Boolean(value && PLAN_IDS.includes(value as PlanId));
}
