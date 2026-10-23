import sharp from "sharp";

// GPT Image sometimes returns RGBA with a transparent "canvas". Frames must be
// opaque so they read the same everywhere; fill with the style's canvas colour.
export async function flattenToCanvas(buffer: Buffer, canvasHex: string) {
  const meta = await sharp(buffer).metadata();
  if (!meta.hasAlpha) return buffer;
  return sharp(buffer).flatten({ background: canvasHex }).png().toBuffer();
}

const FLAT_ROW_SPREAD_THRESHOLD = 36;
const MIN_BAR_RATIO_SINGLE = 0.08;
const MIN_BAR_RATIO_TOTAL = 0.12;
const MAX_BAR_RATIO_TOTAL = 0.55;

/**
 * Detects and removes solid-color top/bottom letterbox bars (or left/right pillarbox bars)
 * that image models sometimes paint when a prompt mentions safe-area margins,
 * scaling the active scene back to the full target canvas dimensions.
 */
export async function stripLetterboxBars(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  if (w < 64 || h < 64) return buffer;

  function rowSpreadAndMean(y: number): { spread: number; mean: number } {
    let min = 255;
    let max = 0;
    let sum = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * c;
      const v = Math.round((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }
    return { spread: max - min, mean: sum / w };
  }

  const topEdge = rowSpreadAndMean(Math.min(4, h - 1));
  const bottomEdge = rowSpreadAndMean(Math.max(0, h - 5));

  let topBar = 0;
  if (topEdge.spread <= FLAT_ROW_SPREAD_THRESHOLD) {
    while (topBar < Math.floor(h * 0.35)) {
      const row = rowSpreadAndMean(topBar);
      if (
        row.spread > FLAT_ROW_SPREAD_THRESHOLD ||
        Math.abs(row.mean - topEdge.mean) > 18
      ) {
        break;
      }
      topBar++;
    }
  }

  let bottomBar = 0;
  if (bottomEdge.spread <= FLAT_ROW_SPREAD_THRESHOLD) {
    while (bottomBar < Math.floor(h * 0.35)) {
      const y = h - 1 - bottomBar;
      const row = rowSpreadAndMean(y);
      if (
        row.spread > FLAT_ROW_SPREAD_THRESHOLD ||
        Math.abs(row.mean - bottomEdge.mean) > 18
      ) {
        break;
      }
      bottomBar++;
    }
  }

  const topRatio = topBar / h;
  const bottomRatio = bottomBar / h;
  const totalRatio = topRatio + bottomRatio;

  // Trigger only when both top and bottom have a clear letterbox bar (e.g. 16%+ top and 18%+ bottom like Clip 2)
  const hasSymmetricBars =
    topRatio >= MIN_BAR_RATIO_SINGLE &&
    bottomRatio >= MIN_BAR_RATIO_SINGLE &&
    totalRatio >= MIN_BAR_RATIO_TOTAL &&
    totalRatio <= MAX_BAR_RATIO_TOTAL;

  if (!hasSymmetricBars) {
    return buffer;
  }

  const activeHeight = h - topBar - bottomBar;
  if (activeHeight < Math.floor(h * 0.45)) return buffer;

  const meta = await sharp(buffer).metadata();
  const pipeline = sharp(buffer)
    .extract({ left: 0, top: topBar, width: w, height: activeHeight })
    .resize(w, h, { fit: "cover", position: "centre" });

  if (meta.format === "jpeg") return pipeline.jpeg({ quality: 95 }).toBuffer();
  if (meta.format === "webp") return pipeline.webp({ quality: 95 }).toBuffer();
  return pipeline.png().toBuffer();
}

