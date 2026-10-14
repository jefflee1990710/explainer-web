import { mediaSrc } from "@/util/media-src";
import {
  clipStateFor,
  type ClipStage,
  type ClipStageSource,
} from "@/service/clip-stage";
import { MIN_VIDEO_SECONDS } from "@/service/credit-costs";

/** UI stage for Assets / timeline thumbs (derived, not stored). */
export type ScroVideoUiStage =
  | "awaiting_frames"
  | "frames_generating"
  | "frames_ready"
  | "video_generating"
  | "video_ready"
  | "failed";

export type ScroVideoView = {
  clipNumber: number;
  durationSeconds: number;
  stage: ScroVideoUiStage;
  posterUrl?: string;
  videoUrl?: string;
  englishVo?: string;
  startVo?: string;
  endVo?: string;
  explainerScene?: string;
  motionCamera?: string;
  error?: string;
};

type StoryboardFields = {
  clipNumber: number;
  durationSeconds?: number;
  englishVo?: string;
  startVo?: string;
  endVo?: string;
  explainerScene?: string;
  motionCamera?: string;
};

export type ScroVideoSource = ClipStageSource & {
  phaseA?: { clips: StoryboardFields[] };
};

const STAGE_MAP: Record<ClipStage, ScroVideoUiStage> = {
  no_frames: "awaiting_frames",
  frames_generating: "frames_generating",
  frames_ready: "frames_ready",
  video_generating: "video_generating",
  video_ready: "video_ready",
  frames_failed: "failed",
  video_failed: "failed",
};

export function scroUiStageFor(stage: ClipStage): ScroVideoUiStage {
  return STAGE_MAP[stage];
}

/** One ScroVideo row per storyboard clip, ordered by clipNumber. */
export function scroVideosFor(project: ScroVideoSource): ScroVideoView[] {
  const rows = [...(project.phaseA?.clips ?? [])].sort(
    (a, b) => a.clipNumber - b.clipNumber,
  );
  return rows.map((row) => {
    const state = clipStateFor(project, row.clipNumber);
    const start = project.frames?.find(
      (frame) => frame.clipNumber === row.clipNumber && frame.position === "start",
    );
    const clip = project.clips.find((item) => item.clipNumber === row.clipNumber);
    const posterUrl = mediaSrc(start) || undefined;
    const videoUrl =
      state.stage === "video_ready" ? mediaSrc(clip) || undefined : undefined;
    const failedFrame = project.frames?.find(
      (frame) => frame.clipNumber === row.clipNumber && frame.status === "failed",
    );
    const error =
      state.stage === "frames_failed"
        ? failedFrame?.error || "Frame failed"
        : state.stage === "video_failed"
          ? clip?.error || "Video failed"
          : undefined;
    return {
      clipNumber: row.clipNumber,
      durationSeconds: row.durationSeconds ?? MIN_VIDEO_SECONDS,
      stage: scroUiStageFor(state.stage),
      posterUrl,
      videoUrl,
      englishVo: row.englishVo,
      startVo: row.startVo,
      endVo: row.endVo,
      explainerScene: row.explainerScene,
      motionCamera: row.motionCamera,
      error,
    };
  });
}
