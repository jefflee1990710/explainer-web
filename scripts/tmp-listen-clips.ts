import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const id = new ObjectId("6ac78edcc542118f53c3b142");
  const videos = await videosCollection();
  const row = await videos.findOne({ _id: id });
  const jobs = await generationJobsCollection();
  const videoJobs = await jobs
    .find({ projectId: id, kind: "video" })
    .sort({ clipIndex: 1, updatedAt: -1 })
    .toArray();
  console.log(
    JSON.stringify(
      {
        updatedAt: row?.updatedAt,
        status: row?.status,
        skillSlug: row?.skillSlug,
        clips: (row?.clips || []).map((clip) => ({
          n: clip.clipNumber,
          status: clip.status,
          error: clip.error,
          promptLen: (clip.prompt || "").length,
          submittedAt: clip.submittedAt,
          hasVideo: Boolean(clip.blobUrl || clip.outputUrl),
          scene: (row?.phaseA?.clips || []).find((item) => item.clipNumber === clip.clipNumber)?.startScene,
          motion: (row?.phaseA?.clips || []).find((item) => item.clipNumber === clip.clipNumber)?.motionCamera?.slice(0, 400),
        })),
        jobs: videoJobs.map((job) => ({
          id: String(job._id),
          clipIndex: job.clipIndex,
          status: job.status,
          error: job.error,
          raw: job.rawError || job.providerError || job.lastError,
          attempts: job.attempts,
          model: job.model,
          updatedAt: job.updatedAt,
          requestId: job.requestId,
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
