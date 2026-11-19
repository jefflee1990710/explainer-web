import type { CreditLot, CreditLotSource } from "@/model/affiliate";
import {
  fromUsdUnits,
  LEGACY_CREDIT_TO_USD_RATE,
  legacyCreditsToUsd,
  roundUsd4,
  toUsdUnits,
} from "@/service/billing/usd";

export type LotSpendSliceUsd = {
  lotId: string;
  creditUsd: number;
  cashCentsPerUsd: number;
  amountCents: number;
  isLegacy: boolean;
};

export type LotSpendPlanUsd = {
  slices: LotSpendSliceUsd[];
  totalAmountCents: number;
};

export type FifoLotInput = Pick<
  CreditLot,
  | "_id"
  | "creditUsdRemaining"
  | "cashCentsPerUsd"
  | "creditsRemaining"
  | "creditsOriginal"
  | "usdPerCreditCents"
  | "amountPaidCents"
>;

// Real cash cents paid per $1.00 of granted USD credit (e.g. 85 for 15%-off promo, 1000/10.5 for 5%-bonus pack).
export function cashCentsPerUsd(amountPaidCents: number, creditUsd: number): number {
  if (
    !Number.isFinite(amountPaidCents) ||
    amountPaidCents <= 0 ||
    !Number.isFinite(creditUsd) ||
    creditUsd <= 0
  ) {
    return 0;
  }
  return amountPaidCents / creditUsd;
}

// Resolves a lot's remaining USD credit, lazily converting unmigrated legacy integer credit lots.
export function resolveLotUsdRemaining(
  lot: Pick<CreditLot, "creditUsdRemaining" | "creditsRemaining">,
): number {
  if (typeof lot.creditUsdRemaining === "number" && Number.isFinite(lot.creditUsdRemaining)) {
    return Math.max(0, roundUsd4(lot.creditUsdRemaining));
  }
  return legacyCreditsToUsd(lot.creditsRemaining ?? 0);
}

// Resolves a lot's real-cash cents per $1.00 USD credit, deriving from legacy fields when unmigrated.
export function resolveLotCashCentsPerUsd(
  lot: Pick<
    CreditLot,
    "cashCentsPerUsd" | "creditsOriginal" | "creditsRemaining" | "usdPerCreditCents" | "amountPaidCents"
  >,
): number {
  if (typeof lot.cashCentsPerUsd === "number" && Number.isFinite(lot.cashCentsPerUsd)) {
    return Math.max(0, lot.cashCentsPerUsd);
  }
  const origCredits = lot.creditsOriginal ?? lot.creditsRemaining ?? 0;
  if (origCredits > 0 && lot.amountPaidCents > 0) {
    return cashCentsPerUsd(lot.amountPaidCents, legacyCreditsToUsd(origCredits));
  }
  if (typeof lot.usdPerCreditCents === "number" && lot.usdPerCreditCents > 0) {
    return lot.usdPerCreditCents / LEGACY_CREDIT_TO_USD_RATE;
  }
  return 0;
}

// Pure FIFO planner in USD ($0.0001 precision) — callers persist the remaining balances.
export function planFifoSpendUsd(
  lots: FifoLotInput[],
  spendUsd: number,
): LotSpendPlanUsd {
  let remainingUnits = Math.max(0, toUsdUnits(spendUsd));
  const slices: LotSpendSliceUsd[] = [];
  let totalAmountCents = 0;

  for (const lot of lots) {
    if (remainingUnits <= 0) break;
    const isLegacy = typeof lot.creditUsdRemaining !== "number";
    const lotRemainingUsd = resolveLotUsdRemaining(lot);
    const lotRemainingUnits = Math.max(0, toUsdUnits(lotRemainingUsd));
    if (lotRemainingUnits <= 0) continue;

    const takeUnits = Math.min(lotRemainingUnits, remainingUnits);
    const takeUsd = fromUsdUnits(takeUnits);
    const rate = resolveLotCashCentsPerUsd(lot);
    const amountCents = Math.round(takeUsd * rate);
    slices.push({
      lotId: lot._id.toHexString(),
      creditUsd: takeUsd,
      cashCentsPerUsd: rate,
      amountCents,
      isLegacy,
    });
    totalAmountCents += amountCents;
    remainingUnits -= takeUnits;
  }

  // Fallback when no lots exist (legacy free balances): treat as $0 base → no commission.
  return { slices, totalAmountCents };
}

export type NewLotInput = {
  source: CreditLotSource;
  sourceId: string;
  creditUsd: number;
  amountPaidCents: number;
};
