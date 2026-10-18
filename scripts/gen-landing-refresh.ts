/**
 * Regenerate the live landing stills in different looks via OpenRouter Seedream.
 * Usage: npx tsx scripts/gen-landing-refresh.ts [--only=hero,kol]
 */
import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { AspectRatio } from "@/model/project";

loadEnvConfig(process.cwd());

type Shot = {
  id: string;
  file: string;
  aspectRatio: AspectRatio;
  prompt: string;
};

const NO_TEXT =
  "No watermark, no logo, no letters, no numbers, no captions, no UI chrome except what the prompt explicitly asks to draw.";

const SHOTS: Shot[] = [
  {
    id: "hero",
    file: "public/hero/scro-shorts.webp",
    aspectRatio: "16:9",
    prompt: `Cinematic photoreal ultra-wide studio composition on a seamless light gray (#f4f4f5) background. Flush against the far-left edge (occupying only the leftmost 18% of the frame): a narrow vertical stack of three small rounded portrait cards for character selection showing different kinds of creators in different poses and posts (top card: a stylish East Asian woman in a cream blazer holding a skincare bottle, highlighted with a crisp lime-green #c6f24b border and checkmark badge; middle card: a bearded man in streetwear pointing at a camera; bottom card: a cheerful 3D stylized cartoon creator waving). Flush against the far-right edge (occupying only the rightmost 18% of the frame): one modern smartphone standing upright near the right margin, screen displaying a vertical 9:16 AI KOL short video generation view of the selected woman from the top card talking to camera, with a sleek bottom video timeline bar, a play icon, and floating pink heart icons. CRITICAL LAYOUT RULE: The entire middle 64% of the image (between the narrow left card stack and the right phone) is 100% empty, blank seamless light gray background with no cards, no objects, and no text. Soft studio daylight, crisp edges. ${NO_TEXT}`,
  },
  {
    id: "cast",
    file: "public/landing/cast-scro.webp",
    aspectRatio: "1:1",
    prompt: `High-fashion editorial photograph, not illustration. The same young woman appears three times side by side in three different outfits: a tailored black blazer, a cream silk dress, and a streetwear jacket. Same face, same hair, studio gray backdrop, sharp fabric texture, magazine lighting. ${NO_TEXT}`,
  },
  {
    id: "virtual-you",
    file: "public/landing/use-cases/virtual-you.webp",
    aspectRatio: "1:1",
    prompt: `Soft watercolor illustration on white paper. Left: a taped portrait photo of a young woman. A green arrow points right to a smartphone whose screen shows the same woman waving, with two small hearts. Gentle pigment blooms, visible paper. ${NO_TEXT}`,
  },
  {
    id: "product",
    file: "public/landing/use-cases/product.webp",
    aspectRatio: "1:1",
    prompt: `Cinematic photoreal vertical-ad still. A young creator holds a real matte skincare bottle toward the camera in a bright apartment. The bottle label is a plain solid color with no readable words. Natural window light, authentic hands, product shape stays crisp. ${NO_TEXT}`,
  },
  {
    id: "tutorial",
    file: "public/landing/use-cases/tutorial.webp",
    aspectRatio: "1:1",
    prompt: `Colored-pencil storybook illustration. A friendly host stands beside three numbered step cards (blank shapes only, no writing) and a smartphone showing the same host. Warm paper texture, visible pencil strokes. ${NO_TEXT}`,
  },
  {
    id: "explain",
    file: "public/landing/use-cases/explain.webp",
    aspectRatio: "1:1",
    prompt: `Bold pop-art illustration, Ben-Day dots, flat yellow and magenta. A creator on a phone screen points at one simple chart made of shapes, not words. Thick black outlines, energetic but clean. ${NO_TEXT}`,
  },
  {
    id: "saas",
    file: "public/landing/use-cases/saas.webp",
    aspectRatio: "1:1",
    prompt: `Bauhaus graphic illustration. A geometric person stands next to a simplified app window of rectangles and circles, and a small brand mark that is a solid green square, not a wordmark. Primary red, blue, yellow, black on off-white. ${NO_TEXT}`,
  },
  {
    id: "step-style",
    file: "public/landing/steps/style.webp",
    aspectRatio: "16:9",
    prompt: `High-fashion lookbook still, wide frame. Left: a close portrait. Right: the same person full length in one locked outfit. Center stays a quiet gray gap. Editorial lighting, real fabric. ${NO_TEXT}`,
  },
  {
    id: "step-storyboard",
    file: "public/landing/steps/storyboard.webp",
    aspectRatio: "16:9",
    prompt: `Ink manga storyboard on a desk, wide frame. Six empty panel frames in two rows, a hand holding a pen, one panel showing a simple face sketch. Black ink on warm paper, no writing. ${NO_TEXT}`,
  },
  {
    id: "step-export",
    file: "public/landing/steps/export.webp",
    aspectRatio: "16:9",
    prompt: `Claymation still, wide frame. A chunky clay smartphone stands up, its screen a vertical video of a clay creator, with a small clay play triangle. Soft studio light, fingerprints in the clay. ${NO_TEXT}`,
  },
  {
    id: "director",
    file: "public/landing/director-scro.webp",
    aspectRatio: "1:1",
    prompt: `Ukiyo-e woodblock print. Left: a pile of crossed-out sketch sheets. Right: a woman pointing at one approved portrait print with a simple check mark shape, not a letter. Flat washi colors, black keylines. ${NO_TEXT}`,
  },
  {
    id: "free-credit",
    file: "public/cta/free-credit-scro.webp",
    aspectRatio: "16:9",
    prompt: `Pixel-art still, wide frame. A small pixel creator stands beside an open gift box and a chunky phone showing a play triangle. Limited palette of lime, black, and warm gray on a pale background. Crisp pixels, no letters. ${NO_TEXT}`,
  },
  {
    id: "kol",
    file: "public/landing/kol-ig.webp",
    aspectRatio: "1:1",
    prompt: `Photoreal product photo of one modern smartphone on a light gray table, filling the frame, slight three-quarter angle. The screen is an Instagram profile of a popular lifestyle KOL in her twenties: round avatar photo, the follower number 2.4M, a bell icon with a red badge 18, and a 3 by 3 grid of everyday photos (coffee, street outfit, gym, sunset travel, cooking, friends, mirror selfie, desk, night market). Realistic glass, metal frame, soft shadow. No extra phones. The only readable text is 2.4M and 18.`,
  },
];

const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice(7)
  .split(",")
  .filter(Boolean);
const shots = SHOTS.filter((shot) => !only || only.includes(shot.id));

async function generate(shot: Shot) {
  const { submitOpenRouterImage, OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL } = await import(
    "@/service/openrouter/generate"
  );
  const submitted = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt: shot.prompt,
    aspectRatio: shot.aspectRatio,
    resolution: "2k",
  });
  const url = submitted.images?.[0]?.url;
  if (!url || submitted.status === "nsfw") {
    throw new Error(submitted.error || "沒有圖片");
  }
  const bytes = url.startsWith("data:")
    ? Buffer.from(url.slice(url.indexOf(",") + 1), "base64")
    : Buffer.from(await (await fetch(url)).arrayBuffer());
  const dest = path.join(process.cwd(), shot.file);
  await mkdir(path.dirname(dest), { recursive: true });
  const webp = await sharp(bytes)
    .resize({ width: shot.aspectRatio === "16:9" ? 1600 : 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(dest, webp);
  console.log("wrote", shot.file, webp.length);
}

async function main() {
  const queue = [...shots];
  const failures: string[] = [];
  async function worker() {
    for (;;) {
      const shot = queue.shift();
      if (!shot) return;
      try {
        await generate(shot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("fail", shot.id, message);
        failures.push(`${shot.id}: ${message}`);
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
}

main();
