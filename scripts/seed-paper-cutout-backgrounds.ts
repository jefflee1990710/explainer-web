// Generate preview stills for Paper-Cutout Director Preset Backgrounds →
// public/director-backgrounds/paper-cutout/{id}.webp
// Usage: npx tsx scripts/seed-paper-cutout-backgrounds.ts [--force]
import { loadEnvConfig } from "@next/env";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import { PAPER_CUTOUT_PRESET_BACKGROUNDS } from "@/model/paper-cutout-backgrounds";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const MODEL = process.env.TALKING_HEAD_PREVIEW_MODEL || "gemini-2.5-flash-image";
const OUT_DIR = path.join(process.cwd(), "public", "director-backgrounds", "paper-cutout");
const FORCE = process.argv.includes("--force");

function googleImage() {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  return createGoogleGenerativeAI({ apiKey }).image(MODEL);
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

// High-craft procedural SVG fallback so previews always exist even if Gemini API is offline.
function fallbackSvgForPreset(id: string): string {
  switch (id) {
    case "wood-cardboard":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <defs>
          <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#4a311f"/>
            <stop offset="25%" stop-color="#5c3d26"/>
            <stop offset="50%" stop-color="#4e3420"/>
            <stop offset="75%" stop-color="#624129"/>
            <stop offset="100%" stop-color="#462e1c"/>
          </linearGradient>
          <pattern id="grain" width="32" height="360" patternUnits="userSpaceOnUse">
            <line x1="6" y1="0" x2="5" y2="360" stroke="#362112" stroke-width="1.5" stroke-opacity="0.45"/>
            <line x1="16" y1="0" x2="17" y2="360" stroke="#6f4b30" stroke-width="1" stroke-opacity="0.35"/>
            <line x1="26" y1="0" x2="25" y2="360" stroke="#2d1b0e" stroke-width="1.2" stroke-opacity="0.4"/>
          </pattern>
        </defs>
        <rect width="640" height="360" fill="url(#wood)"/>
        <rect width="640" height="360" fill="url(#grain)"/>
        <g transform="translate(220, 110) rotate(-3)">
          <rect x="-8" y="-8" width="216" height="136" rx="14" fill="#ffffff"/>
          <rect x="0" y="0" width="200" height="120" rx="10" fill="#f4d58d" stroke="#2a1e17" stroke-width="3"/>
          <text x="100" y="68" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="22" fill="#2a1e17">WOOD BOARD</text>
        </g>
      </svg>`;
    case "paper":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <defs>
          <radialGradient id="paperGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#fbf7ee"/>
            <stop offset="100%" stop-color="#ede3cf"/>
          </radialGradient>
          <pattern id="fibers" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M5 10 Q12 8 18 12" stroke="#d5c7ad" stroke-width="1" fill="none" opacity="0.6"/>
            <path d="M25 28 Q30 25 36 30" stroke="#cabaa0" stroke-width="1" fill="none" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="640" height="360" fill="url(#paperGlow)"/>
        <rect width="640" height="360" fill="url(#fibers)"/>
        <g transform="translate(220, 110) rotate(2)">
          <rect x="-8" y="-8" width="216" height="136" rx="14" fill="#ffffff" filter="drop-shadow(0 6px 10px rgba(0,0,0,0.12))"/>
          <rect x="0" y="0" width="200" height="120" rx="10" fill="#ff6b4a" stroke="#1e1e24" stroke-width="3"/>
          <text x="100" y="68" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="22" fill="#ffffff">CRAFT PAPER</text>
        </g>
      </svg>`;
    case "blueprint-paper":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <defs>
          <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#4ea3e5" stroke-width="0.6" stroke-opacity="0.35"/>
          </pattern>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)"/>
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#7ec4f7" stroke-width="1.2" stroke-opacity="0.55"/>
          </pattern>
        </defs>
        <rect width="640" height="360" fill="#0f3c6e"/>
        <rect width="640" height="360" fill="url(#grid)"/>
        <g transform="translate(220, 110) rotate(-2)">
          <rect x="-8" y="-8" width="216" height="136" rx="14" fill="#ffffff"/>
          <rect x="0" y="0" width="200" height="120" rx="10" fill="#1a5fb4" stroke="#ffffff" stroke-width="3"/>
          <text x="100" y="68" text-anchor="middle" font-family="monospace" font-weight="800" font-size="22" fill="#ffffff">BLUEPRINT</text>
        </g>
      </svg>`;
    case "concrete":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <defs>
          <linearGradient id="cement" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#8c9094"/>
            <stop offset="50%" stop-color="#7c8085"/>
            <stop offset="100%" stop-color="#6d7176"/>
          </linearGradient>
          <pattern id="pores" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="18" r="1.5" fill="#55595e" opacity="0.45"/>
            <circle cx="42" cy="10" r="1" fill="#a4a8ad" opacity="0.4"/>
            <circle cx="28" cy="45" r="2" fill="#5a5e63" opacity="0.35"/>
            <circle cx="50" cy="36" r="1.2" fill="#4e5257" opacity="0.4"/>
          </pattern>
        </defs>
        <rect width="640" height="360" fill="url(#cement)"/>
        <rect width="640" height="360" fill="url(#pores)"/>
        <g transform="translate(220, 110) rotate(1.5)">
          <rect x="-8" y="-8" width="216" height="136" rx="14" fill="#ffffff"/>
          <rect x="0" y="0" width="200" height="120" rx="10" fill="#d9f99d" stroke="#18181b" stroke-width="3"/>
          <text x="100" y="68" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="22" fill="#18181b">CONCRETE</text>
        </g>
      </svg>`;
    case "office-table":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <defs>
          <linearGradient id="oak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#d8b589"/>
            <stop offset="50%" stop-color="#cfa878"/>
            <stop offset="100%" stop-color="#c49a68"/>
          </linearGradient>
          <pattern id="oakGrain" width="640" height="28" patternUnits="userSpaceOnUse">
            <line x1="0" y1="8" x2="640" y2="9" stroke="#b58955" stroke-width="1.2" stroke-opacity="0.4"/>
            <line x1="0" y1="20" x2="640" y2="19" stroke="#e2c399" stroke-width="1" stroke-opacity="0.45"/>
          </pattern>
        </defs>
        <rect width="640" height="360" fill="url(#oak)"/>
        <rect width="640" height="360" fill="url(#oakGrain)"/>
        <g transform="translate(220, 110) rotate(-1.5)">
          <rect x="-8" y="-8" width="216" height="136" rx="14" fill="#ffffff"/>
          <rect x="0" y="0" width="200" height="120" rx="10" fill="#38bdf8" stroke="#0f172a" stroke-width="3"/>
          <text x="100" y="68" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="22" fill="#0f172a">OFFICE DESK</text>
        </g>
      </svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#60bdf8"/>
            <stop offset="100%" stop-color="#bae6fd"/>
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill="url(#sky)"/>
        <g fill="#ffffff" opacity="0.92">
          <path d="M55 95 a28 28 0 0 1 52 -10 a32 32 0 0 1 58 10 a22 22 0 0 1 12 40 h-122 a22 22 0 0 1 0 -40 z"/>
          <path d="M470 75 a24 24 0 0 1 46 -8 a28 28 0 0 1 50 8 a20 20 0 0 1 10 36 h-106 a20 20 0 0 1 0 -36 z"/>
          <path d="M490 270 a22 22 0 0 1 42 -6 a24 24 0 0 1 44 6 a18 18 0 0 1 8 32 h-94 a18 18 0 0 1 0 -32 z"/>
        </g>
        <g transform="translate(220, 110) rotate(-2)">
          <rect x="-8" y="-8" width="216" height="136" rx="14" fill="#ffffff"/>
          <rect x="0" y="0" width="200" height="120" rx="10" fill="#fde047" stroke="#0f172a" stroke-width="3"/>
          <text x="100" y="68" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="22" fill="#0f172a">BLUE SKY</text>
        </g>
      </svg>`;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const model = googleImage();

  for (const bg of PAPER_CUTOUT_PRESET_BACKGROUNDS) {
    const outPath = path.join(OUT_DIR, `${bg.id}.webp`);
    if (!FORCE && (await exists(outPath))) {
      console.log(`skip ${bg.id} (exists)`);
      continue;
    }
    let webp: Buffer | null = null;
    if (model) {
      try {
        console.log(`generate ${bg.id} via Gemini…`);
        const { image } = await generateImage({
          model,
          prompt: bg.previewPrompt,
          aspectRatio: "16:9",
        });
        webp = await sharp(Buffer.from(image.uint8Array))
          .resize(640, 360, { fit: "cover", position: "attention" })
          .webp({ quality: 84 })
          .toBuffer();
      } catch (err) {
        console.warn(`  ! Gemini failed for ${bg.id}, falling back to SVG render:`, err);
      }
    }
    if (!webp) {
      console.log(`render ${bg.id} via procedural craft SVG…`);
      const svg = fallbackSvgForPreset(bg.id);
      webp = await sharp(Buffer.from(svg))
        .resize(640, 360, { fit: "cover" })
        .webp({ quality: 86 })
        .toBuffer();
    }
    await writeFile(outPath, webp);
    console.log(`  ✓ ${path.relative(process.cwd(), outPath)} (${Math.round(webp.length / 1024)} KB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
