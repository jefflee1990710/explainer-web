// Pure checks on a sequence against its source lengths: shown on the drawer and fed to the
// assistant's edit checks.

import type { CanvasSequence } from "@/model/canvas-sequence";
import {
  sequenceLengthKnown,
  sequenceRenderLimitError,
  sequenceTotalSec,
  type SequenceDurations,
} from "@/service/canvas/core/sequence/timeline";

export type SequenceIssue = { itemId?: string; field: string; message: string };

const sec = (v: number) => `${Math.round(v * 100) / 100}s`;

export function sequenceIssues(seq: CanvasSequence, durations: SequenceDurations): SequenceIssue[] {
  const issues: SequenceIssue[] = [];
  seq.tracks.video.forEach((clip, i) => {
    const src = durations[clip.ref];
    const name = `clip ${i + 1}`;
    if (src !== undefined && clip.inSec >= src) {
      issues.push({ itemId: clip.id, field: "inSec", message: `${name} starts at ${sec(clip.inSec)} but its source is only ${sec(src)} long` });
    }
    if (clip.outSec !== undefined && clip.outSec <= clip.inSec) {
      issues.push({ itemId: clip.id, field: "outSec", message: `${name} ends at ${sec(clip.outSec)}, before its start ${sec(clip.inSec)}` });
    } else if (src !== undefined && clip.outSec !== undefined && clip.outSec > src + 0.05) {
      issues.push({ itemId: clip.id, field: "outSec", message: `${name} ends at ${sec(clip.outSec)} but its source is only ${sec(src)} long` });
    }
  });

  if (!sequenceLengthKnown(seq, durations)) return issues;
  const total = sequenceTotalSec(seq, durations);
  const limit = sequenceRenderLimitError(seq, total);
  if (limit) issues.push({ field: "tracks.video", message: limit });
  for (const layer of seq.tracks.overlay) {
    if (layer.startSec >= total) issues.push({ itemId: layer.id, field: "startSec", message: `a layer starts at ${sec(layer.startSec)}, after the ${sec(total)} timeline ends` });
    if (layer.kind === "text" && !layer.text?.trim()) issues.push({ itemId: layer.id, field: "text", message: "a text layer has no text" });
  }
  for (const item of seq.tracks.audio) {
    if (item.startSec >= total) issues.push({ itemId: item.id, field: "startSec", message: `an audio item starts at ${sec(item.startSec)}, after the ${sec(total)} timeline ends` });
  }
  return issues;
}
