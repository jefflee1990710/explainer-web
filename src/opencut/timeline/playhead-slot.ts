export type PlayheadSlotInput = {
  playheadSeconds: number;
  clipDurations: Array<{ clipNumber: number; durationSeconds: number }>;
  activeClipNumber?: number;
};

/**
 * Maps the timeline's active playhead time (or selected clip element)
 * to the 1-based storyboard slot (`insertAt`).
 */
export function resolvePlayheadInsertSlot(input: PlayheadSlotInput): number {
  const { playheadSeconds, clipDurations, activeClipNumber } = input;
  if (!clipDurations || clipDurations.length === 0) {
    return 1;
  }

  // If an active clip on the timeline was explicitly hovered or selected:
  if (typeof activeClipNumber === "number" && activeClipNumber > 0) {
    return activeClipNumber + 1;
  }

  // If playhead is precisely at the start (0s):
  if (playheadSeconds <= 0) {
    return 1;
  }

  let accumulated = 0;
  for (const clip of clipDurations) {
    const start = accumulated;
    const end = accumulated + Math.max(0.1, clip.durationSeconds);
    if (playheadSeconds >= start && playheadSeconds < end) {
      // Sits inside this clip; inserting after it means slot = clipNumber + 1
      return clip.clipNumber + 1;
    }
    accumulated = end;
  }

  // If playhead is at or past the end of all clips:
  return clipDurations.length + 1;
}
