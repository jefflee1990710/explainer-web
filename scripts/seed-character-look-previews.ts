import { loadEnvConfig } from "@next/env";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  ALL_CHARACTER_LOOK_PARTS,
  characterLookPreviewPrompt,
  optionsForLookPart,
  type AnyCharacterLookPart,
} from "@/service/character/character-look";
import { submitOpenRouterImage } from "@/service/openrouter/generate";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const MODEL = process.env.CHARACTER_LOOK_PREVIEW_MODEL || "bytedance-seed/seedream-5-0-flash";
const OUT_DIR = path.join(process.cwd(), "public", "character-looks");
const force = process.argv.includes("--force");
const recolorOnly = process.argv.includes("--recolor");
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY || 8);

// Tint plain studio grey backgrounds in existing WebP previews into vibrant Scro Logo colors:
// diagonal electric lime (#c6f24b) to warm cream (#fff6eb) to coral red-orange (#ff4d2e) studio backdrop,
// while preserving natural skin/hair/garment colors in the subject.
async function recolorPreviewFile(file: string) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  // Sample corners to estimate the neutral studio background luminance/color
  const cornerIdx = [
    0,
    (width - 1) * channels,
    (height - 1) * width * channels,
    ((height - 1) * width + (width - 1)) * channels,
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  for (const idx of cornerIdx) {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR /= 4;
  bgG /= 4;
  bgB /= 4;

  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    const ny = y / (height - 1);
    for (let x = 0; x < width; x++) {
      const nx = x / (width - 1);
      const offset = (y * width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      // Distance from neutral background & low saturation check
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC - minC;
      const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);
      // Edge proximity boosts background weight so studio seamless sweep recolors cleanly
      const edgeDist = Math.min(nx, 1 - nx, ny, 1 - ny);
      const isNeutralSeamless = sat < 26 && r > 135 && g > 135 && b > 135;
      const bgWeight = isNeutralSeamless
        ? Math.max(0, Math.min(1, (1 - sat / 26) * (distBg < 85 ? 1 : Math.max(0, 1 - (distBg - 85) / 60))))
        : edgeDist < 0.06 && distBg < 45
          ? 0.7
          : 0;

      if (bgWeight > 0.01) {
        // Scro brand gradient: top-left Electric Lime (#c6f24b) -> center Warm Cream (#fff6eb) -> bottom-right Coral (#ff4d2e)
        const t = nx * 0.55 + ny * 0.45;
        let gradR: number;
        let gradG: number;
        let gradB: number;
        if (t < 0.5) {
          const u = t * 2;
          gradR = 198 * (1 - u) + 255 * u;
          gradG = 242 * (1 - u) + 246 * u;
          gradB = 75 * (1 - u) + 235 * u;
        } else {
          const u = (t - 0.5) * 2;
          gradR = 255 * (1 - u) + 255 * u;
          gradG = 246 * (1 - u) + 77 * u;
          gradB = 235 * (1 - u) + 46 * u;
        }
        // Keep original studio shading/vignette modulation
        const shade = Math.min(1.08, Math.max(0.78, (r + g + b) / (bgR + bgG + bgB || 660)));
        const targetR = Math.min(255, Math.round(gradR * shade));
        const targetG = Math.min(255, Math.round(gradG * shade));
        const targetB = Math.min(255, Math.round(gradB * shade));
        const mix = bgWeight * 0.88;
        out[offset] = Math.round(r * (1 - mix) + targetR * mix);
        out[offset + 1] = Math.round(g * (1 - mix) + targetG * mix);
        out[offset + 2] = Math.round(b * (1 - mix) + targetB * mix);
      } else {
        // Subtle vibrant boost + coral/lime rim lift on subject
        const avg = (r + g + b) / 3;
        out[offset] = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.16)));
        out[offset + 1] = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.16)));
        out[offset + 2] = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.16)));
      }
    }
  }

  await sharp(out, { raw: { width, height, channels } })
    .webp({ quality: 84 })
    .toFile(file);
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

// One studio still per look option, saved as a square WebP the picker can show.
async function seedOne(part: AnyCharacterLookPart, id: string) {
  const file = path.join(OUT_DIR, `${part}-${id}.webp`);
  if (recolorOnly && (await exists(file))) {
    await recolorPreviewFile(file);
    console.log(`  ✓ recolored ${path.relative(process.cwd(), file)}`);
    return;
  }
  if (!force && (await exists(file))) {
    return;
  }
  console.log(`generate ${part}/${id}…`);
  const result = await submitOpenRouterImage({
    model: MODEL,
    prompt: characterLookPreviewPrompt(part, id),
    aspectRatio: "1:1",
    resolution: "1k",
  });
  const url = result.images?.[0]?.url;
  if (!url) throw new Error("No image returned");
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf)
    .resize(1024, 1024, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(file);
  console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const tasks: Array<{ part: AnyCharacterLookPart; id: string }> = [];
  for (const part of ALL_CHARACTER_LOOK_PARTS) {
    for (const option of optionsForLookPart(part)) {
      tasks.push({ part, id: option.id });
    }
  }
  let failed = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const item = tasks[cursor++];
      try {
        await seedOne(item.part, item.id);
      } catch (error) {
        failed += 1;
        console.error(`  ✗ ${item.part}/${item.id}:`, error instanceof Error ? error.message : error);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()));
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
