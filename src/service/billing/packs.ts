import type { CreditPackPrice, PackId } from "@/model/billing-settings";

export type { PackId };

export type CreditPack = {
  id: PackId;
  credits: number;
  amountUsd: number;
  nameZh: string;
  blurb: string;
};

export const PACK_IDS: PackId[] = ["pack30", "pack90", "pack200"];

// One-time packs reuse the same list prices as Starter / Pro / Studio.
export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  pack30: {
    id: "pack30",
    credits: 900,
    amountUsd: 59,
    nameZh: "小補充",
    blurb: "一次加上 900 credits。未用完的加購會留到下個週期。",
  },
  pack90: {
    id: "pack90",
    credits: 2100,
    amountUsd: 129,
    nameZh: "中補充",
    blurb: "一次加上 2,100 credits。未用完的加購會留到下個週期。",
  },
  pack200: {
    id: "pack200",
    credits: 4300,
    amountUsd: 249,
    nameZh: "大補充",
    blurb: "一次加上 4,300 credits。未用完的加購會留到下個週期。",
  },
};

// Stripe product label; shown on the hosted checkout page.
export function packProductName(pack: CreditPack) {
  return `Scro ${pack.nameZh} ${pack.credits} credits`;
}

// True while the stored Stripe price still matches the pack's amount and credits.
export function packPriceIsCurrent(stored: CreditPackPrice, pack: CreditPack) {
  return Boolean(stored.priceId) && stored.amountUsd === pack.amountUsd && stored.credits === pack.credits;
}

export function isPackId(value: string | undefined): value is PackId {
  return Boolean(value && PACK_IDS.includes(value as PackId));
}
