import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  buildRealisticToneLut,
  gradeRealisticImageBuffer,
  measureDePlasticMetrics,
  REALISTIC_VIDEO_GRADE_FILTER,
  realisticVideoGradeArgs,
} from "@/service/style/realistic-grade";

test("buildRealisticToneLut lifts black point above 8, preserves midtones near 1:1, and compresses highlights", () => {
  const lut = buildRealisticToneLut(12, 205);
  assert.equal(lut[0], 12);
  assert.equal(lut[255], 205);
  // Midtones (e.g. 115 and 128) stay bright and are never darkened by a global 0.72 multiplier
  assert.ok(lut[115] >= 115 && lut[115] <= 126, `expected lut[115] in [115, 126], got ${lut[115]}`);
  assert.ok(lut[128] >= 128 && lut[128] <= 138, `expected lut[128] in [128, 138], got ${lut[128]}`);
  // Monotonically non-decreasing across all 256 values
  for (let i = 1; i < 256; i += 1) {
    assert.ok(lut[i] >= lut[i - 1], `LUT not monotonic at index ${i}`);
  }
});

test("gradeRealisticImageBuffer fixes blown highlights (Rule 06), crushed blacks (Rule 07), and low grain sigma (Rule 07 & 12)", async () => {
  const width = 160;
  const height = 160;
  const raw = Buffer.alloc(width * height * 3);

  // Create a synthetic "AI plastic" frame with a smooth continuous ramp:
  // - Left 25%: crushed zero-blacks with muddy colour cast (R=2, G=0, B=6)
  // - Middle 50%: smooth cosine ramp from black to blown-out white (zero grain)
  // - Right 25%: blown-out pure-white window highlights (R=250, G=252, B=255)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 3;
      if (x < width * 0.25) {
        raw[idx] = 2;
        raw[idx + 1] = 0;
        raw[idx + 2] = 6;
      } else if (x < width * 0.75) {
        const t = (x - width * 0.25) / (width * 0.5);
        const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
        raw[idx] = Math.round(2 + s * (250 - 2));
        raw[idx + 1] = Math.round(0 + s * (252 - 0));
        raw[idx + 2] = Math.round(6 + s * (255 - 6));
      } else {
        raw[idx] = 250;
        raw[idx + 1] = 252;
        raw[idx + 2] = 255;
      }
    }
  }

  const inputPng = await sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();

  const before = await measureDePlasticMetrics(inputPng);
  assert.ok(before.blackPoint < 4, `expected crushed blackPoint < 4, got ${before.blackPoint}`);
  assert.ok(before.whitePoint > 245, `expected blown whitePoint > 245, got ${before.whitePoint}`);
  assert.ok(before.over235Pct > 20, `expected over235Pct > 20%, got ${before.over235Pct}`);
  assert.ok(before.grainSigma < 2, `expected smooth AI grainSigma < 2, got ${before.grainSigma}`);

  const gradedPng = await gradeRealisticImageBuffer(inputPng, { seed: 42 });
  const after = await measureDePlasticMetrics(gradedPng);

  // Rule 06: White point compressed <= 212, zero pixels > 235
  assert.ok(
    after.whitePoint <= 212,
    `expected graded whitePoint <= 212, got ${after.whitePoint.toFixed(2)}`,
  );
  assert.equal(after.over235Pct, 0, "expected 0% pixels over 235 after grading");

  // Rule 07: Black point lifted >= 8 so film grain is never swallowed by crushed zero-blacks
  assert.ok(
    after.blackPoint >= 8,
    `expected graded blackPoint >= 8, got ${after.blackPoint.toFixed(2)}`,
  );

  // Rule 07 & 12: Real 35mm film grain sigma in the 7.0 - 11.5 range
  assert.ok(
    after.grainSigma >= 7.0 && after.grainSigma <= 11.5,
    `expected graded grainSigma in [7.0, 11.5], got ${after.grainSigma.toFixed(2)}`,
  );
});

test("realisticVideoGradeArgs applies knee LUT (preserving midtones <=170 and rolling off highlights >170) and temporal film grain", () => {
  const args = realisticVideoGradeArgs("in.mp4", "out.mp4");
  assert.ok(args.includes("-vf"));
  assert.ok(args.includes(REALISTIC_VIDEO_GRADE_FILTER));
  assert.match(REALISTIC_VIDEO_GRADE_FILTER, /lutrgb=/);
  assert.match(REALISTIC_VIDEO_GRADE_FILTER, /lte\(val,170\)/);
  assert.doesNotMatch(REALISTIC_VIDEO_GRADE_FILTER, /val\*0\.72/);
  assert.match(REALISTIC_VIDEO_GRADE_FILTER, /noise=c0s=9:c0f=t\+u/);
});
