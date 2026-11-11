import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  chooseOnScreenTextKeyColor,
  cropVerticalTransparentMargin,
  decodeImageBufferFromOutputUrl,
  inferOnScreenTextSceneLanguage,
  inSceneOnScreenTextPrompt,
  extractFeatheredInSceneTextPatch,
  keyColorDifferencePng,
  onScreenTextPrompt,
} from "@/service/opencut/on-screen-text";
import { buildComfyMaskedTextInpaintGraph } from "@/service/comfy/submit-clip-video";
import { subtitleLookLine } from "@/service/director/subtitle-look";

test("inferOnScreenTextSceneLanguage routes Japanese Hiragana/Katakana to ja, Korean Hangul to ko, CJK Hanzi to zh-Hant, and Latin to en", () => {
  assert.equal(inferOnScreenTextSceneLanguage("Try it now!"), "en");
  assert.equal(inferOnScreenTextSceneLanguage("限時優惠 50% OFF"), "zh-Hant");
  assert.equal(inferOnScreenTextSceneLanguage("係咪真㗎"), "zh-Hant");
  assert.equal(inferOnScreenTextSceneLanguage("ひらがなとカタカナ"), "ja");
  assert.equal(inferOnScreenTextSceneLanguage("AIマーケティング"), "ja");
  assert.equal(inferOnScreenTextSceneLanguage("한국어 자막 테스트"), "ko");
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

test("inSceneOnScreenTextPrompt instructs in-scene redraw inside target box without touching faces", () => {
  const prompt = inSceneOnScreenTextPrompt({
    text: "見工無回音？",
    lookLine: "Look: bold condensed sans on torn-paper strips.",
    box: { x: 200, y: 500, w: 600, h: 200 },
    width: 1000,
    height: 1000,
  });
  assert.match(prompt, /見工無回音？/);
  assert.match(prompt, /exactly once/i);
  assert.match(prompt, /each word appears once/i);
  assert.match(prompt, /x=20%/);
  assert.match(prompt, /y=50%/);
  assert.match(prompt, /keep every human face/i);
});

test("inSceneOnScreenTextPrompt does not tell the model to fill every torn-paper strip", () => {
  const prompt = inSceneOnScreenTextPrompt({
    text: "90% of creators do not realize",
    lookLine: subtitleLookLine("clean"),
    box: { x: 200, y: 500, w: 600, h: 200 },
    width: 1000,
    height: 1000,
  });
  assert.match(prompt, /exactly once/i);
  assert.match(prompt, /each word appears once/i);
  assert.match(prompt, /do not repeat a word/i);
  assert.doesNotMatch(prompt, /never draw an empty blank strip/i);
  assert.doesNotMatch(prompt, /every strip contains words/i);
});

test("extractFeatheredInSceneTextPatch keeps painted text inside box opaque and unchanged background transparent", async () => {
  const width = 200;
  const height = 200;
  const origRgb = Buffer.alloc(width * height * 3, 30);
  const paintedRgb = Buffer.from(origRgb);

  // Paint white-on-red torn paper bar inside box (x: 50..150, y: 80..120)
  for (let y = 80; y < 120; y++) {
    for (let x = 50; x < 150; x++) {
      const i = (y * width + x) * 3;
      paintedRgb[i] = 230;
      paintedRgb[i + 1] = 40;
      paintedRgb[i + 2] = 40;
    }
  }

  const [origPng, paintedPng] = await Promise.all([
    sharp(origRgb, { raw: { width, height, channels: 3 } }).png().toBuffer(),
    sharp(paintedRgb, { raw: { width, height, channels: 3 } }).png().toBuffer(),
  ]);

  const { patchPng, ratio } = await extractFeatheredInSceneTextPatch({
    originalFrame: origPng,
    paintedFrame: paintedPng,
    box: { x: 40, y: 70, w: 120, h: 60 },
  });

  assert.ok(ratio > 0.05, `expected non-empty ratio, got ${ratio}`);
  const { data: outRgba } = await sharp(patchPng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Outside box (10, 10) must be transparent
  assert.equal(outRgba[(10 * width + 10) * 4 + 3], 0);
  // Painted center (100, 100) must be opaque red
  const centerIdx = (100 * width + 100) * 4;
  assert.equal(outRgba[centerIdx], 230);
  assert.equal(outRgba[centerIdx + 3], 255);
});

test("buildComfyMaskedTextInpaintGraph configures H3ObjectPlacementMask, MiniMaxH3ContexMaskedTarget, and MiniMaxH3AddGuide at frame 0", () => {
  const graph = buildComfyMaskedTextInpaintGraph({
    runId: "txt123",
    videoName: "clip.mp4",
    paintedStartFrameName: "painted0.jpg",
    section: { start: 0, length: 5 },
    boxNormalized: { x: 0.21, y: 0.54, width: 0.58, height: 0.22 },
    text: "見工無回音？",
    styleDescription: subtitleLookLine("clean"),
  });

  const changeTo = Object.values(graph)
    .map((node) => (node as { inputs?: { change_to?: unknown } }).inputs?.change_to)
    .find((value) => typeof value === "string");
  assert.match(String(changeTo), /each word once/i);
  assert.match(String(changeTo), /no second copy/i);
  assert.doesNotMatch(String(changeTo), /never draw an empty blank strip/i);
  assert.doesNotMatch(JSON.stringify(graph), /never draw an empty blank strip/i);

  assert.equal(graph.object_placement?.class_type, "H3ObjectPlacementMask");
  assert.equal(graph["43"]?.class_type, "MiniMaxH3FantasticVideoEditLatent");
  assert.equal(graph["44"]?.class_type, "MiniMaxH3ContexMaskedTarget");
  assert.equal(graph["44"]?.inputs.mask_meaning, "white = generate");
  assert.equal(graph.scro_first_frame_guide?.class_type, "MiniMaxH3AddGuide");
  assert.equal(graph.scro_first_frame_guide?.inputs.frame_idx, 0);
});
