import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLIP_MAX_SECONDS,
  CLIP_MIN_SECONDS,
  spokenClipSeconds,
  withSpokenClipDuration,
  withSpokenClipDurations,
} from "@/service/director/clip-seconds";

test("a short line stays at 5 seconds and a longer line follows the pace", () => {
  assert.equal(CLIP_MIN_SECONDS, 5);
  assert.equal(CLIP_MAX_SECONDS, 12);
  assert.equal(spokenClipSeconds("Hello there.", "medium"), 5);
  assert.equal(spokenClipSeconds("(no dialogue)", "medium"), 5);
  assert.equal(spokenClipSeconds("", "slow"), 5);
  // 24 English words / 2.4 = 10s at medium. Slow divides by 0.8 and hits the cap.
  const line = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour";
  assert.equal(spokenClipSeconds(line, "medium"), 10);
  assert.equal(spokenClipSeconds(line, "fast"), 8);
  assert.equal(spokenClipSeconds(line, "slow"), 12);
  // 32 Chinese characters / 4 = 8s.
  assert.equal(spokenClipSeconds("一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二", "medium"), 8);
});

test("dual-beat duration uses both spoken halves and writes a running time range", () => {
  const [first, second] = withSpokenClipDurations(
    [
      {
        durationSeconds: 5,
        timeRange: "0–5s",
        englishVo: "ignored when beats exist",
        startVo: "one two three four five six seven eight nine ten eleven twelve",
        endVo: "thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour",
      },
      {
        durationSeconds: 5,
        timeRange: "5–10s",
        englishVo: "(no dialogue)",
      },
    ],
    "medium",
  );
  assert.equal(first.durationSeconds, 10);
  assert.equal(first.timeRange, "0–10s");
  assert.equal(second.durationSeconds, 5);
  assert.equal(second.timeRange, "10–15s");
  const single = withSpokenClipDuration(
    { durationSeconds: 5, timeRange: "x", englishVo: "Hello." },
    "fast",
  );
  assert.equal(single.durationSeconds, 5);
  assert.equal(single.timeRange, "0–5s");
});
