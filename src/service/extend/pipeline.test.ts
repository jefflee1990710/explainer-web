import assert from "node:assert/strict";
import test from "node:test";
import { legacyCreditsToUsd } from "@/service/billing/usd";
import { videoCostUsd } from "@/service/credit-costs";
import {
  EXTEND_CLIP_DURATION_SECONDS,
  extendJobCostUsd,
  resolveExtendRefundUsd,
} from "@/service/extend/pipeline";

test("extendJobCostUsd charges $0.60 for a 6s extend video", () => {
  assert.equal(EXTEND_CLIP_DURATION_SECONDS, 6);
  assert.equal(extendJobCostUsd(), 0.6);
  assert.equal(extendJobCostUsd(), videoCostUsd(EXTEND_CLIP_DURATION_SECONDS));
});

test("resolveExtendRefundUsd returns persisted chargedUsd when finite", () => {
  assert.equal(resolveExtendRefundUsd({ chargedUsd: 0.6 }), 0.6);
  assert.equal(resolveExtendRefundUsd({ chargedUsd: 0.75, creditsCharged: 12 }), 0.75);
});

test("resolveExtendRefundUsd respects chargedUsd: 0 without falling back", () => {
  assert.equal(resolveExtendRefundUsd({ chargedUsd: 0 }), 0);
  assert.equal(resolveExtendRefundUsd({ chargedUsd: 0, creditsCharged: 15 }), 0);
});

test("resolveExtendRefundUsd converts legacy creditsCharged when chargedUsd is missing", () => {
  assert.equal(resolveExtendRefundUsd({ creditsCharged: 12 }), legacyCreditsToUsd(12));
  assert.equal(resolveExtendRefundUsd({ creditsCharged: 12 }), 0.48);
  assert.equal(resolveExtendRefundUsd({ creditsCharged: 15 }), 0.6);
});

test("resolveExtendRefundUsd falls back to default 6s extend video cost when both fields are missing", () => {
  assert.equal(resolveExtendRefundUsd({}), 0.6);
  assert.equal(
    resolveExtendRefundUsd({ chargedUsd: undefined, creditsCharged: undefined }),
    videoCostUsd(EXTEND_CLIP_DURATION_SECONDS),
  );
  assert.equal(resolveExtendRefundUsd({ chargedUsd: Number.NaN }), 0.6);
});
