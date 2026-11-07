import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLIP_MAX_SECONDS,
  CLIP_MIN_SECONDS,
  spokenClipSeconds,
  withSpokenClipDuration,
  withSpokenClipDurations,
} from "@/service/director/clip-seconds";
import { storyboardModelForSkill } from "@/service/director/model";

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

test("preservePlannedDuration keeps director-planned duration for silent/short story clips and expands when spoken line is longer", () => {
  const [silent10, clamped12, expanded10] = withSpokenClipDurations(
    [
      { durationSeconds: 10, timeRange: "0–10s", englishVo: "(no dialogue)" },
      { durationSeconds: 18, timeRange: "10–28s", englishVo: "Short." },
      {
        durationSeconds: 5,
        timeRange: "28–33s",
        englishVo:
          "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour",
      },
    ],
    "medium",
    { preservePlannedDuration: true },
  );
  assert.equal(silent10.durationSeconds, 10);
  assert.equal(silent10.timeRange, "0–10s");
  assert.equal(clamped12.durationSeconds, 12);
  assert.equal(clamped12.timeRange, "10–22s");
  assert.equal(expanded10.durationSeconds, 10);
  assert.equal(expanded10.timeRange, "22–32s");

  const single = withSpokenClipDuration(
    { durationSeconds: 9, timeRange: "x", englishVo: "(no dialogue)" },
    "medium",
    { preservePlannedDuration: true },
  );
  assert.equal(single.durationSeconds, 9);
  assert.equal(single.timeRange, "0–9s");
});

test("storyboardModelForSkill routes story-short-director to gemini-4-argon and keeps gemini-3.8-flash for others", () => {
  assert.equal(storyboardModelForSkill("story-short-director"), "gemini-4-argon");
  assert.equal(storyboardModelForSkill("cartoon-explainer-video-director"), "gemini-3.8-flash");
  assert.equal(storyboardModelForSkill(), "gemini-3.8-flash");
});

