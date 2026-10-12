import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { compositeSubtitleStill } from "@/service/video-edit/merge-subtitle-still";

async function solid(width: number, height: number, rgb: { r: number; g: number; b: number }) {
  return sharp({
    create: { width, height, channels: 3, background: rgb },
  })
    .png()
    .toBuffer();
}

async function plate(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

async function pixel(png: Buffer, x: number, y: number) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const index = (y * info.width + x) * info.channels;
  return [data[index], data[index + 1], data[index + 2]];
}

test("9:16 plate is centered at 62% of the frame height", async () => {
  const merged = await compositeSubtitleStill(
    await solid(100, 200, { r: 0, g: 0, b: 255 }),
    await plate(78, 10),
    "9:16",
  );
  const center = Math.round(200 * 0.62);
  assert.deepEqual(await pixel(merged, 50, center), [255, 0, 0]);
  assert.deepEqual(await pixel(merged, 0, 0), [0, 0, 255]);
});

test("16:9 plate sits above an 8% bottom inset", async () => {
  const merged = await compositeSubtitleStill(
    await solid(160, 90, { r: 0, g: 0, b: 255 }),
    await plate(125, 8),
    "16:9",
  );
  const inset = Math.round(90 * 0.08);
  const top = 90 - 8 - inset;
  assert.deepEqual(await pixel(merged, 80, top + 2), [255, 0, 0]);
  assert.deepEqual(await pixel(merged, 80, 89), [0, 0, 255]);
});
