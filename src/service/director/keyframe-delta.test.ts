import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampClipSeconds,
  frameEndMoment,
  frameStartMoment,
  keyframeDeltaBand,
  keyframeDeltaDirectorBlock,
} from "@/service/director/keyframe-delta";

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
  assert.match(block, /exactly ONE instance of each named character/);
  assert.match(block, /never two bodies in one frame/);
  const separate = keyframeDeltaDirectorBlock({ separateStills: true });
  assert.match(separate, /startScene is the t=0 still/);
  assert.doesNotMatch(separate, /explainerScene writes both states/);
  const english = keyframeDeltaDirectorBlock({ language: "en" });
  assert.match(english, /Start:/);
  assert.doesNotMatch(english, /起始：/);
});

test("a cast on the whiteboard director stays put most of the time and varies the camera", () => {
  const block = keyframeDeltaDirectorBlock({ performance: true, separateStills: true });
  assert.match(block, /80%/);
  assert.match(block, /same side/);
  assert.match(block, /left to right/);
  assert.match(block, /right to left/);
  assert.match(block, /jump/);
  assert.match(block, /feet leave the ground/);
  assert.match(block, /pull/);
  assert.match(block, /push/);
  assert.match(block, /point toward the camera/);
  assert.match(block, /standing position/);
  assert.match(block, /from above/);
  assert.match(block, /do not repeat/);
  assert.match(block, /exactly ONE instance of each named character/);
  assert.doesNotMatch(block, /SAME locked camera/);
  const end = frameEndMoment(1, 6, undefined, true);
  assert.match(end, /head direction/);
  assert.doesNotMatch(end, /same side|Camera angle/);
  assert.doesNotMatch(end, /Same camera, character size/);
  assert.doesNotMatch(frameStartMoment(1, 6, true), /same side|locked camera/);
});

test("frame moments mention the clip duration and a readable end change", () => {
  assert.match(frameStartMoment(1, 5), /t=0s/);
  assert.match(frameStartMoment(1, 5), /5–6s/);
  const end = frameEndMoment(2, 8, "next scene with a very long opening description");
  assert.match(end, /t=8s/);
  assert.match(end, /longer travel/);
  assert.match(end, /hand off to the next clip on the same locked camera/);
  assert.doesNotMatch(end, /very long opening description/);
});
