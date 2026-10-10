import type { ProjectStatus } from "@/model/project";
import type { GenerationDetailTag } from "@/service/clip-stage";

// One bucket per video, so a filter shows exactly that set.
export const VIDEO_LIST_FILTERS = [
  "director",
  "scenes",
  "videos",
  "pending_video",
  "pending_post",
  "posted",
] as const;

export type VideoListFilter = (typeof VIDEO_LIST_FILTERS)[number];

type StageInput = {
  status: ProjectStatus;
  tags: GenerationDetailTag[];
  postedAt?: string;
};

// Finished means every scene still and every clip video is stored.
function clipsFinished(tags: GenerationDetailTag[], status: ProjectStatus) {
  const scenes = tags.filter((tag) => tag.kind === "scene");
  const videos = tags.filter((tag) => tag.kind === "video");
  if (videos.length === 0) return status === "ready" && scenes.every((tag) => tag.state === "ready");
  return scenes.every((tag) => tag.state === "ready") && videos.every((tag) => tag.state === "ready");
}

// Director, then in-flight images, then in-flight videos, then videos still to make.
// A finished video is pending to post until the user marks it posted.
export function videoListStage(video: StageInput): VideoListFilter {
  const scenes = video.tags.filter((tag) => tag.kind === "scene");
  const videos = video.tags.filter((tag) => tag.kind === "video");
  const done = clipsFinished(video.tags, video.status);

  if (done && video.postedAt) return "posted";
  if (video.status === "draft" || video.status === "phase_a" || video.status === "failed") return "director";
  if (scenes.some((tag) => tag.state === "busy") || scenes.some((tag) => tag.state !== "ready")) return "scenes";
  if (videos.some((tag) => tag.state === "busy")) return "videos";
  if (!done) return "pending_video";
  return "pending_post";
}
