// Gemini studio stills for look options that do not have a preview WebP yet.
import { loadEnvConfig } from "@next/env";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import {
  ALL_CHARACTER_LOOK_PARTS,
  characterLookPreviewPrompt,
  optionsForLookPart,
  type AnyCharacterLookPart,
} from "@/service/character/character-look";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const MODEL = process.env.CHARACTER_LOOK_PREVIEW_MODEL || "gemini-2.5-flash-image";
const OUT_DIR = path.join(process.cwd(), "public", "character-looks");
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY || 4);

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

// One isolated still, same prompt the picker already expects.
async function seedOne(part: AnyCharacterLookPart, id: string) {
  const file = path.join(OUT_DIR, `${part}-${id}.webp`);
  const { image } = await generateImage({
    model: googleImage(),
    prompt: characterLookPreviewPrompt(part, id),
    aspectRatio: "1:1",
  });
  await sharp(Buffer.from(image.uint8Array))
    .resize(1024, 1024, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(file);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const tasks: Array<{ part: AnyCharacterLookPart; id: string }> = [];
  for (const part of ALL_CHARACTER_LOOK_PARTS) {
    for (const option of optionsForLookPart(part)) {
      const file = path.join(OUT_DIR, `${part}-${option.id}.webp`);
      if (!(await exists(file))) tasks.push({ part, id: option.id });
    }
  }
  console.log(`missing ${tasks.length}`);
  let cursor = 0;
  let wrote = 0;
  let failed = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const item = tasks[cursor++];
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await seedOne(item.part, item.id);
          wrote += 1;
          console.log(`  ✓ ${item.part}/${item.id} (${wrote + failed}/${tasks.length})`);
          break;
        } catch (error) {
          if (attempt === 3) {
            failed += 1;
            console.error(`  ✗ ${item.part}/${item.id}:`, error instanceof Error ? error.message : error);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
          }
        }
      }
    }
  }
  if (tasks.length) {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()));
  }
  console.log(`done wrote=${wrote} failed=${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
