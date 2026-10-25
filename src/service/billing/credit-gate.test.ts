import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { creditGrantLanded, isCreditGateError } from "@/service/billing/credit-gate";
import {
  assertFreeTrialClipAllowed,
  evaluateCreditSpendGate,
} from "@/service/billing/credits";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";
import { checkoutUrls } from "@/service/billing/checkout-urls";
import { upgradeablePlans } from "@/service/billing/plans";
import {
  FRAME_COST,
  FRAMES_COST,
  MIN_VIDEO_COST,
} from "@/service/production-plan";

test("isCreditGateError matches subscribe and short-wallet copy", () => {
  assert.equal(isCreditGateError("請先訂閱方案才能產片"), true);
  assert.equal(isCreditGateError("credits 不足，請加購或升級方案"), true);
  assert.equal(isCreditGateError("credits 不足，無法扣款"), true);
  assert.equal(isCreditGateError("產生失敗"), false);
  assert.equal(isCreditGateError(undefined), false);
});

test("creditGrantLanded detects a pack top-up or a new subscription", () => {
  assert.equal(
    creditGrantLanded({ credits: 8, subscribed: true }, { credits: 908, subscribed: true }),
    true,
  );
  assert.equal(
    creditGrantLanded({ credits: 20, subscribed: false }, { credits: 1000, subscribed: true }),
    true,
  );
  assert.equal(
    creditGrantLanded(
      { credits: 20, subscribed: true, planId: "starter" },
      { credits: 20, subscribed: true, planId: "pro" },
    ),
    true,
  );
  assert.equal(
    creditGrantLanded({ credits: 20, subscribed: false }, { credits: 20, subscribed: false }),
    false,
  );
});

test("upgradeablePlans lists only higher monthly plans", () => {
  assert.deepEqual(
    upgradeablePlans("starter").map((plan) => plan.id),
    ["pro", "studio", "scale"],
  );
  assert.deepEqual(
    upgradeablePlans("scale").map((plan) => plan.id),
    [],
  );
});

test("checkoutUrls send popup returns to the done page", () => {
  const popup = checkoutUrls({ planId: "pro" }, true);
  assert.match(popup.success_url, /\/checkout\/done\?checkout=success&plan=pro/);
  assert.match(popup.success_url, /session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(popup.cancel_url, /\/checkout\/done\?checkout=cancel/);

  const page = checkoutUrls({ packId: "pack90" });
  assert.match(page.success_url, /\/app\/billing\?checkout=success&pack=pack90/);
  assert.match(page.cancel_url, /\/app\/billing\?checkout=cancel/);
});

test("evaluateCreditSpendGate and assertFreeTrialClipAllowed allow unsubscribed users to spend welcome credits on images and Clip 1 preview, then prompt subscription on Clip 2+", () => {
  // Unsubscribed user with 80 welcome credits can create a character (8 cr), life photo (4 cr), or 1st 5s clip (45 cr)
  assert.equal(
    evaluateCreditSpendGate({
      email: "newuser@example.com",
      credits: WELCOME_CREDITS,
      cost: FRAMES_COST,
      sub: null,
    }),
    null,
  );
  assert.equal(
    evaluateCreditSpendGate({
      email: "newuser@example.com",
      credits: WELCOME_CREDITS,
      cost: FRAME_COST,
      sub: null,
    }),
    null,
  );
  assert.equal(
    evaluateCreditSpendGate({
      email: "newuser@example.com",
      credits: WELCOME_CREDITS,
      cost: MIN_VIDEO_COST,
      sub: null,
    }),
    null,
  );

  // Free trial user is allowed to render Clip 1
  assert.doesNotThrow(() =>
    assertFreeTrialClipAllowed({
      email: "newuser@example.com",
      sub: null,
      clipNumber: 1,
    }),
  );

  // Free trial user trying to render Clip 2 gets subscription paywall
  assert.throws(
    () =>
      assertFreeTrialClipAllowed({
        email: "newuser@example.com",
        sub: null,
        clipNumber: 2,
      }),
    /請先訂閱方案/,
  );

  // Unsubscribed user after exhausting welcome credits gets subscription prompt
  assert.throws(
    () =>
      evaluateCreditSpendGate({
        email: "newuser@example.com",
        credits: 11,
        cost: MIN_VIDEO_COST,
        sub: null,
      }),
    /請先訂閱方案才能產片/,
  );

  // Subscribed user with insufficient credits gets top-up prompt
  assert.throws(
    () =>
      evaluateCreditSpendGate({
        email: "pro@example.com",
        credits: 2,
        cost: FRAME_COST,
        sub: {
          _id: new ObjectId(),
          userId: new ObjectId(),
          clerkUserId: "u1",
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_1",
          stripePriceId: "price_1",
          planId: "pro",
          status: "active",
          monthlyCredits: 3333,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    /credits 不足，請加購或升級方案/,
  );
});
