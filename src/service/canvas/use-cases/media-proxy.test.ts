import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { requestCanvasProxies } from "@/service/canvas/use-cases/media-proxy";

const canvasId = "64b7f0c2a1b2c3d4e5f60718";
const blob = (name: string) => `https://x.public.blob.vercel-storage.com/${name}.mp4`;
const video = (id: string, meta: Record<string, unknown>): CanvasNode => ({
  id,
  type: "media",
  position: { x: 0, y: 0 },
  data: { mediaKind: "video", mediaUrl: blob(id), outputMeta: { url: blob(id), ...meta } },
});

describe("requestCanvasProxies", () => {
  it("returns made proxies, queues wanted ones, and skips failed or short files", async () => {
    const nodes = [
      video("done", { width: 1920, height: 1080, durationSec: 90, proxyUrl: blob("done-proxy") }),
      video("long", { width: 1920, height: 1080, durationSec: 90 }),
      video("broken", { width: 1920, height: 1080, durationSec: 90 }),
      video("shared", { width: 1920, height: 1080, durationSec: 90 }),
      video("short", { width: 1920, height: 1080, durationSec: 8 }),
    ];
    const asked: string[] = [];
    const state = await requestCanvasProxies("u1", canvasId, {
      loadNodes: async () => nodes,
      fillMeta: async (_u, _c, n) => n,
      enqueue: async ({ node }) => {
        asked.push(node.id);
        if (node.id === "broken") return "failed";
        if (node.id === "shared") return { proxyUrl: blob("shared-proxy") };
        return "queued";
      },
    });
    assert.deepEqual(asked, ["long", "broken", "shared"]);
    assert.equal(state.pending, 1);
    assert.deepEqual(
      state.proxies.map((p) => `${p.nodeId}:${p.proxyUrl}`),
      [`done:${blob("done-proxy")}`, `shared:${blob("shared-proxy")}`],
    );
  });

  it("returns nothing for an unknown canvas", async () => {
    assert.deepEqual(await requestCanvasProxies("u1", "bad"), { proxies: [], pending: 0 });
    assert.deepEqual(
      await requestCanvasProxies("u1", canvasId, { loadNodes: async () => null }),
      { proxies: [], pending: 0 },
    );
  });
});
