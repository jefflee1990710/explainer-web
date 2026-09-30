import assert from "node:assert/strict";
import { test } from "node:test";
import { creditGrantLanded, isCreditGateError } from "@/service/billing/credit-gate";
import { checkoutUrls } from "@/service/billing/checkout-urls";
import { upgradeablePlans } from "@/service/billing/plans";

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
