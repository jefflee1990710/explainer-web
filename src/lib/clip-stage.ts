import type { ClipFrame, ProjectClip, ProjectStatus } from "@/types/project";

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
  status: ProjectStatus;
  phaseA?: { clips: Array<{ clipNumber: number; editedAt?: string }> };
  frames?: ClipFrame[];
  clips: ProjectClip[];
};

const IN_FLIGHT = new Set<string>(["queued", "in_progress"]);

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
  // video because the user is redrawing; the panel still shows the old video.
  let stage: ClipStage;
  if (clip && IN_FLIGHT.has(clip.status)) stage = "video_generating";
  else if (frames.some((frame) => IN_FLIGHT.has(frame.status))) stage = "frames_generating";
  else if (frames.some((frame) => frame.status === "failed")) stage = "frames_failed";
  else if (clip?.status === "completed") stage = "video_ready";
  else if (clip?.status === "failed") stage = "video_failed";
  else if (start?.status === "completed" && end?.status === "completed") stage = "frames_ready";
  else stage = "no_frames";

  return { clipNumber, stage, stale };
}

export function clipStatesFor(project: ClipStageSource): ClipState[] {
  return (project.phaseA?.clips || []).map((row) => clipStateFor(project, row.clipNumber));
}

// Poll while the director writes, or while any frame/video job is in flight.
export function isProjectBusy(project: ClipStageSource) {
  if (project.status === "phase_a") return true;
  return (
    (project.frames || []).some((frame) => IN_FLIGHT.has(frame.status)) ||
    project.clips.some((clip) => IN_FLIGHT.has(clip.status))
  );
}

// Every storyboard clip has a completed video.
export function isProjectReady(project: ClipStageSource) {
  const rows = project.phaseA?.clips || [];
  return (
    rows.length > 0 &&
    rows.every(
      (row) =>
        project.clips.find((clip) => clip.clipNumber === row.clipNumber)?.status ===
        "completed",
    )
  );
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
