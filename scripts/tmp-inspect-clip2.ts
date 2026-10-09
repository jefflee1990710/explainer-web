import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const id = new ObjectId("6ac78edcc542118f53c3b142");
  const videos = await videosCollection();
  const row = await videos.findOne({ _id: id });
  if (!row) {
    console.log("missing");
    process.exit(0);
  }
  const clip = (row.clips || []).find((item) => item.clipNumber === 2);
  const phase = row.phaseA?.clips?.find((item) => item.clipNumber === 2);
  const jobs = await generationJobsCollection();
  const videoJobs = await jobs
    .find({ projectId: id, kind: "video", clipIndex: 1 })
    .sort({ updatedAt: -1 })
    .limit(8)
    .toArray();
  console.log(
    JSON.stringify(
      {
        updatedAt: row.updatedAt,
        clip: clip
          ? {
              status: clip.status,
              error: clip.error,
              hasVideo: Boolean(clip.blobUrl || clip.outputUrl),
              promptLen: (clip.prompt || "").length,
              promptHead: (clip.prompt || "").slice(0, 220),
              durationSeconds: clip.durationSeconds,
              submittedAt: clip.submittedAt,
            }
          : null,
        phase: phase
          ? {
              seconds: phase.durationSeconds,
              vo: phase.englishVo,
              motionHead: (phase.motionCamera || "").slice(0, 220),
            }
          : null,
        jobs: videoJobs.map((job) => ({
          status: job.status,
          error: job.error,
          attempts: job.attempts,
          model: job.model,
          updatedAt: job.updatedAt,
          hasOutput: Boolean(job.outputUrl || job.blobUrl),
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
