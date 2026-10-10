import { loadEnvConfig } from "@next/env";
import { writeFileSync } from "node:fs";
import { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";
import { fetchHiggsfieldStatus } from "@/service/higgsfield/generate";
import { clipKeyframeUrls } from "@/service/higgsfield/clip-keyframes";

loadEnvConfig(process.cwd());

function diffLines(base: string, next: string) {
  const a = new Set(base.split("\n").map((line) => line.trim()).filter(Boolean));
  return next
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !a.has(line));
}

async function main() {
  const id = new ObjectId("6ac78edcc542118f53c3b142");
  const videos = await videosCollection();
  const row = await videos.findOne({ _id: id });
  if (!row) throw new Error("missing");
  const jobs = await generationJobsCollection();
  const videoJobs = await jobs.find({ projectId: id, kind: "video" }).sort({ clipIndex: 1 }).toArray();
  const clip1 = (row.clips || []).find((clip) => clip.clipNumber === 1);
  const frames = [1, 2, 3].map((n) => ({ n, ...clipKeyframeUrls(row.frames, n) }));
  const prompts = [1, 2, 3].map((n) => {
    const clip = (row.clips || []).find((item) => item.clipNumber === n);
    const phase = row.phaseA?.clips?.find((item) => item.clipNumber === n);
    return {
      n,
      status: clip?.status,
      error: clip?.error,
      vo: phase?.englishVo,
      onlyInPrompt: diffLines(clip1?.prompt || "", clip?.prompt || "").slice(0, 40),
    };
  });
  const remote = [];
  for (const job of videoJobs) {
    if (!job.statusUrl || job.clipIndex === 0) continue;
    try {
      const body = await fetchHiggsfieldStatus(job.statusUrl);
      remote.push({ clipIndex: job.clipIndex, statusUrl: job.statusUrl, body });
    } catch (error) {
      remote.push({
        clipIndex: job.clipIndex,
        statusUrl: job.statusUrl,
        fetchError: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const report = {
    frames,
    prompts,
    jobs: videoJobs.map((job) => ({
      clipIndex: job.clipIndex,
      status: job.status,
      error: job.error,
      model: job.model,
      requestId: job.requestId,
      statusUrl: job.statusUrl,
    })),
    remote,
  };
  writeFileSync("/tmp/scro-nsfw-report.json", JSON.stringify(report, null, 2));
  console.log("wrote /tmp/scro-nsfw-report.json", "remote", remote.length, "frames", frames.length);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
