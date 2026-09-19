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

test("isProductionLike covers production, ready and legacy middle statuses", () => {
  assert.equal(isProductionLike("production"), true);
  assert.equal(isProductionLike("ready"), true);
  assert.equal(isProductionLike("generating"), true);
  assert.equal(isProductionLike("awaiting_approval"), false);
  assert.equal(isProductionLike("failed"), false);
});

test("failedStepFor: storyboard missing → 1, present → 2", () => {
  assert.equal(failedStepFor({}), 1);
  assert.equal(failedStepFor({ phaseA: { clips: [] } as never }), 2);
});

test("export stays locked until clips are ready; Next unlocks step 4", () => {
  assert.equal(stepVisualState(2, 2, false, false), "current");
  assert.equal(stepVisualState(3, 2, false, false), "todo");
  assert.equal(maxReachableStep(2, false), 2);

  assert.equal(stepVisualState(2, 2, true, false), "done");
  assert.equal(stepVisualState(3, 2, true, false), "current");
  assert.equal(maxReachableStep(2, true), 3);

  assert.equal(stepVisualState(3, 2, true, true), "done");
});
