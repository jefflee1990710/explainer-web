import assert from "node:assert/strict";
import { test } from "node:test";
import { WELCOME_CREDIT_USD } from "@/service/billing/welcome-credits";
import {
  CREDIT_PACKS,
  localizedPackBlurb,
  localizedPackName,
  packPriceIsCurrent,
  packProductName,
} from "@/service/billing/packs";
import { planMarginPct, PLANS } from "@/service/billing/plans";
import { typicalGrossMargin } from "@/service/billing/unit-economics";
import {
  BLUEPRINT_COST_USD,
  chargedClipUsd,
  FRAME_COST_USD,
  FRAMES_COST_USD,
  IMAGE_COST_USD,
  MIN_VIDEO_COST_USD,
  needsVideoUpgradeUsd,
  scroSwapCostUsd,
  TALKING_HEAD_COST_PER_SECOND_USD,
  talkingHeadVideoCostUsd,
  teleportCostUsd,
  VIDEO_COST_PER_SECOND_USD,
  videoCostUsd,
} from "@/service/production-plan";

test("plans grant 1:1 USD monthly credit matching their list prices", () => {
  assert.equal(PLANS.starter.monthlyCreditUsd, 59);
  assert.equal(PLANS.pro.monthlyCreditUsd, 129);
  assert.equal(PLANS.studio.monthlyCreditUsd, 249);
  assert.equal(PLANS.scale.monthlyCreditUsd, 399);
  assert.deepEqual(
    [PLANS.starter.amountUsd, PLANS.pro.amountUsd, PLANS.studio.amountUsd, PLANS.scale.amountUsd],
    [59, 129, 249, 399],
  );
  for (const plan of Object.values(PLANS)) {
    assert.equal(plan.monthlyCreditUsd, plan.amountUsd);
    assert.equal(planMarginPct(plan), 33);
  }
});

test("packs cover $10, $20, $50, $100, $500, and $1,000 USD tiers at 1:1 base creditUsd", () => {
  assert.equal(CREDIT_PACKS.pack10.creditUsd, 10);
  assert.equal(CREDIT_PACKS.pack20.creditUsd, 20);
  assert.equal(CREDIT_PACKS.pack50.creditUsd, 50);
  assert.equal(CREDIT_PACKS.pack100.creditUsd, 100);
  assert.equal(CREDIT_PACKS.pack500.creditUsd, 500);
  assert.equal(CREDIT_PACKS.pack1000.creditUsd, 1000);
  assert.deepEqual(
    [
      CREDIT_PACKS.pack10.amountUsd,
      CREDIT_PACKS.pack20.amountUsd,
      CREDIT_PACKS.pack50.amountUsd,
      CREDIT_PACKS.pack100.amountUsd,
      CREDIT_PACKS.pack500.amountUsd,
      CREDIT_PACKS.pack1000.amountUsd,
    ],
    [10, 20, 50, 100, 500, 1000],
  );
});

test("a stored Stripe pack price is replaced when its creditUsd or amountUsd changes", () => {
  const pack = CREDIT_PACKS.pack50;
  const stored = { priceId: "price_1", productId: "prod_1", amountUsd: 50, creditUsd: 50 };
  assert.equal(packPriceIsCurrent(stored, pack), true);
  assert.equal(packPriceIsCurrent({ ...stored, creditUsd: 40 }, pack), false);
  assert.equal(packPriceIsCurrent({ priceId: "price_1", productId: "prod_1", amountUsd: 50 }, pack), false);
  assert.equal(packPriceIsCurrent({ ...stored, amountUsd: 49 }, pack), false);
  assert.equal(packPriceIsCurrent({ ...stored, priceId: "" }, pack), false);
  assert.equal(packProductName(pack), "Scro $50 儲值包 ($50.00 USD)");
});

test("image, frame, and blueprint USD constants are OpenRouter price × 1.5", () => {
  assert.equal(IMAGE_COST_USD, 0.135);
  assert.equal(FRAME_COST_USD, 0.135);
  assert.equal(FRAMES_COST_USD, 0.27);
  assert.equal(BLUEPRINT_COST_USD, 0.27);
});

test("standard video is billed Hailuo 3 × 1.5 with a 5s minimum across styles and quality tiers", () => {
  assert.equal(VIDEO_COST_PER_SECOND_USD, 0.195);
  assert.equal(MIN_VIDEO_COST_USD, 0.975);
  assert.equal(videoCostUsd(3), 0.975);
  assert.equal(videoCostUsd(5), 0.975);
  assert.equal(videoCostUsd(6.4), 1.17);
  assert.equal(videoCostUsd(8), 1.56);
  assert.equal(videoCostUsd(30), 2.925);
  assert.equal(videoCostUsd(Number.NaN), 0.975);
  assert.equal(videoCostUsd(6, "realistic", true, 15, "economy"), 1.17);
  assert.equal(videoCostUsd(6, "doodle", true, 15, "economy"), 1.17);
  assert.equal(videoCostUsd(6, "realistic", false, 15, "2k_cinema"), 1.17);
});

test("talking-head video is billed HeyGen Avatar IV × 1.5 up to 120 seconds", () => {
  assert.equal(TALKING_HEAD_COST_PER_SECOND_USD, 0.075);
  assert.equal(talkingHeadVideoCostUsd(5), 0.375);
  assert.equal(talkingHeadVideoCostUsd(60), 4.5);
  assert.equal(talkingHeadVideoCostUsd(150), 9);
});

test("scroSwapCostUsd and teleportCostUsd charge the Seedream still plus Hailuo seconds", () => {
  assert.equal(scroSwapCostUsd({ mediaKind: "image", durationSeconds: 6 }), 0.135);
  assert.equal(scroSwapCostUsd({ mediaKind: "video", durationSeconds: 6 }), 1.305);
  assert.equal(scroSwapCostUsd({ mediaKind: "gif", durationSeconds: 5 }), 1.11);
  assert.equal(scroSwapCostUsd({ mediaKind: "video", durationSeconds: 2 }), 0.525);
  assert.equal(teleportCostUsd({ durationSeconds: 6 }), 1.305);
  assert.equal(teleportCostUsd({ durationSeconds: 10 }), 2.085);
});

test("chargedClipUsd reads chargedUsd first, falls back to legacy creditsCharged, then duration estimate", () => {
  assert.equal(chargedClipUsd({ chargedUsd: 0.75, creditsCharged: 99, durationSeconds: 5 }), 0.75);
  assert.equal(chargedClipUsd({ creditsCharged: 12, durationSeconds: 5 }), 0.48);
  assert.equal(chargedClipUsd({ durationSeconds: 8 }), 1.56);
  assert.equal(chargedClipUsd(undefined), 0.975);
});

test("a new account receives $6.00 welcome USD credit covering a 10-clip board and preview clips", () => {
  assert.equal(WELCOME_CREDIT_USD, 6);
  assert.equal(WELCOME_CREDIT_USD >= 10 * FRAME_COST_USD + videoCostUsd(7, "realistic"), true);
  assert.equal(WELCOME_CREDIT_USD >= FRAMES_COST_USD + MIN_VIDEO_COST_USD, true);
});

test("upgrade is offered only when remaining USD credit cannot pay for the video", () => {
  assert.equal(needsVideoUpgradeUsd(0.25), true);
  assert.equal(needsVideoUpgradeUsd(0.49), true);
  assert.equal(needsVideoUpgradeUsd(0.975), false);
  assert.equal(needsVideoUpgradeUsd(0.75, 0.8), true);
  assert.equal(needsVideoUpgradeUsd(0.8, 0.8), false);
});

test("localizedPackName and localizedPackBlurb format USD packs according to selected locale", () => {
  const pack = CREDIT_PACKS.pack50;
  assert.equal(localizedPackName(pack, "en"), "$50 Credit Pack");
  assert.match(localizedPackBlurb(pack, "en"), /Adds \$50\.00 USD Credit at once/);
  assert.equal(localizedPackName(pack, "zh-Hant"), "$50 儲值包");
  assert.match(localizedPackBlurb(pack, "zh-Hant"), /一次加上 \$50\.00 USD Credit/);
  assert.equal(localizedPackName(pack, "zh-Hans"), "$50 充值包");
});

test("a 50% OpenRouter markup does not cover a 30% promo plus the 25% affiliate stack", () => {
  for (const plan of Object.values(PLANS)) {
    const netUsd = plan.amountUsd * 0.7 * 0.75;
    const margin = typicalGrossMargin(netUsd, plan.monthlyCreditUsd);
    assert.equal(margin < 0, true, `${plan.id} ${margin}`);
  }
});

test("a 50% OpenRouter markup does not cover a 20% discount plus the 25% affiliate stack", () => {
  for (const plan of Object.values(PLANS)) {
    const netUsd = plan.amountUsd * 0.8 * 0.75;
    const margin = typicalGrossMargin(netUsd, plan.monthlyCreditUsd);
    assert.equal(margin < 0, true, `${plan.id} ${margin}`);
  }
});
