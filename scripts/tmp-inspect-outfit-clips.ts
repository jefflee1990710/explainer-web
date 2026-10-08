import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5102f1cb7f316b0c054d9");

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video?.phaseA) throw new Error("missing");
  console.log(
    JSON.stringify(
      {
        clipCount: video.phaseA.clips.length,
        clips: video.phaseA.clips.map((clip) => ({
          n: clip.clipNumber,
          job: clip.narrativeJob,
          duration: clip.durationSeconds,
          motion: clip.motionCamera,
          startCam: clip.startScene?.match(/Camera:[^.]*\.?/)?.[0],
          endCam: clip.endScene?.match(/Camera:[^.]*\.?/)?.[0],
          startChar: clip.startScene?.match(/Character:[^.]*\.?/)?.[0]?.slice(0, 220),
          endChar: clip.endScene?.match(/Character:[^.]*\.?/)?.[0]?.slice(0, 220),
        })),
        frames: (video.frames || []).map((frame) => ({
          n: frame.clipNumber,
          p: frame.position,
          status: frame.status,
          url: Boolean(frame.blobUrl || frame.outputUrl),
        })),
        videos: (video.clips || []).map((clip) => ({
          n: clip.clipNumber,
          status: clip.status,
          url: Boolean(clip.blobUrl || clip.outputUrl),
        })),
        reelStatus: video.reelStatus,
        reelUrl: video.reelUrl,
        finalUrl: video.finalUrl,
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
