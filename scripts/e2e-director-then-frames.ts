/**
 * Change scene-text settings, re-run Phase A (director), then regenerate clip 1 frames.
 * Usage: npx tsx scripts/e2e-director-then-frames.ts <videoId> [off|en|zh-Hant|zh-Hans]
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";
import {
  isSceneTextLanguage,
  sceneTextDirectorRevisionNote,
} from "../src/lib/director/scene-text";
import { runPhaseAJob } from "../src/lib/director/jobs";
import { buildFramePrompt, framesWithClip } from "../src/lib/higgsfield/frame-prompts";
import { mediaSrc } from "../src/lib/media-src";
import { refreshProjectJobs, regenerateFrames } from "../src/lib/higgsfield/pipeline";
import type { Project, SceneTextLanguage } from "../src/types/project";

loadEnvConfig(process.cwd());

const CLIP = 1;
const POLL_MS = 8_000;
const PHASE_A_TIMEOUT_MS = 6 * 60_000;
const FRAME_TIMEOUT_MS = 10 * 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCase(arg: string | undefined): {
  sceneTextEnabled: boolean;
  sceneTextLanguage: SceneTextLanguage;
  label: string;
} {
  if (!arg || arg === "off") {
    return { sceneTextEnabled: false, sceneTextLanguage: "en", label: "關閉" };
  }
  const language: SceneTextLanguage = isSceneTextLanguage(arg) ? arg : "en";
  return { sceneTextEnabled: true, sceneTextLanguage: language, label: `開啟 · ${language}` };
}

async function waitPhaseA(projectId: ObjectId, startedAt: Date) {
  const videos = await videosCollection();
  const deadline = Date.now() + PHASE_A_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const fresh = (await videos.findOne({ _id: projectId })) as Project | null;
    if (
      (fresh?.status === "production" || fresh?.status === "awaiting_approval") &&
      fresh.phaseA &&
      fresh.updatedAt &&
      new Date(fresh.updatedAt) >= startedAt
    ) {
      return fresh;
    }
    if (fresh?.status === "failed") {
      throw new Error(fresh.error || "Phase A 失敗");
    }
    await sleep(POLL_MS);
  }
  throw new Error("Phase A 逾時");
}

async function waitFrames(projectId: ObjectId) {
  const videos = await videosCollection();
  const deadline = Date.now() + FRAME_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await refreshProjectJobs(projectId);
    const fresh = (await videos.findOne({ _id: projectId })) as Project;
    const rows = (fresh.frames || []).filter((frame) => frame.clipNumber === CLIP);
    const failed = rows.find((frame) => frame.status === "failed");
    if (failed) throw new Error(failed.error || "畫格產生失敗");
    const done = (["start", "end"] as const).every((position) => {
      const row = rows.find((frame) => frame.position === position);
      return row?.status === "completed" && Boolean(mediaSrc(row));
    });
    if (done) return fresh;
    await sleep(POLL_MS);
  }
  throw new Error("畫格產生逾時");
}

async function main() {
  const videoId = process.argv[2];
  const c = parseCase(process.argv[3]);
  if (!videoId || !ObjectId.isValid(videoId)) {
    throw new Error("用法: npx tsx scripts/e2e-director-then-frames.ts <videoId> [off|en|zh-Hant|zh-Hans]");
  }

  const videos = await videosCollection();
  const projectId = new ObjectId(videoId);
  const before = (await videos.findOne({ _id: projectId })) as Project | null;
  if (!before) throw new Error("專案不存在");

  const oldScene = before.phaseA?.clips.find((clip) => clip.clipNumber === CLIP)?.explainerScene;
  const phaseAStartedAt = new Date();

  await videos.updateOne(
    { _id: projectId },
    {
      $set: {
        sceneTextEnabled: c.sceneTextEnabled,
        sceneTextLanguage: c.sceneTextLanguage,
        ...(c.sceneTextEnabled && (c.sceneTextLanguage === "zh-Hant" || c.sceneTextLanguage === "zh-Hans")
          ? { language: "zh" as const }
          : {}),
        status: "phase_a",
        updatedAt: new Date(),
      },
      $unset: { error: "" },
    },
  );

  const revision = sceneTextDirectorRevisionNote(c.sceneTextEnabled, c.sceneTextLanguage);
  await runPhaseAJob(projectId, revision, { clipsOnly: true });
  const afterDirector = await waitPhaseA(projectId, phaseAStartedAt);
  const clip = afterDirector.phaseA?.clips.find((row) => row.clipNumber === CLIP);
  if (!clip) throw new Error("Phase A 沒有 clip 1");

  // Drop old stills so Qwen cannot copy baked-in labels from a previous attempt.
  const frames = framesWithClip(afterDirector, CLIP);
  await videos.updateOne(
    { _id: projectId },
    { $set: { frames, status: "production", updatedAt: new Date() } },
  );
  const forSubmit = { ...afterDirector, frames };
  const promptStart = buildFramePrompt(forSubmit, CLIP, "start");
  await regenerateFrames(forSubmit, [
    { clipNumber: CLIP, position: "start" },
    { clipNumber: CLIP, position: "end" },
  ]);
  const done = await waitFrames(projectId);
  const rows = (done.frames || []).filter((frame) => frame.clipNumber === CLIP);

  console.log(
    JSON.stringify(
      {
        case: c.label,
        projectId: videoId,
        title: done.phaseA?.localizedTitle,
        sceneTextEnabled: done.sceneTextEnabled,
        sceneTextLanguage: done.sceneTextLanguage,
        director: {
          revisionNote: revision,
          oldExplainerScene: oldScene,
          newExplainerScene: clip.explainerScene,
          englishVo: clip.englishVo,
          sceneLostQuotedLabel: !/[「『]/.test(clip.explainerScene || ""),
        },
        prompt: {
          hasSubtitleOn: /subtitles ON/i.test(promptStart),
          hasNoText: /No on-canvas text/.test(promptStart),
          hasQuotedVo: promptStart.includes(clip.englishVo),
          sceneLineHasOldLabel: /Mental Health\?/.test(promptStart),
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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
