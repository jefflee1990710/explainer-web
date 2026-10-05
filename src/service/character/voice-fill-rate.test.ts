import assert from "node:assert/strict";
import { test } from "node:test";
import {
  VOICE_FILL_LIMIT,
  VOICE_FILL_WINDOW_MS,
  voiceFillRateLimited,
} from "@/service/character/voice-fill-rate";

const now = new Date("2026-10-05T08:00:00Z");

test("voice fill allows fewer than 5 in 5 minutes", () => {
  assert.equal(VOICE_FILL_LIMIT, 5);
  assert.equal(VOICE_FILL_WINDOW_MS, 5 * 60 * 1000);
  const recent = Array.from({ length: 4 }, () => new Date(now.getTime() - 60_000));
  assert.equal(voiceFillRateLimited(recent, now), false);
  assert.equal(voiceFillRateLimited(undefined, now), false);
});

test("voice fill blocks the 5th recent try and ignores older stamps", () => {
  const recent = Array.from({ length: 5 }, () => new Date(now.getTime() - 60_000));
  assert.equal(voiceFillRateLimited(recent, now), true);
  const mixed = [
    ...Array.from({ length: 10 }, () => new Date(now.getTime() - VOICE_FILL_WINDOW_MS - 1)),
    ...Array.from({ length: 4 }, () => new Date(now.getTime() - 30_000)),
  ];
  assert.equal(voiceFillRateLimited(mixed, now), false);
});
