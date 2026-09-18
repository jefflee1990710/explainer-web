import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import {
  canReframeOnCanvas,
  findContentBounds,
  hexToRgb,
  isNearCanvas,
  reframeBlueprintBuffer,
} from "./blueprint-framing";

const WHITE = { r: 255, g: 255, b: 255 };
const CHALK_HEX = "#2f4f3f";
const CHALK = { r: 0x2f, g: 0x4f, b: 0x3f };

test("isNearCanvas treats off-white pixels as background on a white canvas", () => {
  assert.equal(isNearCanvas(255, 255, 255, WHITE), true);
  assert.equal(isNearCanvas(245, 245, 245, WHITE), true);
  assert.equal(isNearCanvas(200, 200, 200, WHITE), false);
});

test("isNearCanvas uses the canvas colour, not white, as background", () => {
  assert.equal(isNearCanvas(0x2f, 0x4f, 0x3f, CHALK), true);
  // Within tolerance on every channel.
  assert.equal(isNearCanvas(0x2f + 10, 0x4f - 10, 0x3f + 5, CHALK), true);
  // White chalk on a chalkboard is content.
  assert.equal(isNearCanvas(255, 255, 255, CHALK), false);
});

test("hexToRgb parses 6-digit hex", () => {
  assert.deepEqual(hexToRgb(CHALK_HEX), CHALK);
  assert.deepEqual(hexToRgb("#ffffff"), WHITE);
  assert.deepEqual(hexToRgb("2F4F3F"), CHALK);
});

test("hexToRgb rejects anything that is not strict #rrggbb", () => {
  for (const bad of ["#fff", "#2f4f3f00", "white", "#2f4f3g", "", "#2f4f3f "]) {
    assert.throws(() => hexToRgb(bad), /invalid canvas colour/, bad);
  }
});

test("canReframeOnCanvas allows only near-white solid canvases", () => {
  assert.equal(canReframeOnCanvas("#ffffff"), true);
  // Watercolor paper: too warm/dark on the blue channel to be trusted.
  assert.equal(canReframeOnCanvas("#fbf6ea"), false);
  // Chalkboard: never near white.
  assert.equal(canReframeOnCanvas("#2f4f3f"), false);
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

  const bounds = findContentBounds(data, width, height, channels, WHITE);
  assert.deepEqual(bounds, { minX: 4, minY: 3, maxX: 4, maxY: 3 });
});

// Build a 1536x1024 chalkboard-coloured sheet, optionally with a coloured
// square on it, matching the real blueprint output size.
async function chalkboardSheet(square?: { left: number; top: number; size: number }) {
  const base = sharp({
    create: { width: 1536, height: 1024, channels: 3, background: CHALK_HEX },
  });
  if (!square) return base.png().toBuffer();
  const patch = await sharp({
    create: {
      width: square.size,
      height: square.size,
      channels: 3,
      background: { r: 230, g: 60, b: 40 },
    },
  })
    .png()
    .toBuffer();
  return base
    .composite([{ input: patch, left: square.left, top: square.top }])
    .png()
    .toBuffer();
}

test("findContentBounds on a chalkboard canvas finds only the coloured square", async () => {
  const square = { left: 600, top: 400, size: 200 };
  const sheet = await chalkboardSheet(square);
  const { data, info } = await sharp(sheet)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = findContentBounds(data, info.width, info.height, info.channels, CHALK);
  assert.deepEqual(bounds, {
    minX: square.left,
    minY: square.top,
    maxX: square.left + square.size - 1,
    maxY: square.top + square.size - 1,
  });
});

test("findContentBounds returns null when the sheet is nothing but canvas colour", async () => {
  const sheet = await chalkboardSheet();
  const { data, info } = await sharp(sheet)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(findContentBounds(data, info.width, info.height, info.channels, CHALK), null);
  // The reframe early-outs and hands back the original bytes untouched.
  assert.equal(await reframeBlueprintBuffer(sheet, CHALK_HEX), sheet);
});

test("reframeBlueprintBuffer composites onto the style canvas colour, not white", async () => {
  const sheet = await chalkboardSheet({ left: 600, top: 400, size: 200 });
  const out = await reframeBlueprintBuffer(sheet, CHALK_HEX);
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1536);
  assert.equal(info.height, 1024);

  const pixel = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const chalk = [CHALK.r, CHALK.g, CHALK.b];
  // Every corner sits in the margin and must be the canvas colour.
  assert.deepEqual(pixel(0, 0), chalk);
  assert.deepEqual(pixel(info.width - 1, 0), chalk);
  assert.deepEqual(pixel(0, info.height - 1), chalk);
  assert.deepEqual(pixel(info.width - 1, info.height - 1), chalk);
  // The square was scaled up to fill the inner area, so the centre is red.
  assert.deepEqual(pixel(768, 512), [230, 60, 40]);
});
