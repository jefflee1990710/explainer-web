import assert from "node:assert/strict";
import { test } from "node:test";
import { CREDIT_PACKS } from "@/service/billing/packs";
import { PLANS } from "@/service/billing/plans";
import {
  adhocBonusPercent,
  packCreditsWithBonus,
  payPercent,
  signupDiscountPercent,
  signupPromoEnabled,
  signupPromoFold,
} from "@/service/billing/promo";
import { IMAGE_COGS_USD, typicalCogsUsd, typicalGrossMargin } from "@/service/billing/unit-economics";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";
import { FRAME_COST } from "@/service/credit-costs";

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

test("adhoc bonus defaults to 5 percent and scales pack credits", () => {
  withEnv({ ADHOC_CREDIT_BONUS_PERCENT: undefined }, () => {
    assert.equal(adhocBonusPercent(), 5);
  });
  withEnv({ ADHOC_CREDIT_BONUS_PERCENT: "0" }, () => {
    assert.equal(adhocBonusPercent(), 0);
    assert.equal(packCreditsWithBonus(900, 0), 900);
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
  assert.equal(packCreditsWithBonus(CREDIT_PACKS.pack30.credits, 5), 945);
  assert.equal(packCreditsWithBonus(CREDIT_PACKS.pack90.credits, 5), 2205);
  assert.equal(packCreditsWithBonus(CREDIT_PACKS.pack200.credits, 5), 4515);
});

test("permanent 85 percent pricing stays above the plan margin targets before affiliate", () => {
  for (const plan of Object.values(PLANS)) {
    const list = typicalGrossMargin(plan.amountUsd, plan.monthlyCredits);
    const discounted = typicalGrossMargin(plan.amountUsd * 0.85, plan.monthlyCredits);
    assert.equal(discounted < list, true, plan.id);
    assert.equal(discounted > 0.45, true, `${plan.id} ${discounted}`);
  }
});

test("a 5 percent pack bonus lowers margin and stays profitable", () => {
  for (const pack of Object.values(CREDIT_PACKS)) {
    const base = typicalGrossMargin(pack.amountUsd, pack.credits);
    const bonus = typicalGrossMargin(pack.amountUsd, packCreditsWithBonus(pack.credits, 5));
    assert.equal(bonus < base, true, pack.id);
    assert.equal(bonus > 0.7, true, `${pack.id} ${bonus}`);
  }
});

test("welcome credits spent only on images cost less than one dollar", () => {
  const images = WELCOME_CREDITS / FRAME_COST;
  assert.equal(images * IMAGE_COGS_USD < 1, true);
  assert.equal(typicalCogsUsd(WELCOME_CREDITS) < 1, true);
});
