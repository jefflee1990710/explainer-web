import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  cropVerticalTransparentMargin,
  decodeImageBufferFromOutputUrl,
  inferOnScreenTextSceneLanguage,
  onScreenTextPrompt,
} from "@/service/opencut/on-screen-text";

test("inferOnScreenTextSceneLanguage routes CJK text to zh-Hant and Latin text to en", () => {
  assert.equal(inferOnScreenTextSceneLanguage("Try it now!"), "en");
  assert.equal(inferOnScreenTextSceneLanguage("限時優惠 50% OFF"), "zh-Hant");
  assert.equal(inferOnScreenTextSceneLanguage("係咪真㗎"), "zh-Hant");
});

test("onScreenTextPrompt preserves exact user text and includes chroma-green background rule", () => {
  const prompt = onScreenTextPrompt({
    text: "  係咪真㗎？即刻試吓！ ",
    lookLine: "Look: bold condensed sans on torn-paper strips.",
  });
  assert.match(prompt, /The only words are: 係咪真㗎？即刻試吓！/);
  assert.match(prompt, /#00FF00/);
  assert.match(prompt, /torn-paper strips/);
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
