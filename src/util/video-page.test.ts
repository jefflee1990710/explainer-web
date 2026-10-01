import assert from "node:assert/strict";
import { test } from "node:test";
import { pageCount, pageSlice } from "@/util/video-page";

test("pageSlice returns the first 12 items on page 1", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(pageSlice(items, 1), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test("pageSlice returns leftover items on the last page", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(pageSlice(items, 2), [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
});

test("pageSlice clamps a page past the end to the last page", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(pageSlice(items, 99), [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
});

test("pageCount is 2 for 23 items", () => {
  assert.equal(pageCount(23), 2);
});

test("pageCount is 0 for an empty list", () => {
  assert.equal(pageCount(0), 0);
});
