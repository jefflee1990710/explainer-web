import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PermanentJobError,
  PROVIDER_TIMEOUT_MS,
  isJobInFlight,
  isJobTerminal,
  providerTimedOut,
  retryDelayMs,
  shouldRetrySubmit,
} from "@/service/generation/task-policy";

test("pending and submitting count as in flight", () => {
  for (const status of ["pending", "submitting", "queued", "in_progress"] as const) {
    assert.equal(isJobInFlight(status), true, status);
  }
  for (const status of ["completed", "failed", "nsfw"] as const) {
    assert.equal(isJobInFlight(status), false, status);
    assert.equal(isJobTerminal(status), true, status);
  }
});

test("retry delay backs off 1 / 3 / 10 minutes", () => {
  assert.equal(retryDelayMs(1), 60_000);
  assert.equal(retryDelayMs(2), 3 * 60_000);
  assert.equal(retryDelayMs(3), 10 * 60_000);
  assert.equal(retryDelayMs(9), 10 * 60_000);
});

test("transient errors retry until the attempt cap; permanent never", () => {
  assert.equal(shouldRetrySubmit(new Error("network"), 1), true);
  assert.equal(shouldRetrySubmit(new Error("network"), 2), true);
  assert.equal(shouldRetrySubmit(new Error("network"), 3), false);
  assert.equal(shouldRetrySubmit(new PermanentJobError("找不到風格"), 1), false);
});

test("provider timeout uses submittedAt, falls back to createdAt", () => {
  const now = Date.parse("2026-09-28T12:00:00Z");
  const old = new Date(now - PROVIDER_TIMEOUT_MS - 1);
  const fresh = new Date(now - 60_000);
  assert.equal(providerTimedOut({ status: "queued", submittedAt: old, createdAt: fresh }, now), true);
  assert.equal(providerTimedOut({ status: "in_progress", createdAt: old }, now), true);
  assert.equal(providerTimedOut({ status: "queued", submittedAt: fresh, createdAt: old }, now), false);
  assert.equal(providerTimedOut({ status: "pending", createdAt: old }, now), false);
  assert.equal(providerTimedOut({ status: "completed", submittedAt: old, createdAt: old }, now), false);
});
