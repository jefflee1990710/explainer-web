import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkerTaskClaimFilter,
  computeWorkerRetryBackoffMs,
  inferWorkerTaskLane,
  shouldUseWorkerQueueOnly,
} from "@/service/worker/task-queue";

test("inferWorkerTaskLane routes Swap and Teleport to the gpu lane and Extend plus API jobs to the cpu lane", () => {
  assert.equal(inferWorkerTaskLane("jutsu_swap"), "gpu");
  assert.equal(inferWorkerTaskLane("teleport"), "gpu");
  assert.equal(inferWorkerTaskLane("extend"), "cpu");
  assert.equal(
    inferWorkerTaskLane("generation_submit", {
      generationKind: "video",
      useComfy: true,
    }),
    "gpu",
  );
  assert.equal(
    inferWorkerTaskLane("generation_submit", {
      generationKind: "frame",
      useComfy: false,
    }),
    "cpu",
  );
  assert.equal(inferWorkerTaskLane("storyboard_phase_a"), "cpu");
  assert.equal(inferWorkerTaskLane("reel_concat"), "cpu");
  assert.equal(inferWorkerTaskLane("final_render"), "cpu");
  assert.equal(inferWorkerTaskLane("life_shot"), "cpu");
  assert.equal(inferWorkerTaskLane("director_job"), "cpu");
});

test("buildWorkerTaskClaimFilter matches due pending tasks and expired in_progress leases", () => {
  const now = new Date("2026-11-08T01:30:00.000Z");
  const filter = buildWorkerTaskClaimFilter("gpu", now);
  assert.equal(filter.lane, "gpu");
  assert.equal(Array.isArray(filter.$or), true);
  assert.equal(filter.$or.length, 2);
});

test("computeWorkerRetryBackoffMs grows exponentially and caps at 5 minutes", () => {
  assert.equal(computeWorkerRetryBackoffMs(1), 5_000);
  assert.equal(computeWorkerRetryBackoffMs(2), 15_000);
  assert.equal(computeWorkerRetryBackoffMs(3), 45_000);
  assert.equal(computeWorkerRetryBackoffMs(10), 300_000);
});

test("shouldUseWorkerQueueOnly reads WORKER_QUEUE_ENABLED env flag", () => {
  assert.equal(shouldUseWorkerQueueOnly({ WORKER_QUEUE_ENABLED: "true" }), true);
  assert.equal(shouldUseWorkerQueueOnly({ WORKER_QUEUE_ENABLED: "1" }), true);
  assert.equal(shouldUseWorkerQueueOnly({ WORKER_QUEUE_ENABLED: "false" }), false);
  assert.equal(shouldUseWorkerQueueOnly({}), false);
});
