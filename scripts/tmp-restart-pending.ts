import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { generationJobsCollection } from "@/dao";
import { drainPendingJobs, refreshSubmittedJobs } from "@/service/generation/task-runner";

loadEnvConfig(process.cwd());

const projectId = new ObjectId("6abe90f81b52ea9fae30415f");

async function snapshot() {
  const jobs = await generationJobsCollection();
  const rows = await jobs
    .find({ projectId, kind: "frame" })
    .sort({ clipIndex: 1, createdAt: 1 })
    .toArray();
  return rows
    .map((job) => {
      const clip = `${job.clipIndex + 1}${job.framePosition === "end" ? "e" : "s"}`;
      return `${clip}:${job.status}${job.awaits ? `/${job.awaits}` : ""}${job.error ? "!" : ""}`;
    })
    .join(" ");
}

async function main() {
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    const drained = await drainPendingJobs();
    const refreshed = await refreshSubmittedJobs();
    const summary = await snapshot();
    console.log(JSON.stringify({ drained, refreshed: refreshed.refreshed, summary }));
    const inflight =
      summary.includes("pending") ||
      summary.includes("submitting") ||
      summary.includes("queued") ||
      summary.includes("in_progress");
    if (!inflight) break;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.log(JSON.stringify({ done: await snapshot() }));
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
