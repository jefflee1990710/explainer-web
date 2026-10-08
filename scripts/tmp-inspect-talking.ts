import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5102f1cb7f316b0c054d9");

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video) throw new Error("video missing");
  const clips = video.phaseA?.clips ?? [];
  console.log(
    JSON.stringify(
      {
        skillSlug: video.skillSlug,
        status: video.status,
        language: video.language,
        spokenScript: video.spokenScript,
        source: video.source?.slice(0, 400),
        characterLock: video.phaseA?.characterLock,
        visualWorld: video.phaseA?.visualWorld,
        hookStrategy: video.phaseA?.hookStrategy,
        coreMessage: video.phaseA?.coreMessage,
        narrativeArc: video.phaseA?.narrativeArc,
        narrator: video.phaseA?.narrator,
        cast: video.cast?.map((member) => ({ name: member.name, id: member.characterId })),
        phaseBPrompts: video.phaseB?.prompts?.map((p) => ({
          clipNumber: p.clipNumber,
          durationSeconds: p.durationSeconds,
          prompt: p.prompt,
        })),
        rows: clips.map((clip) => ({
          clipNumber: clip.clipNumber,
          durationSeconds: clip.durationSeconds,
          narrativeJob: clip.narrativeJob,
          englishVo: clip.englishVo,
          motionCamera: clip.motionCamera,
          startScene: clip.startScene,
          endScene: clip.endScene,
          explainerScene: clip.explainerScene,
        })),
        frames: video.frames?.map((frame) => ({
          clipNumber: frame.clipNumber,
          position: frame.position,
          status: frame.status,
          url: frame.blobUrl || frame.outputUrl,
        })),
        clipVideos: video.clips?.map((clip) => ({
          clipNumber: clip.clipNumber,
          status: clip.status,
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
