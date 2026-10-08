import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: new ObjectId("6ac508ff4b2d109939ec5654") });
  if (!video) throw new Error("missing talking-head video");
  console.log(
    JSON.stringify(
      {
        skillSlug: video.skillSlug,
        status: video.status,
        spokenScript: video.spokenScript,
        source: video.source,
        visualWorld: video.phaseA?.visualWorld,
        characterLock: video.phaseA?.characterLock,
        clips: video.phaseA?.clips?.map((clip) => ({
          n: clip.clipNumber,
          seconds: clip.durationSeconds,
          vo: clip.englishVo,
          motion: clip.motionCamera,
          start: clip.startScene,
          end: clip.endScene,
        })),
        frames: video.frames?.map((frame) => ({
          n: frame.clipNumber,
          p: frame.position,
          s: frame.status,
          url: frame.blobUrl || frame.outputUrl,
        })),
        videos: video.clips?.map((clip) => ({
          n: clip.clipNumber,
          s: clip.status,
          url: clip.blobUrl || clip.outputUrl,
        })),
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
