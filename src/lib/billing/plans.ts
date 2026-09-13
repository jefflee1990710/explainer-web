import type { PlanId } from "@/types/subscription";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  nameZh: string;
  monthlyCredits: number;
  amountUsd: number;
  blurb: string;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    nameZh: "入門",
    monthlyCredits: 30,
    amountUsd: 19,
    blurb: "每月 30 credits，適合試做短片。",
  },
  pro: {
    id: "pro",
    name: "Pro",
    nameZh: "專業",
    monthlyCredits: 120,
    amountUsd: 49,
    blurb: "每月 120 credits，適合固定產片。",
  },
};

export function planByPriceId(
  priceId: string,
  priceMap: { starterPriceId: string; proPriceId: string },
): PlanDefinition {
  if (priceId === priceMap.proPriceId) return PLANS.pro;
  return PLANS.starter;
}
