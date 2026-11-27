import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeCanvasProxyTask } from "@/service/canvas/execution/media-proxy";

const canvasId = "64b7f0c2a1b2c3d4e5f60718";
const task = (url: string) => ({
  targetId: canvasId,
  payload: { clerkUserId: "u1", nodeId: "n1", url, width: 1920, height: 1080 },
});

describe("canvas proxy task", () => {
  it("renders, stores, and saves the proxy for the node", async () => {
    const saved: string[] = [];
    const res = await executeCanvasProxyTask(task("https://x.public.blob.vercel-storage.com/a.mp4"), {
      render: async () => Buffer.from("mp4"),
      persist: async (_buf, pathname) => {
        assert.match(pathname, /^canvas\/u1\/proxy\/[0-9a-f]{16}-540p\.mp4$/);
        return "https://x.public.blob.vercel-storage.com/proxy.mp4";
      },
      saveProxyUrl: async (payload, proxyUrl) => {
        saved.push(`${payload.nodeId}:${proxyUrl}`);
      },
    });
    assert.deepEqual(res, { outcome: "completed", outputUrl: "https://x.public.blob.vercel-storage.com/proxy.mp4" });
    assert.deepEqual(saved, ["n1:https://x.public.blob.vercel-storage.com/proxy.mp4"]);
  });

  it("refuses URLs outside canvas storage without rendering", async () => {
    let rendered = false;
    const res = await executeCanvasProxyTask(task("http://169.254.169.254/latest"), {
      render: async () => {
        rendered = true;
        return Buffer.alloc(0);
      },
    });
    assert.equal(res.outcome, "failed");
    assert.equal(rendered, false);
  });

  it("fails on an incomplete payload or a render error", async () => {
    assert.equal((await executeCanvasProxyTask({ targetId: "bad", payload: {} })).outcome, "failed");
    const res = await executeCanvasProxyTask(task("https://x.public.blob.vercel-storage.com/a.mp4"), {
      render: async () => {
        throw new Error("ffmpeg timed out");
      },
    });
    assert.deepEqual(res, { outcome: "failed", error: "ffmpeg timed out" });
  });
});
