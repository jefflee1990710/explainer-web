import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addUsd,
  formatUsd,
  formatUsdRate,
  LEGACY_CREDIT_TO_USD_RATE,
  legacyCreditsToUsd,
  mulUsd,
  roundUsd4,
  subUsd,
} from "@/service/billing/usd";

test("USD arithmetic avoids IEEE 754 floating-point drift and preserves 4 decimals", () => {
  assert.equal(addUsd(0.1, 0.2), 0.3);
  assert.equal(subUsd(6.0, 0.15), 5.85);
  assert.equal(subUsd(1.0, 0.0008), 0.9992);
  assert.equal(mulUsd(0.18, 7), 1.26);
  assert.equal(roundUsd4(0.12345), 0.1235);
});

test("legacyCreditsToUsd converts old integer credits at $0.04 each", () => {
  assert.equal(LEGACY_CREDIT_TO_USD_RATE, 0.04);
  assert.equal(legacyCreditsToUsd(145), 5.8);
  assert.equal(legacyCreditsToUsd(4), 0.16);
  assert.equal(legacyCreditsToUsd(-10), 0);
  assert.equal(legacyCreditsToUsd(Number.NaN), 0);
});

test("formatUsd formats standard amounts to 2 decimals and sub-cent amounts up to 4 decimals", () => {
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd(59), "$59.00");
  assert.equal(formatUsd(1234.5), "$1,234.50");
  assert.equal(formatUsd(0.15), "$0.15");
  assert.equal(formatUsd(0.0008), "$0.0008");
  assert.equal(formatUsd(0.0012), "$0.0012");
  assert.equal(formatUsd(0.004), "$0.004");
  assert.equal(formatUsd(-0.15), "-$0.15");
});

test("formatUsdRate formats per-second pricing cleanly", () => {
  assert.equal(formatUsdRate(0.1), "$0.10/s");
  assert.equal(formatUsdRate(0.18, "秒"), "$0.18/秒");
});
