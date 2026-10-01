import { formatTimecode } from "@/presentation/studio/format-timecode";
import type { StudioClipItem, StudioClipTone } from "@/presentation/studio/clip-item";
import type { ClipStage, ClipState } from "@/service/clip-stage";
import { mediaSrc } from "@/util/media-src";
import type { PublicVideo } from "@/presentation/serialize";

const BUSY: ReadonlySet<ClipStage> = new Set(["frames_generating", "video_generating"]);

export type ClipTimelineLabels = {
  clipTitle: (clipNumber: number) => string;
  stageLabel: (stage: ClipStage) => string;
};

export function clipStudioItems(
  project: PublicVideo,
  states: ClipState[],
  pending = "",
  labels?: ClipTimelineLabels,
): StudioClipItem[] {
  return states.map((state) => {
    const row = project.phaseA?.clips.find((item) => item.clipNumber === state.clipNumber);
    const start = project.frames.find(
      (frame) => frame.clipNumber === state.clipNumber && frame.position === "start",
    );
    const end = project.frames.find(
      (frame) => frame.clipNumber === state.clipNumber && frame.position === "end",
    );
    const clip = project.clips.find((item) => item.clipNumber === state.clipNumber);
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
      title: labels?.clipTitle(state.clipNumber) ?? `Clip${state.clipNumber}.mp4`,
      durationLabel: formatTimecode(row?.durationSeconds ?? 0),
      thumbnailUrl: startBusy ? undefined : mediaSrc(start),
      statusLabel: labels?.stageLabel(state.stage) ?? state.stage,
      busy,
      stale,
      tone: clipTone(state.stage, busy, stale),
      hasScene: Boolean(mediaSrc(start) && mediaSrc(end)),
      hasVideo: Boolean(mediaSrc(clip)),
    };
  });
}

function clipTone(stage: ClipStage, busy: boolean, stale: boolean): StudioClipTone {
  if (busy) return "busy";
  if (stage === "frames_failed" || stage === "video_failed") return "failed";
  if (stale) return "stale";
  if (stage === "video_ready") return "done";
  return "idle";
}
