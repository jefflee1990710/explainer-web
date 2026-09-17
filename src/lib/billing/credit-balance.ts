export type CreditBalance = {
  credits: number;
  bonusCredits: number;
  creditLimit: number;
};

export function applyMonthlyRefill(input: {
  monthlyCredits: number;
  bonusCredits: number;
}): CreditBalance {
  const bonusCredits = Math.max(0, input.bonusCredits || 0);
  const credits = input.monthlyCredits + bonusCredits;
  return { credits, bonusCredits, creditLimit: credits };
}

export function applySpend(state: CreditBalance, cost: number): CreditBalance {
  const credits = state.credits - cost;
  return {
    credits,
    bonusCredits: Math.min(state.bonusCredits || 0, credits),
    creditLimit: state.creditLimit,
  };
}

export function applyPackPurchase(state: CreditBalance, packCredits: number): CreditBalance {
  const baseLimit = Math.max(state.creditLimit || 0, state.credits);
  return {
    credits: state.credits + packCredits,
    bonusCredits: (state.bonusCredits || 0) + packCredits,
    creditLimit: baseLimit + packCredits,
  };
}

export function creditProgress(credits: number, creditLimit: number) {
  const remaining = Math.max(0, credits);
  const limit = Math.max(0, creditLimit);
  return {
    remaining,
    limit,
    ratio: limit === 0 ? 0 : Math.min(1, remaining / limit),
  };
}
