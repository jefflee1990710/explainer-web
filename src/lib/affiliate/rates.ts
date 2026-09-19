import type { AffiliateTier } from "@/types/affiliate";

// Buy + consume rates sized so Scale worst-case still keeps >40% margin.
// Stack max: buy 20.5% + consume 4.5% = 25%.
export const BUY_RATES: Record<AffiliateTier, number> = {
  1: 0.15,
  2: 0.04,
  3: 0.015,
};

export const CONSUME_RATES: Record<AffiliateTier, number> = {
  1: 0.03,
  2: 0.01,
  3: 0.005,
};

export const AFFILIATE_TIERS: AffiliateTier[] = [1, 2, 3];

export const PAYOUT_MIN_CENTS = 5000; // $50

export const REFERRAL_COOKIE = "explainer_ref";
export const REFERRAL_COOKIE_DAYS = 90;

export function buyRate(tier: AffiliateTier) {
  return BUY_RATES[tier];
}

export function consumeRate(tier: AffiliateTier) {
  return CONSUME_RATES[tier];
}

export function maxStackPct() {
  const buy = AFFILIATE_TIERS.reduce((sum, t) => sum + BUY_RATES[t], 0);
  const consume = AFFILIATE_TIERS.reduce((sum, t) => sum + CONSUME_RATES[t], 0);
  return Math.round((buy + consume) * 1000) / 10;
}

export function commissionCents(baseCents: number, rate: number) {
  if (baseCents <= 0 || rate <= 0) return 0;
  return Math.floor(baseCents * rate);
}
