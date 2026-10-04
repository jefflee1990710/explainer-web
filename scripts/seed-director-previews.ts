import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { skillsCollection } from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";
import { isCustomSkill } from "@/service/director/behavior-slug";
import { bleedDirectorPreview } from "@/service/director/preview-frame";
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

const force = process.argv.includes("--force");
// Re-crop stored previews, keeping the frame aspect ratio. Does not call the image model.
const refit = process.argv.includes("--refit");
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
  const profile = skill.profile ? parseSystemProfile(skill.profile) : null;
  const visual = profile?.visual.trim() || skill.description;
  const plan = [profile?.hook, profile?.arc].filter(Boolean).join(" ") || skill.description;
  const prompt = directorPreviewPrompt({
    title: skill.title,
    visual,
    plan,
    styleNames,
  });
  const hash = createHash("sha256").update(`${prompt}|${MODEL}`).digest("hex");
  if (!force && !refit && skill.previewUrl && skill.previewHash === hash) {
    console.log(`skip ${skill.slug} (up to date)`);
    return;
  }

  let webp: Buffer;
  if (refit && !force && skill.previewUrl) {
    console.log(`refit ${skill.slug}…`);
    const response = await fetch(skill.previewUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`無法下載 ${skill.slug} 預覽`);
    webp = await bleedDirectorPreview(Buffer.from(await response.arrayBuffer()));
  } else {
    console.log(`generate ${skill.slug}…`);
    const { image } = await generateImage({
      model: googleImage(),
      prompt,
      aspectRatio: "16:9",
    });
    webp = await bleedDirectorPreview(Buffer.from(image.uint8Array));
  }
  // New pathname so a CDN cache of the previous file cannot keep the letterbox.
  const previewUrl = await persistBuffer(
    webp,
    `explainer/directors/${skill.slug}-preview-${hash.slice(0, 10)}.webp`,
    "image/webp",
  );

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
