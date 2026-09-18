import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { flattenToCanvas } from "./flatten";

test("transparent pixels become the canvas colour and alpha is dropped", async () => {
  const rgba = await sharp({
    create: {
      width: 2,
      height: 1,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  const out = await flattenToCanvas(rgba, "#2f4f3f");
  const { data, info } = await sharp(out)
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 3);
  assert.deepEqual([data[0], data[1], data[2]], [0x2f, 0x4f, 0x3f]);
});

test("opaque input passes through unchanged", async () => {
  const rgb = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: "#ffffff",
    },
  })
    .png()
    .toBuffer();
  const out = await flattenToCanvas(rgb, "#000000");
  assert.deepEqual(out, rgb);
});
