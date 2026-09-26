import { mediaSrc } from "@/util/media-src";
import { clipStatesFor, type ClipStageSource } from "@/service/clip-stage";
import type { ClipFrame, ProjectClip } from "@/model/project";

// Credits per action. Frames are 1 each (start + end), a clip video is 1.
export const FRAME_COST = 1;
export const FRAMES_COST = 2;
export const VIDEO_COST = 1;

// A clip video is claimed (`queued` + `submittedAt`) before its background job
// runs. If that job is lost, nothing will ever move the clip, so after this long
// with no job behind the claim the user may claim it again and retry.
export const STUCK_CLAIM_MS = 10 * 60 * 1000;

export type RemainingPlan = {
  // Clips that get both frames submitted.
  frames: number[];
  // Clips that get a video submitted.
  videos: number[];
  cost: number;
};

// "補齊剩餘": fill gaps only. Never touches generating, finished, or stale clips.
export function planRemaining(project: ClipStageSource): RemainingPlan {
  const frames: number[] = [];
  const videos: number[] = [];
  for (const state of clipStatesFor(project)) {
    if (state.stage === "no_frames" || state.stage === "frames_failed") {
      frames.push(state.clipNumber);
    } else if (
      (state.stage === "frames_ready" || state.stage === "video_failed") &&
      !state.stale.frames
    ) {
      videos.push(state.clipNumber);
    }
  }
  return {
    frames,
    videos,
    cost: frames.length * FRAMES_COST + videos.length * VIDEO_COST,
  };
}

export type BulkGeneratePlan = {
  // Clips that get both scene images submitted now.
  frames: number[];
  // Clips that get a video once both scene images exist. Empty for scenes-only.
  videos: number[];
  cost: number;
};

// Every clip whose scene images are not already in flight.
export function planGenerateAllScenes(project: ClipStageSource): BulkGeneratePlan {
  const frames = clipStatesFor(project)
    .filter((state) => state.stage !== "frames_generating")
    .map((state) => state.clipNumber);
  return { frames, videos: [], cost: frames.length * FRAMES_COST };
}

// Scene images for every clip not already drawing, plus a video for every clip.
// Video credits are reserved up front and charged only after both stills exist.
export function planGenerateAllClips(project: ClipStageSource): BulkGeneratePlan {
  const states = clipStatesFor(project);
  const frames = states
    .filter((state) => state.stage !== "frames_generating")
    .map((state) => state.clipNumber);
  const videos = states.map((state) => state.clipNumber);
  return {
    frames,
    videos,
    cost: frames.length * FRAMES_COST + videos.length * VIDEO_COST,
  };
}

const IN_FLIGHT = new Set(["queued", "in_progress"]);

// Whether a clip on the auto-video list should start, wait, or leave the list.
export function autoVideoDecision(
  frames: ClipFrame[] | undefined,
  clips: ProjectClip[],
  clipNumber: number,
): "start" | "wait" | "drop" | "done" {
  const start = frames?.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === "start",
  );
  const end = frames?.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === "end",
  );
  const pair = [start, end];
  if (pair.some((frame) => frame && IN_FLIGHT.has(frame.status))) return "wait";
  if (!start || !end) return "wait";
  if (pair.some((frame) => frame?.status === "failed")) return "drop";
  if (start.status !== "completed" || end.status !== "completed") return "wait";
  if (!mediaSrc(start) || !mediaSrc(end)) return "wait";

  const clip = clips.find((item) => item.clipNumber === clipNumber);
  if (clip && IN_FLIGHT.has(clip.status)) return "wait";

  const frameAt = [start.submittedAt, end.submittedAt].filter(Boolean).sort().at(-1);
  if (
    clip?.status === "completed" &&
    clip.submittedAt &&
    frameAt &&
    clip.submittedAt >= frameAt
  ) {
    return "done";
  }
  return "start";
}
