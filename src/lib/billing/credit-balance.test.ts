import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyMonthlyRefill,
  applyPackPurchase,
  applySpend,
  creditProgress,
} from "./credit-balance";

test("monthly refill keeps leftover bonus and resets unused monthly", () => {
  const next = applyMonthlyRefill({ monthlyCredits: 90, bonusCredits: 30 });
  assert.deepEqual(next, {
    credits: 120,
    bonusCredits: 30,
    creditLimit: 120,
  });
});

test("spend consumes monthly first so bonus only shrinks after monthly is gone", () => {
  const afterMonthly = applySpend(
    { credits: 120, bonusCredits: 30, creditLimit: 120 },
    40,
  );
  assert.deepEqual(afterMonthly, {
    credits: 80,
    bonusCredits: 30,
    creditLimit: 120,
  });

  const afterBonus = applySpend(
    { credits: 120, bonusCredits: 30, creditLimit: 120 },
    100,
  );
  assert.deepEqual(afterBonus, {
    credits: 20,
    bonusCredits: 20,
    creditLimit: 120,
  });
});

test("pack purchase stacks onto remaining and raises the period limit", () => {
  const next = applyPackPurchase(
    { credits: 20, bonusCredits: 0, creditLimit: 90 },
    30,
  );
  assert.deepEqual(next, {
    credits: 50,
    bonusCredits: 30,
    creditLimit: 120,
  });
});

test("progress uses remaining over limit and clamps ratio", () => {
  assert.deepEqual(creditProgress(45, 90), {
    remaining: 45,
    limit: 90,
    ratio: 0.5,
  });
  assert.equal(creditProgress(0, 0).ratio, 0);
  assert.equal(creditProgress(120, 90).ratio, 1);
});
