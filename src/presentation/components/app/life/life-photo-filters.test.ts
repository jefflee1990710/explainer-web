import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIFE_PHOTO_FILTERS,
  applyLifePhotoFilter,
  lifePhotoFilterById,
} from "@/presentation/components/app/life/life-photo-filters";

// 2x2 RGBA test image: red, green, blue, mid grey.
function sample() {
  return new Uint8ClampedArray([
    220, 40, 40, 255,
    40, 200, 60, 255,
    30, 60, 210, 255,
    128, 128, 128, 255,
  ]);
}

test("original filter leaves pixels unchanged", () => {
  const data = sample();
  applyLifePhotoFilter(data, 2, 2, lifePhotoFilterById("original"), 1);
  assert.deepEqual(data, sample());
});

test("black and white makes every pixel grey and keeps alpha", () => {
  const data = sample();
  applyLifePhotoFilter(data, 2, 2, lifePhotoFilterById("bw"), 1);
  for (let i = 0; i < data.length; i += 4) {
    assert.equal(data[i], data[i + 1]);
    assert.equal(data[i + 1], data[i + 2]);
    assert.equal(data[i + 3], 255);
  }
});

test("zero intensity is the original image", () => {
  const data = sample();
  applyLifePhotoFilter(data, 2, 2, lifePhotoFilterById("gold200"), 0);
  assert.deepEqual(data, sample());
});

test("grain is seeded so the preview and export match", () => {
  const a = sample();
  const b = sample();
  applyLifePhotoFilter(a, 2, 2, lifePhotoFilterById("hp5"), 1);
  applyLifePhotoFilter(b, 2, 2, lifePhotoFilterById("hp5"), 1);
  assert.deepEqual(a, b);
});

test("every filter has a unique id and changes a colour image", () => {
  const ids = new Set(LIFE_PHOTO_FILTERS.map((filter) => filter.id));
  assert.equal(ids.size, LIFE_PHOTO_FILTERS.length);
  for (const filter of LIFE_PHOTO_FILTERS) {
    if (filter.id === "original") continue;
    const data = sample();
    applyLifePhotoFilter(data, 2, 2, filter, 1);
    assert.notDeepEqual(data, sample(), filter.id);
  }
});

test("unknown id falls back to the original filter", () => {
  assert.equal(lifePhotoFilterById("nope").id, "original");
});
