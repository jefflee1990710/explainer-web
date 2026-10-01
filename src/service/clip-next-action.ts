import { FRAMES_COST, MIN_VIDEO_COST } from "@/service/credit-costs";
import { canQueueFrames, type ClipState } from "@/service/clip-stage";
import type { TranslateFn } from "@/util/i18n/translate";

export { canQueueFrames };

export type ClipNextKind = "frames" | "video" | "busy" | "next" | "done";

export type ClipNextActionId =
  | "busy.framesRunning"
  | "busy.framesQueued"
  | "busy.videoRunning"
  | "busy.videoQueued"
  | "staleFrames"
  | "drawFrames"
  | "retryFrames"
  | "renderClip"
  | "retryVideo"
  | "redoVideo"
  | "nextClip"
  | "allDone";

// The one thing a clip needs next; drives the inspector's primary button.
export type ClipNextAction = {
  kind: ClipNextKind;
  id: ClipNextActionId;
  params?: Record<string, string | number>;
  cost: number;
};

export function clipNextActionText(t: TranslateFn, action: ClipNextAction) {
  const base = `production.nextAction.${action.id}`;
  return {
    label: t(`${base}.label`, action.params),
    hint: t(`${base}.hint`, action.params),
  };
}

// Quiet "重畫兩張" when the primary button is not already a frame action.
export function canRedrawFrames(state: ClipState, hasFrames: boolean): boolean {
  return hasFrames && canQueueFrames(state) && state.stage !== "no_frames" && state.stage !== "frames_failed";
}

export function clipNextAction(state: ClipState, nextUnfinished?: number): ClipNextAction {
  const videoCredits = state.videoCost ?? MIN_VIDEO_COST;
  if (state.stage === "frames_generating") {
    const id = state.wait === "running" ? "busy.framesRunning" : "busy.framesQueued";
    return { kind: "busy", id, cost: 0 };
  }
  if (state.stage === "video_generating") {
    const id = state.wait === "running" ? "busy.videoRunning" : "busy.videoQueued";
    return { kind: "busy", id, cost: 0 };
  }
  if (state.stale.frames) {
    return { kind: "frames", id: "staleFrames", cost: FRAMES_COST };
  }
  if (state.stage === "no_frames") {
    return { kind: "frames", id: "drawFrames", cost: FRAMES_COST };
  }
  if (state.stage === "frames_failed") {
    return { kind: "frames", id: "retryFrames", cost: FRAMES_COST };
  }
  if (state.stage === "frames_ready") {
    return { kind: "video", id: "renderClip", cost: videoCredits };
  }
  if (state.stage === "video_failed") {
    return { kind: "video", id: "retryVideo", cost: videoCredits };
  }
  if (state.stale.video) {
    return { kind: "video", id: "redoVideo", cost: videoCredits };
  }
  if (nextUnfinished !== undefined) {
    return { kind: "next", id: "nextClip", params: { n: nextUnfinished }, cost: 0 };
  }
  return { kind: "done", id: "allDone", cost: 0 };
}
