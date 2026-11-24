import assert from "node:assert/strict";
import { test } from "node:test";
import { CREDIT_PACKS } from "@/service/billing/packs";
import { PLANS } from "@/service/billing/plans";
import {
  adhocBonusPercent,
  packCreditUsdWithBonus,
  payPercent,
  signupDiscountPercent,
  signupPromoEnabled,
  signupPromoFold,
} from "@/service/billing/promo";
import { IMAGE_COGS_USD, typicalCogsUsd, typicalGrossMargin } from "@/service/billing/unit-economics";
import { WELCOME_CREDIT_USD } from "@/service/billing/welcome-credits";
import { IMAGE_COST_USD } from "@/service/credit-costs";

const env = process.env;

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, env[key]);
    if (value == null) delete env[key];
    else env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value == null) delete env[key];
      else env[key] = value;
    }
  }
}

test("signup promo defaults on and can be switched off", () => {
  withEnv({ SIGNUP_PROMO_ENABLED: undefined }, () => {
    assert.equal(signupPromoEnabled(), true);
  });
  withEnv({ SIGNUP_PROMO_ENABLED: "0" }, () => {
    assert.equal(signupPromoEnabled(), false);
  });
  withEnv({ SIGNUP_PROMO_ENABLED: "on" }, () => {
    assert.equal(signupPromoEnabled(), true);
  });
});

test("adhoc bonus defaults to 5 percent and scales pack USD credit cleanly", () => {
  withEnv({ ADHOC_CREDIT_BONUS_PERCENT: undefined }, () => {
    assert.equal(adhocBonusPercent(), 5);
  });
  withEnv({ ADHOC_CREDIT_BONUS_PERCENT: "0" }, () => {
    assert.equal(adhocBonusPercent(), 0);
    assert.equal(packCreditUsdWithBonus(50, 0), 50);
  });
  withEnv({ SIGNUP_PROMO_FOLD: undefined }, () => {
    assert.equal(signupPromoFold(), 85);
    assert.equal(signupDiscountPercent(), 15);
  });
  withEnv({ SIGNUP_PROMO_FOLD: "80" }, () => {
    assert.equal(signupPromoFold(), 80);
    assert.equal(signupDiscountPercent(), 20);
  });
  withEnv({ SIGNUP_PROMO_FOLD: "0" }, () => {
    assert.equal(signupPromoFold(), 85);
  });
  assert.equal(payPercent(15), 85);
  assert.equal(packCreditUsdWithBonus(CREDIT_PACKS.pack10.creditUsd, 5), 10.5);
  assert.equal(packCreditUsdWithBonus(CREDIT_PACKS.pack20.creditUsd, 5), 21);
  assert.equal(packCreditUsdWithBonus(CREDIT_PACKS.pack50.creditUsd, 5), 52.5);
  assert.equal(packCreditUsdWithBonus(CREDIT_PACKS.pack100.creditUsd, 5), 105);
  assert.equal(packCreditUsdWithBonus(CREDIT_PACKS.pack500.creditUsd, 5), 525);
  assert.equal(packCreditUsdWithBonus(CREDIT_PACKS.pack1000.creditUsd, 5), 1050);
});

test("permanent 85 percent pricing keeps healthy gross margin on 1:1 USD plans", () => {
  for (const plan of Object.values(PLANS)) {
    const list = typicalGrossMargin(plan.amountUsd, plan.monthlyCreditUsd);
    const discounted = typicalGrossMargin(plan.amountUsd * 0.85, plan.monthlyCreditUsd);
    assert.equal(discounted < list, true, plan.id);
    assert.equal(discounted > 0.2, true, `${plan.id} ${discounted}`);
  }
});

test("a 5 percent pack bonus lowers margin slightly and stays highly profitable", () => {
  for (const pack of Object.values(CREDIT_PACKS)) {
    const base = typicalGrossMargin(pack.amountUsd, pack.creditUsd);
    const bonus = typicalGrossMargin(pack.amountUsd, packCreditUsdWithBonus(pack.creditUsd, 5));
    assert.equal(bonus < base, true, pack.id);
    assert.equal(bonus > 0.25, true, `${pack.id} ${bonus}`);
  }
});

test("welcome USD credit keeps COGS per signup near $1", () => {
  assert.equal(WELCOME_CREDIT_USD, 1.5);
  // $1.50 buys about 11 Seedream 2K stills. Provider cost is $0.09 each, about $1.
  assert.equal((WELCOME_CREDIT_USD / IMAGE_COST_USD) * IMAGE_COGS_USD < 1.1, true);
  assert.equal(typicalCogsUsd(WELCOME_CREDIT_USD) < 1.1, true);
});
