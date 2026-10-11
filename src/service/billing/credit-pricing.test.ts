import assert from "node:assert/strict";
import { test } from "node:test";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";
import { CREDIT_PACKS, packPriceIsCurrent, packProductName } from "@/service/billing/packs";
import { PLANS } from "@/service/billing/plans";
import { typicalGrossMargin } from "@/service/billing/unit-economics";
import {
  FRAME_COST,
  FRAMES_COST,
  MIN_VIDEO_COST,
  needsVideoUpgrade,
  videoCost,
} from "@/service/production-plan";

test("plans keep their prices and grant credits sized to the worst-case margins", () => {
  assert.equal(PLANS.starter.monthlyCredits, 1641);
  assert.equal(PLANS.pro.monthlyCredits, 3333);
  assert.equal(PLANS.studio.monthlyCredits, 5938);
  assert.equal(PLANS.scale.monthlyCredits, 8723);
  assert.deepEqual(
    [PLANS.starter.amountUsd, PLANS.pro.amountUsd, PLANS.studio.amountUsd, PLANS.scale.amountUsd],
    [59, 129, 249, 399],
  );
});

test("packs cost more per credit than the matching plan", () => {
  assert.equal(CREDIT_PACKS.pack30.credits, 900);
  assert.equal(CREDIT_PACKS.pack90.credits, 2100);
  assert.equal(CREDIT_PACKS.pack200.credits, 4300);
  assert.equal(CREDIT_PACKS.pack30.amountUsd, 59);
});

test("a stored Stripe pack price is replaced when its credits or amount change", () => {
  const pack = CREDIT_PACKS.pack30;
  const stored = { priceId: "price_1", productId: "prod_1", amountUsd: 59, credits: 900 };
  assert.equal(packPriceIsCurrent(stored, pack), true);
  assert.equal(packPriceIsCurrent({ ...stored, credits: 30 }, pack), false);
  assert.equal(packPriceIsCurrent({ priceId: "price_1", productId: "prod_1", amountUsd: 59 }, pack), false);
  assert.equal(packPriceIsCurrent({ ...stored, amountUsd: 49 }, pack), false);
  assert.equal(packPriceIsCurrent({ ...stored, priceId: "" }, pack), false);
  assert.equal(packProductName(pack), "Scro 小補充 900 credits");
});

test("each image costs 4 credits", () => {
  assert.equal(FRAME_COST, 4);
  assert.equal(FRAMES_COST, 8);
});

test("video is billed 9 credits per second with a 5 second minimum", () => {
  assert.equal(MIN_VIDEO_COST, 45);
  assert.equal(videoCost(3), 45);
  assert.equal(videoCost(5), 45);
  assert.equal(videoCost(6.4), 54);
  assert.equal(videoCost(8), 72);
  assert.equal(videoCost(30), 135);
  assert.equal(videoCost(Number.NaN), 45);
});

test("cinematic realistic video costs 47 credits per second", () => {
  assert.equal(videoCost(5, "realistic"), 235);
  assert.equal(videoCost(8, "realistic"), 376);
  assert.equal(videoCost(3, "doodle"), 45);
});

test("a new account can draw images but cannot render a video", () => {
  assert.equal(WELCOME_CREDITS, 20);
  assert.equal(WELCOME_CREDITS >= FRAMES_COST, true);
  assert.equal(WELCOME_CREDITS < MIN_VIDEO_COST, true);
});

test("upgrade is offered only when the wallet cannot pay for the video", () => {
  assert.equal(needsVideoUpgrade(20), true);
  assert.equal(needsVideoUpgrade(44), true);
  assert.equal(needsVideoUpgrade(45), false);
  assert.equal(needsVideoUpgrade(60, 72), true);
  assert.equal(needsVideoUpgrade(72, 72), false);
});

test("every plan stays profitable at 30% off plus the full affiliate stack", () => {
  for (const plan of Object.values(PLANS)) {
    const netUsd = plan.amountUsd * 0.7 * 0.75;
    const margin = typicalGrossMargin(netUsd, plan.monthlyCredits);
    assert.equal(margin > 0, true, `${plan.id} ${margin}`);
  }
});

test("worst-case cash margin is 30, 35, 40, and 45 percent", () => {
  const targets: Record<string, number> = { starter: 0.3, pro: 0.35, studio: 0.4, scale: 0.45 };
  for (const plan of Object.values(PLANS)) {
    const netUsd = plan.amountUsd * 0.8 * 0.75;
    const margin = typicalGrossMargin(netUsd, plan.monthlyCredits);
    const target = targets[plan.id];
    assert.equal(margin >= target && margin < target + 0.005, true, `${plan.id} ${margin}`);
  }
});
