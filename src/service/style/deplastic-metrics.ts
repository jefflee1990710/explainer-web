import sharp from "sharp";

// Quantitative de-plastic image metrics based on the 12-rule cinematography checklist:
// - Luminance: Rec.709 weighted (0.2126 R + 0.7152 G + 0.0722 B)
// - Black point / White point: 1st and 99th luminance percentiles
// - Highlight R-B: mean(R) - mean(B) of brightest 10% pixels
// - Shadow R-B: mean(R) - mean(B) of darkest 25% pixels
// - Chroma: mean(max(R,G,B) - min(R,G,B)) across whole frame, brights, and darks
// - Grain sigma: std dev of luminance residual (original minus Gaussian blur sigma=1.4)
// - Grazing light ratio: brighter half / darker half luminance ratio in subject region

export type DeplasticSceneContext = {
  // Rule 3 & 4: underwater, fog, or smoke scenes lift black point >= 20; underwater shadows lean blue.
  medium?: "normal" | "underwater" | "fog" | "smoke" | "night";
  // Rule 5 & 6: whether the shot features an active glowing emitter / lamp / screen.
  hasGlowingSource?: boolean;
  // Rule 10: whether a visible warm practical lamp / fire / sunset is in frame.
  hasWarmPracticalLight?: boolean;
  // Rule 2: whether the image is intended to be true monochrome B&W.
  monochrome?: boolean;
  // Optional bounding box (normalized 0..1) for the face/subject to measure Rule 11 left/right falloff.
  subjectBox?: { x: number; y: number; width: number; height: number };
};

export type DeplasticMetrics = {
  width: number;
  height: number;
  // Rule 4 & 7: 1st percentile luminance (0..255)
  blackPointP1: number;
  // Rule 6: 99th percentile luminance (0..255)
  whitePointP99: number;
  // Rule 2, 5, 7: fraction of pixels with luminance < 16 (0..1)
  darkPixelRatioBelow16: number;
  // Rule 6: fraction of pixels with luminance > 235 (0..1)
  blownHighlightRatioAbove235: number;
  // Rule 1 & 10: R - B average on brightest 10% pixels
  highlightRedMinusBlue: number;
  // Rule 3: R - B average on darkest 25% pixels
  shadowRedMinusBlue: number;
  // Rule 2 & 8: RGB max - min average across all pixels
  meanChroma: number;
  // Rule 5 & 8: RGB max - min average on brightest 10% pixels
  highlightChroma: number;
  // Rule 5 & 8: RGB max - min average on darkest 25% pixels
  shadowChroma: number;
  // Rule 7 & 12: standard deviation of luminance residual against sigma=1.4 Gaussian blur
  grainSigma: number;
  // Rule 7: grain sigma in mid/bright areas (luminance >= 48)
  grainSigmaBright: number;
  // Rule 7: grain sigma in crushed dark areas (luminance < 16)
  grainSigmaDark: number;
  // Rule 11: brighter-half / darker-half mean luminance ratio in subject region
  grazingLightRatio: number;
  leftHalfLuminance: number;
  rightHalfLuminance: number;
};

export type DeplasticIssue = {
  rule: number;
  code:
    | "not_true_monochrome"
    | "underwater_shadow_not_blue"
    | "night_shadow_not_neutral"
    | "scattering_black_crushed"
    | "dark_scene_neon_shadows"
    | "glowing_emitter_clipped"
    | "grain_swallowed_by_crushed_blacks"
    | "unmotivated_warm_highlights"
    | "flat_front_light";
  message: string;
  measured: number;
  target: string;
};

// Rule 2: Models leave residual chroma when prompted for B&W; convert to true 0.00-chroma grayscale in post.
export async function applyTrueMonochromePass(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer).grayscale().toColorspace("srgb").png().toBuffer();
}

// Rec.709 luminance in 0..255 range.
export function rec709Luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  const mean = sum / values.length;
  let sq = 0;
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - mean;
    sq += diff * diff;
  }
  return Math.sqrt(sq / values.length);
}

// Measure all 12-rule metrics from an image buffer (PNG/JPEG/WebP).
export async function measureDeplasticMetrics(
  imageBuffer: Buffer,
  options?: { subjectBox?: { x: number; y: number; width: number; height: number } },
): Promise<DeplasticMetrics> {
  const rawImage = sharp(imageBuffer).removeAlpha().toColorspace("srgb");
  const { data: raw, info } = await rawImage
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Rule 12: Gaussian blur with sigma = 1.4 for grain residual measurement.
  const { data: blurred } = await rawImage
    .clone()
    .blur(1.4)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const totalPixels = width * height;
  if (totalPixels === 0) {
    throw new Error("Image has zero pixels");
  }

  const indices = new Int32Array(totalPixels);
  const lum = new Float32Array(totalPixels);
  const chroma = new Float32Array(totalPixels);
  const redMinusBlue = new Float32Array(totalPixels);

  let darkBelow16Count = 0;
  let blownAbove235Count = 0;
  let chromaSum = 0;

  const residualsAll: number[] = [];
  const residualsBright: number[] = [];
  const residualsDark: number[] = [];

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 3;
    const r = raw[offset];
    const g = raw[offset + 1];
    const b = raw[offset + 2];

    const y = rec709Luminance(r, g, b);
    const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
    const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
    const c = maxC - minC;

    indices[i] = i;
    lum[i] = y;
    chroma[i] = c;
    redMinusBlue[i] = r - b;
    chromaSum += c;

    if (y < 16) darkBelow16Count++;
    if (y > 235) blownAbove235Count++;

    const br = blurred[offset];
    const bg = blurred[offset + 1];
    const bb = blurred[offset + 2];
    const by = rec709Luminance(br, bg, bb);
    const res = y - by;
    residualsAll.push(res);
    if (y >= 48) residualsBright.push(res);
    else if (y < 16) residualsDark.push(res);
  }

  // Sort pixel indices by luminance ascending for percentiles and top/bottom bands.
  const sorted = Array.from(indices).sort((a, b) => lum[a] - lum[b]);

  const p1Index = Math.min(totalPixels - 1, Math.max(0, Math.floor(totalPixels * 0.01)));
  const p99Index = Math.min(totalPixels - 1, Math.max(0, Math.floor(totalPixels * 0.99)));
  const blackPointP1 = lum[sorted[p1Index]];
  const whitePointP99 = lum[sorted[p99Index]];

  // Darkest 25% and brightest 10%.
  const darkBandCount = Math.max(1, Math.floor(totalPixels * 0.25));
  const brightBandCount = Math.max(1, Math.floor(totalPixels * 0.1));

  let shadowRbSum = 0;
  let shadowChromaSum = 0;
  for (let i = 0; i < darkBandCount; i++) {
    const idx = sorted[i];
    shadowRbSum += redMinusBlue[idx];
    shadowChromaSum += chroma[idx];
  }

  let highlightRbSum = 0;
  let highlightChromaSum = 0;
  for (let i = totalPixels - brightBandCount; i < totalPixels; i++) {
    const idx = sorted[i];
    highlightRbSum += redMinusBlue[idx];
    highlightChromaSum += chroma[idx];
  }

  // Rule 11: Left vs right luminance in the subject/face box (defaults to central 50% width/height).
  const box = options?.subjectBox ?? { x: 0.25, y: 0.2, width: 0.5, height: 0.5 };
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(box.x * width)));
  const x1 = Math.max(x0 + 1, Math.min(width, Math.ceil((box.x + box.width) * width)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(box.y * height)));
  const y1 = Math.max(y0 + 1, Math.min(height, Math.ceil((box.y + box.height) * height)));
  const midX = Math.floor((x0 + x1) / 2);

  let leftSum = 0;
  let leftCount = 0;
  let rightSum = 0;
  let rightCount = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * width + x;
      if (x < midX) {
        leftSum += lum[idx];
        leftCount++;
      } else {
        rightSum += lum[idx];
        rightCount++;
      }
    }
  }

  const leftMean = leftCount > 0 ? leftSum / leftCount : 0;
  const rightMean = rightCount > 0 ? rightSum / rightCount : 0;
  const brighter = Math.max(leftMean, rightMean);
  const darker = Math.max(1, Math.min(leftMean, rightMean));
  const grazingLightRatio = brighter / darker;

  return {
    width,
    height,
    blackPointP1: round1(blackPointP1),
    whitePointP99: round1(whitePointP99),
    darkPixelRatioBelow16: round2(darkBelow16Count / totalPixels),
    blownHighlightRatioAbove235: round2(blownAbove235Count / totalPixels),
    highlightRedMinusBlue: round1(highlightRbSum / brightBandCount),
    shadowRedMinusBlue: round1(shadowRbSum / darkBandCount),
    meanChroma: round2(chromaSum / totalPixels),
    highlightChroma: round1(highlightChromaSum / brightBandCount),
    shadowChroma: round1(shadowChromaSum / darkBandCount),
    grainSigma: round2(stdDev(residualsAll)),
    grainSigmaBright: round2(stdDev(residualsBright)),
    grainSigmaDark: round2(stdDev(residualsDark)),
    grazingLightRatio: round2(grazingLightRatio),
    leftHalfLuminance: round1(leftMean),
    rightHalfLuminance: round1(rightMean),
  };
}

// Evaluate measured numbers against the 12-rule cinematography checklist.
export function evaluateDeplasticRules(
  metrics: DeplasticMetrics,
  context: DeplasticSceneContext = {},
): DeplasticIssue[] {
  const issues: DeplasticIssue[] = [];

  // Rule 2: True monochrome must have 0.00 chroma.
  if (context.monochrome && metrics.meanChroma > 0.05) {
    issues.push({
      rule: 2,
      code: "not_true_monochrome",
      message: "黑白畫面殘留色偏（模型無法單靠 prompt 輸出純黑白，請使用後製轉灰階）",
      measured: metrics.meanChroma,
      target: "meanChroma === 0.00",
    });
  }

  // Rule 3: Underwater shadows must be blue (R - B <= -20), whereas night shadows stay neutral.
  if (context.medium === "underwater" && metrics.shadowRedMinusBlue > -20) {
    issues.push({
      rule: 3,
      code: "underwater_shadow_not_blue",
      message: "水下畫面的暗部不夠藍（水下暗部 R−B 應落在 −38 到 −63）",
      measured: metrics.shadowRedMinusBlue,
      target: "shadowRedMinusBlue <= -20",
    });
  }
  if (context.medium === "night" && Math.abs(metrics.shadowRedMinusBlue) > 15) {
    issues.push({
      rule: 3,
      code: "night_shadow_not_neutral",
      message: "夜景畫面的暗部偏色過重（夜景暗部應維持中性黑，R−B 約落在 −1 到 −7）",
      measured: metrics.shadowRedMinusBlue,
      target: "abs(shadowRedMinusBlue) <= 15",
    });
  }

  // Rule 4: Underwater, fog, or smoke scenes scatter light so black point must stay >= 20.
  if (
    (context.medium === "underwater" || context.medium === "fog" || context.medium === "smoke") &&
    metrics.blackPointP1 < 18
  ) {
    issues.push({
      rule: 4,
      code: "scattering_black_crushed",
      message: "水下／霧／煙環境把暗部壓太黑了（散射環境的黑點 P1 應墊高到 20 以上）",
      measured: metrics.blackPointP1,
      target: "blackPointP1 >= 20",
    });
  }

  // Rule 5: In extreme dark scenes (>75% pixels below 16), colour belongs only on the light source.
  if (metrics.darkPixelRatioBelow16 >= 0.75 && metrics.shadowChroma > 12) {
    issues.push({
      rule: 5,
      code: "dark_scene_neon_shadows",
      message: "極暗畫面的暗部殘留過多色度（九成暗部應去色，顏色只留給光源才不會像廉價霓虹）",
      measured: metrics.shadowChroma,
      target: "shadowChroma <= 12",
    });
  }

  // Rule 6: Glowing emitters must stay below ~190–210 P99 rather than clipping to 250+.
  if (context.hasGlowingSource && (metrics.whitePointP99 > 215 || metrics.blownHighlightRatioAbove235 > 0.01)) {
    issues.push({
      rule: 6,
      code: "glowing_emitter_clipped",
      message: "發光體過曝死白（白點 P99 衝太高會變成廉價 AI 特效感，應壓在 190–215 以下）",
      measured: metrics.whitePointP99,
      target: "whitePointP99 <= 215",
    });
  }

  // Rule 7: Grain and crushed blacks are mutually exclusive.
  if (
    metrics.grainSigmaBright >= 6 &&
    metrics.blackPointP1 < 2 &&
    metrics.darkPixelRatioBelow16 > 0.25 &&
    metrics.grainSigmaDark < metrics.grainSigmaBright * 0.3
  ) {
    issues.push({
      rule: 7,
      code: "grain_swallowed_by_crushed_blacks",
      message: "暗部壓死到 0 把底片顆粒吞掉了（要保留顆粒感，黑點 P1 應微抬至 6–20）",
      measured: metrics.blackPointP1,
      target: "blackPointP1 >= 6",
    });
  }

  // Rule 10: Warm highlights belong only on shots with a visible warm practical light source.
  if (context.hasWarmPracticalLight === false && metrics.highlightRedMinusBlue > 20) {
    issues.push({
      rule: 10,
      code: "unmotivated_warm_highlights",
      message: "畫面沒有可見暖光源，亮部卻明顯偏暖（無暖燈鏡頭的亮部應維持冷調或中性）",
      measured: metrics.highlightRedMinusBlue,
      target: "highlightRedMinusBlue <= 20",
    });
  }

  // Rule 11: Flat front lighting destroys skin micro-shadows (left/right ratio near 1.0–1.15).
  if (metrics.grazingLightRatio < 1.2) {
    issues.push({
      rule: 11,
      code: "flat_front_light",
      message: "主體左右亮度過於平均，屬於正面平光（易產生蠟像塑膠臉，請改用斜射主光＋負補光）",
      measured: metrics.grazingLightRatio,
      target: "grazingLightRatio >= 1.25",
    });
  }

  return issues;
}
