/**
 * Scro Instagram Carousel Post Harness (`@scro.io` Signature Torn-Paper Cinematic Style)
 *
 * Generates multi-slide 9:16 2K (1152x2048) Instagram Carousel Posts using
 * OpenRouter Seedream 5.0 Pro (`bytedance-seed/seedream-5-0-pro`), locked to
 * the exact visual DNA of `https://www.instagram.com/scro.io`:
 *
 * 1. Top Brand Anchor: Centered dark rounded-square `S` icon (`Marketing/logo-mark.png`)
 *    + glowing neon-lime (`#A3FF47`) pill badge (`#SCRO <TAG>`).
 * 2. Center Torn-Paper (撕紙毛邊效果) Headline Banner: Layered charcoal-black, warm cream,
 *    and neon-lime hand-torn cardstock strips with rough white fibrous deckle edges and
 *    giant ultra-bold condensed uppercase typography.
 * 3. Dramatic Full-Bleed Cinematic Scene / Tactile Collage: Expressive Hong Kong / East Asian
 *    creator character(s), glowing 3D glass comparison pillars or floating neon-lime Polaroid /
 *    torn-paper feature stickers, and platform logo badges.
 * 4. Optional Tactile Torn-Paper Swipe Callout on Slide 1..N-1 (e.g. `下一頁睇吓有咩功能 →`).
 */
import { loadEnvConfig } from "@next/env";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "../src/service/openrouter/generate";

loadEnvConfig(process.cwd());

export interface IgCarouselSlideConfig {
  /** Output filename stem for this slide, e.g. "Slide 1 - Price Comparison" */
  slideName: string;
  /** Top neon-lime pill badge text, e.g. "#SCRO PRICING" or "#SCRO STUDIO" */
  badge: string;
  /** Multi-line center torn-paper headline, e.g. "AI VIDEO 82%\nCHEAPER ($0.07/S)" */
  headline: string;
  /** Dramatic scene, character, props, and visual callouts description */
  scenePrompt: string;
  /** Optional swipe callout torn-paper strip at bottom-right, e.g. "下一頁睇吓有咩功能 →" */
  swipeCallout?: string;
  /** Optional extra reference image file paths (e.g. existing IG cover for style lock) */
  referenceImagePaths?: string[];
}

export interface IgCarouselHarnessConfig {
  /** Campaign name used for logging and default output naming */
  campaignName: string;
  /** Output directory (defaults to `Marketing/`) */
  outDir?: string;
  /** Slides to generate in parallel */
  slides: IgCarouselSlideConfig[];
}

export async function generateIgCarouselSlide(
  slide: IgCarouselSlideConfig,
  outDir = path.join(process.cwd(), "Marketing"),
): Promise<string> {
  const logoPath = existsSync(path.join(process.cwd(), "Marketing/logo-mark.png"))
    ? path.join(process.cwd(), "Marketing/logo-mark.png")
    : path.join(process.cwd(), "public/logo.png");

  const logoBuf = await sharp(logoPath)
    .resize(360, 360, {
      fit: "contain",
      background: { r: 18, g: 20, b: 28, alpha: 1 },
    })
    .jpeg({ quality: 92 })
    .toBuffer();

  const refs: string[] = [`data:image/jpeg;base64,${logoBuf.toString("base64")}`];

  for (const refPath of slide.referenceImagePaths || []) {
    const abs = path.isAbsolute(refPath) ? refPath : path.join(process.cwd(), refPath);
    if (existsSync(abs)) {
      const buf = await sharp(abs)
        .resize(720, 1280, { fit: "cover" })
        .jpeg({ quality: 88 })
        .toBuffer();
      refs.push(`data:image/jpeg;base64,${buf.toString("base64")}`);
    }
  }

  const headlineLines = slide.headline
    .split("\n")
    .map((line) => `"${line.trim()}"`)
    .join(" / ");

  const swipeSection = slide.swipeCallout
    ? `4) TACTILE TORN-PAPER SWIPE CALLOUT AT BOTTOM-RIGHT: Near the bottom-right corner, place an angled neon-lime (#A3FF47) hand-torn paper tape strip with rough white fibrous edges reading in bold black text: "${slide.swipeCallout}". Do NOT draw any large rectangular box at the bottom.`
    : "4) CLEAN UNOBSTRUCTED BOTTOM (NO BOTTOM BOX): Do NOT draw any rectangular box, border frame, or banner at the bottom of the poster. Let the dramatic cinematic scene and tactile collage bleed cleanly to the bottom edge.";

  const prompt = [
    "Vertical 9:16 dramatic cinematic & tactile paper-collage Instagram poster matching the exact @scro.io Instagram visual identity (see Reference Images).",
    `1) TOP BRAND HEADER: Centered near the top is the exact dark rounded-square app icon with the glowing neon-lime S logo mark (matching Reference Image 1), and directly underneath it is a bright neon-lime pill badge reading "${slide.badge}" in bold black condensed sans-serif.`,
    `2) CENTER TORN-PAPER (撕紙 STYLE) TITLE BANNER: Right across the middle of the 9:16 composition, render a tactile hand-torn paper collage title banner (撕紙毛邊效果: layered charcoal-black, warm cream, and neon-lime #A3FF47 torn cardstock strips with rough white fibrous deckle edges and deep drop shadow) reading in giant ultra-bold condensed uppercase letters: ${headlineLines}.`,
    `3) DRAMATIC SCENE, CHARACTER & VISUAL CALLOUTS: ${slide.scenePrompt}`,
    swipeSection,
    "Ultra-crisp theatrical studio lighting and tactile paper-craft textures, chiaroscuro contrast with glowing #A3FF47 neon-lime rim light, razor-sharp legible typography.",
  ].join("\n\n");

  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt,
    aspectRatio: "9:16",
    resolution: "2k",
    referenceImageUrls: refs,
  });

  const url = res.images?.[0]?.url;
  if (!url) {
    throw new Error(`Seedream 5.0 Pro returned no image for slide ${slide.slideName}`);
  }

  let imgBuf: Buffer;
  if (url.startsWith("data:")) {
    const base64Data = url.replace(/^data:image\/\w+;base64,/, "");
    imgBuf = Buffer.from(base64Data, "base64");
  } else {
    const r = await fetch(url);
    imgBuf = Buffer.from(await r.arrayBuffer());
  }

  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${slide.slideName}.png`);
  writeFileSync(outPath, imgBuf);
  return outPath;
}

export async function runIgCarouselHarness(
  config: IgCarouselHarnessConfig,
): Promise<string[]> {
  const outDir = config.outDir || path.join(process.cwd(), "Marketing");
  return Promise.all(
    config.slides.map((slide) => generateIgCarouselSlide(slide, outDir)),
  );
}
