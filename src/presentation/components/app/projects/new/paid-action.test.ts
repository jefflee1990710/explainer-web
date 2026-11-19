import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FRAME_COST_USD,
  FRAMES_COST_USD,
  MIN_VIDEO_COST_USD,
} from "@/service/production-plan";
import { costForPaidKey, paidActionProject } from "@/presentation/components/app/projects/new/paid-action";

test("costForPaidKey maps enqueue keys to the charged USD amount", () => {
  assert.equal(costForPaidKey("video:3"), MIN_VIDEO_COST_USD);
  assert.equal(costForPaidKey("frames:2"), FRAMES_COST_USD);
  assert.equal(costForPaidKey("frame:1:start"), FRAME_COST_USD);
  assert.equal(costForPaidKey("clip:4:regen"), FRAMES_COST_USD);
  assert.equal(costForPaidKey("bulk"), 0);
});

test("paidActionProject is missing on enqueue-only success", () => {
  assert.equal(paidActionProject({ ok: true }), undefined);
  assert.equal(paidActionProject({ ok: false, error: "USD Credit 餘額不足，請加值或升級方案" }), undefined);
});
