import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyMonthlyRefillUsd,
  applyPackPurchaseUsd,
  applySpendUsd,
  creditProgressUsd,
  creditsUsedUsd,
  resolveUserUsdBalance,
} from "@/service/billing/credit-balance";

test("monthly refill resets monthly USD allowance while keeping leftover bonus pack USD", () => {
  const next = applyMonthlyRefillUsd({ monthlyCreditUsd: 59, bonusCreditUsd: 10.5 });
  assert.deepEqual(next, {
    creditUsd: 69.5,
    bonusCreditUsd: 10.5,
    creditLimitUsd: 69.5,
  });
});

test("spend consumes monthly USD first before touching bonusCreditUsd without floating-point drift", () => {
  const afterMonthly = applySpendUsd(
    { creditUsd: 69.5, bonusCreditUsd: 10.5, creditLimitUsd: 69.5 },
    0.15,
  );
  assert.deepEqual(afterMonthly, {
    creditUsd: 69.35,
    bonusCreditUsd: 10.5,
    creditLimitUsd: 69.5,
  });

  const afterBonus = applySpendUsd(
    { creditUsd: 69.5, bonusCreditUsd: 10.5, creditLimitUsd: 69.5 },
    65,
  );
  assert.deepEqual(afterBonus, {
    creditUsd: 4.5,
    bonusCreditUsd: 4.5,
    creditLimitUsd: 69.5,
  });
});

test("pack purchase adds to remaining and bonusCreditUsd and raises period limit", () => {
  const next = applyPackPurchaseUsd(
    { creditUsd: 5.85, bonusCreditUsd: 0, creditLimitUsd: 6 },
    10.5,
  );
  assert.deepEqual(next, {
    creditUsd: 16.35,
    bonusCreditUsd: 10.5,
    creditLimitUsd: 16.5,
  });
});

test("resolveUserUsdBalance reads canonical USD fields and lazily falls back from legacy integer credits", () => {
  assert.deepEqual(
    resolveUserUsdBalance({ creditUsd: 12.34, bonusCreditUsd: 2.5, creditLimitUsd: 59, credits: 9999 }),
    { creditUsd: 12.34, bonusCreditUsd: 2.5, creditLimitUsd: 59 },
  );
  assert.deepEqual(
    resolveUserUsdBalance({ credits: 145, bonusCredits: 25, creditLimit: 200 }),
    { creditUsd: 5.8, bonusCreditUsd: 1, creditLimitUsd: 8 },
  );
});

test("progress and used USD ratios compute accurately", () => {
  assert.deepEqual(creditProgressUsd(29.5, 59), { remaining: 29.5, limit: 59, ratio: 0.5 });
  assert.equal(creditProgressUsd(0, 0).ratio, 0);
  assert.equal(creditProgressUsd(70, 59).ratio, 1);

  assert.deepEqual(creditsUsedUsd(58.85, 59), {
    used: 0.15,
    remaining: 58.85,
    limit: 59,
    ratio: 0.15 / 59,
  });
  assert.equal(creditsUsedUsd(0, 0).ratio, 0);
  assert.equal(creditsUsedUsd(70, 59).used, 0);
});
