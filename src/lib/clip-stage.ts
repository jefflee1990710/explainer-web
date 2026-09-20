import { mediaSrc } from "@/lib/media-src";
import { normalizeProjectStatus } from "@/lib/project-status";
import type {
  ClipFrame,
  LegacyProjectStatus,
  ProjectClip,
  ProjectStatus,
} from "@/types/project";

// Where one clip is in production. Derived, never stored.
export type ClipStage =
  | "no_frames"          // 待畫格
  | "frames_generating"  // 畫格中
  | "frames_failed"      // 有畫格失敗（credits 已退）
  | "frames_ready"       // 兩張畫格完成，可產片
  | "video_generating"   // 產片中
  | "video_failed"       // 影片失敗（credits 已退）
  | "video_ready";       // 影片完成

export type ClipState = {
  clipNumber: number;
  stage: ClipStage;
  // Media generated before the latest text edit / frame redo.
  stale: { frames: boolean; video: boolean };
};

// Minimal shape so both the Mongo `Project` and `PublicVideo` fit.
export type ClipStageSource = {
  status: ProjectStatus | LegacyProjectStatus;
  phaseA?: { clips: Array<{ clipNumber: number; editedAt?: string }> };
  frames?: ClipFrame[];
  clips: ProjectClip[];
};

const IN_FLIGHT = new Set<string>(["queued", "in_progress"]);

type MediaItem = { status: string; blobUrl?: string; outputUrl?: string };

// Completed without a stored file is not done: the webhook fired early and the
// poller still has to fetch the URL. Treat it as in flight so the UI keeps polling.
function isInFlight(item?: MediaItem) {
  if (!item) return false;
  if (IN_FLIGHT.has(item.status)) return true;
  return item.status === "completed" && !mediaSrc(item);
}

function isCompleted(item?: MediaItem) {
  return Boolean(item && item.status === "completed" && mediaSrc(item));
}

// ISO strings compare lexicographically; missing values never count as later.
function isLater(a?: string, b?: string) {
  return Boolean(a && b && a > b);
}

export function clipStateFor(project: ClipStageSource, clipNumber: number): ClipState {
  const row = project.phaseA?.clips.find((item) => item.clipNumber === clipNumber);
  const start = project.frames?.find(
    (item) => item.clipNumber === clipNumber && item.position === "start",
  );
  const end = project.frames?.find(
    (item) => item.clipNumber === clipNumber && item.position === "end",
  );
  const clip = project.clips.find((item) => item.clipNumber === clipNumber);
  const frames = [start, end].filter((item): item is ClipFrame => Boolean(item));

  const stale = {
    frames: frames.some((frame) => isLater(row?.editedAt, frame.submittedAt)),
    video:
      Boolean(clip) &&
      (isLater(row?.editedAt, clip?.submittedAt) ||
        frames.some((frame) => isLater(frame.submittedAt, clip?.submittedAt))),
  };

  // Precedence: active video > active frames > failed frames > finished video
  // > failed video > frames ready > nothing. Frame activity outranks a finished
  // video because the user is redrawing.
  let stage: ClipStage;
  if (isInFlight(clip)) stage = "video_generating";
  else if (frames.some((frame) => isInFlight(frame))) stage = "frames_generating";
  else if (frames.some((frame) => frame.status === "failed")) stage = "frames_failed";
  else if (isCompleted(clip)) stage = "video_ready";
  else if (clip?.status === "failed") stage = "video_failed";
  else if (isCompleted(start) && isCompleted(end)) stage = "frames_ready";
  else stage = "no_frames";

  return { clipNumber, stage, stale };
}

export function clipStatesFor(project: ClipStageSource): ClipState[] {
  return (project.phaseA?.clips || []).map((row) => clipStateFor(project, row.clipNumber));
}

// Poll while the director writes, or while any frame/video job is in flight.
export function isProjectBusy(project: ClipStageSource) {
  if (normalizeProjectStatus(project.status) === "phase_a") return true;
  return (
    (project.frames || []).some((frame) => isInFlight(frame)) ||
    project.clips.some((clip) => isInFlight(clip))
  );
}

// Ready when every storyboard clip is video_ready (not mid frame redraw).
export function isProjectReady(project: ClipStageSource) {
  const states = clipStatesFor(project);
  return states.length > 0 && states.every((state) => state.stage === "video_ready");
}

// Header counters: clips with both frames done, clips with a video.
export function productionCounts(project: ClipStageSource) {
  const states = clipStatesFor(project);
  const framesDone = states.filter((state) =>
    ["frames_ready", "video_generating", "video_failed", "video_ready"].includes(state.stage),
  ).length;
  const videosDone = states.filter((state) => state.stage === "video_ready").length;
  return { total: states.length, framesDone, videosDone };
}
