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
    assert.equal(planMarginPct(plan), 65);
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

test("image, frame, and blueprint USD constants match the standardized pricing table", () => {
  assert.equal(IMAGE_COST_USD, 0.15);
  assert.equal(FRAME_COST_USD, 0.15);
  assert.equal(FRAMES_COST_USD, 0.3);
  assert.equal(BLUEPRINT_COST_USD, 0.3);
});

test("standard video is billed $0.10/s with a 5s ($0.50) minimum across styles and quality tiers", () => {
  assert.equal(VIDEO_COST_PER_SECOND_USD, 0.1);
  assert.equal(MIN_VIDEO_COST_USD, 0.5);
  assert.equal(videoCostUsd(3), 0.5);
  assert.equal(videoCostUsd(5), 0.5);
  assert.equal(videoCostUsd(6.4), 0.6);
  assert.equal(videoCostUsd(8), 0.8);
  assert.equal(videoCostUsd(30), 1.5);
  assert.equal(videoCostUsd(Number.NaN), 0.5);
  assert.equal(videoCostUsd(6, "realistic", true, 15, "economy"), 0.6);
  assert.equal(videoCostUsd(6, "doodle", true, 15, "economy"), 0.6);
  assert.equal(videoCostUsd(6, "realistic", false, 15, "2k_cinema"), 0.6);
});

test("talking-head video is billed $0.18/s up to 120 seconds", () => {
  assert.equal(TALKING_HEAD_COST_PER_SECOND_USD, 0.18);
  assert.equal(talkingHeadVideoCostUsd(5), 0.9);
  assert.equal(talkingHeadVideoCostUsd(60), 10.8);
  assert.equal(talkingHeadVideoCostUsd(150), 21.6);
});

test("scroSwapCostUsd and teleportCostUsd charge $0.15 for image and $0.15 + $0.10/s for video/gif", () => {
  assert.equal(scroSwapCostUsd({ mediaKind: "image", durationSeconds: 6 }), 0.15);
  assert.equal(scroSwapCostUsd({ mediaKind: "video", durationSeconds: 6 }), 0.75);
  assert.equal(scroSwapCostUsd({ mediaKind: "gif", durationSeconds: 5 }), 0.65);
  assert.equal(scroSwapCostUsd({ mediaKind: "video", durationSeconds: 2 }), 0.35);
  assert.equal(teleportCostUsd({ durationSeconds: 6 }), 0.75);
  assert.equal(teleportCostUsd({ durationSeconds: 10 }), 1.15);
});

test("chargedClipUsd reads chargedUsd first, falls back to legacy creditsCharged, then duration estimate", () => {
  assert.equal(chargedClipUsd({ chargedUsd: 0.75, creditsCharged: 99, durationSeconds: 5 }), 0.75);
  assert.equal(chargedClipUsd({ creditsCharged: 12, durationSeconds: 5 }), 0.48);
  assert.equal(chargedClipUsd({ durationSeconds: 8 }), 0.8);
  assert.equal(chargedClipUsd(undefined), 0.5);
});

test("a new account receives $6.00 welcome USD credit covering a 10-clip board and preview clips", () => {
  assert.equal(WELCOME_CREDIT_USD, 6);
  assert.equal(WELCOME_CREDIT_USD >= 10 * FRAME_COST_USD + videoCostUsd(7, "realistic"), true);
  assert.equal(WELCOME_CREDIT_USD >= FRAMES_COST_USD + MIN_VIDEO_COST_USD, true);
});

test("upgrade is offered only when remaining USD credit cannot pay for the video", () => {
  assert.equal(needsVideoUpgradeUsd(0.25), true);
  assert.equal(needsVideoUpgradeUsd(0.49), true);
  assert.equal(needsVideoUpgradeUsd(0.5), false);
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

test("every 1:1 USD plan stays profitable at 30% off plus the full 25% affiliate stack", () => {
  for (const plan of Object.values(PLANS)) {
    const netUsd = plan.amountUsd * 0.7 * 0.75;
    const margin = typicalGrossMargin(netUsd, plan.monthlyCreditUsd);
    assert.equal(margin > 0.3, true, `${plan.id} ${margin}`);
  }
});

test("1:1 USD plans maintain healthy cash margin under worst-case 20% discount + 25% affiliate stack", () => {
  for (const plan of Object.values(PLANS)) {
    const netUsd = plan.amountUsd * 0.8 * 0.75;
    const margin = typicalGrossMargin(netUsd, plan.monthlyCreditUsd);
    assert.equal(margin >= 0.4, true, `${plan.id} ${margin}`);
  }
});
