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

  const totalDuration = clipDurations.reduce((sum, c) => sum + Math.max(0.1, c.durationSeconds), 0);

  // If playhead is precisely at the start (0s):
  if (playheadSeconds <= 0) {
    return 1;
  }

  // If playhead is at or past the end of all clips:
  if (playheadSeconds >= totalDuration) {
    return clipDurations.length + 1;
  }

  // If an active clip on the timeline was explicitly hovered or selected and playhead is within its bounds:
  if (typeof activeClipNumber === "number" && activeClipNumber > 0) {
    let accumulated = 0;
    for (const clip of clipDurations) {
      const start = accumulated;
      const end = accumulated + Math.max(0.1, clip.durationSeconds);
      if (clip.clipNumber === activeClipNumber) {
        if (playheadSeconds >= start && playheadSeconds <= end) {
          return activeClipNumber + 1;
        }
        break;
      }
      accumulated = end;
    }
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

  return clipDurations.length + 1;
}
