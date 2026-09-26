import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasJobSince,
  orphanQueuedFrames,
  positionsToFail,
  unsubmittedPositions,
  type JobAttempt,
} from "@/service/higgsfield/job-attempts";

const since = new Date("2026-01-02T00:00:00Z");
const older = new Date("2026-01-01T00:00:00Z");
const newer = new Date("2026-01-03T00:00:00Z");

function job(framePosition: JobAttempt["framePosition"], createdAt: Date): JobAttempt {
  return { framePosition, createdAt };
}

test("unsubmittedPositions: no jobs at all → both positions missed", () => {
  assert.deepEqual(unsubmittedPositions([], since), ["start", "end"]);
});

test("unsubmittedPositions: only jobs from a previous attempt → both missed", () => {
  const jobs = [job("start", older), job("end", older)];
  assert.deepEqual(unsubmittedPositions(jobs, since), ["start", "end"]);
});

test("unsubmittedPositions: one fresh job → only the other position missed", () => {
  const jobs = [job("start", newer), job("end", older)];
  assert.deepEqual(unsubmittedPositions(jobs, since), ["end"]);
});

test("unsubmittedPositions: both fresh → nothing missed", () => {
  const jobs = [job("start", newer), job("end", since)];
  assert.deepEqual(unsubmittedPositions(jobs, since), []);
});

test("unsubmittedPositions: deferred end is not a missed charge", () => {
  const jobs = [job("start", newer)];
  assert.deepEqual(unsubmittedPositions(jobs, since, ["end"]), []);
});

test("positionsToFail: deferred end is failed when the start never went out", () => {
  assert.deepEqual(positionsToFail([], since, ["end"]), ["start", "end"]);
});

test("positionsToFail: deferred end stays when the start job exists", () => {
  assert.deepEqual(positionsToFail([job("start", newer)], since, ["end"]), []);
});

const stuckMs = 10 * 60 * 1000;
const now = Date.parse("2026-09-23T04:00:00Z");
const oldClaim = "2026-09-23T01:44:39.314Z";
const freshClaim = "2026-09-23T03:55:00.000Z";

test("orphanQueuedFrames releases a deferred end after its start already failed", () => {
  const released = orphanQueuedFrames(
    [
      { clipNumber: 1, position: "start", status: "failed", submittedAt: oldClaim },
      { clipNumber: 1, position: "end", status: "queued", submittedAt: oldClaim },
    ],
    [],
    now,
    stuckMs,
  );
  assert.deepEqual(released, [{ clipNumber: 1, position: "end" }]);
});

test("orphanQueuedFrames keeps a deferred end while the start job is still running", () => {
  const released = orphanQueuedFrames(
    [
      { clipNumber: 1, position: "start", status: "in_progress", submittedAt: oldClaim },
      { clipNumber: 1, position: "end", status: "queued", submittedAt: oldClaim },
    ],
    [{ clipIndex: 0, framePosition: "start", createdAt: new Date(oldClaim), kind: "frame" }],
    now,
    stuckMs,
  );
  assert.deepEqual(released, []);
});

test("orphanQueuedFrames ignores a claim that is still inside the submit window", () => {
  const released = orphanQueuedFrames(
    [
      { clipNumber: 1, position: "start", status: "queued", submittedAt: freshClaim },
      { clipNumber: 1, position: "end", status: "queued", submittedAt: freshClaim },
    ],
    [],
    now,
    stuckMs,
  );
  assert.deepEqual(released, []);
});

test("hasJobSince: only counts jobs created at or after the attempt", () => {
  assert.equal(hasJobSince([], since), false);
  assert.equal(hasJobSince([{ createdAt: older }], since), false);
  assert.equal(hasJobSince([{ createdAt: since }], since), true);
  assert.equal(hasJobSince([{ createdAt: older }, { createdAt: newer }], since), true);
});
