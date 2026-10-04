import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { skillsCollection } from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";
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

const files: Record<string, string> = {
  "cartoon-explainer-video-director": "/tmp/director-cartoon.webp",
  "comparison-card-director": "/tmp/director-comparison.webp",
  "talking-broll-director": "/tmp/director-broll.webp",
  "talking-head-director": "/tmp/talking-head-original.webp",
};

async function main() {
  await hydrateStyles();
  const styleNames = directorPreviewStyleNames(STYLE_IDS.map((id) => resolvedStyle(id)));
  const skills = await skillsCollection();
  for (const [slug, file] of Object.entries(files)) {
    const skill = (await skills.findOne({
      slug,
      ownerClerkUserId: { $exists: false },
    })) as Skill | null;
    if (!skill) throw new Error(slug);
    const profile = skill.profile ? parseSystemProfile(skill.profile) : null;
    const visual = profile?.visual.trim() || skill.description;
    const plan = [profile?.hook, profile?.arc].filter(Boolean).join(" ") || skill.description;
    const prompt = directorPreviewPrompt({ title: skill.title, visual, plan, styleNames });
    const hash = createHash("sha256").update(`${prompt}|${MODEL}`).digest("hex");
    const webp = await bleedDirectorPreview(readFileSync(file));
    const meta = await sharp(webp).metadata();
    const previewUrl = await persistBuffer(
      webp,
      `explainer/directors/${slug}-preview-${hash.slice(0, 10)}.webp`,
      "image/webp",
    );
    await skills.updateOne(
      { _id: skill._id },
      { $set: { previewUrl, previewHash: hash, updatedAt: new Date() } },
    );
    console.log(slug, `${meta.width}x${meta.height}`, previewUrl);
  }
}

main();
