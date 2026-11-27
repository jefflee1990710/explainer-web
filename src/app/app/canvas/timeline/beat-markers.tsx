// Beat ticks inside a music item on the timeline's audio lane.

import type { SequenceAudio } from "@/model/canvas-sequence";
import { timelineBeats } from "@/service/canvas/core/sequence";

export function BeatMarkers({
  item,
  sourceSec,
  totalSec,
  pps,
}: {
  item: SequenceAudio;
  sourceSec?: number;
  totalSec: number;
  pps: number;
}) {
  if (!item.beats?.length) return null;
  const beats = timelineBeats(item, totalSec, sourceSec);
  return (
    <div className="pointer-events-none absolute inset-0" data-testid="beat-markers">
      {beats.map((t) => (
        <span
          key={t}
          className="absolute top-0 bottom-0 w-px bg-sky-200/45"
          style={{ left: (t - item.startSec) * pps }}
        />
      ))}
    </div>
  );
}
