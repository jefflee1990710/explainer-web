import assert from "node:assert/strict";
import { test } from "node:test";
import { findContentBounds, isNearWhite } from "./blueprint-framing";

test("isNearWhite treats off-white pixels as background", () => {
  assert.equal(isNearWhite(255, 255, 255), true);
  assert.equal(isNearWhite(245, 245, 245), true);
  assert.equal(isNearWhite(200, 200, 200), false);
});

test("findContentBounds ignores white margins around ink", () => {
  const width = 10;
  const height = 8;
  const channels = 4;
  const data = Buffer.alloc(width * height * channels, 255);
  // One dark pixel in the middle.
  const center = (3 * width + 4) * channels;
  data[center] = 0;
  data[center + 1] = 0;
  data[center + 2] = 0;
  data[center + 3] = 255;

  const bounds = findContentBounds(data, width, height, channels);
  assert.deepEqual(bounds, { minX: 4, minY: 3, maxX: 4, maxY: 3 });
});
