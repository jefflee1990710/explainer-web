import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

const projectId = new ObjectId("6abe90f81b52ea9fae30415f");

async function main() {
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  const frames = (project?.frames ?? []).map((frame) => ({
    clip: frame.clipNumber,
    position: frame.position,
    status: frame.status,
    hasUrl: Boolean(frame.outputUrl || frame.blobUrl),
    error: frame.error ?? null,
    promptLen: frame.prompt?.length ?? 0,
  }));
  const all = await jobs.find({ projectId }).sort({ clipIndex: 1, framePosition: 1 }).toArray();
  console.log(
    JSON.stringify(
      {
        title: project?.title ?? null,
        frames,
        jobs: all.map((job) => ({
          id: job._id.toHexString(),
          status: job.status,
          kind: job.kind,
          clip: job.clipIndex + 1,
          position: job.framePosition ?? null,
          awaits: job.awaits ?? null,
          attempts: job.attempts ?? 0,
          error: job.error ?? null,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
