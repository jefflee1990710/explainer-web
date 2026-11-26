// Compact view of an `ffmpeg:sequence` timeline for the canvas agent: sources, trims, joins,
// layers, audio, total length, and any problems.

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { sequenceSourceDurations } from "@/service/canvas/core/edit-media";
import {
  edgeSrc,
  readSequence,
  sequenceIssues,
  sequenceLengthKnown,
  sequenceTotalSec,
  syncSequenceWithEdges,
} from "@/service/canvas/core/sequence";

export function describeSequence(g: { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[] }, nodeId: string) {
  const node = g.nodes.find((n) => n.id === nodeId);
  const seq = syncSequenceWithEdges(readSequence(node?.data.toolParams), nodeId, g.edges);
  const durations = sequenceSourceDurations(g, nodeId);
  const src = (ref?: string) => {
    const e = g.edges.find((x) => x.id === ref);
    return e ? edgeSrc(e).replace(/:output$/, "") : undefined;
  };
  return {
    aspectRatio: seq.aspectRatio,
    resolution: seq.resolution,
    fps: seq.fps,
    totalSec: sequenceLengthKnown(seq, durations) ? sequenceTotalSec(seq, durations) : "unknown until the sources run",
    clips: seq.tracks.video.map((c) => ({
      source: src(c.ref),
      inSec: c.inSec,
      ...(c.outSec !== undefined ? { outSec: c.outSec } : {}),
      ...(c.speed !== 1 ? { speed: c.speed } : {}),
      ...(c.muted ? { muted: true } : {}),
      ...(c.transitionIn ? { transition: c.transitionIn.effect, transitionSec: c.transitionIn.durationSec } : {}),
      ...(durations[c.ref] !== undefined ? { sourceSec: durations[c.ref] } : {}),
    })),
    layers: seq.tracks.overlay.map((l) =>
      l.kind === "text"
        ? { kind: "text", text: l.text, startSec: l.startSec, endSec: l.endSec, position: l.position }
        : { kind: l.kind, source: src(l.ref), startSec: l.startSec, endSec: l.endSec },
    ),
    audio: seq.tracks.audio.map((a) => ({ source: src(a.ref), startSec: a.startSec, gainDb: a.gainDb, duck: a.duck, loop: a.loop })),
    ...(seq.tracks.captions ? { captions: seq.tracks.captions } : {}),
    issues: sequenceIssues(seq, durations).map((i) => i.message),
  };
}
