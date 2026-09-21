import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampClipSeconds,
  frameEndMoment,
  frameStartMoment,
  keyframeDeltaBand,
  keyframeDeltaDirectorBlock,
} from "./keyframe-delta";

test("clip seconds clamp to the 3–8 storyboard range", () => {
  assert.equal(clampClipSeconds(2), 3);
  assert.equal(clampClipSeconds(5.4), 5);
  assert.equal(clampClipSeconds(12), 8);
});

test("duration maps onto a change-budget band", () => {
  assert.equal(keyframeDeltaBand(3), "3s");
  assert.equal(keyframeDeltaBand(4), "4s");
  assert.equal(keyframeDeltaBand(6), "5-6s");
  assert.equal(keyframeDeltaBand(8), "7-8s");
});

test("director block asks for start and end states scaled by seconds", () => {
  const block = keyframeDeltaDirectorBlock();
  assert.match(block, /起始：/);
  assert.match(block, /3s:/);
  assert.match(block, /7–8s:/);
  assert.match(block, /must NOT look almost identical/);
  const separate = keyframeDeltaDirectorBlock({ separateStills: true });
  assert.match(separate, /startScene is the t=0 still/);
  assert.doesNotMatch(separate, /explainerScene writes both states/);
});

test("frame moments mention the clip duration and a readable end change", () => {
  assert.match(frameStartMoment(1, 5), /t=0s/);
  assert.match(frameStartMoment(1, 5), /5–6s/);
  const end = frameEndMoment(2, 8, "next scene");
  assert.match(end, /t=8s/);
  assert.match(end, /longer travel/);
  assert.match(end, /next scene/);
});
