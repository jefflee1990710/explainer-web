import assert from "node:assert/strict";
import { test } from "node:test";
import { settledAutoVideoClips } from "@/service/clip/auto-video-list";

test("settledAutoVideoClips: clips not kept for a retry are settled", () => {
  assert.deepEqual(settledAutoVideoClips([1, 2, 3], [2]), [1, 3]);
});

test("settledAutoVideoClips: everything still waiting → nothing to remove", () => {
  assert.deepEqual(settledAutoVideoClips([3, 1], [1, 3]), []);
});

test("settledAutoVideoClips: duplicates collapse and the result is sorted", () => {
  assert.deepEqual(settledAutoVideoClips([4, 2, 4, 1], []), [1, 2, 4]);
});

test("settledAutoVideoClips: empty pending list", () => {
  assert.deepEqual(settledAutoVideoClips([], []), []);
});
