// Generate Gemini preview stills for Talking-Head Backgrounds & Poses →
// public/talking-head-backgrounds/{id}.webp & public/talking-head-poses/{id}.webp
// Usage: npx tsx scripts/seed-talking-head-previews.ts [--force]
import { loadEnvConfig } from "@next/env";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import {
  TALKING_HEAD_BACKGROUNDS,
  TALKING_HEAD_POSES,
} from "@/model/talking-head-options";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const MODEL = process.env.TALKING_HEAD_PREVIEW_MODEL || "gemini-2.5-flash-image";
const BG_DIR = path.join(process.cwd(), "public", "talking-head-backgrounds");
const POSE_DIR = path.join(process.cwd(), "public", "talking-head-poses");
const FORCE = process.argv.includes("--force");

function googleImage() {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY");
  }
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

async function generateAndSaveWebp(input: {
  id: string;
  prompt: string;
  outPath: string;
  width: number;
  height: number;
  aspectRatio: "16:9" | "3:4";
}) {
  if (!FORCE && (await exists(input.outPath))) {
    console.log(`skip ${input.id} (exists)`);
    return;
  }
  console.log(`generate ${input.id}…`);
  const { image } = await generateImage({
    model: googleImage(),
    prompt: input.prompt,
    aspectRatio: input.aspectRatio,
  });
  const webp = await sharp(Buffer.from(image.uint8Array))
    .resize(input.width, input.height, { fit: "cover", position: "attention" })
    .webp({ quality: 84 })
    .toBuffer();
  await writeFile(input.outPath, webp);
  console.log(`  ✓ ${path.relative(process.cwd(), input.outPath)} (${Math.round(webp.length / 1024)} KB)`);
}

async function main() {
  await mkdir(BG_DIR, { recursive: true });
  await mkdir(POSE_DIR, { recursive: true });

  for (const bg of TALKING_HEAD_BACKGROUNDS) {
    const outPath = path.join(BG_DIR, `${bg.id}.webp`);
    await generateAndSaveWebp({
      id: `bg:${bg.id}`,
      prompt: bg.geminiPreviewPrompt,
      outPath,
      width: 640,
      height: 360,
      aspectRatio: "16:9",
    });
  }

  for (const pose of TALKING_HEAD_POSES) {
    const outPath = path.join(POSE_DIR, `${pose.id}.webp`);
    await generateAndSaveWebp({
      id: `pose:${pose.id}`,
      prompt: pose.geminiPreviewPrompt,
      outPath,
      width: 480,
      height: 640,
      aspectRatio: "3:4",
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
