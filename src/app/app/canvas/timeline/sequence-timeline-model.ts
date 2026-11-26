// Pure edits on a sequence document for the timeline drawer: reorder, trim, move, and add.

import type { CanvasSequence, SequenceAudio, SequenceClip, SequenceLayer } from "@/model/canvas-sequence";
import { canvasSequenceSchema } from "@/model/canvas-sequence";
import { sequenceItemId } from "@/service/canvas/core/sequence";

export type SequenceItemKind = "clip" | "layer" | "audio";
export type SequenceSelection = { kind: SequenceItemKind; id: string } | null;

const round = (v: number) => Math.round(v * 100) / 100;

export function formatSec(sec: number | undefined): string {
  if (sec === undefined || !Number.isFinite(sec)) return "--";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function patchClip(seq: CanvasSequence, id: string, patch: Partial<SequenceClip>): CanvasSequence {
  return { ...seq, tracks: { ...seq.tracks, video: seq.tracks.video.map((c) => (c.id === id ? { ...c, ...patch } : c)) } };
}

export function patchLayer(seq: CanvasSequence, id: string, patch: Partial<SequenceLayer>): CanvasSequence {
  return { ...seq, tracks: { ...seq.tracks, overlay: seq.tracks.overlay.map((l) => (l.id === id ? { ...l, ...patch } : l)) } };
}

export function patchAudio(seq: CanvasSequence, id: string, patch: Partial<SequenceAudio>): CanvasSequence {
  return { ...seq, tracks: { ...seq.tracks, audio: seq.tracks.audio.map((a) => (a.id === id ? { ...a, ...patch } : a)) } };
}

export function reorderClips(seq: CanvasSequence, from: number, to: number): CanvasSequence {
  const video = moveItem(seq.tracks.video, from, to);
  // The first clip never has a join leading into it.
  if (video[0]?.transitionIn) video[0] = { ...video[0], transitionIn: undefined };
  return { ...seq, tracks: { ...seq.tracks, video } };
}

// Drags one edge of a clip by `deltaSec` of timeline time; in / out stay inside the source.
export function trimClip(
  clip: SequenceClip,
  side: "in" | "out",
  deltaSec: number,
  sourceSec: number | undefined,
): Partial<SequenceClip> {
  const srcDelta = deltaSec * (clip.speed || 1);
  const out = clip.outSec ?? sourceSec;
  if (side === "in") {
    const max = (out ?? clip.inSec + 0.2) - 0.2;
    return { inSec: round(Math.min(max, Math.max(0, clip.inSec + srcDelta))) };
  }
  if (out === undefined) return {};
  const next = Math.max(clip.inSec + 0.2, out + srcDelta);
  return { outSec: round(sourceSec !== undefined ? Math.min(sourceSec, next) : next) };
}

// Moves a layer or audio item along the timeline, keeping its length.
export function shiftWindow(
  item: { startSec: number; endSec?: number },
  deltaSec: number,
  totalSec: number,
): { startSec: number; endSec?: number } {
  const len = item.endSec !== undefined ? item.endSec - item.startSec : undefined;
  const maxStart = Math.max(0, totalSec - (len ?? 0.2));
  const startSec = round(Math.min(maxStart, Math.max(0, item.startSec + deltaSec)));
  return len !== undefined ? { startSec, endSec: round(startSec + len) } : { startSec };
}

export function resizeLayer(layer: SequenceLayer, side: "start" | "end", deltaSec: number, totalSec: number): Partial<SequenceLayer> {
  const end = layer.endSec ?? totalSec;
  if (side === "start") return { startSec: round(Math.min(end - 0.2, Math.max(0, layer.startSec + deltaSec))) };
  return { endSec: round(Math.min(totalSec, Math.max(layer.startSec + 0.2, end + deltaSec))) };
}

export function addTextLayer(seq: CanvasSequence, atSec: number, text: string, totalSec: number): { seq: CanvasSequence; id: string } {
  const id = sequenceItemId("text");
  const startSec = round(Math.max(0, Math.min(atSec, Math.max(0, totalSec - 0.5))));
  const layer = canvasSequenceSchema.shape.tracks.parse({
    overlay: [{ id, kind: "text", text, startSec, endSec: round(Math.min(totalSec || startSec + 3, startSec + 3)), position: "top", box: true }],
  }).overlay[0]!;
  return { seq: { ...seq, tracks: { ...seq.tracks, overlay: [...seq.tracks.overlay, layer] } }, id };
}

// Removes an item that has no wire (a text layer). Wired items are removed by deleting the wire.
export function removeTextLayer(seq: CanvasSequence, id: string): CanvasSequence {
  return { ...seq, tracks: { ...seq.tracks, overlay: seq.tracks.overlay.filter((l) => l.id !== id) } };
}

// Wire id behind a selected item, when it has one.
export function selectionRef(seq: CanvasSequence, selection: SequenceSelection): string | undefined {
  if (!selection) return undefined;
  if (selection.kind === "clip") return seq.tracks.video.find((c) => c.id === selection.id)?.ref;
  if (selection.kind === "audio") return seq.tracks.audio.find((a) => a.id === selection.id)?.ref;
  return seq.tracks.overlay.find((l) => l.id === selection.id)?.ref;
}
