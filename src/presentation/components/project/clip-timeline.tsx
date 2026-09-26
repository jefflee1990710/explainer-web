import { formatTimecode } from "@/presentation/studio/format-timecode";
import type { StudioClipItem, StudioClipTone } from "@/presentation/studio/clip-item";
import type { ClipStage, ClipState } from "@/service/clip-stage";
import { mediaSrc } from "@/util/media-src";
import type { PublicVideo } from "@/presentation/serialize";

export const STAGE_LABEL: Record<ClipStage, string> = {
  no_frames: "待畫格",
  frames_generating: "畫格中",
  frames_failed: "畫格失敗",
  frames_ready: "畫格完成",
  video_generating: "產片中",
  video_failed: "影片失敗",
  video_ready: "影片完成",
};

const BUSY: ReadonlySet<ClipStage> = new Set(["frames_generating", "video_generating"]);

// Turns clip state into the rows shared by the media list and the filmstrip.
export function clipStudioItems(
  project: PublicVideo,
  states: ClipState[],
  pending = "",
): StudioClipItem[] {
  return states.map((state) => {
    const row = project.phaseA?.clips.find((item) => item.clipNumber === state.clipNumber);
    const start = project.frames.find(
      (frame) => frame.clipNumber === state.clipNumber && frame.position === "start",
    );
    const startBusy =
      pending === `frames:${state.clipNumber}` ||
      pending === `clip:${state.clipNumber}:regen` ||
      pending === `frame:${state.clipNumber}:start` ||
      start?.status === "queued" ||
      start?.status === "in_progress";
    const busy = BUSY.has(state.stage) || Boolean(startBusy);
    const stale = state.stale.frames || state.stale.video;
    return {
      id: String(state.clipNumber),
      title: `Clip${state.clipNumber}.mp4`,
      durationLabel: formatTimecode(row?.durationSeconds ?? 0),
      thumbnailUrl: startBusy ? undefined : mediaSrc(start),
      statusLabel: STAGE_LABEL[state.stage],
      busy,
      stale,
      tone: clipTone(state.stage, busy, stale),
    };
  });
}

// Busy wins, then failure, then stale media, then finished video.
function clipTone(stage: ClipStage, busy: boolean, stale: boolean): StudioClipTone {
  if (busy) return "busy";
  if (stage === "frames_failed" || stage === "video_failed") return "failed";
  if (stale) return "stale";
  if (stage === "video_ready") return "done";
  return "idle";
}
