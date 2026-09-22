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

// List prices target ~90% → ~80% typical gross margin as volume grows.
// Starter 89.8%, Pro 86.0%, Studio 83.9%, Scale 79.9% on $0.20/credit COGS.
export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    nameZh: "入門",
    monthlyCredits: 30,
    amountUsd: 59,
    blurb: "每月 30 credits，約 10 段 clips／2 支短片。適合試做 Reels。",
  },
  pro: {
    id: "pro",
    name: "Pro",
    nameZh: "專業",
    monthlyCredits: 90,
    amountUsd: 129,
    blurb: "每月 90 credits，約 30 段 clips。行銷與簡報固定產出。",
  },
  studio: {
    id: "studio",
    name: "Studio",
    nameZh: "工作室",
    monthlyCredits: 200,
    amountUsd: 249,
    blurb: "每月 200 credits，約 66 段 clips。小團隊每週出片。",
    highlight: true,
  },
  scale: {
    id: "scale",
    name: "Scale",
    nameZh: "規模",
    monthlyCredits: 400,
    amountUsd: 399,
    blurb: "每月 400 credits，約 133 段 clips。量大、多專案並進。",
  },
};

export const ENTERPRISE = {
  name: "Enterprise",
  nameZh: "企業",
  blurb: "自訂 credits、發票請款、專人支援與用量合約。",
};

export function salesEmail() {
  return process.env.NEXT_PUBLIC_SALES_EMAIL || "hello@explainer.io";
}

export function salesMailto() {
  const subject = encodeURIComponent("Explainer 企業方案");
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
