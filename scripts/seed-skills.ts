import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { skillsCollection } from "../src/lib/collections";
import type { HiggsfieldDefaults, SkillInputSchema } from "../src/types/skill";

loadEnvConfig(process.cwd());

// One entry per skill directory under `skills/`. The markdown tree of each
// directory becomes the director system prompt (SKILL.md) plus references.
type SkillManifest = {
  dir: string;
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  sortOrder: number;
  inputSchema?: Partial<SkillInputSchema>;
};

// Shared execution layer (Higgsfield model slugs from GET /models):
// Qwen Image 3 for stills/frames (edit when references attached) + Wan 3.0 for clips.
const HIGGSFIELD_DEFAULTS: HiggsfieldDefaults = {
  imageModel: "alibaba/qwen-image-3/text-to-image",
  imageQuality: "medium",
  imageResolution: "1k",
  videoModel: "alibaba/wan-3.0/image-to-video",
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
    titleZh: "白板概念解說",
    description:
      "用白板塗鴉風格把概念講清楚，適合 Reels、行銷與簡報。先核准分鏡，再產出影片。",
    sortOrder: 1,
  },
  {
    dir: "story-short-director",
    slug: "story-short-director",
    title: "Short film",
    titleZh: "故事短片",
    description: "角色對白推進的短片：有目標、阻礙與轉折，沒有旁白。",
    sortOrder: 2,
  },
  {
    dir: "product-demo-director",
    slug: "product-demo-director",
    title: "Product demo / unboxing",
    titleZh: "產品 Demo / 開箱",
    description: "痛點 → 開箱 → 核心功能示範 → 成果，產品外觀全程鎖定一致。",
    sortOrder: 3,
  },
  {
    dir: "dialogue-qa-director",
    slug: "dialogue-qa-director",
    title: "Two-character Q&A",
    titleZh: "對話式 Q&A",
    description: "必須選兩個角色一問一答，用提問推進好奇心，用回答交付重點。",
    sortOrder: 4,
  },
  {
    dir: "listicle-director",
    slug: "listicle-director",
    title: "Listicle",
    titleZh: "清單式",
    description: "N 個重點逐條快切，每段一項，畫面必須列出清單文字。",
    sortOrder: 5,
  },
  {
    dir: "tutorial-director",
    slug: "tutorial-director",
    title: "Step-by-step tutorial",
    titleZh: "教學步驟",
    description: "先亮成果，再一步一步示範，每段一個步驟，最後回到完成品。",
    sortOrder: 6,
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

  const now = new Date();
  const skills = await skillsCollection();
  await skills.updateOne(
    { slug: manifest.slug },
    {
      $set: {
        slug: manifest.slug,
        title: manifest.title,
        titleZh: manifest.titleZh,
        description: manifest.description,
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
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  console.log(`Seeded skill: ${manifest.slug}`);
}

async function main() {
  for (const manifest of SKILLS) {
    await seedSkill(manifest);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
