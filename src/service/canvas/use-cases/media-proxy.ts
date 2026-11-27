// Asks the worker for 540p proxies of a canvas's long or very large videos and reports the
// proxies already made. Called by the canvas page; free, nothing is billed.

import { ObjectId } from "mongodb";
import { canvasProjectsCollection, workerTasksCollection } from "@/dao";
import type { CanvasNode } from "@/model/canvas";
import { currentMediaMeta } from "@/service/canvas/core/media-meta";
import { nodesWantingProxy } from "@/service/canvas/core/media-proxy";
import { saveCanvasProxyUrl } from "@/service/canvas/execution/media-proxy";
import { isAllowedCanvasMediaUrl } from "@/service/canvas/execution/media-url-guard";
import { fillMissingMediaMeta } from "@/service/canvas/use-cases/media-meta";
import { enqueueWorkerTask } from "@/service/worker/task-queue";

const MAX_PROXIES_PER_CALL = 4;

export type CanvasProxyState = {
  proxies: { nodeId: string; url: string; proxyUrl: string }[];
  // Proxies still being rendered.
  pending: number;
};

export type CanvasProxyDeps = {
  loadNodes: (clerkUserId: string, canvasId: string) => Promise<CanvasNode[] | null>;
  fillMeta: (clerkUserId: string, canvasId: string, nodes: CanvasNode[]) => Promise<CanvasNode[]>;
  // "failed" when this file's proxy already failed once; a URL when another node's render made it.
  enqueue: (input: ProxyRequest) => Promise<"queued" | "failed" | { proxyUrl: string }>;
};

type ProxyRequest = { canvasId: string; clerkUserId: string; node: CanvasNode; url: string; width: number; height: number };

const defaultDeps: CanvasProxyDeps = {
  loadNodes: async (clerkUserId, canvasId) => {
    const projects = await canvasProjectsCollection();
    const project = await projects.findOne({ _id: new ObjectId(canvasId), clerkUserId }, { projection: { nodes: 1 } });
    return project?.nodes ?? null;
  },
  fillMeta: fillMissingMediaMeta,
  enqueue: async ({ canvasId, clerkUserId, node, url, width, height }) => {
    // One render per file, even when several nodes or tabs ask.
    const dedupeKey = `canvas_proxy:${url}`;
    const tasks = await workerTasksCollection();
    const prior = await tasks.findOne(
      { dedupeKey, status: { $in: ["completed", "failed"] } },
      { sort: { updatedAt: -1 } },
    );
    if (prior?.status === "failed") return "failed";
    if (prior?.status === "completed" && prior.outputUrl) {
      await saveCanvasProxyUrl({ canvasId, clerkUserId, nodeId: node.id, url }, prior.outputUrl);
      return { proxyUrl: prior.outputUrl };
    }
    await enqueueWorkerTask({
      kind: "canvas_proxy",
      targetId: canvasId,
      lane: "cpu",
      dedupeKey,
      payload: { clerkUserId, nodeId: node.id, url, width, height },
    });
    return "queued";
  },
};

export async function requestCanvasProxies(
  clerkUserId: string,
  canvasId: string,
  deps: Partial<CanvasProxyDeps> = {},
): Promise<CanvasProxyState> {
  const resolved = { ...defaultDeps, ...deps };
  if (!ObjectId.isValid(canvasId)) return { proxies: [], pending: 0 };
  const stored = await resolved.loadNodes(clerkUserId, canvasId);
  if (!stored) return { proxies: [], pending: 0 };
  const nodes = await resolved.fillMeta(clerkUserId, canvasId, stored);

  const proxies = nodes.flatMap((node) => {
    const meta = currentMediaMeta(node);
    return meta?.proxyUrl ? [{ nodeId: node.id, url: meta.url, proxyUrl: meta.proxyUrl }] : [];
  });
  const wanted = nodesWantingProxy(nodes).filter((node) => isAllowedCanvasMediaUrl(currentMediaMeta(node)!.url));
  let pending = 0;
  for (const node of wanted.slice(0, MAX_PROXIES_PER_CALL)) {
    const meta = currentMediaMeta(node)!;
    const res = await resolved.enqueue({ canvasId, clerkUserId, node, url: meta.url, width: meta.width!, height: meta.height! });
    if (res === "queued") pending += 1;
    else if (res !== "failed") proxies.push({ nodeId: node.id, url: meta.url, proxyUrl: res.proxyUrl });
  }
  // Videos past this call's cap are asked for on the next poll.
  pending += Math.max(0, wanted.length - MAX_PROXIES_PER_CALL);
  return { proxies, pending };
}
