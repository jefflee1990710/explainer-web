import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  applyTrueMonochromePass,
  evaluateDeplasticRules,
  measureDeplasticMetrics,
  rec709Luminance,
} from "@/service/style/deplastic-metrics";

async function makeSyntheticPng(
  width: number,
  height: number,
  pixelFn: (x: number, y: number) => [number, number, number],
): Promise<Buffer> {
  const buf = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      const offset = (y * width + x) * 3;
      buf[offset] = Math.max(0, Math.min(255, Math.round(r)));
      buf[offset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      buf[offset + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }
  return sharp(buf, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

test("Rec.709 luminance matches standard weights", () => {
  assert.equal(Math.round(rec709Luminance(255, 255, 255)), 255);
  assert.equal(rec709Luminance(0, 0, 0), 0);
});

test("Rule 11: detects flat front light vs grazing directional light with negative fill", async () => {
  // Flat front light: left and right halves of the face have almost identical brightness (~131 vs ~118)
  const flatImg = await makeSyntheticPng(64, 64, (x) => (x < 32 ? [132, 132, 132] : [118, 118, 118]));
  const flatMetrics = await measureDeplasticMetrics(flatImg);
  assert.ok(flatMetrics.grazingLightRatio < 1.2);
  const flatIssues = evaluateDeplasticRules(flatMetrics);
  assert.ok(flatIssues.some((issue) => issue.code === "flat_front_light"));

  // Grazing directional light: bright side ~150, negative-fill shadow side ~28 (ratio > 5x)
  const grazingImg = await makeSyntheticPng(64, 64, (x) => (x < 32 ? [150, 150, 150] : [28, 28, 28]));
  const grazingMetrics = await measureDeplasticMetrics(grazingImg);
  assert.ok(grazingMetrics.grazingLightRatio > 4.5);
  const grazingIssues = evaluateDeplasticRules(grazingMetrics);
  assert.ok(!grazingIssues.some((issue) => issue.code === "flat_front_light"));
});

test("Rule 6 & 10: flags clipped glowing emitters and unmotivated warm highlights", async () => {
  // Bright warm highlights (R=250, G=240, B=190) without a warm practical lamp
  const clippedWarmImg = await makeSyntheticPng(64, 64, (x) =>
    x < 32 ? [250, 245, 200] : [40, 45, 50],
  );
  const metrics = await measureDeplasticMetrics(clippedWarmImg);
  const issues = evaluateDeplasticRules(metrics, {
    hasGlowingSource: true,
    hasWarmPracticalLight: false,
  });
  assert.ok(issues.some((issue) => issue.code === "glowing_emitter_clipped"));
  assert.ok(issues.some((issue) => issue.code === "unmotivated_warm_highlights"));
});

test("Rule 3 & 4: validates underwater lifted black point and blue shadow tint", async () => {
  // Crushed neutral black in an underwater scene -> fails both Rule 3 and Rule 4
  const badUnderwater = await makeSyntheticPng(64, 64, (x) =>
    x < 32 ? [8, 8, 8] : [80, 110, 140],
  );
  const badMetrics = await measureDeplasticMetrics(badUnderwater);
  const badIssues = evaluateDeplasticRules(badMetrics, { medium: "underwater" });
  assert.ok(badIssues.some((issue) => issue.code === "underwater_shadow_not_blue"));
  assert.ok(badIssues.some((issue) => issue.code === "scattering_black_crushed"));

  // Proper underwater: lifted black point (>= 20) and blue-shifted shadows (R-B <= -38)
  const goodUnderwater = await makeSyntheticPng(64, 64, (x) =>
    x < 32 ? [10, 35, 60] : [90, 130, 175],
  );
  const goodMetrics = await measureDeplasticMetrics(goodUnderwater);
  const goodIssues = evaluateDeplasticRules(goodMetrics, { medium: "underwater" });
  assert.ok(!goodIssues.some((issue) => issue.code === "underwater_shadow_not_blue"));
  assert.ok(!goodIssues.some((issue) => issue.code === "scattering_black_crushed"));
});

test("Rule 2: detects residual chroma in pseudo-monochrome images and fixes it to 0.00 with applyTrueMonochromePass", async () => {
  const tintedGray = await makeSyntheticPng(32, 32, (x) =>
    x < 16 ? [120, 119, 118] : [40, 39, 38],
  );
  const tintedMetrics = await measureDeplasticMetrics(tintedGray);
  assert.ok(tintedMetrics.meanChroma > 0.5);
  const issues = evaluateDeplasticRules(tintedMetrics, { monochrome: true });
  assert.ok(issues.some((issue) => issue.code === "not_true_monochrome"));

  const trueMono = await applyTrueMonochromePass(tintedGray);
  const monoMetrics = await measureDeplasticMetrics(trueMono);
  assert.equal(monoMetrics.meanChroma, 0);
  assert.equal(evaluateDeplasticRules(monoMetrics, { monochrome: true }).some((i) => i.code === "not_true_monochrome"), false);
});

test("Rule 3 & 5: flags tinted night shadows and neon shadows in extreme dark scenes", async () => {
  // Extreme dark scene (>75% pixels < 16) with saturated blue-purple shadows (chroma > 12)
  const neonDark = await makeSyntheticPng(64, 64, (x) =>
    x < 56 ? [2, 0, 26] : [180, 140, 90],
  );
  const metrics = await measureDeplasticMetrics(neonDark);
  const issues = evaluateDeplasticRules(metrics, { medium: "night" });
  assert.ok(issues.some((issue) => issue.code === "dark_scene_neon_shadows"));
  assert.ok(issues.some((issue) => issue.code === "night_shadow_not_neutral"));
});
