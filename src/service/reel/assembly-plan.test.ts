import assert from "node:assert/strict";
import { test } from "node:test";
import type { EditTransition } from "@/model/video-edit";
import { assemblyRatio, assemblyRuns } from "@/service/reel/assembly-plan";
import { mapLimit } from "@/util/map-limit";

const cut: EditTransition = { effect: "none", durationSec: 0.5 };
const fade: EditTransition = { effect: "fade", durationSec: 0.5 };

test("hard cuts keep every piece in its own run", () => {
  assert.deepEqual(assemblyRuns(3, [cut, cut]), [[0], [1], [2]]);
});

test("fades group neighbours so each group encodes once", () => {
  assert.deepEqual(assemblyRuns(5, [fade, cut, fade, fade]), [[0, 1], [2, 3, 4]]);
  assert.deepEqual(assemblyRuns(3, [fade, fade]), [[0, 1, 2]]);
});

test("assembly ratio walks download, prepare, then join", () => {
  assert.equal(assemblyRatio("download", 0, false), 0);
  assert.equal(assemblyRatio("join", 1, false), 1);
  assert.equal(assemblyRatio("join", 1, true), 1);
  assert.ok(assemblyRatio("prepare", 0, false) < assemblyRatio("join", 0, false));
  assert.ok(assemblyRatio("join", 0, true) < assemblyRatio("join", 0, false));
});

test("mapLimit keeps order and caps calls in flight", async () => {
  let active = 0;
  let peak = 0;
  const out = await mapLimit([30, 10, 20, 5, 1], 2, async (ms, index) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, ms));
    active -= 1;
    return index;
  });
  assert.deepEqual(out, [0, 1, 2, 3, 4]);
  assert.equal(peak, 2);
});
