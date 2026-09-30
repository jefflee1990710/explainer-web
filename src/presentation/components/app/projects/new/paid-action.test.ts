import assert from "node:assert/strict";
import { test } from "node:test";
import { FRAME_COST, FRAMES_COST, MIN_VIDEO_COST } from "@/service/production-plan";
import { costForPaidKey, paidActionProject } from "@/presentation/components/app/projects/new/paid-action";

test("costForPaidKey maps enqueue keys to the charged amount", () => {
  assert.equal(costForPaidKey("video:3"), MIN_VIDEO_COST);
  assert.equal(costForPaidKey("frames:2"), FRAMES_COST);
  assert.equal(costForPaidKey("frame:1:start"), FRAME_COST);
  assert.equal(costForPaidKey("clip:4:regen"), FRAMES_COST);
  assert.equal(costForPaidKey("bulk"), 0);
});

test("paidActionProject is missing on enqueue-only success", () => {
  assert.equal(paidActionProject({ ok: true }), undefined);
  assert.equal(paidActionProject({ ok: false, error: "x" }), undefined);
});
