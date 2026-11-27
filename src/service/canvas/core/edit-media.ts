// Pure: the length, sound, and size a node's output has or will have. A probed current file
// wins; otherwise FFmpeg edit nodes are estimated from their wired source and toolParams.

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { mergeRanges, parseKeepRanges, totalRangeSec } from "@/service/canvas/core/edit-ranges";
import { currentMediaMeta } from "@/service/canvas/core/media-meta";
import { isOutputStale } from "@/service/canvas/core/stale-outputs";

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
]);

function estimateEdit(g: Graph, node: CanvasNode, seen: Set<string>): ExpectedMedia | undefined {
  const modelId = node.data.modelId ?? "";
  const source = (port = "video") => {
    const id = wiredSources(g, node.id, port)[0];
    return id ? expectedNodeMedia(g, id, seen) : undefined;
  };

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
  if (modelId === "ffmpeg:trim-speed") {
    const src = source();
    if (!src) return undefined;
    const speed = Math.min(2, Math.max(0.5, numParam(node, "ffmpegSpeed", 1)));
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
      const ranges = parseKeepRanges(String(param(node, "ffmpegRanges") ?? ""), src.durationSec ?? Number.MAX_SAFE_INTEGER);
      durationSec = totalRangeSec(mergeRanges(ranges));
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
    const clips = wiredSources(g, node.id, "videos").map((id) => expectedNodeMedia(g, id, seen));
    if (clips.length === 0) return undefined;
    const known = clips.every((c) => c?.durationSec !== undefined);
    const transition = String(param(node, "ffmpegTransition") ?? "pad-200ms");
    const joins = clips.length - 1;
    const total = known ? clips.reduce((sum, c) => sum + c!.durationSec!, 0) : undefined;
    const adjust = transition === "pad-200ms" ? 0.2 * joins : transition === "fade" ? -0.35 * joins : 0;
    const first = clips[0];
    return {
      durationSec: total !== undefined ? Math.max(0, total + adjust) : undefined,
      hasAudio: true,
      ...(first?.width && first.height ? { width: first.width, height: first.height } : {}),
      estimated: true,
    };
  }
  return undefined;
}

export function expectedNodeMedia(g: Graph, nodeId: string, seen: Set<string> = new Set()): ExpectedMedia | undefined {
  if (seen.has(nodeId)) return undefined;
  seen.add(nodeId);
  const node = g.nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;
  const meta = currentMediaMeta(node);
  if (meta && !isOutputStale(node.data)) {
    return {
      durationSec: meta.durationSec,
      hasAudio: meta.hasAudio,
      width: meta.width,
      height: meta.height,
      estimated: false,
    };
  }
  if (node.type !== "model") return meta ? { ...meta, estimated: false } : undefined;
  if (node.data.modelId?.startsWith("ffmpeg:")) return estimateEdit(g, node, seen);
  // An AI video that has not run yet: its length setting.
  return node.data.durationSeconds ? { durationSec: node.data.durationSeconds, estimated: true } : undefined;
}
