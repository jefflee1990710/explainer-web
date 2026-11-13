import type { ObjectId } from "mongodb";
import { jutsuJobsCollection, teleportJobsCollection, videosCollection } from "@/dao";
import type { Project } from "@/model/project";
import { standaloneEngineResumeAction } from "@/service/comfy/clip-video-route";
import {
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-slugs";

type ResumeResult = { ok: true } | { ok: false; error: string };

type EngineJob = {
  _id: ObjectId;
  status?: string;
  openRouterStatusUrl?: string;
  outputVideoUrl?: string;
  targetClipNumber?: number;
};

// The storyboard "產片" button on a standalone video continues the OpenJutsu job.
export async function resumeStandaloneEngineRender(project: Project): Promise<ResumeResult> {
  if (project.skillSlug === SCRO_SWAP_STANDALONE_SKILL_SLUG) {
    const collection = await jutsuJobsCollection();
    const job = await collection.find({ targetVideoId: project._id }).sort({ updatedAt: -1 }).limit(1).next();
    const { runScroSwapJobInBackground } = await import("@/service/jutsu/pipeline");
    return resumeEngineJob(project, job, collection, "找不到 Scro Swap 任務", runScroSwapJobInBackground);
  }
  if (project.skillSlug === TELEPORT_STANDALONE_SKILL_SLUG) {
    const collection = await teleportJobsCollection();
    const job = await collection.find({ targetVideoId: project._id }).sort({ updatedAt: -1 }).limit(1).next();
    const { runTeleportJobInBackground } = await import("@/service/teleport/pipeline");
    return resumeEngineJob(project, job, collection, "找不到 Teleport 任務", runTeleportJobInBackground);
  }
  return { ok: false, error: "這段不是 Scro Swap 或 Teleport" };
}

async function resumeEngineJob(
  project: Project,
  job: EngineJob | null,
  collection: {
    updateOne: (
      filter: { _id: ObjectId },
      update: { $set: { status: "rendering"; updatedAt: Date }; $unset: Record<string, ""> },
    ) => Promise<unknown>;
  },
  missing: string,
  run: (jobId: ObjectId) => Promise<void>,
): Promise<ResumeResult> {
  if (!job?._id) return { ok: false, error: missing };
  const action = standaloneEngineResumeAction({
    status: job.status,
    providerUrl: job.openRouterStatusUrl,
    outputVideoUrl: job.outputVideoUrl,
  });
  if (action === "done") return { ok: true };

  await collection.updateOne(
    { _id: job._id },
    {
      $set: { status: "rendering", updatedAt: new Date() },
      $unset:
        action === "submit"
          ? { error: "", openRouterRequestId: "", openRouterStatusUrl: "" }
          : { error: "" },
    },
  );
  await markClipRendering(project._id, job.targetClipNumber ?? 1);
  if (action === "submit") await run(job._id);
  return { ok: true };
}

async function markClipRendering(videoId: ObjectId, clipNumber: number) {
  const videos = await videosCollection();
  await videos.updateOne(
    { _id: videoId },
    {
      $set: {
        status: "production",
        "clips.$[clip].status": "in_progress",
        updatedAt: new Date(),
      },
      $unset: { error: "", "clips.$[clip].error": "" },
    },
    { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
  );
}
