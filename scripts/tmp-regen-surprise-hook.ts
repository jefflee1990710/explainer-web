import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { sanitizeSurprisePhaseA } from "@/service/director/surprise-interview";
import { sendFrame } from "@/service/higgsfield/pipeline";
import { fetchHiggsfieldStatus, mediaUrlFromResponse } from "@/service/higgsfield/generate";
import { persistMedia } from "@/service/higgsfield/persist";
import { hydrateStyles } from "@/service/style/load-style";
import { frameSubmitPlan } from "@/service/higgsfield/frame-prompts";
import type { FramePosition, Project } from "@/model/project";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5b890490814ffcb2396e1");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadVideo() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video?.phaseA) throw new Error("video or phaseA missing");
  return video;
}

async function generateFrame(project: Project, clipNumber: number, position: FramePosition) {
  const videos = await videosCollection();
  const plan = frameSubmitPlan(project, clipNumber, position);
  console.log(`\n=== clip ${clipNumber} ${position} ===`);
  console.log(plan.prompt.match(/Layout:[^\n]+/)?.[0]);
  let sent = await sendFrame(project, clipNumber, position);
  let status = sent.status || "queued";
  let outputUrl = mediaUrlFromResponse(sent);
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    console.log("submitted", { attempt, requestId: sent.requestId, status: sent.status });
    status = sent.status || "queued";
    outputUrl = mediaUrlFromResponse(sent);
    const deadline = Date.now() + 180_000;
    while (sent.statusUrl && Date.now() < deadline) {
      if (status === "completed" && outputUrl) break;
      if (status === "nsfw" || status === "failed") break;
      await sleep(4000);
      const remote = await fetchHiggsfieldStatus(sent.statusUrl);
      status = (remote.status || status).toLowerCase();
      outputUrl = mediaUrlFromResponse(remote) || outputUrl;
      console.log("poll", { position, status, hasUrl: Boolean(outputUrl) });
    }
    if (status === "completed" && outputUrl) break;
    if (status === "nsfw" && attempt === 1) {
      console.log("retry after nsfw");
      sent = await sendFrame(project, clipNumber, position);
      continue;
    }
    break;
  }

  if (status === "nsfw" || status === "failed" || !outputUrl) {
    throw new Error(`clip ${clipNumber} ${position} failed: ${status}`);
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
    { arrayFilters: [{ "frame.clipNumber": clipNumber, "frame.position": position }] },
  );
  console.log("saved", blobUrl);
}

async function main() {
  await hydrateStyles();
  const videos = await videosCollection();
  const video = await loadVideo();
  const phaseA = sanitizeSurprisePhaseA(video.phaseA!);
  const clip2 = phaseA.clips.find((clip) => clip.clipNumber === 2);
  const clip3 = phaseA.clips.find((clip) => clip.clipNumber === 3);
  if (clip2) clip2.englishVo = "Why spend hours every day editing Reels and managing Instagram?";
  if (clip3) clip3.englishVo = "Let Scro handle the grind so you just focus on content.";
  const hook = phaseA.clips[0];
  await videos.updateOne(
    { _id: VIDEO_ID },
    {
      $set: {
        "phaseA.clips.0.startScene": hook.startScene,
        "phaseA.clips.0.endScene": hook.endScene,
        "phaseA.clips.0.motionCamera": hook.motionCamera,
        "phaseA.clips.0.narrativeJob": hook.narrativeJob,
        "phaseA.clips.1.englishVo":
          "Why spend hours every day editing Reels and managing Instagram?",
        "phaseA.clips.2.englishVo": "Let Scro handle the grind so you just focus on content.",
        updatedAt: new Date(),
      },
    },
  );
  console.log("motion", hook.motionCamera);
  const jobs = (process.argv[2] || "1:start,1:end,2:start,2:end,3:start,3:end").split(",").map((item) => {
    const [clip, position] = item.split(":");
    return { clipNumber: Number(clip), position: position as FramePosition };
  });
  for (const job of jobs) {
    const current = await loadVideo();
    await generateFrame({ ...current, phaseA }, job.clipNumber, job.position);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
