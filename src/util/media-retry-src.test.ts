import assert from "node:assert/strict";
import { test } from "node:test";
import { mediaRetrySrc } from "@/util/media-retry-src";

test("first paint uses the stored URL; later attempts cache-bust", () => {
  const src = "https://blob.example/frames/end";
  assert.equal(mediaRetrySrc(src, 0), src);
  assert.equal(mediaRetrySrc(src, 1), `${src}?retry=1`);
  assert.equal(mediaRetrySrc(`${src}?x=1`, 2), `${src}?x=1&retry=2`);
});
