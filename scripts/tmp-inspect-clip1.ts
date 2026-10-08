import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5102f1cb7f316b0c054d9");

async function main() {
  const videos = await videosCollection();
  const jobs = await generationJobsCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video) throw new Error("video missing");
  const row = video.phaseA?.clips.find((clip) => clip.clipNumber === 1);
  const clip = video.clips?.find((item) => item.clipNumber === 1);
  const frames = (video.frames || []).filter((frame) => frame.clipNumber === 1);
  const related = await jobs
    .find({ projectId: VIDEO_ID, clipIndex: 0 })
    .sort({ createdAt: -1 })
    .toArray();
  console.log(
    JSON.stringify(
      {
        skillSlug: video.skillSlug,
        status: video.status,
        error: video.error,
        row: {
          durationSeconds: row?.durationSeconds,
          narrativeJob: row?.narrativeJob,
          englishVo: row?.englishVo,
          motionCamera: row?.motionCamera,
          startScene: row?.startScene,
          endScene: row?.endScene,
        },
        frames: frames.map((frame) => ({
          position: frame.position,
          status: frame.status,
          error: frame.error,
          submittedAt: frame.submittedAt,
          url: frame.blobUrl || frame.outputUrl,
          prompt: frame.prompt?.slice(0, 800),
        })),
        clip: {
          status: clip?.status,
          error: clip?.error,
          submittedAt: clip?.submittedAt,
          durationSeconds: clip?.durationSeconds,
          creditsCharged: clip?.creditsCharged,
          url: clip?.blobUrl || clip?.outputUrl,
          prompt: clip?.prompt,
        },
        jobs: related.map((job) => ({
          id: String(job._id),
          kind: job.kind,
          framePosition: job.framePosition,
          status: job.status,
          attempts: job.attempts,
          error: job.error,
          awaits: job.awaits,
          model: job.model,
          requestId: job.requestId,
          submittedAt: job.submittedAt,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          url: job.blobUrl || job.outputUrl,
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
