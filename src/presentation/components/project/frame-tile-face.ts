import type { ClipFrame } from "@/model/project";
import { mediaSrc } from "@/util/media-src";

export type FrameTileFace = "image" | "drawing" | "failed" | "empty";

// Only this tile's own click / job — a sibling still generating must not
// hide a start (or end) that already has a file.
export function isFrameTilePending(frame: ClipFrame | undefined, clickPending: boolean) {
  if (clickPending) return true;
  if (!frame) return false;
  if (frame.status === "queued" || frame.status === "in_progress") return true;
  return frame.status === "completed" && !mediaSrc(frame);
}

// Queued / in-progress (or a click still in flight) always shows the drawing
// indicator, even before the server has written a frame row.
export function frameTileFace(
  frame: ClipFrame | undefined,
  pending: boolean,
  hasImage: boolean,
): FrameTileFace {
  const inFlight =
    pending || frame?.status === "queued" || frame?.status === "in_progress";
  if (hasImage && !inFlight) return "image";
  if (inFlight) return "drawing";
  if (frame?.status === "failed") return "failed";
  return "empty";
}
