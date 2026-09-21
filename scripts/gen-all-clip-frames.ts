/**
 * Generate start/end stills for every Phase A clip (no director call).
 * Usage: npx tsx scripts/gen-all-clip-frames.ts <videoId>
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";
import { framesWithClip } from "../src/lib/higgsfield/frame-prompts";
import { mediaSrc } from "../src/lib/media-src";
import { refreshProjectJobs, regenerateFrames } from "../src/lib/higgsfield/pipeline";
import type { FramePosition, Project } from "../src/types/project";

loadEnvConfig(process.cwd());

const POLL_MS = 8_000;
const TIMEOUT_MS = 12 * 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitClip(projectId: ObjectId, clipNumber: number) {
  const videos = await videosCollection();
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await refreshProjectJobs(projectId);
    const fresh = (await videos.findOne({ _id: projectId })) as Project;
    const rows = (fresh.frames || []).filter((frame) => frame.clipNumber === clipNumber);
    const failed = rows.find((frame) => frame.status === "failed");
    if (failed) throw new Error(`clip ${clipNumber} ${failed.position}: ${failed.error || "失敗"}`);
    const done = (["start", "end"] as FramePosition[]).every((position) => {
      const row = rows.find((frame) => frame.position === position);
      return row?.status === "completed" && Boolean(mediaSrc(row));
    });
    if (done) return fresh;
    await sleep(POLL_MS);
  }
  throw new Error(`clip ${clipNumber} 逾時`);
}

async function main() {
  const videoId = process.argv[2] || "6aae09120d76b8b8baa76aaa";
  const projectId = new ObjectId(videoId);
  const videos = await videosCollection();
  let project = (await videos.findOne({ _id: projectId })) as Project | null;
  if (!project?.phaseA?.clips?.length) throw new Error("缺少分鏡");
  const storyboard = project.phaseA.clips;

  if (!project.clips) {
    await videos.updateOne({ _id: projectId }, { $set: { clips: [] } });
    project = { ...project, clips: [] };
  }

  const outputs: Array<Record<string, unknown>> = [];
  for (const clip of storyboard) {
    const frames = framesWithClip(project, clip.clipNumber);
    await videos.updateOne(
      { _id: projectId },
      { $set: { frames, status: "production", updatedAt: new Date() } },
    );
    await regenerateFrames({ ...project, frames, clips: project.clips || [] }, [
      { clipNumber: clip.clipNumber, position: "start" },
      { clipNumber: clip.clipNumber, position: "end" },
    ]);
    project = await waitClip(projectId, clip.clipNumber);
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
        sceneTextLanguage: project.sceneTextLanguage,
        clips: outputs,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
