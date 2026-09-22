/**
 * Print how ON vs OFF scene text changes clip frame prompts (no API calls).
 * Usage: npx tsx scripts/diff-scene-text-prompt.ts <videoId> [clipNumber=1]
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import {
  sceneTextNegativePrompt,
  sceneTextFrameLines,
} from "@/service/director/scene-text";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { videosCollection } from "@/dao";
import type { Project } from "@/model/project";

loadEnvConfig(process.cwd());

function excerpt(prompt: string, needle: string, radius = 120) {
  const i = prompt.indexOf(needle);
  if (i < 0) return `(missing: ${needle})`;
  const start = Math.max(0, i - radius);
  const end = Math.min(prompt.length, i + needle.length + radius);
  return `…${prompt.slice(start, end)}…`;
}

async function main() {
  const videoId = process.argv[2];
  const clip = Number(process.argv[3] || "1");
  if (!videoId || !ObjectId.isValid(videoId)) {
    throw new Error("用法: npx tsx scripts/diff-scene-text-prompt.ts <videoId> [clip]");
  }

  const videos = await videosCollection();
  const base = (await videos.findOne({ _id: new ObjectId(videoId) })) as Project | null;
  if (!base?.phaseA) throw new Error("專案缺少分鏡");

  const row = base.phaseA.clips.find((c) => c.clipNumber === clip);
  if (!row) throw new Error(`找不到 clip ${clip}`);

  const off: Project = { ...base, sceneTextEnabled: false };
  const on: Project = { ...base, sceneTextEnabled: true, sceneTextLanguage: "en" };

  for (const position of ["start", "end"] as const) {
    const promptOff = buildFramePrompt(off, clip, position);
    const promptOn = buildFramePrompt(on, clip, position);
    const stored = base.frames?.find(
      (f) => f.clipNumber === clip && f.position === position,
    );

    console.log(`\n=== Clip ${clip} · ${position} ===`);
    console.log("englishVo:", row.englishVo);
    console.log("DB sceneTextEnabled:", base.sceneTextEnabled);
    console.log("stored prompt has MANDATORY:", /MANDATORY ON-CANVAS TEXT/.test(stored?.prompt || ""));
    console.log("stored prompt has No on-canvas:", /No on-canvas text/.test(stored?.prompt || ""));
    console.log("rebuilt(OFF) negative:", sceneTextNegativePrompt(false));
    console.log("rebuilt(ON) negative:", sceneTextNegativePrompt(true) ?? "(none)");
    console.log("\nOFF frame lines:", sceneTextFrameLines(false, "en").join(" | "));
    console.log("ON frame lines (head):", sceneTextFrameLines(true, "en", row.englishVo)[0]);
    console.log("\nOFF excerpt:", excerpt(promptOff, "Scene:"));
    console.log("ON excerpt:", excerpt(promptOn, "MANDATORY ON-CANVAS TEXT"));
    console.log("prompts equal?", promptOff === promptOn);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
