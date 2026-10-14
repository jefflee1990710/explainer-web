import assert from "node:assert/strict";
import { test } from "node:test";
import {
  failedStepFor,
  isProductionLike,
  maxReachableStep,
  normalizeProjectStatus,
  PROJECT_STEP_IDS,
  stepVisualState,
} from "@/service/project-status";

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

test("failedStepFor: storyboard missing or present both land on video", () => {
  assert.equal(failedStepFor({}), 1);
  assert.equal(failedStepFor({ phaseA: { clips: [] } as never }), 1);
});

test("steps are input then video", () => {
  assert.deepEqual([...PROJECT_STEP_IDS], ["input", "video"]);
});

test("unlocks video when phase A is ready even if clips are not done", () => {
  assert.equal(maxReachableStep(1, true), 1);
});

test("does not unlock video when phase A is not ready and still on input", () => {
  assert.equal(maxReachableStep(0, false), 0);
});

test("video step is reachable once current is already video", () => {
  assert.equal(maxReachableStep(1, false), 1);
});

test("step visuals for two-step input → video", () => {
  assert.equal(stepVisualState(0, 0, false, false), "current");
  assert.equal(stepVisualState(1, 0, false, false), "todo");
  assert.equal(stepVisualState(1, 0, true, false), "current");
  assert.equal(stepVisualState(0, 1, true, false), "done");
  assert.equal(stepVisualState(1, 1, true, false), "current");
  assert.equal(stepVisualState(1, 1, true, true), "done");
});
