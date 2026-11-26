// Section math shared by Swap / Teleport groups and their settings. Comfy renders 2–15s per job.

export function clampSectionLength(seconds: number): number {
  return Math.min(15, Math.max(2, Math.round(Number.isFinite(seconds) ? seconds : 6)));
}

export function trimToolParams(start: number, length: number) {
  const from = Math.max(0, Number.isFinite(start) ? start : 0);
  return { ffmpegStartSec: from, ffmpegEndSec: from + clampSectionLength(length), ffmpegSpeed: 1 };
}
