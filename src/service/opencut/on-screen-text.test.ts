import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  chooseOnScreenTextKeyColor,
  cropVerticalTransparentMargin,
  decodeImageBufferFromOutputUrl,
  inferOnScreenTextSceneLanguage,
  keyColorDifferencePng,
  onScreenTextPrompt,
} from "@/service/opencut/on-screen-text";

test("inferOnScreenTextSceneLanguage routes CJK text to zh-Hant and Latin text to en", () => {
  assert.equal(inferOnScreenTextSceneLanguage("Try it now!"), "en");
  assert.equal(inferOnScreenTextSceneLanguage("限時優惠 50% OFF"), "zh-Hant");
  assert.equal(inferOnScreenTextSceneLanguage("係咪真㗎"), "zh-Hant");
});

test("onScreenTextPrompt uses non-green key color (#FF00FF for Torn Paper, #0055FF for pink/neon styles)", () => {
  const tornPaperKey = chooseOnScreenTextKeyColor({
    textStyleId: "clean",
    lookLine: "Look: bold condensed sans on torn-paper strips. One strip is black with white type, another is bright green with black type.",
  });
  assert.equal(tornPaperKey.hex, "#FF00FF");

  const prompt = onScreenTextPrompt({
    text: "  Why ADHD work like this? ",
    lookLine: "Look: bold condensed sans on torn-paper strips.",
    keyColor: tornPaperKey,
  });
  assert.match(prompt, /The only words are: Why ADHD work like this\?/);
  assert.match(prompt, /#FF00FF/);
  assert.doesNotMatch(prompt, /flat #00FF00/);

  const neonKey = chooseOnScreenTextKeyColor({
    textStyleId: "neon",
    lookLine: "Look: neon glass tubing letters, cyan with a soft magenta halo.",
  });
  assert.equal(neonKey.hex, "#0055FF");
});

test("keyColorDifferencePng removes #FF00FF background while keeping Torn Paper bright green strip 100% opaque", async () => {
  const width = 120;
  const height = 80;
  const rgb = Buffer.alloc(width * height * 3);

  // Fill background with #FF00FF magenta
  for (let i = 0; i < width * height; i += 1) {
    rgb[i * 3] = 255;
    rgb[i * 3 + 1] = 0;
    rgb[i * 3 + 2] = 255;
  }

  // Paint top black strip (y: 15..35, x: 20..100)
  for (let y = 15; y <= 35; y += 1) {
    for (let x = 20; x <= 100; x += 1) {
      const idx = (y * width + x) * 3;
      rgb[idx] = 18;
      rgb[idx + 1] = 18;
      rgb[idx + 2] = 18;
    }
  }

  // Paint bottom bright green strip (#64E338 -> 100, 227, 56) (y: 40..62, x: 20..100)
  for (let y = 40; y <= 62; y += 1) {
    for (let x = 20; x <= 100; x += 1) {
      const idx = (y * width + x) * 3;
      rgb[idx] = 100;
      rgb[idx + 1] = 227;
      rgb[idx + 2] = 56;
    }
  }

  const inputPng = await sharp(rgb, {
    raw: { width, height, channels: 3 },
  })
    .png()
    .toBuffer();

  const { png: keyedPng, ratio } = await keyColorDifferencePng(
    inputPng,
    chooseOnScreenTextKeyColor({ textStyleId: "clean" }),
  );
  assert.ok(ratio > 0.3);

  const { data: outRgba } = await sharp(keyedPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Corner pixel (0, 0) must be transparent (alpha = 0)
  assert.equal(outRgba[3], 0);

  // Bright green strip pixel (x = 50, y = 50) must stay 100% opaque with original bright green RGB
  const greenIdx = (50 * width + 50) * 4;
  assert.equal(outRgba[greenIdx], 100);
  assert.equal(outRgba[greenIdx + 1], 227);
  assert.equal(outRgba[greenIdx + 2], 56);
  assert.equal(outRgba[greenIdx + 3], 255);
});

test("decodeImageBufferFromOutputUrl decodes data URL base64 without network call", async () => {
  const sample = Buffer.from("hello-opencut-plate", "utf8");
  const dataUrl = `data:image/png;base64,${sample.toString("base64")}`;
  const decoded = await decodeImageBufferFromOutputUrl(dataUrl);
  assert.deepEqual(decoded, sample);
});

test("cropVerticalTransparentMargin trims top and bottom transparent rows while keeping full width", async () => {
  const width = 320;
  const height = 180;
  const rgba = Buffer.alloc(width * height * 4, 0);

  // Paint an opaque band between y = 70 and y = 100
  for (let y = 70; y <= 100; y += 1) {
    for (let x = 40; x <= 280; x += 1) {
      const idx = (y * width + x) * 4;
      rgba[idx] = 255;
      rgba[idx + 1] = 255;
      rgba[idx + 2] = 255;
      rgba[idx + 3] = 255;
    }
  }

  const inputPng = await sharp(rgba, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const cropped = await cropVerticalTransparentMargin(inputPng, 16);
  const meta = await sharp(cropped).metadata();
  assert.equal(meta.width, width);
  // Band height is 31px + 16px top + 16px bottom = 63px (< 180px)
  assert.equal(meta.height, 63);
});
