import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { skillsCollection } from "../src/lib/collections";

loadEnvConfig(process.cwd());

const SKILL_DIR = path.join(
  process.cwd(),
  "skills/cartoon-explainer-video-director",
);

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

async function main() {
  const files = await readMarkdownTree(SKILL_DIR);
  const skillFile = files.find((file) => file.path === "SKILL.md");
  if (!skillFile) {
    throw new Error("Missing SKILL.md");
  }

  const now = new Date();
  const skills = await skillsCollection();
  await skills.updateOne(
    { slug: "cartoon-explainer-video-director" },
    {
      $set: {
        slug: "cartoon-explainer-video-director",
        title: "Whiteboard concept explainer",
        titleZh: "白板概念解說",
        description:
          "用白板塗鴉風格把概念講清楚，適合 Reels、行銷與簡報。先核准分鏡，再產出影片。",
        systemPrompt: skillFile.content,
        references: files
          .filter((file) => file.path !== "SKILL.md")
          .map((file) => ({ path: file.path, content: file.content })),
        inputSchema: {
          requiresSource: true,
          aspectRatios: ["16:9", "9:16", "1:1"],
          durationPresets: ["micro", "short", "punchy", "full"],
          optionalCharacterImage: true,
        },
        // Execution layer: ChatGPT Image 2 (low / 1K) + Wan 3 clips.
        higgsfieldDefaults: {
          imageModel: "gpt_image_2",
          imageQuality: "low",
          imageResolution: "1k",
          videoModel: "wan3",
        },
        isActive: true,
        sortOrder: 1,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  console.log("Seeded skill: cartoon-explainer-video-director");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
