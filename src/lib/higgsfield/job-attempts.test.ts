import assert from "node:assert/strict";
import { test } from "node:test";
import { hasJobSince, unsubmittedPositions, type JobAttempt } from "./job-attempts";

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

test("hasJobSince: only counts jobs created at or after the attempt", () => {
  assert.equal(hasJobSince([], since), false);
  assert.equal(hasJobSince([{ createdAt: older }], since), false);
  assert.equal(hasJobSince([{ createdAt: since }], since), true);
  assert.equal(hasJobSince([{ createdAt: older }, { createdAt: newer }], since), true);
});
