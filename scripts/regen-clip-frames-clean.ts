/**
 * Clear clip 1 stills and regenerate from the current Phase A (no director call).
 * Usage: npx tsx scripts/regen-clip-frames-clean.ts <videoId>
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";
import { framesWithClip } from "../src/lib/higgsfield/frame-prompts";
import { mediaSrc } from "../src/lib/media-src";
import { refreshProjectJobs, regenerateFrames } from "../src/lib/higgsfield/pipeline";
import type { Project } from "../src/types/project";

loadEnvConfig(process.cwd());

const CLIP = 1;
const POLL_MS = 8_000;
const TIMEOUT_MS = 10 * 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const videoId = process.argv[2];
  if (!videoId || !ObjectId.isValid(videoId)) {
    throw new Error("用法: npx tsx scripts/regen-clip-frames-clean.ts <videoId>");
  }
  const projectId = new ObjectId(videoId);
  const videos = await videosCollection();
  const project = (await videos.findOne({ _id: projectId })) as Project | null;
  if (!project?.phaseA) throw new Error("專案缺少分鏡");

  const frames = framesWithClip(project, CLIP);
  await videos.updateOne(
    { _id: projectId },
    { $set: { frames, status: "production", updatedAt: new Date() } },
  );
  await regenerateFrames({ ...project, frames }, [
    { clipNumber: CLIP, position: "start" },
    { clipNumber: CLIP, position: "end" },
  ]);

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await refreshProjectJobs(projectId);
    const fresh = (await videos.findOne({ _id: projectId })) as Project;
    const rows = (fresh.frames || []).filter((f) => f.clipNumber === CLIP);
    const failed = rows.find((f) => f.status === "failed");
    if (failed) throw new Error(failed.error || "失敗");
    const done = (["start", "end"] as const).every((pos) => {
      const row = rows.find((f) => f.position === pos);
      return row?.status === "completed" && Boolean(mediaSrc(row));
    });
    if (done) {
      console.log(
        JSON.stringify(
          {
            sceneTextEnabled: fresh.sceneTextEnabled,
            sceneTextLanguage: fresh.sceneTextLanguage,
            explainerScene: fresh.phaseA?.clips.find((c) => c.clipNumber === CLIP)?.explainerScene,
            englishVo: fresh.phaseA?.clips.find((c) => c.clipNumber === CLIP)?.englishVo,
            startHasOldAnchor: /Mental Health\?/.test(
              rows.find((f) => f.position === "start")?.prompt || "",
            ),
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
  throw new Error("逾時");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
