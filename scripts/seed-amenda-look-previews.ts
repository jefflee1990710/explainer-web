// Gemini studio stills for the Amenda wardrobe, same prompt and model as the other look previews.
import { loadEnvConfig } from "@next/env";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import { AMENDA_PANTS, AMENDA_TOPS } from "@/service/character/amenda-wardrobe";
import { characterLookPreviewPrompt, type AnyCharacterLookPart } from "@/service/character/character-look";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const MODEL = process.env.CHARACTER_LOOK_PREVIEW_MODEL || "gemini-2.5-flash-image";
const OUT_DIR = path.join(process.cwd(), "public", "character-looks");
const force = process.argv.includes("--force");
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

// One isolated garment still, saved as the picker WebP.
async function seedOne(part: AnyCharacterLookPart, id: string) {
  const file = path.join(OUT_DIR, `${part}-${id}.webp`);
  if (!force && (await exists(file))) return "skip" as const;
  const { image } = await generateImage({
    model: googleImage(),
    prompt: characterLookPreviewPrompt(part, id),
    aspectRatio: "1:1",
  });
  await sharp(Buffer.from(image.uint8Array))
    .resize(1024, 1024, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(file);
  return "wrote" as const;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const tasks = [
    ...AMENDA_TOPS.map((option) => ({ part: "top" as const, id: option.id })),
    ...AMENDA_PANTS.map((option) => ({ part: "pants" as const, id: option.id })),
  ];
  const limit = Number(process.env.SEED_LIMIT || 0);
  if (limit > 0) tasks.splice(limit);
  let cursor = 0;
  let wrote = 0;
  let skipped = 0;
  let failed = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const item = tasks[cursor++];
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await seedOne(item.part, item.id);
          if (result === "skip") skipped += 1;
          else {
            wrote += 1;
            console.log(`  ✓ ${item.part}/${item.id} (${wrote + skipped}/${tasks.length})`);
          }
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
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()));
  console.log(`done wrote=${wrote} skipped=${skipped} failed=${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
