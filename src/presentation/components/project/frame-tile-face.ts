import type { ClipFrame } from "@/model/project";

export type FrameTileFace = "image" | "drawing" | "failed" | "empty";

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
