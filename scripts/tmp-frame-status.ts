import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { writeFile } from "node:fs/promises";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";

const VIDEO_ID = "6ac8f30a969a0d0a6433ec1c";

async function main() {
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const projectId = new ObjectId(VIDEO_ID);
  for (let i = 0; i < 20; i += 1) {
    const rows = await jobs.find({ projectId, kind: "frame" }).toArray();
    const summary = rows
      .map((job) => `${(job.clipIndex ?? 0) + 1}${job.framePosition?.[0]}:${job.status}`)
      .join(" ");
    console.log(summary);
    const done = rows.length === 8 && rows.every((job) => job.status === "completed" || job.status === "failed");
    if (done) {
      const project = await projects.findOne({ _id: projectId });
      for (const frame of project?.frames || []) {
        const url = frame.blobUrl || frame.outputUrl;
        if (!url) continue;
        const name = `/tmp/n${frame.clipNumber}${frame.position[0]}.png`;
        const res = await fetch(url);
        await writeFile(name, Buffer.from(await res.arrayBuffer()));
      }
      const failed = rows.filter((job) => job.status === "failed").map((job) => job.error);
      console.log(JSON.stringify({ failed }));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }
  throw new Error("frames still running");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
