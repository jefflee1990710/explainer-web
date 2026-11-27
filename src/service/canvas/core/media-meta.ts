// Pure: reads `ffmpeg -i` probe output and keeps each node's media metadata tied to its file.

import type { CanvasMediaMeta, CanvasNode, CanvasNodeData } from "@/model/canvas";

export type MediaProbe = {
  hasAudio: boolean;
  hasVideo: boolean;
  // Undefined when ffmpeg printed no usable Duration line.
  durationSec?: number;
  width?: number;
  height?: number;
};

export function parseMediaProbe(stderr: string): MediaProbe {
  const hasAudio = /Stream\s+#\d+:\d+.*Audio:/i.test(stderr);
  const videoLine = stderr.match(/Stream\s+#\d+:\d+.*Video:.*$/im)?.[0] ?? "";
  // Cover art in an mp3 shows as a Video stream with attached_pic; it is not a picture track.
  const hasVideo = Boolean(videoLine) && !/attached pic/i.test(videoLine);
  const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  let durationSec: number | undefined;
  if (durMatch) {
    const value = Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3]);
    if (Number.isFinite(value) && value > 0) durationSec = Math.round(value * 1000) / 1000;
  }
  const dimMatch = videoLine.match(/,\s*(\d{2,5})x(\d{2,5})\b/);
  return {
    hasAudio,
    hasVideo,
    ...(durationSec !== undefined ? { durationSec } : {}),
    ...(dimMatch ? { width: Number(dimMatch[1]), height: Number(dimMatch[2]) } : {}),
  };
}

// False when ffmpeg could not read the file at all.
export function isUsableProbe(probe: MediaProbe): boolean {
  return probe.durationSec !== undefined || probe.hasAudio || probe.hasVideo;
}

export function mediaMetaFromProbe(url: string, probe: MediaProbe): CanvasMediaMeta {
  return {
    url,
    hasAudio: probe.hasAudio,
    ...(probe.durationSec !== undefined ? { durationSec: probe.durationSec } : {}),
    ...(probe.hasVideo && probe.width && probe.height ? { width: probe.width, height: probe.height } : {}),
  };
}

// The file a node currently shows: a model or character output, or a media node's file.
export function nodeMediaUrl(node: Pick<CanvasNode, "type" | "data">): string | undefined {
  const url = node.type === "media" ? node.data.mediaUrl : node.data.outputUrl;
  return url?.trim() || undefined;
}

// Metadata only when it describes the node's current file.
export function currentMediaMeta(node: Pick<CanvasNode, "type" | "data">): CanvasMediaMeta | undefined {
  const url = nodeMediaUrl(node);
  const meta = node.data.outputMeta;
  return url && meta?.url === url ? meta : undefined;
}

// A save from a tab that never saw the probe keeps the stored metadata for the same file.
export function carryMediaMeta(
  previous: CanvasNodeData,
  next: CanvasNodeData,
  type: CanvasNode["type"],
): CanvasNodeData {
  const nextMeta = currentMediaMeta({ type, data: next });
  if (nextMeta) {
    // A tab that has not seen the proxy yet keeps the stored one for the same file.
    const proxyUrl = previous.outputMeta?.url === nextMeta.url ? previous.outputMeta.proxyUrl : undefined;
    return proxyUrl && !nextMeta.proxyUrl ? { ...next, outputMeta: { ...nextMeta, proxyUrl } } : next;
  }
  if (!previous.outputMeta) return next;
  const url = nodeMediaUrl({ type, data: next });
  return url && previous.outputMeta.url === url ? { ...next, outputMeta: previous.outputMeta } : next;
}

// Video and audio files whose metadata is missing or describes an older file.
export function nodesMissingMediaMeta<N extends Pick<CanvasNode, "id" | "type" | "data">>(nodes: readonly N[]): N[] {
  return nodes.filter((node) => {
    if (node.type !== "media" && node.type !== "model") return false;
    const kind = node.type === "media" ? node.data.mediaKind : node.data.outputKind;
    if (kind !== "video" && kind !== "audio") return false;
    return Boolean(nodeMediaUrl(node)) && !currentMediaMeta(node);
  });
}
