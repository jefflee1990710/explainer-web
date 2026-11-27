import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { carryMediaMeta } from "@/service/canvas/core/media-meta";
import {
  applyProxyUrls,
  nodesWantingProxy,
  previewMediaUrl,
  proxyFfmpegArgs,
  wantsProxy,
} from "@/service/canvas/core/media-proxy";

const url = "https://x.public.blob.vercel-storage.com/a.mp4";
const video = (id: string, meta: Record<string, unknown>): CanvasNode => ({
  id,
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId: "ffmpeg:concat", outputKind: "video", outputUrl: url, outputMeta: { url, ...meta } },
});

describe("media proxy", () => {
  it("wants a proxy for long or very large videos only", () => {
    assert.equal(wantsProxy({ url, width: 1080, height: 1920, durationSec: 90 }), true);
    assert.equal(wantsProxy({ url, width: 1080, height: 1920, durationSec: 20 }), false);
    assert.equal(wantsProxy({ url, width: 2160, height: 3840, durationSec: 20 }), true);
    assert.equal(wantsProxy({ url, width: 540, height: 960, durationSec: 300 }), false);
    assert.equal(wantsProxy({ url, width: 1080, height: 1920, durationSec: 90, proxyUrl: "https://p.mp4" }), false);
    assert.equal(wantsProxy({ url, durationSec: 90 }), false);
  });

  it("lists only video nodes whose current file wants one", () => {
    const stale = video("old", { width: 1920, height: 1080, durationSec: 90 });
    stale.data.outputUrl = "https://x.public.blob.vercel-storage.com/new.mp4";
    const audio = video("aud", { durationSec: 300 });
    audio.data.outputKind = "audio";
    const ids = nodesWantingProxy([video("long", { width: 1920, height: 1080, durationSec: 90 }), stale, audio]).map((n) => n.id);
    assert.deepEqual(ids, ["long"]);
  });

  it("previews the proxy and applies it only to the same file", () => {
    const node = video("v", { width: 1920, height: 1080, durationSec: 90 });
    assert.equal(previewMediaUrl(node), url);
    const { nodes, changed } = applyProxyUrls([node], [{ nodeId: "v", url, proxyUrl: "https://p.mp4" }]);
    assert.equal(changed, true);
    assert.equal(previewMediaUrl(nodes[0]!), "https://p.mp4");
    assert.equal(applyProxyUrls([node], [{ nodeId: "v", url: "https://other.mp4", proxyUrl: "https://p.mp4" }]).changed, false);
  });

  it("keeps a stored proxy when a tab saves the same file without it", () => {
    const prev = video("v", { width: 1920, height: 1080, durationSec: 90, proxyUrl: "https://p.mp4" }).data;
    const next = video("v", { width: 1920, height: 1080, durationSec: 90 }).data;
    assert.equal(carryMediaMeta(prev, next, "model").outputMeta?.proxyUrl, "https://p.mp4");
    const replaced = { ...next, outputUrl: "https://n.mp4", outputMeta: { url: "https://n.mp4" } };
    assert.equal(carryMediaMeta(prev, replaced, "model").outputMeta?.proxyUrl, undefined);
  });

  it("scales the short side to 540 and limits input protocols", () => {
    const portrait = proxyFfmpegArgs("https://in.mp4", "out.mp4", { width: 1080, height: 1920 });
    assert.ok(portrait.includes("scale=540:-2"));
    assert.ok(proxyFfmpegArgs("https://in.mp4", "out.mp4", { width: 1920, height: 1080 }).includes("scale=-2:540"));
    assert.equal(portrait[portrait.indexOf("-protocol_whitelist") + 1], "file,http,https,tcp,tls");
  });
});
