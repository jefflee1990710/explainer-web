import assert from "node:assert/strict";
import { test } from "node:test";
import { jobNeedsResend } from "@/service/generation/task-advance";

const now = Date.parse("2026-09-29T12:00:00.000Z");

test("pending job is resent once it is due", () => {
  assert.equal(
    jobNeedsResend(
      { status: "pending", attempts: 0, nextAttemptAt: new Date(now - 1000) },
      now,
    ),
    true,
  );
  assert.equal(
    jobNeedsResend(
      { status: "pending", attempts: 0, nextAttemptAt: new Date(now + 60_000) },
      now,
    ),
    false,
  );
});

test("submitting job is resent only after its lock expires", () => {
  assert.equal(
    jobNeedsResend(
      { status: "submitting", attempts: 1, lockedUntil: new Date(now - 1000) },
      now,
    ),
    true,
  );
  assert.equal(
    jobNeedsResend(
      { status: "submitting", attempts: 1, lockedUntil: new Date(now + 60_000) },
      now,
    ),
    false,
  );
});

test("a job at the attempt cap is left for the timeout path", () => {
  assert.equal(
    jobNeedsResend(
      { status: "pending", attempts: 3, nextAttemptAt: new Date(now - 1000) },
      now,
    ),
    false,
  );
});
