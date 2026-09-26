import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

const VIDEO_ID = process.argv[2] || "6ab806fec354e3123aea51a2";

async function main() {
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: new ObjectId(VIDEO_ID) });
  if (!video) throw new Error(`找不到 video ${VIDEO_ID}`);

  const jobs = await generationJobsCollection();
  const videoJobs = await jobs
    .find({ projectId: video._id, clipIndex: 0, kind: "video" })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  const clips = (video.clips || []).map((clip) => ({
    clipNumber: clip.clipNumber,
    status: clip.status,
    error: clip.error,
    submittedAt: clip.submittedAt,
    outputUrl: clip.outputUrl ? "yes" : undefined,
    blobUrl: clip.blobUrl ? "yes" : undefined,
    promptLen: clip.prompt?.length || 0,
  }));
  const frames = (video.frames || [])
    .filter((frame) => frame.clipNumber === 1)
    .map((frame) => ({
      position: frame.position,
      status: frame.status,
      submittedAt: frame.submittedAt,
      outputUrl: frame.outputUrl ? "yes" : undefined,
      blobUrl: frame.blobUrl ? "yes" : undefined,
      error: frame.error,
    }));

  console.log(
    JSON.stringify(
      {
        id: video._id.toHexString(),
        title: video.phaseA?.localizedTitle,
        status: video.status,
        updatedAt: video.updatedAt,
        clip1: clips.find((clip) => clip.clipNumber === 1) || null,
        clips,
        framesClip1: frames,
        videoJobsClip1: videoJobs.map((job) => ({
          id: job._id.toHexString(),
          status: job.status,
          model: job.model,
          requestId: job.requestId,
          statusUrl: job.statusUrl ? "yes" : undefined,
          outputUrl: job.outputUrl ? "yes" : undefined,
          blobUrl: job.blobUrl ? "yes" : undefined,
          error: job.error,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        })),
      },
      null,
      2,
    ),
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
