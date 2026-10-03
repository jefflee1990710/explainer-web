import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { skillsCollection } from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";
import { isCustomSkill } from "@/service/director/behavior-slug";
import {
  directorPreviewPrompt,
  directorPreviewStyleNames,
} from "@/service/director/preview-prompt";
import { hydrateStyles, resolvedStyle } from "@/service/style/load-style";
import { parseSystemProfile } from "@/service/director/profile";
import { STYLE_IDS } from "@/model/style-id";
import type { Skill } from "@/model/skill";

loadEnvConfig(process.cwd());

const MODEL = process.env.DIRECTOR_PREVIEW_MODEL || "gemini-2.5-flash-image";
const THUMB_WIDTH = 1280;
const THUMB_QUALITY = 82;

const force = process.argv.includes("--force");
const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice(7)
  .split(",");

function googleImage() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  return createGoogleGenerativeAI({ apiKey }).image(MODEL);
}

// Gemini still → WebP on Blob. Never touches prompt / profile fields.
async function seedDirector(skill: Skill, styleNames: string[]) {
  const visual = (skill.profile ? parseSystemProfile(skill.profile).visual.trim() : "") || skill.description;
  const prompt = directorPreviewPrompt({
    title: skill.title,
    visual,
    styleNames,
  });
  const hash = createHash("sha256").update(`${prompt}|${MODEL}`).digest("hex");
  if (!force && skill.previewUrl && skill.previewHash === hash) {
    console.log(`skip ${skill.slug} (up to date)`);
    return;
  }

  console.log(`generate ${skill.slug}…`);
  const { image } = await generateImage({
    model: googleImage(),
    prompt,
    aspectRatio: "16:9",
  });
  const webp = await sharp(Buffer.from(image.uint8Array))
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
  const previewUrl = await persistBuffer(webp, `explainer/directors/${skill.slug}-preview.webp`, "image/webp");

  const skills = await skillsCollection();
  await skills.updateOne(
    { _id: skill._id },
    { $set: { previewUrl, previewHash: hash, updatedAt: new Date() } },
  );
  console.log(`  ✓ ${previewUrl}`);
}

async function main() {
  const skills = await skillsCollection();
  const docs = (await skills
    .find({ isActive: true, ownerClerkUserId: { $exists: false } })
    .sort({ sortOrder: 1 })
    .toArray()) as Skill[];
  const unknown = (only ?? []).filter((slug) => !docs.some((doc) => doc.slug === slug));
  if (unknown.length) throw new Error(`Unknown system director: ${unknown.join(", ")}`);

  await hydrateStyles();
  const styleNames = directorPreviewStyleNames(STYLE_IDS.map((id) => resolvedStyle(id)));

  let failed = 0;
  for (const skill of docs) {
    if (only && !only.includes(skill.slug)) continue;
    if (isCustomSkill(skill)) continue;
    try {
      await seedDirector(skill, styleNames);
    } catch (error) {
      failed += 1;
      console.error(`  ✗ ${skill.slug}:`, error instanceof Error ? error.message : error);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
