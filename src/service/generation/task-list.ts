import { ObjectId } from "mongodb";
import { charactersCollection, generationJobsCollection, videosCollection } from "@/dao";
import { mediaSrc } from "@/util/media-src";
import type { GenerationJob, GenerationKind, GenerationStatus } from "@/model/generation-job";

export type TaskStage = "queued" | "sending" | "generating" | "done" | "failed";

// One generation job shaped for the task list UI.
export type PublicTask = {
  id: string;
  kind: GenerationKind;
  stage: TaskStage;
  // Video title or character name.
  title: string;
  // e.g. "Clip 2 · 起始畫格" / "角色藍圖".
  detail: string;
  previewUrl?: string;
  isVideo: boolean;
  href: string;
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

// Collapse provider/queue statuses into the five stages the UI shows.
export function taskStage(status: GenerationStatus): TaskStage {
  if (status === "pending") return "queued";
  if (status === "submitting") return "sending";
  if (status === "completed") return "done";
  if (status === "failed" || status === "nsfw") return "failed";
  return "generating";
}

// Human label for what the job produces.
export function taskDetail(job: Pick<GenerationJob, "kind" | "clipIndex" | "framePosition">) {
  if (job.kind === "still") return "角色定裝圖";
  if (job.kind === "character") return "角色藍圖";
  const clip = `Clip ${job.clipIndex + 1}`;
  if (job.kind === "video") return `${clip} · 影片`;
  return `${clip} · ${job.framePosition === "end" ? "結尾畫格" : "起始畫格"}`;
}

// Jobs have no owner field: scope by the user's videos and characters.
async function ownedScope(clerkUserId: string, videoId?: string) {
  const videos = await videosCollection();
  const videoFilter = videoId && ObjectId.isValid(videoId)
    ? { _id: new ObjectId(videoId), clerkUserId }
    : { clerkUserId };
  const videoDocs = await videos
    .find(videoFilter, { projection: { _id: 1, projectId: 1, "phaseA.localizedTitle": 1 } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  const characters = videoId
    ? []
    : await (await charactersCollection())
        .find({ clerkUserId }, { projection: { _id: 1, name: 1 } })
        .limit(200)
        .toArray();
  return { videoDocs, characters };
}

// Newest-first tasks for one user, optionally limited to a single video.
export async function listTasks(
  clerkUserId: string,
  options: { videoId?: string; limit?: number } = {},
): Promise<PublicTask[]> {
  const { videoDocs, characters } = await ownedScope(clerkUserId, options.videoId);
  if (videoDocs.length === 0 && characters.length === 0) return [];
  const videoById = new Map(videoDocs.map((doc) => [doc._id.toHexString(), doc]));
  const characterById = new Map(characters.map((doc) => [doc._id.toHexString(), doc]));

  const jobs = await generationJobsCollection();
  const docs = await jobs
    .find({
      $or: [
        { projectId: { $in: videoDocs.map((doc) => doc._id) } },
        { characterId: { $in: characters.map((doc) => doc._id) } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 100)
    .toArray();

  return docs.map((job) => {
    const video = job.projectId ? videoById.get(job.projectId.toHexString()) : undefined;
    const character = job.characterId ? characterById.get(job.characterId.toHexString()) : undefined;
    return {
      id: job._id.toHexString(),
      kind: job.kind,
      stage: taskStage(job.status),
      title: character?.name ?? video?.phaseA?.localizedTitle ?? "未命名影片",
      detail: taskDetail(job),
      previewUrl: job.status === "completed" ? mediaSrc(job) : undefined,
      isVideo: job.kind === "video",
      href: video
        ? `/app/projects/${video.projectId.toHexString()}?video=${video._id.toHexString()}`
        : "/app/characters",
      error: job.status === "failed" || job.status === "nsfw" ? job.error : undefined,
      attempts: job.attempts ?? 0,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  });
}

// Sidebar badge: tasks still waiting or generating.
export async function countActiveTasks(clerkUserId: string) {
  const tasks = await listTasks(clerkUserId, { limit: 200 });
  return tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
}
