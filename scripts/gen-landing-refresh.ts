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

// All faces must be brand-new fictional cast — never reuse account library characters (Alice, etc.).
const SHOTS: Shot[] = [
  {
    id: "hero",
    file: "public/hero/scro-shorts.webp",
    aspectRatio: "16:9",
    prompt: `Cinematic photoreal ultra-wide on a dark olive ink studio backdrop. Theme: injecting a soul into a virtual KOL. Leftmost 18%: stack of three rounded portrait cards of brand-new fictional creators (curly-haired woman with lime #c6f24b border, clay-style young man, watercolor teen) — original faces only. Rightmost 18%: smartphone showing the curly-haired woman talking to camera. Middle 64% empty dark ink for headline. ${NO_TEXT}`,
  },
  {
    id: "cast",
    file: "public/landing/cast-scro.webp",
    aspectRatio: "1:1",
    prompt: `High-fashion editorial. Brand-new fictional young woman with voluminous dark curly hair appears three times in charcoal turtleneck, cream satin dress, olive utility jacket — same original face. Dark olive ink studio, subtle lime rim light. ${NO_TEXT}`,
  },
  {
    id: "virtual-you",
    file: "public/landing/use-cases/virtual-you.webp",
    aspectRatio: "1:1",
    prompt: `Soft watercolor on off-white paper. Brand-new South Asian woman with long black braid. Notebook polaroid left, lime #c6f24b arrow to phone showing her as a waving virtual KOL. Original face only. ${NO_TEXT}`,
  },
  {
    id: "product",
    file: "public/landing/use-cases/product.webp",
    aspectRatio: "1:1",
    prompt: `Cinematic photoreal. Brand-new young Black man with short twists holds a blank-label matte skincare bottle in a bright loft. Original face only. ${NO_TEXT}`,
  },
  {
    id: "tutorial",
    file: "public/landing/use-cases/tutorial.webp",
    aspectRatio: "1:1",
    prompt: `Colored-pencil storybook. Brand-new Latina host with curly auburn hair and freckles beside three blank step cards and a phone showing the same host. Original face only. ${NO_TEXT}`,
  },
  {
    id: "explain",
    file: "public/landing/use-cases/explain.webp",
    aspectRatio: "1:1",
    prompt: `Bold pop-art, Ben-Day dots, yellow and magenta. Brand-new East Asian creator with silver undercut and glasses on a phone screen points at a shape-only chart. Original face only. ${NO_TEXT}`,
  },
  {
    id: "saas",
    file: "public/landing/use-cases/saas.webp",
    aspectRatio: "1:1",
    prompt: `Bauhaus graphic. Brand-new geometric person (lime circle head, indigo torso, coral arms) beside a simplified app window and a solid lime square mark. ${NO_TEXT}`,
  },
  {
    id: "step-character",
    file: "public/landing/steps/character.webp",
    aspectRatio: "16:9",
    prompt: `Wide editorial lookbook. Brand-new curly-haired woman: left lime-bordered portrait, right full-body cream dress beside wardrobe rail. Dark olive ink studio. Original face only. ${NO_TEXT}`,
  },
  {
    id: "step-life",
    file: "public/landing/steps/life.webp",
    aspectRatio: "16:9",
    prompt: `Wide photoreal lifestyle collage without borders: same brand-new curly-haired woman in café, city street, sunset travel — identical original face. ${NO_TEXT}`,
  },
  {
    id: "step-video",
    file: "public/landing/steps/video.webp",
    aspectRatio: "16:9",
    prompt: `Wide clean Videos screen mock: two folder cards with mosaics of brand-new curly-haired woman and clay-style young man. Titles as abstract lime bars only. Original faces only. ${NO_TEXT}`,
  },
  {
    id: "director",
    file: "public/landing/director-scro.webp",
    aspectRatio: "1:1",
    prompt: `Ukiyo-e woodblock. Brand-new Japanese woman with asymmetrical bob points at one approved portrait; rejected sketches stacked left with X shapes. Original faces only. ${NO_TEXT}`,
  },
  {
    id: "free-credit",
    file: "public/cta/free-credit-scro.webp",
    aspectRatio: "16:9",
    prompt: `Wide pixel-art. Brand-new teal-bob pixel woman beside open gift box and phone with lime play triangle on charcoal ground. Crisp pixels. ${NO_TEXT}`,
  },
  {
    id: "kol",
    file: "public/landing/kol-ig.webp",
    aspectRatio: "1:1",
    prompt: `Photoreal smartphone on dark charcoal table. Screen is an Instagram-like profile of a brand-new curly-haired lifestyle virtual KOL: avatar, follower text 2.4M, bell badge 18, 3x3 everyday grid. Original face only. Only readable text is 2.4M and 18.`,
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
