import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { sanitizeOutfitPhaseA } from "@/service/director/outfit-reel";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5102f1cb7f316b0c054d9");

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video?.phaseA) throw new Error("video or phaseA missing");
  const sanitized = sanitizeOutfitPhaseA(video.phaseA);
  const clip1 = sanitized.clips.find((clip) => clip.clipNumber === 1);
  if (!clip1) throw new Error("clip 1 missing");
  await videos.updateOne(
    { _id: VIDEO_ID, "phaseA.clips.clipNumber": 1 },
    {
      $set: {
        "phaseA.clips.$": clip1,
        updatedAt: new Date(),
      },
    },
  );
  await videos.updateOne(
    { _id: VIDEO_ID, "clips.clipNumber": 1 },
    { $unset: { "clips.$.prompt": "" } },
  );
  console.log(
    JSON.stringify(
      {
        motionCamera: clip1.motionCamera,
        startHasTank: /crew-neck tank/.test(clip1.startScene || ""),
        motionHasPull: /pull/i.test(clip1.motionCamera),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
