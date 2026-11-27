import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasMediaMeta, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { expectedNodeMedia } from "@/service/canvas/core/edit-media";
import { EDIT_TOOL_HANDLERS as E } from "@/service/canvas-agent/edit-tools";
import { findCanvasAgentGaps } from "@/service/canvas-agent/gaps";
import { CANVAS_AGENT_TOOL_HANDLERS as H } from "@/service/canvas-agent/tools";
import { createWorkingGraph } from "@/service/canvas-agent/working-graph";
import { applyCanvasAgentOps } from "@/service/canvas-agent/apply-ops";

function media(id: string, kind: "video" | "audio", meta: Omit<CanvasMediaMeta, "url">): CanvasNode {
  const url = `https://x.public.blob.vercel-storage.com/${id}.${kind === "video" ? "mp4" : "mp3"}`;
  return {
    id,
    type: "media",
    position: { x: 0, y: 0 },
    data: { label: id, fileName: id, mediaKind: kind, mediaUrl: url, outputMeta: { url, ...meta } },
  };
}

// Three clips joined by a concat, like an expanded explainer.
function joined() {
  let i = 0;
  const g = createWorkingGraph({
    nodes: [
      media("c1", "video", { durationSec: 6, hasAudio: true, width: 720, height: 1280 }),
      media("c2", "video", { durationSec: 8, hasAudio: true, width: 720, height: 1280 }),
      media("c3", "video", { durationSec: 4, hasAudio: true, width: 720, height: 1280 }),
      media("song", "audio", { durationSec: 30, hasAudio: true }),
    ],
    edges: [],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    nextId: () => `n${++i}`,
  });
  const res = H.add_model_node(g, {
    modelId: "ffmpeg:concat",
    wires: ["c1", "c2", "c3"].map((sourceId) => ({ sourceId, targetPort: "videos" })),
  });
  return { g, concatId: res.nodeId as string };
}

const order = (g: ReturnType<typeof joined>["g"], concatId: string) =>
  g.edges
    .filter((e) => e.target === concatId && e.targetHandle === "videos")
    .map((e) => (e.sourceHandle && e.sourceHandle !== "output" ? `${e.source}:${e.sourceHandle}` : e.source));

describe("canvas agent edit tools", () => {
  it("trim_clip edits clip 2 in place inside the concat", () => {
    const { g, concatId } = joined();
    const res = E.trim_clip(g, H, { sourceId: "c2", startSec: 1, endSec: 5 });
    const trimId = res.nodeId as string;
    assert.equal(res.error, undefined);
    assert.deepEqual(order(g, concatId), ["c1", trimId, "c3"]);
    assert.deepEqual(g.nodes.find((n) => n.id === trimId)!.data.toolParams, { ffmpegStartSec: 1, ffmpegEndSec: 5 });
    assert.equal(expectedNodeMedia(g, concatId)?.durationSec, 6 + 4 + 4 + 0.2 * 2);
  });

  it("split_clip puts both halves in the clip's slot", () => {
    const { g, concatId } = joined();
    const res = E.split_clip(g, H, { sourceId: "c2", atSec: 3 });
    const splitId = res.nodeId as string;
    assert.deepEqual(order(g, concatId), ["c1", splitId, `${splitId}:video-b`, "c3"]);
    const b = g.edges.find((e) => e.source === splitId && e.sourceHandle === "video-b")!;
    assert.equal(expectedNodeMedia(g, b.source, new Set(), b.sourceHandle)?.durationSec, 5);
    assert.equal(expectedNodeMedia(g, splitId)?.durationSec, 3);
  });

  it("replays the split's two edges on the client without dropping part B", () => {
    const { g, concatId } = joined();
    const before = { nodes: g.nodes.map((n) => ({ ...n })), edges: [...g.edges], groups: [] };
    const start = g.ops.length;
    E.split_clip(g, H, { sourceId: "c2", atSec: 3 });
    const replayed = applyCanvasAgentOps(before, g.ops.slice(start));
    const ids = replayed.graph.edges.filter((e) => e.target === concatId).map((e) => `${e.source}:${e.sourceHandle}`);
    assert.equal(ids.length, 4);
  });

  it("reorder_clips moves a clip first and keeps the rest in order", () => {
    const { g, concatId } = joined();
    const res = E.reorder_clips(g, H, { nodeId: concatId, order: ["c3"] });
    assert.equal(res.error, undefined);
    assert.deepEqual(order(g, concatId), ["c3", "c1", "c2"]);
    assert.match(String(E.reorder_clips(g, H, { nodeId: concatId, order: ["nope"] }).error), /not wired/);
  });

  it("cut_ranges in remove mode estimates the remaining length", () => {
    const { g } = joined();
    const res = E.cut_ranges(g, H, { sourceId: "c2", ranges: "2-4", mode: "remove" });
    assert.equal(expectedNodeMedia(g, res.nodeId as string)?.durationSec, 6);
  });

  it("add_bgm wires the music and keeps the chain", () => {
    const { g, concatId } = joined();
    const res = E.add_bgm(g, H, { sourceId: concatId, musicNodeId: "song", volumeDb: -20 });
    assert.equal(res.error, undefined);
    const mixId = res.nodeId as string;
    assert.ok(g.edges.some((e) => e.source === "song" && e.target === mixId && e.targetHandle === "refAudio"));
    assert.deepEqual(g.nodes.find((n) => n.id === mixId)!.data.toolParams, { ffmpegBgmVolumeDb: -20 });
    assert.match(String(E.add_bgm(g, H, { sourceId: concatId }).error), /musicNodeId/);
  });

  it("add_captions adds Auto Captions feeding a burn node and names the cost", () => {
    const { g } = joined();
    const res = E.add_captions(g, H, { sourceId: "c1", language: "yue", look: "neon" });
    assert.equal(res.error, undefined);
    const captions = g.nodes.find((n) => n.id === res.captionsNodeId)!;
    assert.equal(captions.data.toolParams?.captionLanguage, "yue");
    assert.ok(g.edges.some((e) => e.source === captions.id && e.target === res.nodeId && e.targetHandle === "prompt"));
    assert.match(String(res.note), /\$0\.20/);
  });

  it("export_video leaves downstream wires alone", () => {
    const { g, concatId } = joined();
    E.export_video(g, H, { sourceId: "c1", format: "gif" });
    assert.deepEqual(order(g, concatId), ["c1", "c2", "c3"]);
  });

  it("rejects bad values through the spec checks", () => {
    const { g } = joined();
    assert.match(String(E.insert_edit(g, H, { sourceId: "c1", modelId: "ffmpeg:adjust", toolParams: { ffmpegSaturation: 9 } }).error), /between/);
    assert.match(String(E.insert_edit(g, H, { sourceId: "c1", modelId: "openrouter:x" }).error), /not an FFmpeg/);
  });

  it("flags a split past the end and a freeze past the end", () => {
    const { g } = joined();
    E.split_clip(g, H, { sourceId: "c3", atSec: 9 });
    E.insert_edit(g, H, { sourceId: "c1", modelId: "ffmpeg:freeze", toolParams: { ffmpegAtSec: 7 } });
    const messages = findCanvasAgentGaps(g)
      .filter((gap) => gap.reason === "edit")
      .map((gap) => gap.message);
    assert.ok(messages.some((m) => /splits at 9s/.test(m ?? "")));
    assert.ok(messages.some((m) => /freezes at 7s/.test(m ?? "")));
  });
});
