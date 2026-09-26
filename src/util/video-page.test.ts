import assert from "node:assert/strict";
import { test } from "node:test";
import { pageCount, pageSlice } from "@/util/video-page";

test("pageSlice returns the first 10 items on page 1", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(pageSlice(items, 1), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("pageSlice returns leftover items on the last page", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(pageSlice(items, 3), [21, 22, 23]);
});

test("pageSlice clamps a page past the end to the last page", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(pageSlice(items, 99), [21, 22, 23]);
});

test("pageCount is 3 for 23 items", () => {
  assert.equal(pageCount(23), 3);
});

test("pageCount is 0 for an empty list", () => {
  assert.equal(pageCount(0), 0);
});
