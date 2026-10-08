import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5b890490814ffcb2396e1");

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video?.phaseA) throw new Error("missing");
  const clip = video.phaseA.clips[0];
  console.log(
    JSON.stringify(
      {
        skill: video.skillSlug,
        title: video.phaseA.localizedTitle,
        clipCount: video.phaseA.clips.length,
        hook: {
          job: clip.narrativeJob,
          duration: clip.durationSeconds,
          vo: clip.englishVo,
          motion: clip.motionCamera,
          start: clip.startScene,
          end: clip.endScene,
        },
        later: video.phaseA.clips.slice(1).map((item) => ({
          n: item.clipNumber,
          vo: item.englishVo,
          start: item.startScene?.slice(0, 180),
        })),
        frames: (video.frames || []).map((frame) => ({
          n: frame.clipNumber,
          p: frame.position,
          status: frame.status,
          url: Boolean(frame.blobUrl || frame.outputUrl),
        })),
        clip1: (video.clips || [])
          .filter((item) => item.clipNumber === 1)
          .map((item) => ({
            status: item.status,
            url: item.blobUrl || item.outputUrl,
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
