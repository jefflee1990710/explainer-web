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
  scroSwapCost,
  teleportCost,
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

test("packs cover $10, $20, $50, $100, $500, and $1,000 USD tiers", () => {
  assert.equal(CREDIT_PACKS.pack10.credits, 150);
  assert.equal(CREDIT_PACKS.pack20.credits, 310);
  assert.equal(CREDIT_PACKS.pack50.credits, 800);
  assert.equal(CREDIT_PACKS.pack100.credits, 1650);
  assert.equal(CREDIT_PACKS.pack500.credits, 8500);
  assert.equal(CREDIT_PACKS.pack1000.credits, 17500);
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

test("a stored Stripe pack price is replaced when its credits or amount change", () => {
  const pack = CREDIT_PACKS.pack50;
  const stored = { priceId: "price_1", productId: "prod_1", amountUsd: 50, credits: 800 };
  assert.equal(packPriceIsCurrent(stored, pack), true);
  assert.equal(packPriceIsCurrent({ ...stored, credits: 30 }, pack), false);
  assert.equal(packPriceIsCurrent({ priceId: "price_1", productId: "prod_1", amountUsd: 50 }, pack), false);
  assert.equal(packPriceIsCurrent({ ...stored, amountUsd: 49 }, pack), false);
  assert.equal(packPriceIsCurrent({ ...stored, priceId: "" }, pack), false);
  assert.equal(packProductName(pack), "Scro $50 儲值包 800 credits");
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

test("cinematic realistic video costs 15 credits per second", () => {
  assert.equal(videoCost(5, "realistic"), 75);
  assert.equal(videoCost(8, "realistic"), 120);
  assert.equal(videoCost(3, "doodle"), 45);
});

test("scroSwapCost and teleportCost charge 4 credits for static image swap and 4 + 15 credits/s for video/gif", () => {
  assert.equal(scroSwapCost({ mediaKind: "image", durationSeconds: 6 }), 4);
  assert.equal(scroSwapCost({ mediaKind: "video", durationSeconds: 6 }), 94);
  assert.equal(scroSwapCost({ mediaKind: "gif", durationSeconds: 5 }), 79);
  assert.equal(scroSwapCost({ mediaKind: "video", durationSeconds: 2 }), 34);
  assert.equal(teleportCost({ durationSeconds: 6 }), 94);
  assert.equal(teleportCost({ durationSeconds: 10 }), 154);
});

test("economy videoQualityTier bills 4 credits per second with no voice surcharge while 2k_cinema keeps 15 credits/s", () => {
  assert.equal(videoCost(6, "realistic", true, 15, "economy"), 24);
  assert.equal(videoCost(6, "doodle", true, 15, "economy"), 24);
  assert.equal(videoCost(6, "realistic", false, 15, "2k_cinema"), 90);
});

test("a new account can draw a 10-clip board and one realistic preview, but not a second clip", () => {
  assert.equal(WELCOME_CREDITS, 145);
  assert.equal(WELCOME_CREDITS >= 10 * FRAME_COST + videoCost(7, "realistic"), true);
  assert.equal(
    WELCOME_CREDITS < 10 * FRAME_COST + videoCost(7, "realistic") + videoCost(5, "realistic"),
    true,
  );
  assert.equal(WELCOME_CREDITS >= FRAMES_COST + MIN_VIDEO_COST, true);
});

test("upgrade is offered only when the wallet cannot pay for the video", () => {
  assert.equal(needsVideoUpgrade(20), true);
  assert.equal(needsVideoUpgrade(44), true);
  assert.equal(needsVideoUpgrade(45), false);
  assert.equal(needsVideoUpgrade(60, 72), true);
  assert.equal(needsVideoUpgrade(72, 72), false);
});

test("localizedPackName and localizedPackBlurb format packs according to selected locale", async () => {
  const { localizedPackBlurb, localizedPackName } = await import("@/service/billing/packs");
  const pack = CREDIT_PACKS.pack50;
  assert.equal(localizedPackName(pack, "en"), "$50 Credit Pack");
  assert.match(localizedPackBlurb(pack, "en"), /Adds 800 credits at once/);
  assert.equal(localizedPackName(pack, "zh-Hant"), "$50 儲值包");
  assert.match(localizedPackBlurb(pack, "zh-Hant"), /一次加上 800 credits/);
  assert.equal(localizedPackName(pack, "zh-Hans"), "$50 充值包");
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
