import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { skillsCollection } from "@/dao";
import { parseSystemProfile } from "@/service/director/profile";
import { MINIMAX_H3_VIDEO_MODEL } from "@/service/higgsfield/clip-keyframes";
import type { HiggsfieldDefaults, SkillInputSchema } from "@/model/skill";

loadEnvConfig(process.cwd());

// One entry per skill directory under `skills/`. The markdown tree of each
// directory becomes the director system prompt (SKILL.md) plus references.
type SkillManifest = {
  dir: string;
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  inputSchema?: Partial<SkillInputSchema>;
};

// Shared execution layer: Qwen Image 3 for stills + MiniMax H3 first/last I2V.
const HIGGSFIELD_DEFAULTS: HiggsfieldDefaults = {
  imageModel: "alibaba/qwen-image-3/text-to-image",
  imageQuality: "medium",
  imageResolution: "1k",
  videoModel: MINIMAX_H3_VIDEO_MODEL,
};

const INPUT_SCHEMA: SkillInputSchema = {
  requiresSource: true,
  aspectRatios: ["16:9", "9:16", "1:1"],
  durationPresets: ["micro", "short", "punchy", "full"],
  optionalCharacterImage: true,
};

const SKILLS: SkillManifest[] = [
  {
    dir: "cartoon-explainer-video-director",
    slug: "cartoon-explainer-video-director",
    title: "Whiteboard concept explainer",
    description:
      "Turn a concept into a whiteboard doodle explainer for Reels, marketing, and decks. Approve the storyboard, then export the clips.",
    sortOrder: 1,
  },
  {
    dir: "story-short-director",
    slug: "story-short-director",
    title: "Short film",
    description: "A short film driven by character dialogue. Structure follows the source — no narrator.",
    sortOrder: 2,
  },
  {
    dir: "product-demo-director",
    slug: "product-demo-director",
    title: "Product demo / unboxing",
    description: "Pain → unbox → feature demo → result, with the product look locked throughout.",
    sortOrder: 3,
  },
  {
    dir: "dialogue-qa-director",
    slug: "dialogue-qa-director",
    title: "Two-character Q&A",
    description: "Exactly two characters ask and answer. Questions build curiosity; answers deliver the point.",
    sortOrder: 4,
  },
  {
    dir: "listicle-director",
    slug: "listicle-director",
    title: "Listicle",
    description: "N items, one per clip, fast cuts. Every still must show the list text.",
    sortOrder: 5,
  },
  {
    dir: "tutorial-director",
    slug: "tutorial-director",
    title: "Step-by-step tutorial",
    description: "Show the finished result, then one step per clip, and return to the finished piece.",
    sortOrder: 6,
  },
  {
    dir: "opening-director",
    slug: "opening-director",
    title: "Opening",
    description: "A single 3–4 second bumper: the brand logo enters and holds, placed before the main video.",
    sortOrder: 7,
    inputSchema: { durationPresets: ["micro"] },
  },
  {
    dir: "ending-director",
    slug: "ending-director",
    title: "Ending",
    description: "A single 3–4 second closer: the frame settles on the brand logo as the last beat.",
    sortOrder: 8,
    inputSchema: { durationPresets: ["micro"] },
  },
  {
    dir: "talking-head-director",
    slug: "talking-head-director",
    title: "Talking-head read",
    description: "One character reads to camera: one line per clip, timed to word count, up to 20 clips, with bottom subtitles.",
    sortOrder: 9,
    inputSchema: { durationPresets: ["micro"] },
  },
  {
    dir: "full-body-talking-head-director",
    slug: "full-body-talking-head-director",
    title: "Full body Talking-head read",
    description:
      "One character reads to camera in a locked full-body shot. Clips share a similar length, up to 20, with bottom subtitles.",
    sortOrder: 10,
    inputSchema: { durationPresets: ["micro"] },
  },
  {
    dir: "comparison-card-director",
    slug: "comparison-card-director",
    title: "Comparison card",
    description: "One comparison per clip: two views of the same thing, left/right or top/bottom.",
    sortOrder: 11,
  },
  {
    dir: "talking-broll-director",
    slug: "talking-broll-director",
    title: "Talking-head with B-roll",
    description: "Two lines to camera, a cutaway of what those lines named, then back to the same close-up.",
    sortOrder: 12,
  },
  {
    dir: "surprise-interview-director",
    slug: "surprise-interview-director",
    title: "Surprise interview",
    description: "One character opens on a surprised close-up, then sits facing the camera and explains the concept.",
    sortOrder: 13,
  },
  {
    dir: "outfit-reel-director",
    slug: "outfit-reel-director",
    title: "Outfit reel",
    description: "Already wearing the full outfit from the reference image. Each clip is a different camera move, with sound effects only.",
    sortOrder: 14,
  },
  {
    dir: "follow-shot-director",
    slug: "follow-shot-director",
    title: "Follow shot",
    description: "A third-person continuous shot. Each clip starts on the previous clip's end.",
    sortOrder: 15,
  },
];

async function readMarkdownTree(dir: string, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: Array<{ path: string; content: string }> = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readMarkdownTree(full, relative)));
      continue;
    }
    if (entry.name.endsWith(".md")) {
      files.push({ path: relative, content: await readFile(full, "utf8") });
    }
  }
  return files;
}

async function seedSkill(manifest: SkillManifest) {
  const files = await readMarkdownTree(path.join(process.cwd(), "skills", manifest.dir));
  const skillFile = files.find((file) => file.path === "SKILL.md");
  if (!skillFile) {
    throw new Error(`Missing SKILL.md in skills/${manifest.dir}`);
  }
  // Public 8-field summary shown instead of the prompt; required for every system skill.
  const profile = parseSystemProfile(
    JSON.parse(await readFile(path.join(process.cwd(), "skills", manifest.dir, "profile.json"), "utf8")),
  );

  const now = new Date();
  const skills = await skillsCollection();
  await skills.updateOne(
    { slug: manifest.slug },
    {
      $set: {
        slug: manifest.slug,
        title: manifest.title,
        description: manifest.description,
        profile,
        systemPrompt: skillFile.content,
        references: files
          .filter((file) => file.path !== "SKILL.md")
          .map((file) => ({ path: file.path, content: file.content })),
        inputSchema: { ...INPUT_SCHEMA, ...manifest.inputSchema },
        higgsfieldDefaults: HIGGSFIELD_DEFAULTS,
        isActive: true,
        sortOrder: manifest.sortOrder,
        updatedAt: now,
      },
      $unset: { titleZh: "" },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  console.log(`Seeded skill: ${manifest.slug}`);
}

// Optional slugs (`tsx scripts/seed-skills.ts story-short-director`) seed only those skills.
async function main() {
  const only = process.argv.slice(2);
  const unknown = only.filter((slug) => !SKILLS.some((s) => s.slug === slug));
  if (unknown.length) throw new Error(`Unknown skill slug: ${unknown.join(", ")}`);
  for (const manifest of SKILLS.filter((s) => !only.length || only.includes(s.slug))) {
    await seedSkill(manifest);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
