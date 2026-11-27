// Worker task `canvas_proxy`: renders a 540p preview copy of one canvas video and stores its URL
// as `outputMeta.proxyUrl` on the node that still shows that file. Free, CPU lane.

import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ObjectId } from "mongodb";
import { canvasProjectsCollection } from "@/dao";
import type { CanvasMediaMeta } from "@/model/canvas";
import type { WorkerTask } from "@/model/worker-task";
import { proxyFfmpegArgs } from "@/service/canvas/core/media-proxy";
import { isAllowedCanvasMediaUrl } from "@/service/canvas/execution/media-url-guard";
import { persistBuffer } from "@/service/higgsfield/persist";
import { runFfmpeg } from "@/service/reel/concat";

// A 10-minute source at veryfast finishes well inside this on the worker CPU.
const PROXY_TIMEOUT_MS = 8 * 60_000;

export type CanvasProxyPayload = {
  clerkUserId: string;
  canvasId: string;
  nodeId: string;
  url: string;
  width: number;
  height: number;
};

export type CanvasProxyDeps = {
  render: (url: string, meta: Pick<CanvasMediaMeta, "width" | "height">) => Promise<Buffer>;
  persist: (buffer: Buffer, pathname: string) => Promise<string>;
  saveProxyUrl: (payload: CanvasProxyPayload, proxyUrl: string) => Promise<void>;
};

const defaultDeps: CanvasProxyDeps = {
  render: async (url, meta) => {
    const dir = await mkdtemp(join(tmpdir(), "canvas-proxy-"));
    try {
      await runFfmpeg(dir, proxyFfmpegArgs(url, "proxy.mp4", meta), PROXY_TIMEOUT_MS);
      return await readFile(join(dir, "proxy.mp4"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
  persist: (buffer, pathname) => persistBuffer(buffer, pathname, "video/mp4"),
  saveProxyUrl: (payload, proxyUrl) => saveCanvasProxyUrl(payload, proxyUrl),
};

// Only while the node still shows the same file.
export async function saveCanvasProxyUrl(
  target: Pick<CanvasProxyPayload, "canvasId" | "clerkUserId" | "nodeId" | "url">,
  proxyUrl: string,
): Promise<void> {
  const projects = await canvasProjectsCollection();
  await projects.updateOne(
    {
      _id: new ObjectId(target.canvasId),
      clerkUserId: target.clerkUserId,
      nodes: { $elemMatch: { id: target.nodeId, "data.outputMeta.url": target.url } },
    },
    { $set: { "nodes.$.data.outputMeta.proxyUrl": proxyUrl } },
  );
}

export function readCanvasProxyPayload(task: Pick<WorkerTask, "payload" | "targetId">): CanvasProxyPayload | null {
  const p = task.payload ?? {};
  const payload = {
    clerkUserId: String(p.clerkUserId ?? ""),
    canvasId: task.targetId,
    nodeId: String(p.nodeId ?? ""),
    url: String(p.url ?? ""),
    width: Number(p.width),
    height: Number(p.height),
  };
  const valid =
    payload.clerkUserId &&
    payload.nodeId &&
    ObjectId.isValid(payload.canvasId) &&
    Number.isFinite(payload.width) &&
    Number.isFinite(payload.height);
  return valid ? payload : null;
}

export async function executeCanvasProxyTask(
  task: Pick<WorkerTask, "payload" | "targetId">,
  deps: Partial<CanvasProxyDeps> = {},
): Promise<{ outcome: "completed"; outputUrl: string } | { outcome: "failed"; error: string }> {
  const resolved = { ...defaultDeps, ...deps };
  const payload = readCanvasProxyPayload(task);
  if (!payload) return { outcome: "failed", error: "預覽檔任務資料不完整" };
  // SSRF guard: only canvas storage is fetched.
  if (!isAllowedCanvasMediaUrl(payload.url)) return { outcome: "failed", error: "影片網址不在允許的來源內" };
  try {
    const buffer = await resolved.render(payload.url, payload);
    const hash = createHash("sha1").update(payload.url).digest("hex").slice(0, 16);
    const proxyUrl = await resolved.persist(buffer, `canvas/${payload.clerkUserId}/proxy/${hash}-540p.mp4`);
    await resolved.saveProxyUrl(payload, proxyUrl);
    return { outcome: "completed", outputUrl: proxyUrl };
  } catch (error) {
    return { outcome: "failed", error: error instanceof Error ? error.message : "預覽檔轉換失敗" };
  }
}
