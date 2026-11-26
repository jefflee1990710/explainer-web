import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasMediaMeta, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { readSequence } from "@/service/canvas/core/sequence";
import { SEQUENCE_TOOL_HANDLERS as S } from "@/service/canvas-agent/sequence-tools";
import { smartEditToolHandlers } from "@/service/canvas-agent/smart-edit-tools";
import type { SmartAudioFinder } from "@/service/canvas-agent/smart-audio";
import { CANVAS_AGENT_TOOL_HANDLERS as H } from "@/service/canvas-agent/tools";
import { createWorkingGraph } from "@/service/canvas-agent/working-graph";

function media(id: string, kind: "video" | "audio", meta: Omit<CanvasMediaMeta, "url">): CanvasNode {
  const url = `https://x.public.blob.vercel-storage.com/${id}.${kind === "video" ? "mp4" : "mp3"}`;
  return {
    id,
    type: "media",
    position: { x: 0, y: 0 },
    data: { label: id, fileName: id, mediaKind: kind, mediaUrl: url, outputMeta: { url, ...meta } },
  };
}

function graph() {
  let i = 0;
  const g = createWorkingGraph({
    nodes: [
      media("c1", "video", { durationSec: 6, hasAudio: true, width: 1920, height: 1080 }),
      media("c2", "video", { durationSec: 8, hasAudio: true }),
      media("song", "audio", { durationSec: 30, hasAudio: true }),
    ],
    edges: [],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    nextId: () => `n${++i}`,
  });
  return g;
}

const sound = (name: string) => ({ url: `https://x.public.blob.vercel-storage.com/${name}.mp3`, name, durationSec: 2 });

function finder(calls: unknown[]): SmartAudioFinder {
  return {
    findMusic: async (input) => {
      calls.push(input);
      return { ...sound("Sunny Day"), mood: "upbeat", durationSec: 90 };
    },
    findSfx: async (input) => {
      calls.push(input);
      return [{ ...sound("Whoosh"), atSec: 5.5, reason: "fade" }];
    },
  };
}

describe("canvas agent smart edit tools", () => {
  it("clean_speech and smart_reframe insert their Scro node right after the source", () => {
    const g = graph();
    const T = smartEditToolHandlers(finder([]));
    const clean = T.clean_speech(g, H, { sourceId: "c1", maxPauseSec: 0.5, language: "yue" });
    assert.equal(clean.error, undefined);
    const cleanNode = g.nodes.find((n) => n.id === clean.nodeId)!;
    assert.equal(cleanNode.data.modelId, "scro:clean-speech");
    assert.equal(cleanNode.data.toolParams?.cleanMaxPauseSec, 0.5);
    assert.ok(g.edges.some((e) => e.source === "c1" && e.target === cleanNode.id));
    assert.match(String(clean.note), /\$0\.20/);

    const reframe = T.smart_reframe(g, H, { sourceId: cleanNode.id, aspect: "1:1" });
    const reframeNode = g.nodes.find((n) => n.id === reframe.nodeId)!;
    assert.equal(reframeNode.data.modelId, "scro:smart-reframe");
    assert.equal(reframeNode.data.toolParams?.reframeAspect, "1:1");
    assert.ok(g.edges.some((e) => e.source === cleanNode.id && e.target === reframeNode.id));
  });

  it("auto_bgm adds library music and mixes it under a plain video", async () => {
    const g = graph();
    const calls: unknown[] = [];
    const res = await smartEditToolHandlers(finder(calls)).auto_bgm(g, H, { targetId: "c1", context: "a cooking vlog", mood: "upbeat" });
    assert.equal(res.error, undefined);
    assert.deepEqual(calls, [{ context: "a cooking vlog", mood: "upbeat" }]);
    const music = g.nodes.find((n) => n.data.mediaUrl?.includes("Sunny Day"))!;
    assert.equal(music.data.mediaKind, "audio");
    const mixer = g.edges.find((e) => e.source === music.id)!;
    assert.equal(g.nodes.find((n) => n.id === mixer.target)?.data.modelId, "ffmpeg:audio-mix");
  });

  it("auto_bgm and auto_sfx add audio items to a Sequence and keep the existing ones", async () => {
    const g = graph();
    const T = smartEditToolHandlers(finder([]));
    const seqId = S.build_sequence(g, H, {
      clips: [{ source: "c1" }, { source: "c2", transition: "fade", transitionSec: 1 }],
    }).nodeId as string;
    S.update_sequence(g, H, { nodeId: seqId, audio: [{ source: "song", gainDb: -10 }] });

    const bgm = await T.auto_bgm(g, H, { targetId: seqId, context: "travel montage" });
    assert.equal(bgm.error, undefined);
    const calls: unknown[] = [];
    const sfx = await smartEditToolHandlers(finder(calls)).auto_sfx(g, H, { sequenceId: seqId });
    assert.equal(sfx.error, undefined);
    assert.deepEqual(calls, [{ transitions: [{ effectType: "fade", cutSec: 5, durationSec: 1 }], pops: [], max: 3 }]);

    const seq = readSequence(g.nodes.find((n) => n.id === seqId)!.data.toolParams);
    const srcOf = (ref: string) => g.nodes.find((n) => n.id === g.edges.find((e) => e.id === ref)?.source);
    assert.deepEqual(
      seq.tracks.audio.map((a) => [srcOf(a.ref)?.data.label, a.gainDb]),
      [["song", -10], ["Sunny Day", -18], ["Whoosh", -6]],
    );
    assert.equal(seq.tracks.audio[2]!.startSec, 5.5);
  });

  it("auto_sfx needs transitions or text on the timeline", async () => {
    const g = graph();
    const seqId = S.build_sequence(g, H, { clips: [{ source: "c1" }] }).nodeId as string;
    const res = await smartEditToolHandlers(finder([])).auto_sfx(g, H, { sequenceId: seqId });
    assert.match(String(res.error), /no transitions or text/);
  });
});
