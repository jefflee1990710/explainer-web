/**
 * Regenerate clip 1 frames for OFF / ON+en / ON+zh-Hant and collect URLs.
 * Usage: npx tsx scripts/e2e-scene-text-cases.ts <videoId>
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";
import { buildFramePrompt } from "../src/lib/higgsfield/frame-prompts";
import { mediaSrc } from "../src/lib/media-src";
import { refreshProjectJobs, regenerateFrames } from "../src/lib/higgsfield/pipeline";
import type { Project, SceneTextLanguage } from "../src/types/project";

loadEnvConfig(process.cwd());

const CLIP = 1;
const POLL_MS = 10_000;
const TIMEOUT_MS = 10 * 60_000;

type Case = {
  name: string;
  sceneTextEnabled: boolean;
  sceneTextLanguage?: SceneTextLanguage;
};

const CASES: Case[] = [
  { name: "關閉", sceneTextEnabled: false },
  { name: "開啟 · English", sceneTextEnabled: true, sceneTextLanguage: "en" },
  { name: "開啟 · 繁體中文", sceneTextEnabled: true, sceneTextLanguage: "zh-Hant" },
  { name: "開啟 · 简体中文", sceneTextEnabled: true, sceneTextLanguage: "zh-Hans" },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function typographySnippet(prompt: string) {
  const m = prompt.match(/On-canvas text language:[^\n]+/);
  return m?.[0] ?? null;
}

async function waitFrames(projectId: ObjectId) {
  const started = Date.now();
  while (Date.now() - started < TIMEOUT_MS) {
    await refreshProjectJobs(projectId);
    const fresh = (await videosCollection().then((c) => c.findOne({ _id: projectId }))) as Project;
    const rows = (fresh.frames || []).filter((f) => f.clipNumber === CLIP);
    const failed = rows.find((f) => f.status === "failed");
    if (failed) throw new Error(`${failed.position}: ${failed.error || "failed"}`);
    const done = (["start", "end"] as const).every((pos) => {
      const row = rows.find((f) => f.position === pos);
      return row?.status === "completed" && Boolean(mediaSrc(row));
    });
    if (done) return fresh;
    await sleep(POLL_MS);
  }
  throw new Error("逾時");
}

async function main() {
  const videoId = process.argv[2];
  if (!videoId || !ObjectId.isValid(videoId)) {
    throw new Error("用法: npx tsx scripts/e2e-scene-text-cases.ts <videoId>");
  }
  const projectId = new ObjectId(videoId);
  const videos = await videosCollection();
  const base = (await videos.findOne({ _id: projectId })) as Project | null;
  if (!base?.phaseA) throw new Error("專案缺少分鏡");

  const vo = base.phaseA.clips.find((c) => c.clipNumber === CLIP)?.englishVo ?? "";
  const out: Record<string, unknown>[] = [];

  for (const c of CASES) {
    const caseStarted = Date.now();
    await videos.updateOne(
      { _id: projectId },
      {
        $set: {
          sceneTextEnabled: c.sceneTextEnabled,
          ...(c.sceneTextLanguage ? { sceneTextLanguage: c.sceneTextLanguage } : {}),
          updatedAt: new Date(),
        },
      },
    );
    const project = (await videos.findOne({ _id: projectId })) as Project;
    const promptStart = buildFramePrompt(project, CLIP, "start");

    await regenerateFrames(project, [
      { clipNumber: CLIP, position: "start" },
      { clipNumber: CLIP, position: "end" },
    ]);

    const fresh = await waitFrames(projectId);
    const rows = (fresh.frames || []).filter((f) => f.clipNumber === CLIP);
    const start = rows.find((f) => f.position === "start");
    const end = rows.find((f) => f.position === "end");

    out.push({
      case: c.name,
      sceneTextEnabled: c.sceneTextEnabled,
      sceneTextLanguage: c.sceneTextLanguage ?? fresh.sceneTextLanguage,
      voiceover: vo,
      prompt: {
        hasMandatory: /MANDATORY ON-CANVAS TEXT/.test(promptStart),
        hasNoText: /No on-canvas text/.test(promptStart),
        typographyLine: typographySnippet(promptStart),
        storedStartHasMandatory: /MANDATORY ON-CANVAS TEXT/.test(start?.prompt || ""),
        storedStartHasNoText: /No on-canvas text/.test(start?.prompt || ""),
      },
      urls: {
        start: mediaSrc(start),
        end: mediaSrc(end),
      },
      ms: Date.now() - caseStarted,
    });
  }

  console.log(JSON.stringify({ projectId: videoId, title: base.phaseA.localizedTitle, results: out }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
