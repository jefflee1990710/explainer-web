import assert from "node:assert/strict";
import { test } from "node:test";
import {
  failedStepFor,
  isProductionLike,
  maxReachableStep,
  normalizeProjectStatus,
  stepVisualState,
} from "./project-status";

test("legacy middle statuses normalise to production", () => {
  assert.equal(normalizeProjectStatus("frames_generating"), "production");
  assert.equal(normalizeProjectStatus("frames_ready"), "production");
  assert.equal(normalizeProjectStatus("approved"), "production");
  assert.equal(normalizeProjectStatus("generating"), "production");
});

test("non-legacy statuses pass through", () => {
  assert.equal(normalizeProjectStatus("draft"), "draft");
  assert.equal(normalizeProjectStatus("awaiting_approval"), "awaiting_approval");
  assert.equal(normalizeProjectStatus("production"), "production");
  assert.equal(normalizeProjectStatus("ready"), "ready");
  assert.equal(normalizeProjectStatus("failed"), "failed");
});

test("isProductionLike covers production, ready, leftover approval, and legacy middle statuses", () => {
  assert.equal(isProductionLike("production"), true);
  assert.equal(isProductionLike("ready"), true);
  assert.equal(isProductionLike("generating"), true);
  // Leftover projects that never clicked 核准分鏡 can still produce.
  assert.equal(isProductionLike("awaiting_approval"), true);
  assert.equal(isProductionLike("failed"), false);
  assert.equal(isProductionLike("phase_a"), false);
});

test("failedStepFor: storyboard missing or present both land on production", () => {
  assert.equal(failedStepFor({}), 1);
  assert.equal(failedStepFor({ phaseA: { clips: [] } as never }), 1);
});

test("export stays locked until clips are ready; Next unlocks step 3", () => {
  assert.equal(stepVisualState(1, 1, false, false), "current");
  assert.equal(stepVisualState(2, 1, false, false), "todo");
  assert.equal(maxReachableStep(1, false), 1);

  assert.equal(stepVisualState(1, 1, true, false), "done");
  assert.equal(stepVisualState(2, 1, true, false), "current");
  assert.equal(maxReachableStep(1, true), 2);

  assert.equal(stepVisualState(2, 1, true, true), "done");
});
