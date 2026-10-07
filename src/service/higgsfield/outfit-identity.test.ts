import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { cropBlueprintFront, cropFigureFromCanvas } from "@/service/higgsfield/outfit-identity";

test("cropFigureFromCanvas drops the empty margin around a standing figure", async () => {
  const figure = await sharp({
    create: { width: 40, height: 120, channels: 3, background: "#222222" },
  })
    .png()
    .toBuffer();
  const canvas = await sharp({
    create: { width: 400, height: 200, channels: 3, background: "#ddd8d0" },
  })
    .composite([{ input: figure, left: 180, top: 40 }])
    .png()
    .toBuffer();

  const cropped = await cropFigureFromCanvas(canvas);
  const meta = await sharp(cropped).metadata();
  assert.ok((meta.width ?? 0) < 120, `width ${meta.width}`);
  assert.ok((meta.height ?? 0) > (meta.width ?? 0));
});

test("cropBlueprintFront takes a portrait slice from a landscape sheet", async () => {
  const sheet = await sharp({
    create: { width: 1344, height: 752, channels: 3, background: "#888888" },
  })
    .png()
    .toBuffer();
  const front = await cropBlueprintFront(sheet);
  const meta = await sharp(front).metadata();
  assert.ok((meta.height ?? 0) > (meta.width ?? 0));
  assert.ok((meta.width ?? 0) < 300);
});
