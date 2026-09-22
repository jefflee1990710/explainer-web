import { clipStatesFor, type ClipStageSource } from "@/service/clip-stage";

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
