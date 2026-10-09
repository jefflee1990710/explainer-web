import { mediaSrc } from "@/util/media-src";
import { canQueueFrames, clipStatesFor, type ClipStageSource } from "@/service/clip-stage";
import type { ClipFrame, ProjectClip } from "@/model/project";

import { MIN_VIDEO_COST, MIN_VIDEO_SECONDS, videoCost } from "@/service/credit-costs";
import { talkingHeadFramesCost } from "@/service/director/talking-head";
import { resolveVoiceSwapId } from "@/service/voice/voice-swap-target";

export * from "@/service/credit-costs";

// Video credits for one storyboard clip, from its planned duration.
export function clipVideoCost(project: ClipStageSource, clipNumber: number) {
  const row = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber);
  return videoCost(
    row?.durationSeconds ?? MIN_VIDEO_SECONDS,
    project.styleId,
    Boolean(resolveVoiceSwapId(project)),
  );
}

// Scene-image credits. Talking-head clip 2+ pays for the end still only.
export function sceneImageCost(project: ClipStageSource, clipNumbers: number[]) {
  return clipNumbers.reduce(
    (sum, clipNumber) => sum + talkingHeadFramesCost(project.skillSlug, clipNumber),
    0,
  );
}

// Sum of video credits for these clips.
function videosCost(project: ClipStageSource, clipNumbers: number[]) {
  return clipNumbers.reduce((sum, clipNumber) => sum + clipVideoCost(project, clipNumber), 0);
}

// Cheapest video among these clips, so the upgrade prompt fires only when none fit.
export function cheapestVideoCost(project: ClipStageSource, clipNumbers: number[]) {
  if (clipNumbers.length === 0) return MIN_VIDEO_COST;
  return Math.min(...clipNumbers.map((clipNumber) => clipVideoCost(project, clipNumber)));
}

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
    cost: sceneImageCost(project, frames) + videosCost(project, videos),
  };
}

const VIDEO_READY_STAGES = new Set(["frames_ready", "video_failed", "video_ready"]);

// Filmstrip multi-select: frames unless that pair is already drawing; videos
// only where both frames are finished and newer than the last text edit.
export function planSelected(
  project: ClipStageSource,
  clipNumbers: number[],
  kind: "frames" | "videos",
): RemainingPlan {
  const picked = clipStatesFor(project).filter((state) =>
    clipNumbers.includes(state.clipNumber),
  );
  if (kind === "frames") {
    const frames = picked
      .filter((state) => canQueueFrames(state))
      .map((state) => state.clipNumber);
    return { frames, videos: [], cost: sceneImageCost(project, frames) };
  }
  const videos = picked
    .filter((state) => VIDEO_READY_STAGES.has(state.stage) && !state.stale.frames)
    .map((state) => state.clipNumber);
  return { frames: [], videos, cost: videosCost(project, videos) };
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
  return { frames, videos: [], cost: sceneImageCost(project, frames) };
}

const FRAMES_DONE = new Set(["frames_ready", "video_generating", "video_failed", "video_ready"]);

// Every clip has a current start and end still, so videos may be rendered.
export function allFramesReady(project: ClipStageSource) {
  const states = clipStatesFor(project);
  return (
    states.length > 0 &&
    states.every((state) => FRAMES_DONE.has(state.stage) && !state.stale.frames)
  );
}

// Videos for clips that still need one. Empty until every frame image is ready.
export function planGenerateAllVideos(project: ClipStageSource): BulkGeneratePlan {
  if (!allFramesReady(project)) return { frames: [], videos: [], cost: 0 };
  const videos = clipStatesFor(project)
    .filter((state) => state.stage === "frames_ready" || state.stage === "video_failed")
    .map((state) => state.clipNumber);
  return { frames: [], videos, cost: videosCost(project, videos) };
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
