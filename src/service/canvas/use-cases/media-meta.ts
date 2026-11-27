// Fills `outputMeta` (length, sound, size) for canvas video and audio files that have none,
// so the assistant can read durations before it trims or fades. Probes read headers only.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ObjectId } from "mongodb";
import { canvasProjectsCollection } from "@/dao";
import type { CanvasMediaMeta, CanvasNode } from "@/model/canvas";
import {
  isUsableProbe,
  mediaMetaFromProbe,
  nodeMediaUrl,
  nodesMissingMediaMeta,
  parseMediaProbe,
} from "@/service/canvas/core/media-meta";
import { isAllowedCanvasMediaUrl } from "@/service/canvas/execution/media-url-guard";
import { ffmpegStderr } from "@/service/reel/concat";

const MAX_PROBES_PER_CALL = 12;
const PROBE_TIMEOUT_MS = 20_000;

export type MediaMetaDeps = {
  probeUrl: (url: string) => Promise<string>;
  saveMeta: (canvasId: ObjectId, clerkUserId: string, node: CanvasNode, meta: CanvasMediaMeta) => Promise<void>;
};

const defaultDeps: MediaMetaDeps = {
  probeUrl: (url) => ffmpegStderr(process.cwd(), ["-i", url], PROBE_TIMEOUT_MS),
  saveMeta: async (canvasId, clerkUserId, node, meta) => {
    const projects = await canvasProjectsCollection();
    const urlField = node.type === "media" ? "data.mediaUrl" : "data.outputUrl";
    // Only when the node still shows the probed file.
    await projects.updateOne(
      { _id: canvasId, clerkUserId, nodes: { $elemMatch: { id: node.id, [urlField]: meta.url } } },
      { $set: { "nodes.$.data.outputMeta": meta } },
    );
  },
};

// Probes a local file (an upload before it is stored).
export async function probeMediaBuffer(buffer: Buffer, ext: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "canvas-probe-"));
  try {
    await writeFile(join(dir, `in.${ext}`), buffer);
    return await ffmpegStderr(dir, ["-i", `in.${ext}`], PROBE_TIMEOUT_MS);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Returns the nodes with metadata added where a probe worked. Failures are skipped.
export async function fillMissingMediaMeta(
  clerkUserId: string,
  canvasId: string,
  nodes: CanvasNode[],
  deps: Partial<MediaMetaDeps> = {},
): Promise<CanvasNode[]> {
  const resolved = { ...defaultDeps, ...deps };
  if (!ObjectId.isValid(canvasId)) return nodes;
  const targets = nodesMissingMediaMeta(nodes)
    .filter((node) => isAllowedCanvasMediaUrl(nodeMediaUrl(node)!))
    .slice(0, MAX_PROBES_PER_CALL);
  if (targets.length === 0) return nodes;
  const objectId = new ObjectId(canvasId);
  const found = new Map<string, CanvasMediaMeta>();
  await Promise.all(
    targets.map(async (node) => {
      const url = nodeMediaUrl(node)!;
      const stderr = await resolved.probeUrl(url).catch(() => "");
      const probe = parseMediaProbe(stderr);
      if (!isUsableProbe(probe)) return;
      const meta = mediaMetaFromProbe(url, probe);
      found.set(node.id, meta);
      await resolved.saveMeta(objectId, clerkUserId, node, meta).catch(() => undefined);
    }),
  );
  return nodes.map((node) => {
    const meta = found.get(node.id);
    return meta ? { ...node, data: { ...node.data, outputMeta: meta } } : node;
  });
}
