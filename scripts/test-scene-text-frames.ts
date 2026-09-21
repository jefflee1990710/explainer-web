/**
 * Turn on scene text for a project and regenerate clip 1 start/end frames.
 * Usage: npx tsx scripts/test-scene-text-frames.ts <videoId> [zh-Hant|en|zh-Hans]
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";
import { buildFramePrompt } from "../src/lib/higgsfield/frame-prompts";
import { mediaSrc } from "../src/lib/media-src";
import { refreshProjectJobs, regenerateFrames } from "../src/lib/higgsfield/pipeline";
import { isSceneTextLanguage } from "../src/lib/director/scene-text";
import type { Project, SceneTextLanguage } from "../src/types/project";

loadEnvConfig(process.cwd());

const CLIP = 1;
const POLL_MS = 10_000;
const TIMEOUT_MS = 8 * 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const videoId = process.argv[2];
  const langArg = process.argv[3] || "zh-Hant";
  if (!videoId || !ObjectId.isValid(videoId)) {
    throw new Error("用法: npx tsx scripts/test-scene-text-frames.ts <videoId> [language]");
  }
  const language: SceneTextLanguage = isSceneTextLanguage(langArg) ? langArg : "zh-Hant";

  const videos = await videosCollection();
  const projectId = new ObjectId(videoId);
  const before = (await videos.findOne({ _id: projectId })) as Project | null;
  if (!before?.phaseA) throw new Error("專案缺少分鏡");

  await videos.updateOne(
    { _id: projectId },
    {
      $set: {
        sceneTextEnabled: true,
        sceneTextLanguage: language,
        updatedAt: new Date(),
      },
    },
  );

  const project = (await videos.findOne({ _id: projectId })) as Project;
  const promptStart = buildFramePrompt(project, CLIP, "start");
  const promptEnd = buildFramePrompt(project, CLIP, "end");

  const submitStarted = Date.now();
  await regenerateFrames(project, [
    { clipNumber: CLIP, position: "start" },
    { clipNumber: CLIP, position: "end" },
  ]);

  const waitStarted = Date.now();
  while (Date.now() - waitStarted < TIMEOUT_MS) {
    await refreshProjectJobs(projectId);
    const fresh = (await videos.findOne({ _id: projectId })) as Project;
    const rows = (fresh.frames || []).filter((frame) => frame.clipNumber === CLIP);
    const failed = rows.find((frame) => frame.status === "failed" || frame.status === "nsfw");
    if (failed) throw new Error(failed.error || "畫格產生失敗");

    const done = (["start", "end"] as const).every((position) => {
      const row = rows.find((frame) => frame.position === position);
      return row?.status === "completed" && Boolean(mediaSrc(row));
    });
    if (done) {
      console.log(
        JSON.stringify(
          {
            projectId: videoId,
            title: fresh.phaseA?.localizedTitle,
            sceneTextEnabled: fresh.sceneTextEnabled,
            sceneTextLanguage: fresh.sceneTextLanguage,
            explainerScene: fresh.phaseA?.clips?.find((c) => c.clipNumber === CLIP)?.explainerScene,
            promptChecks: {
              startHasMandatory: /MANDATORY ON-CANVAS TEXT/.test(promptStart),
              startHasExactVo: promptStart.includes(
                `Exact text to render (only writing allowed in the image): "${fresh.phaseA?.clips?.find((c) => c.clipNumber === CLIP)?.englishVo}"`,
              ),
              endHasMandatory: /MANDATORY ON-CANVAS TEXT/.test(promptEnd),
              dbStartPromptHasMandatory: /MANDATORY ON-CANVAS TEXT/.test(
                rows.find((f) => f.position === "start")?.prompt || "",
              ),
            },
            timings: {
              submitMs: Date.now() - submitStarted,
              waitMs: Date.now() - waitStarted,
            },
            outputs: {
              startFrameUrl: mediaSrc(rows.find((f) => f.position === "start")),
              endFrameUrl: mediaSrc(rows.find((f) => f.position === "end")),
            },
          },
          null,
          2,
        ),
      );
      return;
    }
    await sleep(POLL_MS);
  }
  throw new Error("畫格產生逾時");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
