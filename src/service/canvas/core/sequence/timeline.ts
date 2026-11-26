// Pure timeline math for a sequence: clip lengths, transition overlaps, start times, and size.

import {
  SEQUENCE_LIMITS,
  type CanvasSequence,
  type SequenceAudio,
  type SequenceClip,
} from "@/model/canvas-sequence";

// Probed source lengths by edge id; undefined when unknown.
export type SequenceDurations = Readonly<Record<string, number | undefined>>;

export type PlacedClip = {
  clip: SequenceClip;
  index: number;
  // Seconds on the timeline.
  start: number;
  end: number;
  // Source seconds actually used.
  inSec: number;
  outSec: number;
  // Overlap with the previous clip (0 for a cut).
  transitionSec: number;
};

const round = (v: number) => Math.round(v * 1000) / 1000;

export function sequenceFrameSize(seq: Pick<CanvasSequence, "aspectRatio" | "resolution">): { width: number; height: number } {
  const short = seq.resolution === "720p" ? 720 : seq.resolution === "4k" ? 2160 : 1080;
  const even = (v: number) => Math.round(v / 2) * 2;
  switch (seq.aspectRatio) {
    case "16:9":
      return { width: even((short * 16) / 9), height: short };
    case "1:1":
      return { width: short, height: short };
    case "4:5":
      return { width: short, height: even((short * 5) / 4) };
    default:
      return { width: short, height: even((short * 16) / 9) };
  }
}

// Source window of a clip, clamped to the source length when known.
export function clipWindow(clip: SequenceClip, sourceSec?: number): { inSec: number; outSec: number | undefined } {
  const inSec = sourceSec !== undefined ? Math.min(clip.inSec, Math.max(0, sourceSec - 0.1)) : clip.inSec;
  const rawOut = clip.outSec !== undefined && clip.outSec > inSec ? clip.outSec : sourceSec;
  const outSec = rawOut !== undefined && sourceSec !== undefined ? Math.min(rawOut, sourceSec) : rawOut;
  return { inSec, outSec };
}

// Timeline length of one clip; undefined when its source length is unknown and no out point is set.
export function clipTimelineSec(clip: SequenceClip, sourceSec?: number): number | undefined {
  const { inSec, outSec } = clipWindow(clip, sourceSec);
  if (outSec === undefined) return undefined;
  return round(Math.max(0, outSec - inSec) / (clip.speed || 1));
}

// Places every clip on the timeline. Unknown lengths count as 0 so later clips still get a start.
export function placeClips(seq: CanvasSequence, durations: SequenceDurations): PlacedClip[] {
  const placed: PlacedClip[] = [];
  let cursor = 0;
  let prevLen = 0;
  seq.tracks.video.forEach((clip, index) => {
    const len = clipTimelineSec(clip, durations[clip.ref]) ?? 0;
    const effect = clip.transitionIn?.effect;
    const span =
      index > 0 && effect && effect !== "cut" ? Math.max(0, Math.min(clip.transitionIn!.durationSec, prevLen / 2, len / 2)) : 0;
    const start = round(Math.max(0, cursor - span));
    const { inSec, outSec } = clipWindow(clip, durations[clip.ref]);
    placed.push({ clip, index, start, end: round(start + len), inSec, outSec: outSec ?? inSec, transitionSec: round(span) });
    cursor = start + len;
    prevLen = len;
  });
  return placed;
}

export function sequenceTotalSec(seq: CanvasSequence, durations: SequenceDurations): number {
  const placed = placeClips(seq, durations);
  return placed.length ? placed[placed.length - 1]!.end : 0;
}

// True when every clip has a known length, so the total is exact.
export function sequenceLengthKnown(seq: CanvasSequence, durations: SequenceDurations): boolean {
  return seq.tracks.video.every((clip) => clipTimelineSec(clip, durations[clip.ref]) !== undefined);
}

// Seconds an audio item plays on the timeline, ending at the timeline's end at most.
export function audioItemSec(item: SequenceAudio, sourceSec: number | undefined, totalSec: number): number {
  const room = Math.max(0, totalSec - item.startSec);
  if (item.loop) return round(room);
  const out = item.outSec !== undefined && item.outSec > item.inSec ? item.outSec : sourceSec;
  const len = out !== undefined ? Math.max(0, out - item.inSec) : room;
  return round(Math.min(len, room));
}

// Render limits; returns a user-facing message or null.
export function sequenceRenderLimitError(seq: CanvasSequence, totalSec: number): string | null {
  if (seq.tracks.video.length === 0) return "時間線沒有影片片段";
  if (totalSec > SEQUENCE_LIMITS.maxTotalSec) return `時間線最長 ${SEQUENCE_LIMITS.maxTotalSec / 60} 分鐘`;
  if (seq.resolution === "4k" && totalSec > SEQUENCE_LIMITS.max4kSec) return `4K 時間線最長 ${SEQUENCE_LIMITS.max4kSec / 60} 分鐘`;
  return null;
}
