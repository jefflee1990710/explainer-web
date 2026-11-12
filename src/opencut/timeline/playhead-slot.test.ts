import test from "node:test";
import assert from "node:assert/strict";
import { resolvePlayheadInsertSlot } from "./playhead-slot";

test("resolvePlayheadInsertSlot returns 1 when clips are empty", () => {
  assert.equal(resolvePlayheadInsertSlot({ playheadSeconds: 3, clipDurations: [] }), 1);
});

test("resolvePlayheadInsertSlot maps playhead within Clip 1 (0-6s) to insertAt 2", () => {
  const clips = [
    { clipNumber: 1, durationSeconds: 6 },
    { clipNumber: 2, durationSeconds: 6 },
  ];
  assert.equal(resolvePlayheadInsertSlot({ playheadSeconds: 2.5, clipDurations: clips }), 2);
});

test("resolvePlayheadInsertSlot at 0s inserts at 1", () => {
  const clips = [{ clipNumber: 1, durationSeconds: 6 }];
  assert.equal(resolvePlayheadInsertSlot({ playheadSeconds: 0, clipDurations: clips }), 1);
});

test("resolvePlayheadInsertSlot honors activeClipNumber if provided", () => {
  const clips = [
    { clipNumber: 1, durationSeconds: 6 },
    { clipNumber: 2, durationSeconds: 6 },
  ];
  assert.equal(
    resolvePlayheadInsertSlot({ playheadSeconds: 1, clipDurations: clips, activeClipNumber: 2 }),
    3,
  );
});

test("resolvePlayheadInsertSlot past total duration inserts at clips.length + 1", () => {
  const clips = [{ clipNumber: 1, durationSeconds: 6 }];
  assert.equal(resolvePlayheadInsertSlot({ playheadSeconds: 15, clipDurations: clips }), 2);
});
