/**
 * Full Phase A from source (no current draft), then generate every clip's start/end.
 * Usage: npx tsx scripts/rerun-director-then-all-frames.ts <videoId>
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";
import { runPhaseAJob } from "../src/lib/director/jobs";
import { framesWithClip } from "../src/lib/higgsfield/frame-prompts";
import { mediaSrc } from "../src/lib/media-src";
import { refreshProjectJobs, regenerateFrames } from "../src/lib/higgsfield/pipeline";
import type { FramePosition, Project } from "../src/types/project";

loadEnvConfig(process.cwd());

const POLL_MS = 8_000;
const PHASE_A_TIMEOUT_MS = 8 * 60_000;
const FRAME_TIMEOUT_MS = 12 * 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitPhaseA(projectId: ObjectId, startedAt: Date) {
  const videos = await videosCollection();
  const deadline = Date.now() + PHASE_A_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const fresh = (await videos.findOne({ _id: projectId })) as Project | null;
    if (
      fresh?.status === "awaiting_approval" &&
      fresh.phaseA &&
      fresh.updatedAt &&
      new Date(fresh.updatedAt) >= startedAt
    ) {
      return fresh;
    }
    if (fresh?.status === "failed") throw new Error(fresh.error || "Phase A 失敗");
    await sleep(POLL_MS);
  }
  throw new Error("Phase A 逾時");
}

async function waitClipFrames(projectId: ObjectId, clipNumber: number) {
  const videos = await videosCollection();
  const deadline = Date.now() + FRAME_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await refreshProjectJobs(projectId);
    const fresh = (await videos.findOne({ _id: projectId })) as Project;
    const rows = (fresh.frames || []).filter((frame) => frame.clipNumber === clipNumber);
    const failed = rows.find((frame) => frame.status === "failed" || frame.status === "nsfw");
    if (failed) throw new Error(`clip ${clipNumber} ${failed.position}: ${failed.error || "失敗"}`);
    const done = (["start", "end"] as FramePosition[]).every((position) => {
      const row = rows.find((frame) => frame.position === position);
      return row?.status === "completed" && Boolean(mediaSrc(row));
    });
    if (done) return fresh;
    await sleep(POLL_MS);
  }
  throw new Error(`clip ${clipNumber} 畫格逾時`);
}

async function main() {
  const videoId = process.argv[2] || "6aae09120d76b8b8baa76aaa";
  if (!ObjectId.isValid(videoId)) throw new Error("無效 videoId");

  const videos = await videosCollection();
  const projectId = new ObjectId(videoId);
  const before = (await videos.findOne({ _id: projectId })) as Project | null;
  if (!before) throw new Error("專案不存在");

  const phaseAStartedAt = new Date();
  await videos.updateOne(
    { _id: projectId },
    {
      $set: { clips: [], status: "phase_a", updatedAt: new Date() },
      $unset: { phaseA: "", frames: "", error: "" },
    },
  );

  const revision = [
    "Ignore any previous draft. Write a complete new Phase A from the source.",
    "Every clip's explainerScene MUST write 起始 and 結尾（N秒後） as two distinct states.",
    "Scale start→end travel by that clip's durationSeconds (3s small beat, 4s beat+follow-through, 5–6s two beats, 7–8s two stronger beats).",
    "Same locked camera; no cut or teleport. motionCamera must name how far things move.",
  ].join(" ");

  await runPhaseAJob(projectId, revision);
  const afterDirector = await waitPhaseA(projectId, phaseAStartedAt);
  const clips = afterDirector.phaseA?.clips || [];
  if (clips.length === 0) throw new Error("Phase A 沒有 clips");

  let project = afterDirector;
  const outputs: Array<Record<string, unknown>> = [];

  for (const clip of clips) {
    const frames = framesWithClip(project, clip.clipNumber);
    await videos.updateOne(
      { _id: projectId },
      { $set: { frames, status: "production", updatedAt: new Date() } },
    );
    await regenerateFrames({ ...project, frames }, [
      { clipNumber: clip.clipNumber, position: "start" },
      { clipNumber: clip.clipNumber, position: "end" },
    ]);
    project = await waitClipFrames(projectId, clip.clipNumber);
    const rows = (project.frames || []).filter((f) => f.clipNumber === clip.clipNumber);
    outputs.push({
      clipNumber: clip.clipNumber,
      durationSeconds: clip.durationSeconds,
      explainerScene: clip.explainerScene,
      motionCamera: clip.motionCamera,
      englishVo: clip.englishVo,
      startFrameUrl: mediaSrc(rows.find((f) => f.position === "start")),
      endFrameUrl: mediaSrc(rows.find((f) => f.position === "end")),
    });
  }

  console.log(
    JSON.stringify(
      {
        projectId: videoId,
        title: project.phaseA?.localizedTitle,
        sceneTextEnabled: project.sceneTextEnabled,
        sceneTextLanguage: project.sceneTextLanguage,
        language: project.language,
        clipCount: clips.length,
        clips: outputs,
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
