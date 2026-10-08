import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { sendFrame } from "@/service/higgsfield/pipeline";
import { fetchHiggsfieldStatus, mediaUrlFromResponse } from "@/service/higgsfield/generate";
import { persistMedia } from "@/service/higgsfield/persist";
import { hydrateStyles } from "@/service/style/load-style";
import { frameSubmitPlan } from "@/service/higgsfield/frame-prompts";
import { withOutfitIdentityPortraits } from "@/service/higgsfield/outfit-identity";
import type { FramePosition, Project } from "@/model/project";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5102f1cb7f316b0c054d9");
const only = process.argv[2];
const JOBS: Array<{ clipNumber: number; position: FramePosition }> = only
  ? only.split(",").map((item) => {
      const [clip, position] = item.split(":");
      return { clipNumber: Number(clip), position: position as FramePosition };
    })
  : [1, 2, 3, 4].flatMap((clipNumber) =>
      (["start", "end"] as FramePosition[]).map((position) => ({ clipNumber, position })),
    );

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
  const refs =
    project.cast && project.cast.length > 0
      ? await withOutfitIdentityPortraits(project.cast, plan.refs)
      : plan.refs;
  console.log(`\n=== clip ${clipNumber} ${position} ===`);
  console.log("refs", refs);
  const sent = await sendFrame(project, clipNumber, position);
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
    console.log("poll", { clipNumber, position, status, hasUrl: Boolean(outputUrl) });
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
  for (const job of JOBS) {
    const project = await loadVideo();
    await generateFrame(project, job.clipNumber, job.position);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
