import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { relockOutfitPhaseA } from "@/service/director/outfit-reel";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5102f1cb7f316b0c054d9");

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video?.phaseA) throw new Error("video or phaseA missing");
  const lenses = video.styleId === "realistic";
  const phaseA = relockOutfitPhaseA(video.phaseA, { lenses });
  await videos.updateOne({ _id: VIDEO_ID }, { $set: { phaseA, updatedAt: new Date() } });
  for (const clip of phaseA.clips) {
    console.log(
      JSON.stringify({
        clip: clip.clipNumber,
        job: clip.narrativeJob,
        motion: clip.motionCamera,
        startCamera: clip.startScene?.match(/Camera:[\s\S]*$/)?.[0],
        endCamera: clip.endScene?.match(/Camera:[\s\S]*$/)?.[0],
        samePose: clip.startScene?.includes("same spot") && clip.endScene?.includes("same spot"),
      }),
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
