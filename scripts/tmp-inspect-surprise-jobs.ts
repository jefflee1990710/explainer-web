import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const id = new ObjectId("6ac5b890490814ffcb2396e1");
  const jobs = await generationJobsCollection();
  const rows = await jobs.find({ projectId: id }).sort({ createdAt: -1 }).limit(15).toArray();
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: id });
  const frames = (video?.frames || []).map((frame) => ({
    n: frame.clipNumber,
    p: frame.position,
    status: frame.status,
    submittedAt: frame.submittedAt,
    url: (frame.blobUrl || frame.outputUrl || "").slice(-48),
  }));
  const clips = (video?.clips || []).map((clip) => ({
    n: clip.clipNumber,
    status: clip.status,
    submittedAt: clip.submittedAt,
    url: (clip.blobUrl || clip.outputUrl || "").slice(-60),
  }));
  console.log(
    JSON.stringify(
      {
        frames,
        clips,
        jobs: rows.map((job) => ({
          kind: job.kind,
          clip: (job.clipIndex ?? -1) + 1,
          pos: job.framePosition,
          status: job.status,
          createdAt: job.createdAt,
          blob: (job.blobUrl || "").slice(-48),
          out: (job.outputUrl || "").slice(-48),
          req: job.requestId,
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
