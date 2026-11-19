import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NEW_ACCOUNT_WINDOW_MS,
  accountEventKind,
  operatorAccountHtml,
  operatorAccountSubject,
  operatorSubscriptionHtml,
  operatorSubscriptionSubject,
  operatorSubscriptionText,
  paidPlanNotice,
} from "@/service/notify/operator-notice";

const now = Date.parse("2026-10-02T06:00:00.000Z");

test("a Firebase user created moments ago is a registration", () => {
  assert.equal(accountEventKind(now - 30_000, now), "registered");
  assert.equal(accountEventKind(now + 5_000, now), "registered");
  assert.equal(accountEventKind(now - NEW_ACCOUNT_WINDOW_MS - 1, now), "signed_in");
  assert.equal(accountEventKind(Number.NaN, now), "signed_in");
});

test("paid plan mail fires on first subscribe and upgrade, not renewal", () => {
  assert.deepEqual(paidPlanNotice({ status: "active", planId: "pro" }), { action: "notify" });
  assert.deepEqual(
    paidPlanNotice({ status: "active", planId: "pro", notifiedPlanId: "pro" }),
    { action: "skip" },
  );
  assert.deepEqual(
    paidPlanNotice({ status: "active", planId: "studio", notifiedPlanId: "pro" }),
    { action: "notify" },
  );
  assert.deepEqual(paidPlanNotice({ status: "past_due", planId: "pro", notifiedPlanId: "pro" }), {
    action: "skip",
  });
  assert.deepEqual(paidPlanNotice({ status: "canceled", planId: "pro", notifiedPlanId: "pro" }), {
    action: "clear",
  });
});

test("operator mail names the person and escapes html", () => {
  const at = new Date("2026-10-02T06:30:00.000Z");
  assert.equal(
    operatorAccountSubject({
      kind: "registered",
      name: "Ada",
      email: "ada@example.com",
      provider: "google.com",
      at,
    }),
    "新帳號 · ada@example.com",
  );
  const html = operatorAccountHtml({
    kind: "signed_in",
    name: "A<da>",
    email: "ada@example.com",
    provider: "password",
    at,
  });
  assert.match(html, /登入/);
  assert.match(html, /A&lt;da&gt;/);
  assert.doesNotMatch(html, /A<da>/);

  const subCopy = {
    name: "Ada",
    email: "ada@example.com",
    planName: "Pro",
    planNameZh: "專業",
    amountUsd: 129,
    monthlyCreditUsd: 129,
    status: "active",
    at,
  };
  const subText = operatorSubscriptionText(subCopy);
  assert.match(subText, /專業（Pro）/);
  assert.match(subText, /每月 USD Credit：\$129\.00/);
  assert.match(operatorSubscriptionHtml(subCopy), /每月 USD Credit/);
  assert.match(operatorSubscriptionHtml(subCopy), /\$129\.00/);
  assert.equal(
    operatorSubscriptionSubject(subCopy),
    "訂閱付費方案 · Pro · ada@example.com",
  );
});
