// Gemini example stills for Life post templates and poses using character Scro →
// public/life-templates/{id}.webp & public/life-pose-previews/{id}.webp.
// Usage: npx tsx scripts/seed-life-template-previews.ts [--force] [--only-templates] [--only-poses]
import { loadEnvConfig } from "@next/env";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import { charactersCollection } from "@/dao/characters";
import type { Character } from "@/model/character";
import { LIFE_POSES, type LifePose } from "@/model/life-pose";
import { LIFE_POST_TEMPLATES, type LifePostTemplate } from "@/model/life-post-template";
import { LIFE_REALISTIC_RENDER_RULE } from "@/service/character/life-prompt";
import { resolveDefaultVersion } from "@/service/character/versions";

loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const MODEL = process.env.LIFE_TEMPLATE_PREVIEW_MODEL || "gemini-2.5-flash-image";
const TEMPLATE_DIR = path.join(process.cwd(), "public", "life-templates");
const POSE_PREVIEW_DIR = path.join(process.cwd(), "public", "life-pose-previews");
const POSE_SKEL_DIR = path.join(process.cwd(), "public", "life-poses");
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY || 6);
const FORCE = process.argv.includes("--force");
const ONLY_TEMPLATES = process.argv.includes("--only-templates");
const ONLY_POSES = process.argv.includes("--only-poses");

type ScroRefs = {
  portrait: Buffer;
  standing: Buffer;
};

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

// Fetch Scro's default portrait and standing full-body reference buffers from MongoDB/Blob.
async function loadScroRefs(): Promise<ScroRefs> {
  const characters = await charactersCollection();
  const scro = (await characters.findOne({ name: /^scro$/i })) as Character | null;
  if (!scro) throw new Error("找不到角色 Scro");
  const version = resolveDefaultVersion(scro);
  if (!version?.portraitUrl || !version?.profileUrl) {
    throw new Error("角色 Scro 缺少預設藍圖 portraitUrl / profileUrl");
  }
  const [portraitRes, standingRes] = await Promise.all([
    fetch(version.portraitUrl),
    fetch(version.profileUrl),
  ]);
  if (!portraitRes.ok || !standingRes.ok) {
    throw new Error("下載 Scro 參考圖失敗");
  }
  const [portraitRaw, standingRaw] = await Promise.all([
    portraitRes.arrayBuffer(),
    standingRes.arrayBuffer(),
  ]);
  const [portrait, standing] = await Promise.all([
    sharp(Buffer.from(portraitRaw)).png().toBuffer(),
    sharp(Buffer.from(standingRaw)).png().toBuffer(),
  ]);
  return { portrait, standing };
}

// Prompt for one post-type template card featuring Scro.
export function templatePreviewPrompt(template: LifePostTemplate) {
  return [
    "The first and second attached images are the character identity and full-body reference for Scro (a young East Asian woman in her early 20s with a dark chestnut brown chin-length layered wolf-cut bob with wispy bangs, wearing her white ribbed racerback tank top and casual trousers/jeans).",
    "Generate an authentic Instagram lifestyle photo of this exact same woman Scro (keep her exact face, wolf-cut bob hairstyle with bangs, and outfit).",
    `Post type: ${template.promptGuide.replace(/the character/gi, "Scro")}`,
    LIFE_REALISTIC_RENDER_RULE,
    "Vertical 3:4 aspect ratio. No text, no watermark, no logos, no frames or collage.",
  ].join(" ");
}

// Prompt for one pose preview card featuring Scro in the exact OpenPose skeleton posture.
export function posePreviewPrompt(pose: LifePose) {
  const crop =
    pose.framing === "full"
      ? "full-body head-to-toe shot showing her whole body including feet"
      : pose.framing === "knee"
        ? "three-quarter shot framed from the knees up"
        : "half-body shot framed from the waist up";
  return [
    "The first and second attached images are the character identity and full-body reference for Scro (a young East Asian woman in her early 20s with a dark chestnut brown chin-length layered wolf-cut bob with wispy bangs, wearing a fitted white ribbed racerback tank top, high-waisted blue straight-leg jeans, and chunky white sneakers).",
    "The third attached image is an OpenPose stick-figure skeleton showing the exact body pose and camera framing.",
    `Generate a clean, well-lit studio/lifestyle pose reference photo of Scro in this exact pose: ${pose.promptText}`,
    `Framing: ${crop}.`,
    "Keep Scro's exact face, wolf-cut bob hairstyle with bangs, white ribbed tank top and blue jeans. Clean minimal light neutral studio background so the body pose is clear and easy to read. Never draw the colored skeleton lines or black background from the third image.",
  ].join(" ");
}

async function seedTemplate(template: LifePostTemplate, scro: ScroRefs) {
  const { image } = await generateImage({
    model: googleImage(),
    aspectRatio: "3:4",
    prompt: {
      images: [scro.portrait, scro.standing],
      text: templatePreviewPrompt(template),
    },
  });
  await sharp(Buffer.from(image.uint8Array))
    .resize(600, 800, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(path.join(TEMPLATE_DIR, `${template.id}.webp`));
}

async function seedPose(pose: LifePose, scro: ScroRefs) {
  const skeleton = await readFile(path.join(POSE_SKEL_DIR, `${pose.id}.png`));
  const { image } = await generateImage({
    model: googleImage(),
    aspectRatio: "3:4",
    prompt: {
      images: [scro.portrait, scro.standing, skeleton],
      text: posePreviewPrompt(pose),
    },
  });
  await sharp(Buffer.from(image.uint8Array))
    .resize(450, 600, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(path.join(POSE_PREVIEW_DIR, `${pose.id}.webp`));
}

type Task =
  | { kind: "template"; item: LifePostTemplate }
  | { kind: "pose"; item: LifePose };

async function main() {
  await Promise.all([
    mkdir(TEMPLATE_DIR, { recursive: true }),
    mkdir(POSE_PREVIEW_DIR, { recursive: true }),
  ]);
  const scro = await loadScroRefs();
  const tasks: Task[] = [];
  if (!ONLY_POSES) {
    for (const template of LIFE_POST_TEMPLATES) {
      const out = path.join(TEMPLATE_DIR, `${template.id}.webp`);
      if (FORCE || !(await exists(out))) tasks.push({ kind: "template", item: template });
    }
  }
  if (!ONLY_TEMPLATES) {
    for (const pose of LIFE_POSES) {
      const out = path.join(POSE_PREVIEW_DIR, `${pose.id}.webp`);
      if (FORCE || !(await exists(out))) tasks.push({ kind: "pose", item: pose });
    }
  }
  console.log(`todo ${tasks.length} (templates + poses)`);
  let cursor = 0;
  let wrote = 0;
  let failed = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      const label = `${task.kind}:${task.item.id}`;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (task.kind === "template") await seedTemplate(task.item, scro);
          else await seedPose(task.item, scro);
          wrote += 1;
          console.log(`  ✓ ${label} (${wrote + failed}/${tasks.length})`);
          break;
        } catch (error) {
          if (attempt === 3) {
            failed += 1;
            console.error(`  ✗ ${label}:`, error instanceof Error ? error.message : error);
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
