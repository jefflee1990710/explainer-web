import type { PackId } from "@/types/billing-settings";

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
    credits: 30,
    amountUsd: 59,
    nameZh: "小補充",
    blurb: "一次加上 30 credits，約 10 段 clips。未用完的加購會留到下個週期。",
  },
  pack90: {
    id: "pack90",
    credits: 90,
    amountUsd: 129,
    nameZh: "中補充",
    blurb: "一次加上 90 credits，約 30 段 clips。未用完的加購會留到下個週期。",
  },
  pack200: {
    id: "pack200",
    credits: 200,
    amountUsd: 249,
    nameZh: "大補充",
    blurb: "一次加上 200 credits，約 66 段 clips。未用完的加購會留到下個週期。",
  },
};

export function isPackId(value: string | undefined): value is PackId {
  return Boolean(value && PACK_IDS.includes(value as PackId));
}
