// Gemini example stills for Life post templates → public/life-templates/{id}.webp.
// Usage: npx tsx scripts/seed-life-template-previews.ts [--force]
import { loadEnvConfig } from "@next/env";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import { LIFE_POST_TEMPLATES, type LifePostTemplate } from "@/model/life-post-template";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const MODEL = process.env.LIFE_TEMPLATE_PREVIEW_MODEL || "gemini-2.5-flash-image";
const OUT_DIR = path.join(process.cwd(), "public", "life-templates");
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY || 4);
const FORCE = process.argv.includes("--force");

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

// One fictional model demonstrates the template so cards read as a consistent set.
function previewPrompt(template: LifePostTemplate) {
  return [
    "Authentic Instagram lifestyle photo, shot on a phone or 35mm film, natural colours, vertical 3:4.",
    "Subject: a fictional stylish woman in her mid 20s with shoulder-length dark hair, casual modern outfit. Not a real or famous person.",
    `Post type: ${template.promptGuide.replace(/the character/gi, "she")}`,
    "Real skin texture, natural light, believable location, no text, no watermark, no logos, no frames or collage.",
  ].join(" ");
}

async function seedOne(template: LifePostTemplate) {
  const { image } = await generateImage({
    model: googleImage(),
    prompt: previewPrompt(template),
    aspectRatio: "3:4",
  });
  await sharp(Buffer.from(image.uint8Array))
    .resize(600, 800, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(path.join(OUT_DIR, `${template.id}.webp`));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const tasks: LifePostTemplate[] = [];
  for (const template of LIFE_POST_TEMPLATES) {
    if (FORCE || !(await exists(path.join(OUT_DIR, `${template.id}.webp`)))) tasks.push(template);
  }
  console.log(`todo ${tasks.length}`);
  let cursor = 0;
  let wrote = 0;
  let failed = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const template = tasks[cursor++];
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await seedOne(template);
          wrote += 1;
          console.log(`  ✓ ${template.id} (${wrote + failed}/${tasks.length})`);
          break;
        } catch (error) {
          if (attempt === 3) {
            failed += 1;
            console.error(`  ✗ ${template.id}:`, error instanceof Error ? error.message : error);
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
