import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";
import { MINIMAX_H3_VIDEO_MODEL } from "@/service/higgsfield/clip-keyframes";
import { submitClipVideo } from "@/service/higgsfield/generate";
import { refreshProjectJobs } from "@/service/higgsfield/pipeline";
import { toSent } from "@/service/generation/sent";
import { submittedJobStatus } from "@/service/generation/task-policy";
import { lockDialogueSpeech } from "@/service/director/spoken-line";
import { mediaSrc } from "@/util/media-src";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5b890490814ffcb2396e1");
const START =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/6ac5b890490814ffcb2396e1/frames/bc6d34d1-a930-45c0-8d0b-4c5abcd0eb3b";
const END =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/6ac5b890490814ffcb2396e1/frames/4c5ce441-9f52-4695-a9e8-15e096ffd9f7";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: VIDEO_ID });
  const clip = project?.clips?.find((item) => item.clipNumber === 3);
  if (!project?.phaseA || !clip?.prompt) throw new Error("clip 3 prompt missing");

  const claimedAt = new Date();
  await videos.updateOne(
    { _id: VIDEO_ID, "clips.clipNumber": 3 },
    {
      $set: {
        "clips.$.status": "queued",
        "clips.$.submittedAt": claimedAt.toISOString(),
        "frames.$[frame].status": "completed",
        "frames.$[frame].blobUrl": START,
        "frames.$[frame].outputUrl": START,
        status: "production",
        updatedAt: new Date(),
      },
      $unset: { "clips.$.error": "", "clips.$.blobUrl": "", "clips.$.outputUrl": "" },
    },
    { arrayFilters: [{ "frame.clipNumber": 3, "frame.position": "start" }] },
  );

  const submitted = await submitClipVideo({
    prompt: lockDialogueSpeech(clip.prompt, project.skillSlug),
    aspectRatio: project.aspectRatio,
    durationSeconds: clip.durationSeconds,
    startImageUrl: START,
    endImageUrl: END,
  });
  const sent = toSent(MINIMAX_H3_VIDEO_MODEL, submitted);
  const now = new Date();
  const jobs = await generationJobsCollection();
  await jobs.insertOne({
    projectId: VIDEO_ID,
    clipIndex: 2,
    kind: "video",
    model: sent.model,
    requestId: sent.requestId,
    statusUrl: sent.statusUrl,
    status: submittedJobStatus(sent.status),
    attempts: 1,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  console.log(
    JSON.stringify({
      submitted: true,
      requestId: sent.requestId,
      start: START,
      end: END,
    }),
  );

  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    await refreshProjectJobs(VIDEO_ID);
    const next = await videos.findOne({ _id: VIDEO_ID });
    const row = next?.clips?.find((item) => item.clipNumber === 3);
    if (row?.status === "failed") throw new Error(row.error || "clip 3 failed");
    if (row?.status === "completed" && mediaSrc(row)) {
      const start = next?.frames?.find(
        (frame) => frame.clipNumber === 3 && frame.position === "start",
      );
      console.log(
        JSON.stringify(
          {
            videoUrl: mediaSrc(row),
            startFrameUrl: start?.blobUrl || start?.outputUrl,
            pinnedStart: START,
            pinnedEnd: END,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }
    await sleep(10_000);
  }
  throw new Error("timeout");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
