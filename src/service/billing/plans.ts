import type { BillingSettings } from "@/model/billing-settings";
import type { PlanId } from "@/model/subscription";
import { typicalGrossMargin } from "@/service/billing/unit-economics";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  nameZh: string;
  monthlyCredits: number;
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

// Monthly credits are the largest whole number that still leaves the target
// worst-case cash margin. Worst case is list price after a 20% discount and the
// full affiliate stack (buy 20.5% + consume 4.5%), i.e. 60% of list price.
// Targets: Starter 30%, Pro 35%, Studio 40%, Scale 45%.
export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    nameZh: "入門",
    monthlyCredits: 1641,
    amountUsd: 59,
    blurb: "適合先試用 Scro。",
  },
  pro: {
    id: "pro",
    name: "Pro",
    nameZh: "專業",
    monthlyCredits: 3333,
    amountUsd: 129,
    blurb: "適合自己在做生意的人。",
  },
  studio: {
    id: "studio",
    name: "Studio",
    nameZh: "工作室",
    monthlyCredits: 5938,
    amountUsd: 249,
    blurb: "適合用 Scro 接案賺錢的人。",
    highlight: true,
  },
  scale: {
    id: "scale",
    name: "Scale",
    nameZh: "規模",
    monthlyCredits: 8723,
    amountUsd: 399,
    blurb: "適合幫很多客戶做片的團隊。",
  },
};

// Higher monthly plans a subscriber can move to from `current`.
export function upgradeablePlans(current?: PlanId | null) {
  if (!current) return Object.values(PLANS);
  const rank = PLAN_RANK[current];
  return PLAN_IDS.filter((id) => PLAN_RANK[id] > rank).map((id) => PLANS[id]);
}

export const ENTERPRISE = {
  name: "Enterprise",
  nameZh: "企業",
  blurb: "自訂 credits、發票請款、專人支援與用量合約。",
};

export function salesEmail() {
  return process.env.NEXT_PUBLIC_SALES_EMAIL || "hello@explainer.io";
}

export function salesMailto() {
  const subject = encodeURIComponent("Scro 企業方案");
  return `mailto:${salesEmail()}?subject=${subject}`;
}

export function planMarginPct(plan: PlanDefinition) {
  return Math.round(typicalGrossMargin(plan.amountUsd, plan.monthlyCredits) * 100);
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
