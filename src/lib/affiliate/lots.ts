import type { CreditLot, CreditLotSource } from "@/types/affiliate";

export type LotSpendSlice = {
  lotId: string;
  credits: number;
  usdPerCreditCents: number;
  amountCents: number;
};

export type LotSpendPlan = {
  slices: LotSpendSlice[];
  totalAmountCents: number;
};

// Pure FIFO planner — callers persist the remaining balances.
export function planFifoSpend(
  lots: Pick<CreditLot, "_id" | "creditsRemaining" | "usdPerCreditCents">[],
  credits: number,
): LotSpendPlan {
  let remaining = credits;
  const slices: LotSpendSlice[] = [];
  let totalAmountCents = 0;

  for (const lot of lots) {
    if (remaining <= 0) break;
    if (lot.creditsRemaining <= 0) continue;
    const take = Math.min(lot.creditsRemaining, remaining);
    const amountCents = take * lot.usdPerCreditCents;
    slices.push({
      lotId: lot._id.toHexString(),
      credits: take,
      usdPerCreditCents: lot.usdPerCreditCents,
      amountCents,
    });
    totalAmountCents += amountCents;
    remaining -= take;
  }

  // Fallback when no lots (legacy balances): treat as $0 base → no commission.
  return { slices, totalAmountCents };
}

export function usdPerCreditCents(amountPaidCents: number, credits: number) {
  if (credits <= 0) return 0;
  return Math.floor(amountPaidCents / credits);
}

export type NewLotInput = {
  source: CreditLotSource;
  sourceId: string;
  credits: number;
  amountPaidCents: number;
};
