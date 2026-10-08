import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { sanitizeOutfitPhaseA } from "@/service/director/outfit-reel";
import { sendFrame } from "@/service/higgsfield/pipeline";
import { fetchHiggsfieldStatus, mediaUrlFromResponse } from "@/service/higgsfield/generate";
import { persistMedia } from "@/service/higgsfield/persist";
import { hydrateStyles } from "@/service/style/load-style";
import { withInheritedTalkingHeadStarts } from "@/service/director/talking-head";
import { mediaSrc } from "@/util/media-src";
import { frameSubmitPlan } from "@/service/higgsfield/frame-prompts";
import type { Project } from "@/model/project";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5102f1cb7f316b0c054d9");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadVideo() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video?.phaseA) throw new Error("video or phaseA missing");
  return video;
}

async function copyInheritedStarts(project: Project) {
  const videos = await videosCollection();
  const copied = withInheritedTalkingHeadStarts(project.frames || [], project.skillSlug);
  for (const frame of copied) {
    if (frame.position !== "start" || frame.clipNumber < 2) continue;
    if (frame.status !== "completed" || !mediaSrc(frame)) continue;
    const current = (project.frames || []).find(
      (item) => item.clipNumber === frame.clipNumber && item.position === "start",
    );
    if (current && current.status === "completed" && mediaSrc(current) === mediaSrc(frame)) {
      continue;
    }
    await videos.updateOne(
      { _id: VIDEO_ID },
      {
        $set: {
          "frames.$[frame].status": "completed",
          "frames.$[frame].blobUrl": frame.blobUrl,
          "frames.$[frame].outputUrl": frame.outputUrl,
          "frames.$[frame].submittedAt": frame.submittedAt,
          updatedAt: new Date(),
        },
        $unset: { "frames.$[frame].error": "" },
      },
      { arrayFilters: [{ "frame.clipNumber": frame.clipNumber, "frame.position": "start" }] },
    );
    console.log(`copied clip ${frame.clipNumber - 1} end → clip ${frame.clipNumber} start`);
  }
}

async function generateEnd(project: Project, clipNumber: number) {
  const videos = await videosCollection();
  const existing = (project.frames || []).find(
    (frame) => frame.clipNumber === clipNumber && frame.position === "end",
  );
  if (existing?.status === "completed" && mediaSrc(existing)) {
    console.log(`clip ${clipNumber} end already done`);
    return mediaSrc(existing);
  }

  const plan = frameSubmitPlan(project, clipNumber, "end");
  console.log(`\n=== generating clip ${clipNumber} end ===`);
  console.log("refs", plan.refs);
  const sent = await sendFrame(project, clipNumber, "end");
  console.log("submitted", { requestId: sent.requestId, status: sent.status, error: sent.error });

  let status = sent.status || "queued";
  let outputUrl = mediaUrlFromResponse(sent);
  const deadline = Date.now() + 180_000;
  while (sent.statusUrl && Date.now() < deadline) {
    if (status === "completed" && outputUrl) break;
    if (status === "nsfw" || status === "failed") break;
    await sleep(4000);
    const remote = await fetchHiggsfieldStatus(sent.statusUrl);
    status = (remote.status || status).toLowerCase();
    outputUrl = mediaUrlFromResponse(remote) || outputUrl;
    console.log("poll", { clipNumber, status, hasUrl: Boolean(outputUrl) });
  }

  if (status === "nsfw" || status === "failed" || !outputUrl) {
    throw new Error(`clip ${clipNumber} end failed: ${status}`);
  }

  const blobUrl = await persistMedia(
    outputUrl,
    `explainer/${VIDEO_ID.toHexString()}/frames/${sent.requestId}`,
  );
  await videos.updateOne(
    { _id: VIDEO_ID },
    {
      $set: {
        "frames.$[frame].status": "completed",
        "frames.$[frame].blobUrl": blobUrl,
        "frames.$[frame].outputUrl": outputUrl,
        "frames.$[frame].prompt": plan.prompt,
        "frames.$[frame].submittedAt": new Date().toISOString(),
        updatedAt: new Date(),
      },
      $unset: { "frames.$[frame].error": "" },
    },
    { arrayFilters: [{ "frame.clipNumber": clipNumber, "frame.position": "end" }] },
  );
  console.log("saved", blobUrl);
  return blobUrl;
}

async function main() {
  await hydrateStyles();
  const videos = await videosCollection();
  let video = await loadVideo();
  const phaseA = sanitizeOutfitPhaseA(video.phaseA!);
  await videos.updateOne(
    { _id: VIDEO_ID },
    { $set: { "phaseA.clips": phaseA.clips, updatedAt: new Date() } },
  );

  const clipCount = phaseA.clips.length;
  for (let clipNumber = 1; clipNumber <= clipCount; clipNumber += 1) {
    video = await loadVideo();
    video = { ...video, phaseA: { ...video.phaseA!, clips: phaseA.clips } };
    await copyInheritedStarts(video);
    video = await loadVideo();
    video = { ...video, phaseA: { ...video.phaseA!, clips: phaseA.clips } };
    await generateEnd(video, clipNumber);
  }

  video = await loadVideo();
  await copyInheritedStarts(video);
  video = await loadVideo();
  console.log("\n=== ALL FRAMES ===");
  for (const frame of video.frames || []) {
    console.log(
      JSON.stringify({
        clipNumber: frame.clipNumber,
        position: frame.position,
        status: frame.status,
        url: mediaSrc(frame),
        error: frame.error,
      }),
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
