import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { bleedDirectorPreview } from "@/service/director/preview-frame";

test("bleedDirectorPreview drops letterbox and keeps the frame ratio", async () => {
  const inner = await sharp({
    create: { width: 200, height: 60, channels: 3, background: { r: 220, g: 40, b: 40 } },
  })
    .png()
    .toBuffer();
  const letterboxed = await sharp({
    create: { width: 200, height: 120, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([{ input: inner, top: 30, left: 0 }])
    .png()
    .toBuffer();

  const filled = await bleedDirectorPreview(letterboxed);
  const meta = await sharp(filled).metadata();
  assert.equal(meta.width, 1280);
  // 200×60 content scaled by width, not stretched up to 16:9.
  assert.equal(meta.height, 384);
  const { data, info } = await sharp(filled).raw().toBuffer({ resolveWithObject: true });
  // Top edge is the red frame, and the left edge is still that frame (not cropped away).
  assert.ok(data[0] > 150, "top edge is still letterbox");
  assert.ok(data[info.width * info.channels - 3] > 150, "right edge was cropped off");
});

test("bleedDirectorPreview drops a white letterbox without eating the frames", async () => {
  const inner = await sharp({
    create: { width: 200, height: 80, channels: 3, background: { r: 40, g: 90, b: 200 } },
  })
    .png()
    .toBuffer();
  const letterboxed = await sharp({
    create: { width: 200, height: 160, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([{ input: inner, top: 40, left: 0 }])
    .png()
    .toBuffer();

  const filled = await bleedDirectorPreview(letterboxed);
  const { data } = await sharp(filled).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[2] > 150, "top edge is still white");
});
