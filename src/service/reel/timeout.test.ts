import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_REEL_ATTEMPTS,
  REEL_STALE_GRACE_MS,
  isRetryableReelError,
  reelIsStale,
  reelRecovery,
  reelTimeoutMs,
} from "@/service/reel/timeout";

test("reel timeout grows with clip count and stays capped", () => {
  assert.equal(reelTimeoutMs(3), 180_000);
  assert.equal(reelTimeoutMs(10), 390_000);
  assert.equal(reelTimeoutMs(40), 600_000);
});

test("a fresh in-progress reel is left alone", () => {
  const now = Date.parse("2026-10-01T16:00:00.000Z");
  const updatedAt = new Date(now - 30_000).toISOString();
  assert.equal(reelIsStale(updatedAt, 3, now), false);
  assert.equal(
    reelRecovery({ reelStatus: "in_progress", updatedAt, clipCount: 3 }, now),
    null,
  );
});

test("a stale reel retries until the attempt cap, then fails", () => {
  const now = Date.parse("2026-10-01T16:00:00.000Z");
  const updatedAt = new Date(now - reelTimeoutMs(3) - REEL_STALE_GRACE_MS - 1).toISOString();
  assert.equal(
    reelRecovery({ reelStatus: "in_progress", updatedAt, clipCount: 3 }, now),
    "retry",
  );
  assert.equal(
    reelRecovery(
      { reelStatus: "queued", updatedAt, reelAttempts: MAX_REEL_ATTEMPTS - 1, clipCount: 3 },
      now,
    ),
    "retry",
  );
  assert.equal(
    reelRecovery(
      { reelStatus: "in_progress", updatedAt, reelAttempts: MAX_REEL_ATTEMPTS, clipCount: 3 },
      now,
    ),
    "fail",
  );
  assert.equal(
    reelRecovery({ reelStatus: "completed", updatedAt, clipCount: 3 }, now),
    null,
  );
});

test("missing clips and a missing encoder are not retried", () => {
  assert.equal(isRetryableReelError(new Error("缺少第 2 段影片")), false);
  assert.equal(isRetryableReelError(new Error("找不到 ffmpeg，無法合成成片")), false);
  assert.equal(isRetryableReelError(new Error("成片合成逾時")), true);
  assert.equal(isRetryableReelError(new Error("無法下載第 1 段（404）")), true);
});
