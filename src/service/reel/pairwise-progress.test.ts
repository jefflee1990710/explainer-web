import assert from "node:assert/strict";
import { test } from "node:test";
import { pairwiseRatio, pairwiseUnitCount } from "@/service/reel/pairwise-progress";

test("three clips are five steps: download, download, join, download, join", () => {
  assert.equal(pairwiseUnitCount(3), 5);
  assert.equal(pairwiseRatio({ current: 1, total: 3, phase: "download" }, 1), 1 / 5);
  assert.equal(pairwiseRatio({ current: 2, total: 3, phase: "download" }, 1), 2 / 5);
  assert.equal(pairwiseRatio({ current: 2, total: 3, phase: "join" }, 1), 3 / 5);
  assert.equal(pairwiseRatio({ current: 3, total: 3, phase: "download" }, 0), 3 / 5);
  assert.equal(pairwiseRatio({ current: 3, total: 3, phase: "join" }, 1), 1);
});
