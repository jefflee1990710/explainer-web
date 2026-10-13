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
  "archived",
] as const;

export type VideoListFilter = (typeof VIDEO_LIST_FILTERS)[number];

export const VIDEO_LIST_FILTER_PARAM = "filter";

// First visit, with no query, shows work still in flight plus videos still to make or post.
export const DEFAULT_VIDEO_LIST_FILTERS: VideoListFilter[] = [
  "scenes",
  "videos",
  "pending_video",
  "pending_post",
];

function isVideoListFilter(value: string): value is VideoListFilter {
  return (VIDEO_LIST_FILTERS as readonly string[]).includes(value);
}

// Missing param uses the default set. `all` and `none` are explicit.
export function videoListFiltersFromSearch(value: string | null | undefined): VideoListFilter[] {
  if (!value) return [...DEFAULT_VIDEO_LIST_FILTERS];
  if (value === "all") return [...VIDEO_LIST_FILTERS];
  if (value === "none") return [];
  const picked = value
    .split(",")
    .map((part) => part.trim())
    .filter(isVideoListFilter);
  const unique = VIDEO_LIST_FILTERS.filter((id) => picked.includes(id));
  return unique.length > 0 ? unique : [...DEFAULT_VIDEO_LIST_FILTERS];
}

export function videoListFiltersSearchValue(filters: VideoListFilter[]) {
  if (filters.length === 0) return "none";
  if (filters.length === VIDEO_LIST_FILTERS.length) return "all";
  return VIDEO_LIST_FILTERS.filter((id) => filters.includes(id)).join(",");
}

type StageInput = {
  status: ProjectStatus;
  tags: GenerationDetailTag[];
  postedAt?: string;
  archivedAt?: string;
};

// null is an optimistic unarchive and must beat a stale server archivedAt.
// A timestamp is an optimistic archive. Absent means use the server value.
export function resolvedArchivedAt(
  serverArchivedAt: string | undefined,
  override: string | null | undefined,
): string | undefined {
  if (override === null) return undefined;
  return override || serverArchivedAt;
}

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

  if (video.archivedAt) return "archived";
  if (done && video.postedAt) return "posted";
  if (video.status === "draft" || video.status === "phase_a" || video.status === "failed") return "director";
  if (scenes.some((tag) => tag.state === "busy") || scenes.some((tag) => tag.state !== "ready")) return "scenes";
  if (videos.some((tag) => tag.state === "busy")) return "videos";
  if (!done) return "pending_video";
  return "pending_post";
}
