/**
 * End-to-end AliCloud image + clip video test on an existing project.
 * Usage: npx tsx scripts/test-alicloud-generation.ts [projectId]
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";
import { mediaSrc } from "../src/lib/media-src";
import {
  refreshProjectJobs,
  regenerateFrames,
  submitClipVideoJob,
} from "../src/lib/higgsfield/pipeline";
import type { Project } from "../src/types/project";

loadEnvConfig(process.cwd());

const POLL_MS = 10_000;
const FRAME_TIMEOUT_MS = 8 * 60_000;
const VIDEO_TIMEOUT_MS = 15 * 60_000;
const CLIP_NUMBER = 1;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pickProject(idArg?: string) {
  const videos = await videosCollection();
  if (idArg && ObjectId.isValid(idArg)) {
    const project = await videos.findOne({ _id: new ObjectId(idArg) });
    if (!project) throw new Error("找不到專案");
    return project as Project;
  }
  const candidates = await videos
    .find({ "phaseB.prompts.0": { $exists: true }, frames: { $exists: true, $ne: [] } })
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();
  if (!candidates[0]) throw new Error("資料庫沒有可用專案");
  return candidates[0] as Project;
}

async function waitForFrames(projectId: ObjectId, positions: Array<"start" | "end">) {
  const videos = await videosCollection();
  const started = Date.now();
  while (Date.now() - started < FRAME_TIMEOUT_MS) {
    await refreshProjectJobs(projectId);
    const project = (await videos.findOne({ _id: projectId })) as Project | null;
    if (!project) throw new Error("專案消失");
    const rows = (project.frames || []).filter(
      (frame) => frame.clipNumber === CLIP_NUMBER && positions.includes(frame.position),
    );
    const pending = rows.some(
      (frame) => frame.status === "queued" || frame.status === "in_progress",
    );
    const failed = rows.find((frame) => frame.status === "failed");
    if (failed) {
      throw new Error(failed.error || `${failed.position} frame failed`);
    }
    const allDone = positions.every((position) => {
      const row = rows.find((frame) => frame.position === position);
      return row?.status === "completed" && Boolean(mediaSrc(row));
    });
    if (allDone) {
      return {
        elapsedMs: Date.now() - started,
        frames: rows.map((frame) => ({
          position: frame.position,
          url: mediaSrc(frame),
        })),
      };
    }
    if (!pending && !allDone) {
      throw new Error("畫格未進入排程或已卡住");
    }
    await sleep(POLL_MS);
  }
  throw new Error("畫格產生逾時");
}

async function waitForVideo(projectId: ObjectId) {
  const videos = await videosCollection();
  const started = Date.now();
  while (Date.now() - started < VIDEO_TIMEOUT_MS) {
    await refreshProjectJobs(projectId);
    const project = (await videos.findOne({ _id: projectId })) as Project | null;
    if (!project) throw new Error("專案消失");
    const clip = project.clips?.find((row) => row.clipNumber === CLIP_NUMBER);
    if (!clip) throw new Error("找不到 clip 1");
    if (clip.status === "failed") {
      throw new Error(clip.error || "clip video failed");
    }
    if (clip.status === "completed" && mediaSrc(clip)) {
      return { elapsedMs: Date.now() - started, url: mediaSrc(clip) };
    }
    await sleep(POLL_MS);
  }
  throw new Error("影片產生逾時");
}

async function main() {
  const idArg = process.argv[2];
  const project = await pickProject(idArg);
  const projectId = project._id;
  const clipRow = project.clips?.find((row) => row.clipNumber === CLIP_NUMBER);
  const phaseBPrompt = project.phaseB?.prompts?.find((row) => row.clipNumber === CLIP_NUMBER);
  const storyRow = project.phaseA?.clips?.find((row) => row.clipNumber === CLIP_NUMBER);
  const prompt = phaseBPrompt || (clipRow?.prompt
    ? {
        clipNumber: CLIP_NUMBER,
        durationSeconds: clipRow.durationSeconds || storyRow?.durationSeconds || 5,
        prompt: clipRow.prompt,
      }
    : undefined);
  if (!prompt?.prompt) throw new Error("clip 1 沒有可用的影片 prompt");

  console.log(
    JSON.stringify(
      {
        phase: "selected",
        projectId: projectId.toHexString(),
        title: project.phaseA?.localizedTitle,
        status: project.status,
      },
      null,
      2,
    ),
  );

  const frameSubmitStarted = Date.now();
  await regenerateFrames(project, [
    { clipNumber: CLIP_NUMBER, position: "start" },
    { clipNumber: CLIP_NUMBER, position: "end" },
  ]);
  const frameSubmitMs = Date.now() - frameSubmitStarted;

  const frameWaitStarted = Date.now();
  const frames = await waitForFrames(projectId, ["start", "end"]);
  const frameTotalMs = Date.now() - frameWaitStarted;

  const fresh = (await videosCollection()).findOne({ _id: projectId }) as Promise<Project>;
  const projectAfterFrames = await fresh;

  const videoSubmitStarted = Date.now();
  await submitClipVideoJob(projectAfterFrames, CLIP_NUMBER, prompt);
  const videoSubmitMs = Date.now() - videoSubmitStarted;

  const videoWaitStarted = Date.now();
  const video = await waitForVideo(projectId);
  const videoTotalMs = Date.now() - videoWaitStarted;

  console.log(
    JSON.stringify(
      {
        phase: "done",
        projectId: projectId.toHexString(),
        title: project.phaseA?.localizedTitle,
        timings: {
          frameSubmitMs,
          frameWaitMs: frames.elapsedMs,
          frameTotalMs,
          videoSubmitMs,
          videoWaitMs: video.elapsedMs,
          videoTotalMs,
          grandTotalMs: frameTotalMs + videoTotalMs + frameSubmitMs + videoSubmitMs,
        },
        outputs: {
          startFrameUrl: frames.frames.find((row) => row.position === "start")?.url,
          endFrameUrl: frames.frames.find((row) => row.position === "end")?.url,
          clipVideoUrl: video.url,
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
