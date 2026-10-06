import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: new ObjectId("6ac4b89b5e5f50592fb189e6") });
  if (!video) throw new Error("missing");
  const clips = (video.phaseA?.clips || []).map((clip) => ({
    n: clip.clipNumber,
    ids: clip.referenceImageIds || [],
    start: clip.startScene || clip.explainerScene || "",
    end: clip.endScene || "",
  }));
  console.log(JSON.stringify({ description: video.referenceImages?.[0]?.description, clips }, null, 2));
}

main().then(() => process.exit(0));
