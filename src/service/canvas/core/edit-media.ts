// Pure: the length, sound, and size a node's output has or will have. A probed current file
// wins; otherwise FFmpeg edit nodes are estimated from their wired source and toolParams.

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { complementRanges, mergeRanges, parseKeepRanges, totalRangeSec } from "@/service/canvas/core/edit-ranges";
import { SPLIT_SECOND_HANDLE } from "@/service/canvas/core/extra-outputs";
import { currentMediaMeta } from "@/service/canvas/core/media-meta";
import { isOutputStale } from "@/service/canvas/core/stale-outputs";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { readSequence, syncSequenceWithEdges } from "@/service/canvas/core/sequence/document";
import { sequenceFrameSize, sequenceLengthKnown, sequenceTotalSec } from "@/service/canvas/core/sequence/timeline";

export type ExpectedMedia = {
  durationSec?: number;
  hasAudio?: boolean;
  width?: number;
  height?: number;
  // True when computed from inputs instead of probing the file.
  estimated: boolean;
};

type Graph = { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[] };

function param(node: CanvasNode, key: string): unknown {
  return node.data.toolParams?.[key];
}

function numParam(node: CanvasNode, key: string, fallback: number): number {
  const raw = param(node, key);
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

// Source node ids on one input port, in edge order.
export function wiredSources(g: Graph, nodeId: string, port: string): string[] {
  return g.edges.filter((e) => e.target === nodeId && e.targetHandle === port).map((e) => e.source);
}

// Wired edges on one input port, in edge order (keeps which output each came from).
export function wiredEdges(g: Graph, nodeId: string, port: string): CanvasEdge[] {
  return g.edges.filter((e) => e.target === nodeId && e.targetHandle === port);
}

const SMART_EDIT_MODELS = new Set(["scro:clean-speech", "scro:smart-reframe"]);

const PASS_THROUGH = new Set([
  "ffmpeg:fade",
  "ffmpeg:crop",
  "ffmpeg:rotate",
  "ffmpeg:overlay",
  "ffmpeg:color-grade",
  "ffmpeg:transform",
  "ffmpeg:burn-subtitles",
  "ffmpeg:volume",
  "ffmpeg:audio-fade",
  "ffmpeg:text",
  "ffmpeg:adjust",
]);

// Output size of a 720p/1080p/4k pick on a frame of this shape (short side scaled).
function scaledSize(src: ExpectedMedia, resolution: unknown): Pick<ExpectedMedia, "width" | "height"> {
  const short = resolution === "720p" ? 720 : resolution === "4k" ? 2160 : resolution === "1080p" ? 1080 : undefined;
  if (!short || !src.width || !src.height) return {};
  const scale = short / Math.min(src.width, src.height);
  const even = (v: number) => Math.round((v * scale) / 2) * 2;
  return { width: even(src.width), height: even(src.height) };
}

function estimateEdit(g: Graph, node: CanvasNode, seen: Set<string>, handle?: string | null): ExpectedMedia | undefined {
  const modelId = node.data.modelId ?? "";
  const source = (port = "video") => {
    const edge = wiredEdges(g, node.id, port)[0];
    return edge ? expectedNodeMedia(g, edge.source, new Set(seen), edge.sourceHandle) : undefined;
  };

  if (modelId === SEQUENCE_MODEL_ID) {
    const seq = syncSequenceWithEdges(readSequence(node.data.toolParams), node.id, g.edges);
    const durations = sequenceSourceDurations(g, node.id, seen);
    return {
      ...(sequenceLengthKnown(seq, durations) ? { durationSec: sequenceTotalSec(seq, durations) } : {}),
      hasAudio: true,
      ...sequenceFrameSize(seq),
      estimated: true,
    };
  }

  if (PASS_THROUGH.has(modelId)) {
    const src = source();
    if (!src) return undefined;
    const muted = modelId === "ffmpeg:volume" && param(node, "ffmpegVolumeMode") === "mute";
    const rotated = modelId === "ffmpeg:rotate" && param(node, "ffmpegRotate") !== "180";
    return {
      ...src,
      ...(muted ? { hasAudio: true } : {}),
      ...(rotated && src.width && src.height ? { width: src.height, height: src.width } : {}),
      ...(modelId === "ffmpeg:crop" || modelId === "ffmpeg:transform" ? { width: undefined, height: undefined } : {}),
      estimated: true,
    };
  }
  // Same length in a new frame; Clean Speech only gets shorter, so its length stays unknown.
  if (modelId === "scro:smart-reframe" || modelId === "scro:clean-speech") {
    const src = source();
    if (!src) return undefined;
    if (modelId === "scro:clean-speech") return { hasAudio: src.hasAudio, width: src.width, height: src.height, estimated: true };
    const aspect = String(param(node, "reframeAspect") ?? "9:16");
    const [w, h] = (["9:16", "1:1", "4:5", "16:9"].includes(aspect) ? aspect : "9:16").split(":").map(Number);
    const short = param(node, "reframeResolution") === "720p" ? 720 : 1080;
    const even = (v: number) => Math.round(v / 2) * 2;
    const size = w! < h! ? { width: short, height: even((short * h!) / w!) } : { width: even((short * w!) / h!), height: short };
    return { ...src, ...size, estimated: true };
  }
  if (modelId === "ffmpeg:trim-speed") {
    const src = source();
    if (!src) return undefined;
    const speed = Math.min(4, Math.max(0.25, numParam(node, "ffmpegSpeed", 1)));
    const start = Math.max(0, numParam(node, "ffmpegStartSec", 0));
    const endRaw = numParam(node, "ffmpegEndSec", 0);
    const end = src.durationSec !== undefined ? (endRaw > start ? Math.min(endRaw, src.durationSec) : src.durationSec) : endRaw > start ? endRaw : undefined;
    return {
      ...src,
      durationSec: end !== undefined ? Math.max(0, (end - start) / speed) : undefined,
      estimated: true,
    };
  }
  if (modelId === "ffmpeg:keep-ranges") {
    const src = source();
    if (!src) return undefined;
    let durationSec: number | undefined;
    try {
      const ranges = mergeRanges(parseKeepRanges(String(param(node, "ffmpegRanges") ?? ""), src.durationSec ?? Number.MAX_SAFE_INTEGER));
      if (param(node, "ffmpegRangeMode") !== "remove") durationSec = totalRangeSec(ranges);
      else if (src.durationSec !== undefined) durationSec = totalRangeSec(complementRanges(ranges, src.durationSec));
    } catch {
      durationSec = undefined;
    }
    return { ...src, durationSec, hasAudio: true, estimated: true };
  }
  if (modelId === "ffmpeg:audio-mux") {
    const video = source();
    const audio = source("refAudio");
    if (!video) return undefined;
    const lengths = [video.durationSec, audio?.durationSec].filter((d): d is number => d !== undefined);
    return { ...video, durationSec: lengths.length ? Math.min(...lengths) : undefined, hasAudio: true, estimated: true };
  }
  if (modelId === "ffmpeg:extract-audio") {
    const src = source();
    return src ? { durationSec: src.durationSec, hasAudio: true, estimated: true } : undefined;
  }
  if (modelId === "ffmpeg:smooth-silence") {
    const src = source();
    return src ? { ...src, durationSec: undefined, estimated: true } : undefined;
  }
  if (modelId === "ffmpeg:image-to-video") {
    return { durationSec: Math.min(30, Math.max(1, numParam(node, "ffmpegDurationSec", 3))), hasAudio: true, estimated: true };
  }
  if (modelId === "ffmpeg:concat") {
    const clips = wiredEdges(g, node.id, "videos").map((e) => expectedNodeMedia(g, e.source, new Set(seen), e.sourceHandle));
    if (clips.length === 0) return undefined;
    const known = clips.every((c) => c?.durationSec !== undefined);
    const transition = String(param(node, "ffmpegTransition") ?? "pad-200ms");
    const joins = clips.length - 1;
    const total = known ? clips.reduce((sum, c) => sum + c!.durationSec!, 0) : undefined;
    const fadeSec = Math.min(1.5, Math.max(0.2, numParam(node, "ffmpegTransitionSec", 0.35)));
    // Each crossfade overlaps the two clips, capped at half of the shorter one.
    const overlap = known
      ? clips.slice(1).reduce((sum, c, i) => sum + Math.min(fadeSec, clips[i]!.durationSec! / 2, c!.durationSec! / 2), 0)
      : 0;
    const adjust = transition === "pad-200ms" ? 0.2 * joins : transition === "cut" ? 0 : -overlap;
    const first = clips[0];
    const aspect = String(param(node, "ffmpegAspect") ?? "source");
    return {
      durationSec: total !== undefined ? Math.max(0, total + adjust) : undefined,
      hasAudio: true,
      ...(aspect === "source" && first?.width && first.height ? { width: first.width, height: first.height } : {}),
      estimated: true,
    };
  }
  if (modelId === "ffmpeg:split") {
    const src = source();
    if (!src) return undefined;
    const at = Math.max(0, numParam(node, "ffmpegAtSec", 0));
    const durationSec =
      src.durationSec === undefined ? (handle === SPLIT_SECOND_HANDLE ? undefined : at) : handle === SPLIT_SECOND_HANDLE ? Math.max(0, src.durationSec - at) : Math.min(at, src.durationSec);
    return { ...src, durationSec, estimated: true };
  }
  if (modelId === "ffmpeg:freeze") {
    const src = source();
    if (!src) return undefined;
    const hold = Math.min(10, Math.max(0.2, numParam(node, "ffmpegDurationSec", 1)));
    return { ...src, durationSec: src.durationSec !== undefined ? src.durationSec + hold : undefined, hasAudio: true, estimated: true };
  }
  if (modelId === "ffmpeg:audio-mix") {
    const video = source();
    return video ? { ...video, hasAudio: true, estimated: true } : undefined;
  }
  if (modelId === "ffmpeg:audio-trim") {
    const src = source("refAudio");
    if (!src) return undefined;
    const start = Math.max(0, numParam(node, "ffmpegStartSec", 0));
    const endRaw = numParam(node, "ffmpegEndSec", 0);
    const end = src.durationSec !== undefined ? (endRaw > start ? Math.min(endRaw, src.durationSec) : src.durationSec) : endRaw > start ? endRaw : undefined;
    return { durationSec: end !== undefined ? Math.max(0, end - start) : undefined, hasAudio: true, estimated: true };
  }
  if (modelId === "ffmpeg:audio-concat") {
    const parts = wiredEdges(g, node.id, "audios").map((e) => expectedNodeMedia(g, e.source, new Set(seen), e.sourceHandle));
    if (parts.length === 0) return undefined;
    const gap = Math.max(0, numParam(node, "ffmpegGapSec", 0));
    const known = parts.every((p) => p?.durationSec !== undefined);
    return {
      durationSec: known ? parts.reduce((sum, p) => sum + p!.durationSec!, 0) + gap * (parts.length - 1) : undefined,
      hasAudio: true,
      estimated: true,
    };
  }
  if (modelId === "ffmpeg:export") {
    const src = source();
    if (!src) return undefined;
    const format = param(node, "ffmpegFormat");
    return { ...src, ...scaledSize(src, param(node, "ffmpegResolution")), ...(format === "gif" ? { hasAudio: false } : {}), estimated: true };
  }
  return undefined;
}

// `handle` picks an extra output (Split's part B); probed meta only describes the main output.
export function expectedNodeMedia(
  g: Graph,
  nodeId: string,
  seen: Set<string> = new Set(),
  handle?: string | null,
): ExpectedMedia | undefined {
  if (seen.has(nodeId)) return undefined;
  seen.add(nodeId);
  const node = g.nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;
  const meta = currentMediaMeta(node);
  const extra = Boolean(handle && handle !== "output");
  if (meta && !extra && !isOutputStale(node.data)) {
    return {
      durationSec: meta.durationSec,
      hasAudio: meta.hasAudio,
      width: meta.width,
      height: meta.height,
      estimated: false,
    };
  }
  if (node.type !== "model") return meta ? { ...meta, estimated: false } : undefined;
  if (node.data.modelId?.startsWith("ffmpeg:") || SMART_EDIT_MODELS.has(node.data.modelId ?? "")) {
    return estimateEdit(g, node, seen, handle);
  }
  // An AI video that has not run yet: its length setting.
  return node.data.durationSeconds ? { durationSec: node.data.durationSeconds, estimated: true } : undefined;
}

// Expected media of the first source wired into one port, read through its output handle.
export function wiredSourceMedia(g: Graph, nodeId: string, port: string): { id?: string; media?: ExpectedMedia } {
  const edge = wiredEdges(g, nodeId, port)[0];
  return edge ? { id: edge.source, media: expectedNodeMedia(g, edge.source, new Set(), edge.sourceHandle) } : {};
}

// Known or estimated length of every source wired into a sequence, by edge id.
export function sequenceSourceDurations(
  g: Graph,
  nodeId: string,
  seen: Set<string> = new Set([nodeId]),
): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  for (const edge of g.edges) {
    if (edge.target !== nodeId) continue;
    out[edge.id] = expectedNodeMedia(g, edge.source, new Set(seen), edge.sourceHandle)?.durationSec;
  }
  return out;
}
