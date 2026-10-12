import assert from "node:assert/strict";
import sharp from "sharp";
import { test } from "node:test";
import { keyMagentaPng } from "@/service/higgsfield/subtitle-plate-job";

test("keyMagentaPng clears magenta and keeps a black pixel", async () => {
  const png = await sharp({
    create: { width: 2, height: 1, channels: 3, background: { r: 255, g: 0, b: 255 } },
  })
    .composite([{ input: await sharp({ create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toBuffer(), left: 0, top: 0 }])
    .png()
    .toBuffer();
  const keyed = await keyMagentaPng(png);
  assert.ok(keyed.ratio >= 0.01);
  const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 255);
  assert.equal(data[7], 0);
});
