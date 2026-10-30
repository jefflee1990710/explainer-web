import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clipAppendNeedsKick,
  nextClipAppend,
  shiftPendingInserts,
  trimFailedClipAppends,
} from "@/service/clip/clip-append";

test("nextClipAppend resumes a writing job before the queue", () => {
  const next = nextClipAppend([
    { id: "q", insertAt: 2, status: "queued" },
    { id: "w", insertAt: 4, status: "writing" },
  ]);
  assert.equal(next?.id, "w");
});

test("nextClipAppend skips a mid-board insert while media is busy", () => {
  const next = nextClipAppend(
    [
      { id: "mid", insertAt: 2, status: "queued" },
      { id: "end", insertAt: 4, status: "queued" },
    ],
    { clipCount: 3, mediaBusy: true, reelBusy: false },
  );
  assert.equal(next?.id, "end");
});

test("shiftPendingInserts moves only later queued slots", () => {
  const next = shiftPendingInserts(
    [
      { id: "done", insertAt: 2, status: "writing" },
      { id: "after", insertAt: 4, status: "queued" },
      { id: "before", insertAt: 1, status: "queued" },
      { id: "failed", insertAt: 3, status: "failed" },
    ],
    "done",
    2,
    1,
  );
  assert.deepEqual(
    next.map((job) => [job.id, job.insertAt]),
    [
      ["after", 5],
      ["before", 1],
      ["failed", 3],
    ],
  );
});

test("trimFailedClipAppends keeps the newest five failures", () => {
  const jobs: Array<{ id: string; status: "failed" | "queued" }> = Array.from(
    { length: 7 },
    (_, index) => ({
      id: String(index),
      status: "failed",
    }),
  );
  jobs.push({ id: "live", status: "queued" });
  const kept = trimFailedClipAppends(jobs);
  assert.deepEqual(
    kept.map((job) => job.id),
    ["2", "3", "4", "5", "6", "live"],
  );
});

test("clipAppendNeedsKick waits while the lease is still held", () => {
  const now = Date.parse("2026-10-30T12:00:00.000Z");
  assert.equal(
    clipAppendNeedsKick(
      { clipAppends: [{ status: "writing" }], clipAppendLockUntil: new Date(now + 1000) },
      now,
    ),
    false,
  );
  assert.equal(
    clipAppendNeedsKick(
      { clipAppends: [{ status: "queued" }], clipAppendLockUntil: new Date(now - 1) },
      now,
    ),
    true,
  );
  assert.equal(clipAppendNeedsKick({ clipAppends: [{ status: "failed" }] }, now), false);
});
