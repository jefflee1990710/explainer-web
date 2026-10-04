import sharp from "sharp";

const THUMB_WIDTH = 1280;

type MarginKind = "dark" | "light";

function isDark(r: number, g: number, b: number) {
  return Math.max(r, g, b) <= 24;
}

function isLight(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= 245 && max - min < 8;
}

function matches(kind: MarginKind, r: number, g: number, b: number) {
  return kind === "dark" ? isDark(r, g, b) : isLight(r, g, b);
}

function rowShare(
  data: Buffer,
  width: number,
  channels: number,
  y: number,
  kind: MarginKind,
) {
  let hits = 0;
  let samples = 0;
  for (let x = 0; x < width; x += 6) {
    const i = (y * width + x) * channels;
    samples += 1;
    if (matches(kind, data[i], data[i + 1], data[i + 2])) hits += 1;
  }
  return samples > 0 ? hits / samples : 0;
}

// Letterbox is one flat color. White storyboard frames must not be trimmed as a white bar.
function marginKind(data: Buffer, width: number, height: number, channels: number): MarginKind | null {
  const topDark = rowShare(data, width, channels, 0, "dark");
  const topLight = rowShare(data, width, channels, 0, "light");
  const bottomDark = rowShare(data, width, channels, height - 1, "dark");
  const bottomLight = rowShare(data, width, channels, height - 1, "light");
  if (topDark >= 0.85 || bottomDark >= 0.85) return "dark";
  if (topLight >= 0.85 || bottomLight >= 0.85) return "light";
  return null;
}

function trimEdge(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  kind: MarginKind,
  edge: "top" | "bottom",
) {
  const limit = Math.floor(height * 0.45);
  let trimmed = 0;
  while (trimmed < limit) {
    const y = edge === "top" ? trimmed : height - 1 - trimmed;
    if (rowShare(data, width, channels, y, kind) < 0.9) break;
    trimmed += 1;
  }
  return trimmed;
}

// Drop the letterbox and scale by width only, so the frames keep their aspect ratio.
export async function bleedDirectorPreview(buffer: Buffer) {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const kind = marginKind(data, width, height, channels);
  let source = buffer;
  if (kind) {
    const top = trimEdge(data, width, height, channels, kind, "top");
    const bottom = trimEdge(data, width, height, channels, kind, "bottom");
    const cropHeight = height - top - bottom;
    if (cropHeight >= Math.floor(height * 0.2) && (top > 0 || bottom > 0)) {
      source = await sharp(buffer).extract({ left: 0, top, width, height: cropHeight }).toBuffer();
    }
  }
  return sharp(source).resize({ width: THUMB_WIDTH }).webp({ quality: 82 }).toBuffer();
}
