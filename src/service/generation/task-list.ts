import { ObjectId } from "mongodb";
import { charactersCollection, generationJobsCollection, videosCollection } from "@/dao";
import { folderVideoPath } from "@/service/folder-video-path";
import { mediaSrc } from "@/util/media-src";
import type { GenerationJob, GenerationKind, GenerationStatus } from "@/model/generation-job";
import type { ReelStatus } from "@/model/project";

export type TaskStage = "queued" | "sending" | "generating" | "done" | "failed";

const ACTIVE_STATUSES: GenerationStatus[] = ["pending", "submitting", "queued", "in_progress"];
const SETTLED_STATUSES: GenerationStatus[] = ["completed", "failed", "nsfw"];
// Finished jobs older than this drop off the default list.
export const RECENT_SETTLED_MS = 6 * 60 * 60 * 1000;

// Pending always; done/failed only while still fresh.
export function isCurrentTask(stage: TaskStage, updatedAt: Date | string, now = Date.now()) {
  if (stage !== "done" && stage !== "failed") return true;
  return now - new Date(updatedAt).getTime() <= RECENT_SETTLED_MS;
}

// One generation job shaped for the task list UI.
export type PublicTask = {
  id: string;
  kind: GenerationKind | "reel";
  stage: TaskStage;
  // Video title or character name.
  title: string;
  // Legacy plain detail (zh); UI should prefer detailKey + detailParams.
  detail: string;
  detailKey: string;
  detailParams?: Record<string, string | number>;
  previewUrl?: string;
  isVideo: boolean;
  // Set for video jobs and reel tasks so the open editor can reload that video.
  videoId?: string;
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

// Human label for what the job produces (legacy zh strings for logs/tests).
export function taskDetail(job: Pick<GenerationJob, "kind" | "clipIndex" | "framePosition">) {
  if (job.kind === "still") return "角色定裝圖";
  if (job.kind === "character") return "角色藍圖";
  if (job.kind === "stylePreview") return "風格預覽";
  if (job.kind === "reelCover") return "影片封面";
  const clip = `Clip ${job.clipIndex + 1}`;
  if (job.kind === "video") return `${clip} · 影片`;
  return `${clip} · ${job.framePosition === "end" ? "結尾畫格" : "起始畫格"}`;
}

export function taskDetailI18n(job: Pick<GenerationJob, "kind" | "clipIndex" | "framePosition">) {
  const n = job.clipIndex + 1;
  if (job.kind === "still") return { detailKey: "tasksPage.detail.characterStill" as const };
  if (job.kind === "character") return { detailKey: "tasksPage.detail.characterBlueprint" as const };
  if (job.kind === "stylePreview") return { detailKey: "tasksPage.detail.stylePreview" as const };
  if (job.kind === "reelCover") return { detailKey: "tasksPage.detail.reelCover" as const };
  if (job.kind === "video") return { detailKey: "tasksPage.detail.clipVideo" as const, detailParams: { n } };
  return {
    detailKey:
      job.framePosition === "end"
        ? ("tasksPage.detail.clipFrameEnd" as const)
        : ("tasksPage.detail.clipFrameStart" as const),
    detailParams: { n },
  };
}

const REEL_PROJECTION = {
  _id: 1,
  projectId: 1,
  "phaseA.localizedTitle": 1,
  reelStatus: 1,
  reelUrl: 1,
  reelError: 1,
  updatedAt: 1,
} as const;

// 成片合成 lives on the video, not in generationJobs. Surface it as a task.
export function reelTask(
  input: {
    videoId: string;
    projectId: string;
    title: string;
    reelStatus?: ReelStatus;
    reelUrl?: string;
    reelError?: string;
    updatedAt: string;
  },
  now = Date.now(),
): PublicTask | null {
  const status = input.reelStatus;
  if (!status) return null;
  const stage: TaskStage =
    status === "queued" ? "queued" : status === "in_progress" ? "generating" : status === "failed" ? "failed" : "done";
  if (!isCurrentTask(stage, input.updatedAt, now)) return null;
  return {
    id: `reel:${input.videoId}`,
    kind: "reel",
    stage,
    videoId: input.videoId,
    title: input.title,
    detail: "成片合成",
    detailKey: "tasksPage.detail.reel",
    previewUrl: stage === "done" ? input.reelUrl : undefined,
    isVideo: true,
    href: folderVideoPath(input.projectId, input.videoId),
    error: stage === "failed" ? input.reelError : undefined,
    attempts: 0,
    createdAt: input.updatedAt,
    updatedAt: input.updatedAt,
  };
}

// Jobs have no owner field: scope by the user's videos and characters.
async function ownedScope(clerkUserId: string, videoId?: string) {
  const videos = await videosCollection();
  // One video: skip the 200-row scan used by the global list.
  if (videoId && ObjectId.isValid(videoId)) {
    const video = await videos.findOne(
      { _id: new ObjectId(videoId), clerkUserId },
      { projection: REEL_PROJECTION },
    );
    return { videoDocs: video ? [video] : [], characters: [] };
  }
  const videoDocs = await videos
    .find({ clerkUserId }, { projection: REEL_PROJECTION })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  const characters = await (await charactersCollection())
    .find({ clerkUserId }, { projection: { _id: 1, name: 1 } })
    .limit(200)
    .toArray();
  return { videoDocs, characters };
}

export function jobListQuery(input: {
  videoIds: ObjectId[];
  characterIds: ObjectId[];
  cutoff: Date;
}) {
  const owners: Array<Record<string, unknown>> = [];
  if (input.videoIds.length === 1) owners.push({ projectId: input.videoIds[0] });
  else if (input.videoIds.length > 1) owners.push({ projectId: { $in: input.videoIds } });
  if (input.characterIds.length) owners.push({ characterId: { $in: input.characterIds } });
  if (owners.length === 0) return null;
  return {
    $and: [
      owners.length === 1 ? owners[0] : { $or: owners },
      {
        $or: [
          { status: { $in: ACTIVE_STATUSES } },
          { status: { $in: SETTLED_STATUSES }, updatedAt: { $gte: input.cutoff } },
        ],
      },
    ],
  };
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
  const cutoff = new Date(Date.now() - RECENT_SETTLED_MS);
  const query = jobListQuery({
    videoIds: videoDocs.map((doc) => doc._id),
    characterIds: characters.map((doc) => doc._id),
    cutoff,
  });
  if (!query) return [];
  const docs = await jobs
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(options.limit ?? 100)
    .toArray();

  const reelTasks = videoDocs.flatMap((video) => {
    const task = reelTask({
      videoId: video._id.toHexString(),
      projectId: video.projectId.toHexString(),
      title: video.phaseA?.localizedTitle ?? "未命名影片",
      reelStatus: video.reelStatus,
      reelUrl: video.reelUrl,
      reelError: video.reelError,
      updatedAt: (video.updatedAt ?? new Date(0)).toISOString(),
    });
    return task ? [task] : [];
  });

  const tasks = [...reelTasks, ...docs.map((job) => {
    const video = job.projectId ? videoById.get(job.projectId.toHexString()) : undefined;
    const character = job.characterId ? characterById.get(job.characterId.toHexString()) : undefined;
    return {
      id: job._id.toHexString(),
      kind: job.kind,
      stage: taskStage(job.status),
      title: character?.name ?? video?.phaseA?.localizedTitle ?? "未命名影片",
      detail: taskDetail(job),
      ...taskDetailI18n(job),
      previewUrl: job.status === "completed" ? mediaSrc(job) : undefined,
      isVideo: job.kind === "video",
      videoId: job.projectId?.toHexString(),
      href: video
        ? folderVideoPath(video.projectId.toHexString(), video._id.toHexString())
        : "/app/characters",
      error: job.status === "failed" || job.status === "nsfw" ? job.error : undefined,
      attempts: job.attempts ?? 0,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  })];
  // In-flight first, then newest settled.
  return tasks.sort((left, right) => {
    const leftDone = left.stage === "done" || left.stage === "failed" ? 1 : 0;
    const rightDone = right.stage === "done" || right.stage === "failed" ? 1 : 0;
    if (leftDone !== rightDone) return leftDone - rightDone;
    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

// Sidebar badge: tasks still waiting or generating.
export async function countActiveTasks(clerkUserId: string) {
  const tasks = await listTasks(clerkUserId, { limit: 200 });
  return tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
}
