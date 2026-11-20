import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import type { CanvasLibraryAsset } from "@/service/canvas/projects";
import {
  CANVAS_AGENT_MAX_ADDED_NODES,
  CANVAS_AGENT_TOOL_HANDLERS as T,
  buildCanvasAgentTools,
  createWorkingGraph,
} from "@/service/canvas-agent/tools";

const SEEDREAM = "openrouter:bytedance-seed/seedream-5-0-pro";
const HAILUO = "openrouter:minimax/hailuo-3";

const asset: CanvasLibraryAsset = {
  id: "char-1",
  source: "character",
  name: "Mia",
  mediaKind: "image",
  url: "https://blob.example/mia.png",
  createdAt: "2026-11-20T00:00:00.000Z",
};

function fresh(nodes: CanvasNode[] = []) {
  let n = 0;
  return createWorkingGraph({
    nodes,
    edges: [],
    catalog: STATIC_CANVAS_MODELS,
    assets: [asset],
    nextId: () => `id${++n}`,
  });
}

describe("canvas agent tools", () => {
  it("lists OpenRouter, Scro, and FFmpeg models (excluding legacy Mentalok)", () => {
    const res = T.list_models(fresh()) as { models: Array<{ id: string }> };
    assert.ok(res.models.length >= 22);
    assert.ok(res.models.every((m) => !m.id.startsWith("mentalok:")));
    assert.ok(res.models.some((m) => m.id === "scro:talking-head"));
    assert.ok(res.models.some((m) => m.id === "scro:tts"));
    assert.ok(res.models.some((m) => m.id === "ffmpeg:concat"));
    assert.ok(res.models.some((m) => m.id === "ffmpeg:audio-mux"));
  });

  it("supports toolParams on Scro tools, audio -> refAudio wiring, and multi-video ffmpeg:concat", () => {
    const g = fresh();
    const tts = T.add_model_node(g, {
      modelId: "scro:tts",
      prompt: "Hello",
      toolParams: { language: "yue", voicePreset: "alan" },
    }) as { nodeId: string };
    const th = T.add_model_node(g, {
      modelId: "scro:talking-head",
      aspectRatio: "9:16",
      toolParams: { characterId: "char-1", language: "yue" },
    }) as { nodeId: string };
    assert.deepEqual(
      (g.nodes.find((n) => n.id === th.nodeId)?.data.toolParams as Record<string, unknown>)?.characterId,
      "char-1",
    );

    const eAudio = T.connect(g, { sourceId: tts.nodeId, targetId: th.nodeId, targetPort: "refAudio" });
    assert.ok(!("error" in eAudio));

    const v1 = T.add_model_node(g, { modelId: HAILUO }) as { nodeId: string };
    const v2 = T.add_model_node(g, { modelId: HAILUO }) as { nodeId: string };
    const concat = T.add_model_node(g, {
      modelId: "ffmpeg:concat",
      toolParams: { ffmpegTransition: "pad-200ms" },
    }) as { nodeId: string };

    assert.ok(!("error" in T.connect(g, { sourceId: v1.nodeId, targetId: concat.nodeId, targetPort: "videos" })));
    assert.ok(!("error" in T.connect(g, { sourceId: v2.nodeId, targetId: concat.nodeId, targetPort: "videos" })));
    assert.equal(g.edges.filter((e) => e.target === concat.nodeId).length, 2);

    // Mismatched audio -> videos must return { error }
    const bad = T.connect(g, { sourceId: tts.nodeId, targetId: concat.nodeId, targetPort: "videos" });
    assert.ok("error" in bad);

    // Unknown toolParams key or non-existent characterId must return { error }
    const badParam = T.add_model_node(g, {
      modelId: "scro:tts",
      prompt: "Hi",
      toolParams: { unknownVoiceKey: "alan" },
    });
    assert.ok("error" in badParam);

    const badChar = T.add_model_node(g, {
      modelId: "scro:talking-head",
      toolParams: { characterId: "missing-char-999" },
    });
    assert.ok("error" in badChar);
  });

  it("builds prompt → image and logs ops in order", () => {
    const g = fresh();
    const p = T.add_prompt_node(g, { text: "a red fox" }) as { nodeId: string };
    const m = T.add_model_node(g, { modelId: SEEDREAM, aspectRatio: "9:16" }) as { nodeId: string };
    const c = T.connect(g, { sourceId: p.nodeId, targetId: m.nodeId, targetPort: "prompt" });
    assert.ok(!("error" in c));
    assert.deepEqual(g.ops.map((o) => o.kind), ["add_node", "add_node", "add_edge"]);
    const model = g.nodes.find((n) => n.id === m.nodeId);
    assert.equal(model?.data.aspectRatio, "9:16");
    assert.equal(model?.data.status, "idle");
    assert.equal(g.edges.length, 1);
  });

  it("returns an error for a port type mismatch instead of throwing", () => {
    const g = fresh();
    const v = T.add_model_node(g, { modelId: HAILUO }) as { nodeId: string };
    const i = T.add_model_node(g, { modelId: SEEDREAM }) as { nodeId: string };
    const res = T.connect(g, { sourceId: v.nodeId, targetId: i.nodeId, targetPort: "refImages" });
    assert.ok("error" in res);
    assert.equal(g.edges.length, 0);
  });

  it("rejects non-OpenRouter models and unknown ids", () => {
    const g = fresh();
    assert.ok("error" in T.add_model_node(g, { modelId: "mentalok:flux-schnell" }));
    assert.ok("error" in T.add_model_node(g, { modelId: "nope" }));
    assert.equal(g.nodes.length, 0);
  });

  it("clamps video duration to the model range", () => {
    const g = fresh();
    const v = T.add_model_node(g, { modelId: HAILUO, durationSeconds: 99 }) as { nodeId: string };
    assert.equal(g.nodes.find((n) => n.id === v.nodeId)?.data.durationSeconds, 15);
  });

  it("replaces a single-input edge by logging remove then add", () => {
    const g = fresh();
    const a = T.add_model_node(g, { modelId: SEEDREAM }) as { nodeId: string };
    const b = T.add_model_node(g, { modelId: SEEDREAM }) as { nodeId: string };
    const v = T.add_model_node(g, { modelId: HAILUO }) as { nodeId: string };
    T.connect(g, { sourceId: a.nodeId, targetId: v.nodeId, targetPort: "startImage" });
    T.connect(g, { sourceId: b.nodeId, targetId: v.nodeId, targetPort: "startImage" });
    assert.deepEqual(g.ops.slice(-3).map((o) => o.kind), ["add_edge", "remove_edge", "add_edge"]);
    assert.equal(g.edges.length, 1);
    assert.equal(g.edges[0]?.source, b.nodeId);
  });

  it("deletes a node with its edges but refuses a running node", () => {
    const running: CanvasNode = {
      id: "busy",
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: SEEDREAM, status: "running" },
    };
    const g = fresh([running]);
    assert.ok("error" in T.delete_node(g, { nodeId: "busy" }));

    const p = T.add_prompt_node(g, { text: "x" }) as { nodeId: string };
    const m = T.add_model_node(g, { modelId: SEEDREAM }) as { nodeId: string };
    T.connect(g, { sourceId: p.nodeId, targetId: m.nodeId, targetPort: "prompt" });
    T.delete_node(g, { nodeId: p.nodeId });
    assert.equal(g.edges.length, 0);
    assert.equal(g.ops.at(-1)?.kind, "remove_node");
  });

  it("updates prompt and text on the right node types", () => {
    const g = fresh();
    const p = T.add_prompt_node(g, { text: "x" }) as { nodeId: string };
    const m = T.add_model_node(g, { modelId: SEEDREAM }) as { nodeId: string };
    assert.ok(!("error" in T.update_node(g, { nodeId: p.nodeId, text: "y" })));
    assert.ok("error" in T.update_node(g, { nodeId: p.nodeId, prompt: "y" }));
    assert.ok(!("error" in T.update_node(g, { nodeId: m.nodeId, prompt: "z" })));
    assert.equal(g.nodes.find((n) => n.id === p.nodeId)?.data.text, "y");
    assert.equal(g.nodes.find((n) => n.id === m.nodeId)?.data.prompt, "z");
  });

  it("adds a media node only for a known asset", () => {
    const g = fresh();
    assert.ok("error" in T.add_media_node(g, { assetId: "missing" }));
    const res = T.add_media_node(g, { assetId: "char-1" }) as { nodeId: string };
    assert.equal(g.nodes.find((n) => n.id === res.nodeId)?.data.mediaUrl, asset.url);
  });

  it("stops adding nodes after the per-turn limit", () => {
    const g = fresh();
    for (let i = 0; i < CANVAS_AGENT_MAX_ADDED_NODES; i++) T.add_prompt_node(g, { text: `${i}` });
    assert.ok("error" in T.add_prompt_node(g, { text: "one more" }));
  });

  it("arranges nodes left to right by dependency", () => {
    const g = fresh();
    // Added right-to-left so the layout has to move them.
    const v = T.add_model_node(g, { modelId: HAILUO }) as { nodeId: string };
    const i = T.add_model_node(g, { modelId: SEEDREAM }) as { nodeId: string };
    const p = T.add_prompt_node(g, { text: "x" }) as { nodeId: string };
    T.connect(g, { sourceId: p.nodeId, targetId: i.nodeId, targetPort: "prompt" });
    T.connect(g, { sourceId: i.nodeId, targetId: v.nodeId, targetPort: "startImage" });
    T.arrange_layout(g);
    const x = (id: string) => g.nodes.find((n) => n.id === id)!.position.x;
    assert.ok(x(p.nodeId) < x(i.nodeId));
    assert.ok(x(i.nodeId) < x(v.nodeId));
    assert.ok(g.ops.some((o) => o.kind === "move_node"));
  });

  it("exposes every handler as an AI SDK tool", () => {
    const tools = buildCanvasAgentTools(fresh());
    assert.deepEqual(Object.keys(tools).sort(), Object.keys(T).sort());
  });
});
