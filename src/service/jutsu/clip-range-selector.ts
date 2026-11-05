export type ClipRangeDragMode = "start" | "end" | "move";

export const CLIP_RANGE_MIN_SECONDS = 2;
export const CLIP_RANGE_MAX_SECONDS = 15;

/** Round to nearest 0.5s step. */
export function roundToHalfSecond(seconds: number): number {
  return Math.round(seconds * 2) / 2;
}

/**
 * Resolve the total timeline track length in seconds.
 * Uses the real `sourceDuration` when loaded (> 0), falling back to 15s before video metadata arrives.
 */
export function resolveRangeTrackMaxDuration(
  sourceDuration: number,
  sectionStart: number,
  sectionLength: number,
): number {
  const minRequired = Math.max(CLIP_RANGE_MIN_SECONDS, sectionStart + sectionLength);
  if (Number.isFinite(sourceDuration) && sourceDuration > 0) {
    return Math.max(minRequired, roundToHalfSecond(sourceDuration));
  }
  return Math.max(minRequired, CLIP_RANGE_MAX_SECONDS);
}

/**
 * Determine whether a pointer press on the timeline bar targets:
 * - `"start"`: the left resize handle
 * - `"end"`: the right resize handle
 * - `"move"`: the center body (slides the whole selection window while keeping length constant)
 */
export function detectClipRangeDragMode(input: {
  ratio: number;
  sectionStart: number;
  sectionLength: number;
  maxDuration: number;
  handleMarginRatio?: number;
}): ClipRangeDragMode {
  const safeMax = Math.max(CLIP_RANGE_MIN_SECONDS, input.maxDuration);
  const startRatio = Math.min(1, Math.max(0, input.sectionStart / safeMax));
  const endRatio = Math.min(
    1,
    Math.max(startRatio, (input.sectionStart + input.sectionLength) / safeMax),
  );
  const margin = input.handleMarginRatio ?? 0.04;

  if (Math.abs(input.ratio - startRatio) <= margin) {
    return "start";
  }
  if (Math.abs(input.ratio - endRatio) <= margin) {
    return "end";
  }
  return "move";
}

/**
 * Compute updated `{ sectionStart, sectionLength, previewTime }` during a timeline drag gesture:
 * - `"move"`: drags the center of the selection, shifting `sectionStart` by `deltaSec` while keeping `sectionLength` constant.
 * - `"start"`: drags the left handle, making the selection longer or shorter while anchoring the right end (`initialStart + initialLength`).
 * - `"end"`: drags the right handle, making the selection longer or shorter while anchoring `initialStart`.
 */
export function computeClipRangeDragUpdate(input: {
  mode: ClipRangeDragMode;
  deltaSec: number;
  pointerSec: number;
  initialStart: number;
  initialLength: number;
  maxDuration: number;
  minLength?: number;
  maxLength?: number;
}): {
  sectionStart: number;
  sectionLength: number;
  previewTime: number;
} {
  const minLen = input.minLength ?? CLIP_RANGE_MIN_SECONDS;
  const maxDur = Math.max(minLen, input.maxDuration);
  const maxLen = Math.min(maxDur, input.maxLength ?? CLIP_RANGE_MAX_SECONDS);

  if (input.mode === "move") {
    const safeLen = Math.min(maxLen, Math.max(minLen, roundToHalfSecond(input.initialLength)));
    const maxStart = Math.max(0, maxDur - safeLen);
    const nextStart = Math.min(
      maxStart,
      Math.max(0, roundToHalfSecond(input.initialStart + input.deltaSec)),
    );
    return {
      sectionStart: nextStart,
      sectionLength: safeLen,
      previewTime: nextStart,
    };
  }

  if (input.mode === "start") {
    const anchoredEnd = Math.min(maxDur, input.initialStart + input.initialLength);
    const minStart = Math.max(0, anchoredEnd - maxLen);
    const maxStart = Math.max(0, anchoredEnd - minLen);
    const nextStart = Math.min(
      maxStart,
      Math.max(minStart, roundToHalfSecond(input.pointerSec)),
    );
    const nextLength = Math.min(
      maxLen,
      Math.max(minLen, roundToHalfSecond(anchoredEnd - nextStart)),
    );
    return {
      sectionStart: nextStart,
      sectionLength: nextLength,
      previewTime: nextStart,
    };
  }

  // mode === "end"
  const anchoredStart = Math.min(Math.max(0, maxDur - minLen), Math.max(0, input.initialStart));
  const maxAllowedEnd = Math.min(maxDur, anchoredStart + maxLen);
  const minAllowedEnd = Math.min(maxDur, anchoredStart + minLen);
  const nextEnd = Math.min(
    maxAllowedEnd,
    Math.max(minAllowedEnd, roundToHalfSecond(input.pointerSec)),
  );
  const nextLength = Math.min(
    maxLen,
    Math.max(minLen, roundToHalfSecond(nextEnd - anchoredStart)),
  );
  return {
    sectionStart: anchoredStart,
    sectionLength: nextLength,
    previewTime: anchoredStart + nextLength,
  };
}
