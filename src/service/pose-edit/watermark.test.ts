import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { applyPoseWatermark } from "@/service/pose-edit/watermark";

test("applyPoseWatermark composites a Scro.io watermark onto the bottom-right corner", async () => {
  const solid = await sharp({
    create: {
      width: 600,
      height: 800,
      channels: 3,
      background: { r: 240, g: 240, b: 240 },
    },
  })
    .jpeg()
    .toBuffer();

  const watermarked = await applyPoseWatermark(solid);
  const meta = await sharp(watermarked).metadata();
  assert.equal(meta.width, 600);
  assert.equal(meta.height, 800);
  assert.equal(meta.format, "jpeg");
  assert.notDeepEqual(watermarked, solid);
});
