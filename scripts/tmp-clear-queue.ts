import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { generationJobsCollection } = await import("@/dao");
  const { failJob } = await import("@/service/generation/task-runner");
  const jobs = await generationJobsCollection();
  const active = await jobs
    .find({ status: { $in: ["pending", "submitting", "queued", "in_progress"] } })
    .toArray();
  console.log("found", active.length);
  for (const job of active) {
    const ok = await failJob(job, "佇列已清除");
    console.log(ok ? "failed" : "skip", String(job._id), job.kind, job.clipIndex, job.framePosition);
  }
  const left = await jobs.countDocuments({
    status: { $in: ["pending", "submitting", "queued", "in_progress"] },
  });
  console.log("remaining", left);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
