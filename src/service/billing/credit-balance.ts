import type { AppUser } from "@/model/user";
import { addUsd, legacyCreditsToUsd, roundUsd4, subUsd } from "@/service/billing/usd";

// Canonical USD credit wallet state ($0.0001 precision).
export type UsdCreditBalance = {
  creditUsd: number;
  bonusCreditUsd: number;
  creditLimitUsd: number;
};

// Resolves canonical USD credit balances, lazily converting unmigrated legacy integer credit fields.
export function resolveUserUsdBalance(
  user: Pick<
    AppUser,
    "creditUsd" | "bonusCreditUsd" | "creditLimitUsd" | "credits" | "bonusCredits" | "creditLimit"
  >,
): UsdCreditBalance {
  if (typeof user.creditUsd === "number" && Number.isFinite(user.creditUsd)) {
    const creditUsd = roundUsd4(user.creditUsd);
    const bonusCreditUsd = roundUsd4(user.bonusCreditUsd ?? 0);
    const creditLimitUsd = roundUsd4(user.creditLimitUsd ?? creditUsd);
    return { creditUsd, bonusCreditUsd, creditLimitUsd };
  }
  const creditUsd = legacyCreditsToUsd(user.credits ?? 0);
  const bonusCreditUsd = legacyCreditsToUsd(user.bonusCredits ?? 0);
  const creditLimitUsd = legacyCreditsToUsd(user.creditLimit ?? user.credits ?? 0);
  return { creditUsd, bonusCreditUsd, creditLimitUsd };
}

// Resets monthly USD credit allowance on billing renewal while preserving leftover bonus pack USD.
export function applyMonthlyRefillUsd(input: {
  monthlyCreditUsd: number;
  bonusCreditUsd: number;
}): UsdCreditBalance {
  const monthlyCreditUsd = Math.max(0, roundUsd4(input.monthlyCreditUsd || 0));
  const bonusCreditUsd = Math.max(0, roundUsd4(input.bonusCreditUsd || 0));
  const creditUsd = addUsd(monthlyCreditUsd, bonusCreditUsd);
  return { creditUsd, bonusCreditUsd, creditLimitUsd: creditUsd };
}

// Consumes monthly USD allowance first and only touches bonusCreditUsd once monthly USD is exhausted.
export function applySpendUsd(state: UsdCreditBalance, costUsd: number): UsdCreditBalance {
  const cost = Math.max(0, roundUsd4(costUsd || 0));
  const creditUsd = subUsd(state.creditUsd, cost);
  const currentBonus = Math.max(0, roundUsd4(state.bonusCreditUsd || 0));
  return {
    creditUsd,
    bonusCreditUsd: Math.max(0, Math.min(currentBonus, creditUsd)),
    creditLimitUsd: roundUsd4(state.creditLimitUsd),
  };
}

// Adds a one-time top-up pack to spendable USD, permanent bonusCreditUsd, and the period denominator.
export function applyPackPurchaseUsd(
  state: UsdCreditBalance,
  packCreditUsd: number,
): UsdCreditBalance {
  const pack = Math.max(0, roundUsd4(packCreditUsd || 0));
  const currentCredit = roundUsd4(state.creditUsd || 0);
  const currentBonus = roundUsd4(state.bonusCreditUsd || 0);
  const baseLimit = Math.max(roundUsd4(state.creditLimitUsd || 0), currentCredit);
  return {
    creditUsd: addUsd(currentCredit, pack),
    bonusCreditUsd: addUsd(currentBonus, pack),
    creditLimitUsd: addUsd(baseLimit, pack),
  };
}

// Progress meter: remaining USD credit ratio against current period limit.
export function creditProgressUsd(creditUsd: number, creditLimitUsd: number) {
  const remaining = Math.max(0, roundUsd4(creditUsd));
  const limit = Math.max(0, roundUsd4(creditLimitUsd));
  return {
    remaining,
    limit,
    ratio: limit === 0 ? 0 : Math.min(1, remaining / limit),
  };
}

// Header meter: how much of this period's USD credit allowance has been spent.
export function creditsUsedUsd(creditUsd: number, creditLimitUsd: number) {
  const safeCredit = roundUsd4(creditUsd);
  const limit = Math.max(0, roundUsd4(creditLimitUsd), safeCredit);
  const remaining = Math.max(0, Math.min(safeCredit, limit));
  const used = subUsd(limit, remaining);
  return {
    used,
    remaining,
    limit,
    ratio: limit === 0 ? 0 : used / limit,
  };
}
