import assert from "node:assert/strict";
import test from "node:test";
import { poseEditAspect } from "@/service/pose-edit/aspect";

test("poseEditAspect picks the nearest ratio and the narrower one on a tie", () => {
  assert.equal(poseEditAspect(1000, 1000), "1:1");
  assert.equal(poseEditAspect(300, 400), "3:4");
  assert.equal(poseEditAspect(9, 16), "9:16");
  assert.equal(poseEditAspect(undefined, 100), "3:4");
  // 0.875 is equally far from 1 and 0.75; the narrower ratio is 3:4.
  assert.equal(poseEditAspect(875, 1000), "3:4");
});
