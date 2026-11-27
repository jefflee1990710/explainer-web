// Pure: low-resolution preview copies ("proxies") of long or very large canvas videos.
// Previews and the Sequence timeline play the proxy; renders and downloads keep the original.

import type { CanvasMediaMeta, CanvasNode } from "@/model/canvas";
import { currentMediaMeta, nodeMediaUrl } from "@/service/canvas/core/media-meta";

// Proxy short side, in pixels.
export const PROXY_SHORT_SIDE = 540;
// Videos at least this long get a proxy at any size.
export const PROXY_MIN_SEC = 60;
// Very large frames (1440p and up) get one from this length.
export const PROXY_LARGE_MIN_SEC = 15;
const LARGE_SHORT_SIDE = 1440;

export function wantsProxy(meta: CanvasMediaMeta | undefined): boolean {
  if (!meta || meta.proxyUrl || !meta.width || !meta.height || !meta.durationSec) return false;
  const shortSide = Math.min(meta.width, meta.height);
  if (shortSide <= PROXY_SHORT_SIDE) return false;
  return meta.durationSec >= PROXY_MIN_SEC || (shortSide >= LARGE_SHORT_SIDE && meta.durationSec >= PROXY_LARGE_MIN_SEC);
}

function isVideoNode(node: Pick<CanvasNode, "type" | "data">): boolean {
  const kind = node.type === "media" ? node.data.mediaKind : node.data.outputKind;
  return kind === "video" && (node.type === "media" || node.type === "model");
}

// Video nodes whose current file should get a proxy and has none yet.
export function nodesWantingProxy<N extends Pick<CanvasNode, "id" | "type" | "data">>(nodes: readonly N[]): N[] {
  return nodes.filter((node) => isVideoNode(node) && wantsProxy(currentMediaMeta(node)));
}

// What a preview should play: the proxy of the node's current file, else the file itself.
export function previewMediaUrl(node: Pick<CanvasNode, "type" | "data">): string | undefined {
  return currentMediaMeta(node)?.proxyUrl ?? nodeMediaUrl(node);
}

// Copies a proxy onto nodes whose metadata still describes the same file.
export function applyProxyUrls<N extends Pick<CanvasNode, "id" | "type" | "data">>(
  nodes: readonly N[],
  proxies: readonly { nodeId: string; url: string; proxyUrl: string }[],
): { nodes: N[]; changed: boolean } {
  let changed = false;
  const next = nodes.map((node) => {
    const hit = proxies.find((p) => p.nodeId === node.id);
    const meta = currentMediaMeta(node);
    if (!hit || !meta || meta.url !== hit.url || meta.proxyUrl === hit.proxyUrl) return node;
    changed = true;
    return { ...node, data: { ...node.data, outputMeta: { ...meta, proxyUrl: hit.proxyUrl } } };
  });
  return { nodes: next, changed };
}

// FFmpeg arguments: scale the short side to 540, fast H.264, small AAC, streamable.
export function proxyFfmpegArgs(input: string, output: string, meta: Pick<CanvasMediaMeta, "width" | "height">): string[] {
  const portrait = (meta.height ?? 0) > (meta.width ?? 0);
  const scale = portrait ? `scale=${PROXY_SHORT_SIDE}:-2` : `scale=-2:${PROXY_SHORT_SIDE}`;
  return [
    "-y",
    "-protocol_whitelist",
    "file,http,https,tcp,tls",
    "-i",
    input,
    "-vf",
    scale,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    output,
  ];
}
