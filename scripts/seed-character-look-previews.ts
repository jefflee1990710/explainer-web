import { loadEnvConfig } from "@next/env";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import {
  CHARACTER_LOOK_PARTS,
  CHARACTER_LOOKS,
  characterLookPreviewPrompt,
} from "@/service/character/character-look";

loadEnvConfig(process.cwd());

const MODEL = process.env.CHARACTER_LOOK_PREVIEW_MODEL || "gemini-2.5-flash-image";
const OUT_DIR = path.join(process.cwd(), "public", "character-looks");
const force = process.argv.includes("--force");

function googleImage() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
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

// One Gemini still per look option, saved as a square WebP the picker can show.
async function seedOne(part: (typeof CHARACTER_LOOK_PARTS)[number], id: string) {
  const file = path.join(OUT_DIR, `${part}-${id}.webp`);
  if (!force && (await exists(file))) {
    console.log(`skip ${part}/${id}`);
    return;
  }
  console.log(`generate ${part}/${id}…`);
  const { image } = await generateImage({
    model: googleImage(),
    prompt: characterLookPreviewPrompt(part, id),
    aspectRatio: "1:1",
  });
  await sharp(Buffer.from(image.uint8Array))
    .resize(1024, 1024, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(file);
  console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let failed = 0;
  for (const part of CHARACTER_LOOK_PARTS) {
    for (const option of CHARACTER_LOOKS[part]) {
      try {
        await seedOne(part, option.id);
      } catch (error) {
        failed += 1;
        console.error(`  ✗ ${part}/${option.id}:`, error instanceof Error ? error.message : error);
      }
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
