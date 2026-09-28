import type { ClipFrame, FramePosition, ProjectClip } from "@/model/project";
import type { PublicVideo } from "@/presentation/serialize";
import { mediaSrc } from "@/util/media-src";

// One job that just settled between two polled snapshots; drives toasts.
export type GenerationTransition = {
  kind: "frame" | "video";
  clipNumber: number;
  position?: FramePosition;
  outcome: "completed" | "failed";
  // Finished file (image or video) when the job succeeded.
  mediaUrl?: string;
  error?: string;
};

function inFlight(status: string) {
  return status === "queued" || status === "in_progress";
}

function settled(status: string) {
  return status === "completed" || status === "failed";
}

function frameKey(frame: ClipFrame) {
  return `${frame.clipNumber}:${frame.position}`;
}

// Frames / clips that were in flight in `prev` and are settled in `next`.
// A completed row without a file is still waiting for persist; skip it so
// the toast never fires before the image is actually there.
export function generationTransitions(
  prev: Pick<PublicVideo, "frames" | "clips">,
  next: Pick<PublicVideo, "frames" | "clips">,
): GenerationTransition[] {
  const out: GenerationTransition[] = [];
  const prevFrames = new Map(prev.frames.map((frame) => [frameKey(frame), frame]));
  for (const frame of next.frames) {
    const before = prevFrames.get(frameKey(frame));
    if (!before || !inFlight(before.status) || !settled(frame.status)) continue;
    const mediaUrl = mediaSrc(frame);
    if (frame.status === "completed" && !mediaUrl) continue;
    out.push({
      kind: "frame",
      clipNumber: frame.clipNumber,
      position: frame.position,
      outcome: frame.status === "completed" ? "completed" : "failed",
      mediaUrl,
      error: frame.status === "failed" ? frame.error : undefined,
    });
  }
  const prevClips = new Map<number, ProjectClip>(prev.clips.map((clip) => [clip.clipNumber, clip]));
  for (const clip of next.clips) {
    const before = prevClips.get(clip.clipNumber);
    if (!before || !inFlight(before.status) || !settled(clip.status)) continue;
    const mediaUrl = mediaSrc(clip);
    if (clip.status === "completed" && !mediaUrl) continue;
    out.push({
      kind: "video",
      clipNumber: clip.clipNumber,
      outcome: clip.status === "completed" ? "completed" : "failed",
      mediaUrl,
      error: clip.status === "failed" ? clip.error : undefined,
    });
  }
  return out;
}

// Stable key so the same settle is never announced twice.
export function transitionKey(item: GenerationTransition) {
  return `${item.kind}:${item.clipNumber}:${item.position ?? ""}:${item.outcome}`;
}

// Toast copy for one settled job.
export function transitionMessage(item: GenerationTransition) {
  const slot =
    item.kind === "video" ? "影片" : item.position === "end" ? "結尾畫格" : "起始畫格";
  const head = `Clip ${item.clipNumber} · ${slot}`;
  if (item.outcome === "completed") return `${head} 完成`;
  return item.error ? `${head} 失敗：${item.error}` : `${head} 失敗`;
}
