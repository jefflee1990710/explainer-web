// Pure helpers that read a sequence off a node and keep it in step with the node's wires.

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  canvasSequenceSchema,
  SEQUENCE_LIMITS,
  SEQUENCE_MODEL_ID,
  type CanvasSequence,
} from "@/model/canvas-sequence";

export const SEQUENCE_PORTS = { video: "videos", audio: "audios", image: "refImages" } as const;

export function isSequenceNode(node: Pick<CanvasNode, "type" | "data"> | undefined): boolean {
  return node?.type === "model" && node.data.modelId === SEQUENCE_MODEL_ID;
}

export function defaultSequence(aspectRatio: CanvasSequence["aspectRatio"] = "9:16"): CanvasSequence {
  return canvasSequenceSchema.parse({ aspectRatio });
}

// The node's sequence, or an empty one when unset or unreadable.
export function readSequence(toolParams: Record<string, unknown> | undefined): CanvasSequence {
  const parsed = canvasSequenceSchema.safeParse(toolParams?.sequence);
  return parsed.success ? parsed.data : defaultSequence();
}

export const edgeSrc = (edge: Pick<CanvasEdge, "source" | "sourceHandle">) => `${edge.source}:${edge.sourceHandle || "output"}`;

let idCounter = 0;
export function sequenceItemId(prefix: string): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

// Drops items whose wire is gone, rebinds items whose wire was recreated (same source and
// output, new edge id), and appends newly wired sources at the end of their track.
export function syncSequenceWithEdges(
  seq: CanvasSequence,
  nodeId: string,
  edges: readonly CanvasEdge[],
  newId: (prefix: string) => string = sequenceItemId,
): CanvasSequence {
  const onPort = (port: string) => edges.filter((e) => e.target === nodeId && e.targetHandle === port);
  const videoEdges = onPort(SEQUENCE_PORTS.video);
  const audioEdges = onPort(SEQUENCE_PORTS.audio);
  const imageEdges = onPort(SEQUENCE_PORTS.image);

  const rebind = <T extends { ref?: string; src?: string }>(items: T[], pool: readonly CanvasEdge[]): T[] => {
    const used = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
      if (!item.ref) {
        out.push(item);
        continue;
      }
      let edge = pool.find((e) => e.id === item.ref && !used.has(e.id));
      if (!edge && item.src) edge = pool.find((e) => edgeSrc(e) === item.src && !used.has(e.id) && !items.some((i) => i.ref === e.id));
      if (!edge) continue;
      used.add(edge.id);
      out.push({ ...item, ref: edge.id, src: edgeSrc(edge) });
    }
    return out;
  };

  const video = rebind(seq.tracks.video, videoEdges);
  const overlayVideoPool = [...videoEdges, ...imageEdges];
  const overlay = seq.tracks.overlay.filter((l) => l.kind === "text" || overlayVideoPool.some((e) => e.id === l.ref || edgeSrc(e) === l.src));
  const overlayBound = rebind(overlay, overlayVideoPool);
  const audio = rebind(seq.tracks.audio, audioEdges);

  const usedRefs = new Set([...video, ...overlayBound, ...audio].map((i) => i.ref).filter(Boolean));
  for (const edge of videoEdges) {
    if (usedRefs.has(edge.id) || video.length >= SEQUENCE_LIMITS.videoClips) continue;
    video.push({ id: newId("clip"), ref: edge.id, src: edgeSrc(edge), inSec: 0, speed: 1 });
  }
  for (const edge of imageEdges) {
    if (usedRefs.has(edge.id) || overlayBound.length >= SEQUENCE_LIMITS.overlays) continue;
    overlayBound.push({
      id: newId("layer"),
      kind: "image",
      ref: edge.id,
      src: edgeSrc(edge),
      startSec: 0,
      x: 70,
      y: 5,
      scalePct: 25,
      opacity: 1,
      position: "bottom",
      sizePct: 5,
      color: "white",
      box: false,
    });
  }
  for (const edge of audioEdges) {
    if (usedRefs.has(edge.id) || audio.length >= SEQUENCE_LIMITS.audioItems) continue;
    audio.push({
      id: newId("audio"),
      ref: edge.id,
      src: edgeSrc(edge),
      startSec: 0,
      inSec: 0,
      gainDb: 0,
      fadeInSec: 0,
      fadeOutSec: 0,
      duck: false,
      loop: false,
    });
  }
  return { ...seq, tracks: { ...seq.tracks, video, overlay: overlayBound, audio } };
}

// Same document as JSON, so callers can skip no-op writes.
export function sameSequence(a: CanvasSequence, b: CanvasSequence): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
