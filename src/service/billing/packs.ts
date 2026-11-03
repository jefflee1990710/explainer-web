import type { CreditPackPrice, PackId } from "@/model/billing-settings";

export type { PackId };

export type CreditPack = {
  id: PackId;
  credits: number;
  amountUsd: number;
  nameZh: string;
  blurb: string;
};

export const PACK_IDS: PackId[] = [
  "pack10",
  "pack20",
  "pack50",
  "pack100",
  "pack500",
  "pack1000",
];

// Pay-as-you-go one-time credit packs ($10, $20, $50, $100, $500, $1,000 USD).
export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  pack10: {
    id: "pack10",
    credits: 150,
    amountUsd: 10,
    nameZh: "$10 儲值包",
    blurb: "一次加上 150 credits。免訂閱即可購買使用，未用完的 credits 永久保留。",
  },
  pack20: {
    id: "pack20",
    credits: 310,
    amountUsd: 20,
    nameZh: "$20 儲值包",
    blurb: "一次加上 310 credits。免訂閱即可購買使用，未用完的 credits 永久保留。",
  },
  pack50: {
    id: "pack50",
    credits: 800,
    amountUsd: 50,
    nameZh: "$50 儲值包",
    blurb: "一次加上 800 credits。免訂閱即可購買使用，未用完的 credits 永久保留。",
  },
  pack100: {
    id: "pack100",
    credits: 1650,
    amountUsd: 100,
    nameZh: "$100 儲值包",
    blurb: "一次加上 1,650 credits。免訂閱即可購買使用，未用完的 credits 永久保留。",
  },
  pack500: {
    id: "pack500",
    credits: 8500,
    amountUsd: 500,
    nameZh: "$500 儲值包",
    blurb: "一次加上 8,500 credits。免訂閱即可購買使用，未用完的 credits 永久保留。",
  },
  pack1000: {
    id: "pack1000",
    credits: 17500,
    amountUsd: 1000,
    nameZh: "$1,000 儲值包",
    blurb: "一次加上 17,500 credits。免訂閱即可購買使用，未用完的 credits 永久保留。",
  },
};

// Stripe product label; shown on the hosted checkout page.
export function packProductName(pack: CreditPack) {
  return `Scro ${pack.nameZh} ${pack.credits} credits`;
}

// True while the stored Stripe price still matches the pack's amount and credits.
export function packPriceIsCurrent(stored: CreditPackPrice | undefined, pack: CreditPack) {
  return (
    Boolean(stored?.priceId) &&
    stored?.amountUsd === pack.amountUsd &&
    stored?.credits === pack.credits
  );
}

export function isPackId(value: string | undefined): value is PackId {
  return Boolean(value && PACK_IDS.includes(value as PackId));
}
