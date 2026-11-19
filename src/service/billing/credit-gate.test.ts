import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { creditGrantLanded, isCreditGateError } from "@/service/billing/credit-gate";
import {
  assertFreeTrialClipAllowed,
  evaluateCreditSpendGate,
  hasPaidOrCreditAccess,
} from "@/service/billing/credits";
import { WELCOME_CREDIT_USD } from "@/service/billing/welcome-credits";
import { checkoutUrls } from "@/service/billing/checkout-urls";
import { upgradeablePlans } from "@/service/billing/plans";
import {
  FRAME_COST_USD,
  FRAMES_COST_USD,
  MIN_VIDEO_COST_USD,
} from "@/service/credit-costs";

test("isCreditGateError matches subscribe and short-wallet copy", () => {
  assert.equal(isCreditGateError("請先訂閱方案才能產片"), true);
  assert.equal(isCreditGateError("USD Credit 餘額不足，請加值或升級方案"), true);
  assert.equal(isCreditGateError("USD Credit 餘額不足，無法扣款"), true);
  assert.equal(isCreditGateError("credits 不足，請加購或升級方案"), true);
  assert.equal(isCreditGateError("Insufficient USD Credit balance"), true);
  assert.equal(isCreditGateError("產生失敗"), false);
  assert.equal(isCreditGateError(undefined), false);
});

test("creditGrantLanded detects a pack top-up or a new subscription", () => {
  assert.equal(
    creditGrantLanded({ creditUsd: 0.5, subscribed: true }, { creditUsd: 11.0, subscribed: true }),
    true,
  );
  assert.equal(
    creditGrantLanded({ creditUsd: 6.0, subscribed: false }, { creditUsd: 65.0, subscribed: true }),
    true,
  );
  assert.equal(
    creditGrantLanded(
      { creditUsd: 59, subscribed: true, planId: "starter" },
      { creditUsd: 59, subscribed: true, planId: "pro" },
    ),
    true,
  );
  assert.equal(
    creditGrantLanded({ creditUsd: 6.0, subscribed: false }, { creditUsd: 6.0, subscribed: false }),
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

  const page = checkoutUrls({ packId: "pack50" });
  assert.match(page.success_url, /\/app\/billing\?checkout=success&pack=pack50/);
  assert.match(page.cancel_url, /\/app\/billing\?checkout=cancel/);
});

test("evaluateCreditSpendGate and assertFreeTrialClipAllowed allow unsubscribed users to spend welcome USD credit on images and Clip 1 preview, then prompt subscription on Clip 2+", () => {
  // Unsubscribed user with $6.00 welcome credit can create a blueprint ($0.30), frame ($0.15), or Clip 1 preview ($0.50)
  assert.equal(
    evaluateCreditSpendGate({
      email: "newuser@example.com",
      creditUsd: WELCOME_CREDIT_USD,
      costUsd: FRAMES_COST_USD,
      sub: null,
    }),
    null,
  );
  assert.equal(
    evaluateCreditSpendGate({
      email: "newuser@example.com",
      creditUsd: WELCOME_CREDIT_USD,
      costUsd: FRAME_COST_USD,
      sub: null,
    }),
    null,
  );
  assert.equal(
    evaluateCreditSpendGate({
      email: "newuser@example.com",
      creditUsd: WELCOME_CREDIT_USD,
      costUsd: MIN_VIDEO_COST_USD,
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

  // Free trial user trying to render Clip 2 without top-up gets top-up/subscription paywall
  assert.throws(
    () =>
      assertFreeTrialClipAllowed({
        email: "newuser@example.com",
        sub: null,
        clipNumber: 2,
      }),
    /加值 USD Credit 或訂閱方案/,
  );

  // Unsubscribed user who topped up USD credit is allowed to render Clip 2+ without subscribing
  assert.doesNotThrow(() =>
    assertFreeTrialClipAllowed({
      email: "newuser@example.com",
      sub: null,
      clipNumber: 2,
      bonusCreditUsd: 10.5,
    }),
  );
  assert.doesNotThrow(() =>
    assertFreeTrialClipAllowed({
      email: "newuser@example.com",
      sub: null,
      clipNumber: 3,
      hasPaidForClip: true,
    }),
  );

  // Unsubscribed user after exhausting welcome USD credit gets subscription prompt
  assert.throws(
    () =>
      evaluateCreditSpendGate({
        email: "newuser@example.com",
        creditUsd: 0.2,
        costUsd: MIN_VIDEO_COST_USD,
        sub: null,
      }),
    /請先訂閱方案才能產片/,
  );

  // Subscribed user with insufficient USD credit gets top-up prompt
  assert.throws(
    () =>
      evaluateCreditSpendGate({
        email: "pro@example.com",
        creditUsd: 0.1,
        costUsd: FRAME_COST_USD,
        sub: {
          _id: new ObjectId(),
          userId: new ObjectId(),
          clerkUserId: "u1",
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_1",
          stripePriceId: "price_1",
          planId: "pro",
          status: "active",
          monthlyCreditUsd: 129,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    /USD Credit 餘額不足，請加值或升級方案/,
  );
});

test("hasPaidOrCreditAccess checks USD balance and lazy legacy fallback", () => {
  assert.equal(
    hasPaidOrCreditAccess({ email: "a@example.com", creditUsd: 0.15, bonusCreditUsd: 0 }, null),
    true,
  );
  assert.equal(
    hasPaidOrCreditAccess({ email: "a@example.com", creditUsd: 0, bonusCreditUsd: 10.5 }, null),
    true,
  );
  assert.equal(
    hasPaidOrCreditAccess({ email: "a@example.com", credits: 10 }, null),
    true,
  );
  assert.equal(
    hasPaidOrCreditAccess({ email: "a@example.com", creditUsd: 0, bonusCreditUsd: 0 }, null),
    false,
  );
});
