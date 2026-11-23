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
const HAILUO = "minimax:MiniMax-H3";

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
    const res = T.list_models(fresh()) as { models: string[] };
    assert.ok(res.models.length >= 22);
    assert.ok(res.models.every((line) => !line.startsWith("mentalok:")));
    assert.ok(res.models.every((line) => !line.startsWith("scro:talking-head |")));
    assert.ok(res.models.every((line) => !line.startsWith("scro:life |")));
    assert.ok(res.models.some((line) => line.startsWith("scro:tts |")));
    assert.ok(res.models.some((line) => line.startsWith("ffmpeg:concat |")));
    assert.ok(res.models.some((line) => line.startsWith("ffmpeg:audio-mux |")));
    assert.ok(res.models.every((line) => !line.startsWith("scro:explainer-frame |")));
  });

  it("adds Explainer as a self-contained planning card with no wires in or out", () => {
    const g = fresh();
    assert.ok("error" in T.add_model_node(g, { modelId: "scro:explainer" }));
    const exp = T.add_model_node(g, {
      modelId: "scro:explainer",
      promptText: "Explain inflation",
      toolParams: { language: "en" },
    }) as { nodeId: string };
    const node = g.nodes.find((n) => n.id === exp.nodeId)!;
    assert.deepEqual(node.data.toolParams, { language: "en", plannerMode: true });
    assert.equal(node.data.prompt, "Explain inflation");
    assert.equal(g.nodes.filter((n) => n.type === "prompt").length, 0);
    assert.ok("error" in T.add_model_node(g, { modelId: "scro:explainer-frame" }));
    const concat = T.add_model_node(g, { modelId: "ffmpeg:concat" }) as { nodeId: string };
    assert.ok("error" in T.connect(g, { sourceId: exp.nodeId, targetId: concat.nodeId, targetPort: "videos" }));
    const topic = T.add_prompt_node(g, { text: "x" }) as { nodeId: string };
    assert.ok("error" in T.connect(g, { sourceId: topic.nodeId, targetId: exp.nodeId, targetPort: "prompt" }));
  });

  it("supports toolParams on Scro tools, audio -> refAudio wiring, and multi-video ffmpeg:concat", () => {
    const g = fresh();
    const tts = T.add_model_node(g, {
      modelId: "scro:tts",
      prompt: "Hello",
      toolParams: { language: "yue", voicePreset: "alan" },
    }) as { nodeId: string };
    const th = T.add_model_node(g, {
      modelId: "openrouter:heygen/avatar-iv",
      aspectRatio: "9:16",
    }) as { nodeId: string };
    assert.equal(
      (g.nodes.find((n) => n.id === tts.nodeId)?.data.toolParams as Record<string, unknown>)?.voicePreset,
      "alan",
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
      modelId: "scro:tts",
      prompt: "Hi",
      toolParams: { characterId: "missing-char-999" },
    });
    assert.ok("error" in badChar);
  });

  it("sends the five Scro group tools to add_scro_group", () => {
    const g = fresh();
    for (const modelId of ["scro:life", "scro:poster", "scro:swap", "scro:teleport", "scro:talking-head"]) {
      const res = T.add_model_node(g, { modelId, prompt: "x" }) as { error?: string };
      assert.match(res.error ?? "", /add_scro_group/);
    }
    assert.equal(g.ops.length, 0);
  });

  it("add_scro_group builds a wired Life group as add_node / add_edge ops", () => {
    const g = fresh();
    const res = T.add_scro_group(g, { tool: "life", characterId: "char-1", prompt: "cafe window" }) as {
      ok: boolean;
      nodeIds: string[];
      outputNodeId: string;
    };
    assert.equal(res.ok, true);
    assert.equal(res.nodeIds.length, 3);
    assert.equal(g.ops.filter((o) => o.kind === "add_node").length, 3);
    assert.equal(g.ops.filter((o) => o.kind === "add_edge").length, 2);
    assert.equal(g.nodes.find((n) => n.id === res.outputNodeId)?.data.modelId, SEEDREAM);
    assert.equal(g.addedNodes, 3);
  });

  it("add_scro_group wires Swap from an existing canvas video without a new video node", () => {
    const g = fresh([
      {
        id: "clip",
        type: "media",
        position: { x: 0, y: 0 },
        data: { mediaKind: "video", mediaUrl: "https://blob.example/clip.mp4" },
      },
    ]);
    const res = T.add_scro_group(g, {
      tool: "swap",
      videoNodeId: "clip",
      characterId: "char-1",
      sectionLength: 9,
    }) as { ok: boolean; nodeIds: string[] };
    assert.equal(res.ok, true);
    assert.ok(!res.nodeIds.includes("clip"));
    assert.ok(g.edges.some((e) => e.source === "clip" && e.targetHandle === "video"));
    const render = g.nodes.find((n) => n.data.modelId === "scro:swap-render");
    assert.equal(render?.data.durationSeconds, 9);
  });

  it("add_scro_group names the missing field", () => {
    const g = fresh();
    assert.match(String(T.add_scro_group(g, { tool: "life" }).error), /characterId/);
    assert.match(String(T.add_scro_group(g, { tool: "swap", characterId: "char-1" }).error), /videoNodeId/);
    assert.match(String(T.add_scro_group(g, { tool: "teleport", videoAssetId: "nope" }).error), /nope/);
    assert.match(String(T.add_scro_group(g, { tool: "talking-head", characterId: "char-1" }).error), /script/);
    assert.equal(g.ops.length, 0);
  });

  it("add_scro_group adds a Talking Head planning card with no wires", () => {
    const g = fresh();
    const res = T.add_scro_group(g, {
      tool: "talking-head",
      characterId: "char-1",
      prompt: "Hi everyone",
      framing: "waist-up",
    }) as { nodeId: string };
    const card = g.nodes.find((n) => n.id === res.nodeId)!;
    assert.equal(card.data.modelId, "scro:talking-head");
    assert.deepEqual(card.data.toolParams, {
      plannerMode: true,
      characterId: "char-1",
      language: "yue",
      framing: "waist-up",
    });
    assert.equal(g.edges.length, 0);
  });

  it("add_scro_group never adds part of a group past the node limit", () => {
    const g = fresh();
    g.addedNodes = CANVAS_AGENT_MAX_ADDED_NODES - 2;
    const res = T.add_scro_group(g, { tool: "life", characterId: "char-1", prompt: "park" });
    assert.match(String(res.error), /limit/);
    assert.equal(g.ops.length, 0);
    assert.equal(g.nodes.length, 0);
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

  it("wires the prompt and a reference image in the same add_model_node call", () => {
    const g = fresh();
    const media = T.add_media_node(g, { assetId: "char-1" }) as { nodeId: string };
    const created = T.add_model_node(g, {
      modelId: SEEDREAM,
      promptText: "front view of the bottle",
      wires: [{ sourceId: media.nodeId, targetPort: "refImages" }],
    }) as { nodeId: string; promptNodeId: string; error?: string };

    assert.equal(created.error, undefined);
    assert.equal(
      g.nodes.find((node) => node.id === created.promptNodeId)?.data.text,
      "front view of the bottle",
    );
    assert.equal(g.edges.length, 2);
    assert.ok(
      g.edges.some(
        (edge) =>
          edge.source === created.promptNodeId &&
          edge.target === created.nodeId &&
          edge.targetHandle === "prompt",
      ),
    );
    assert.ok(
      g.edges.some(
        (edge) =>
          edge.source === media.nodeId &&
          edge.target === created.nodeId &&
          edge.targetHandle === "refImages",
      ),
    );
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

  it("ask_user stores one question with deduped options and rejects a second ask", () => {
    const g = fresh();
    assert.ok(T.ask_user(g, { question: "Which?", options: ["A", "A", " "] }).error);
    assert.equal(T.ask_user(g, { question: "Which?", options: ["A", "B", "A"] }).ok, true);
    assert.deepEqual(g.question, {
      question: "Which?",
      options: [
        { id: "opt-1", label: "A" },
        { id: "opt-2", label: "B" },
      ],
      allowMultiple: false,
      allowOther: true,
    });
    assert.ok(T.ask_user(g, { question: "Again?", options: ["C", "D"] }).error);
  });

  it("ask_user refuses to offer a talking head when the user asked for an explainer", () => {
    const options = ["Talking Head video of Jim explaining source code", "Multi-scene animated explainer"];
    const asked = { ...fresh(), userMessage: "Use jim create explainer explain what is source code" };
    assert.ok(T.ask_user(asked, { question: "How?", options }).error);
    assert.equal(asked.question, undefined);

    const zh = { ...fresh(), userMessage: "用 Jim 做一條解說片" };
    assert.ok(T.ask_user(zh, { question: "點做？", options: ["Jim 口播", "動畫解說"] }).error);

    const wantsTalkingHead = { ...fresh(), userMessage: "Jim talking head explainer about source code" };
    assert.equal(T.ask_user(wantsTalkingHead, { question: "How?", options }).ok, true);
  });

  it("batch_delete_nodes removes an entire 14-node expanded Explainer in one step and rolls back on error", () => {
    const expandedIds = [
      "exp-020dc4-ref-1",
      "exp-020dc4-frame-1",
      "exp-020dc4-frame-2",
      "exp-020dc4-frame-3",
      "exp-020dc4-video-1",
      "exp-020dc4-video-2",
      "exp-020dc4-video-3",
      "exp-020dc4-voice-1",
      "exp-020dc4-voice-2",
      "exp-020dc4-voice-3",
      "exp-020dc4-mux-1",
      "exp-020dc4-mux-2",
      "exp-020dc4-mux-3",
      "exp-020dc4-concat-1",
    ];
    const initial: CanvasNode[] = [
      { id: "media-jim", type: "media", position: { x: 0, y: 0 }, data: { label: "Jim", mediaKind: "image", mediaUrl: asset.url } },
      ...expandedIds.map((id, i) => ({
        id,
        type: (id.includes("-ref-") ? "media" : "model") as CanvasNode["type"],
        position: { x: i * 10, y: 0 },
        data: id.includes("-ref-")
          ? { label: "參考圖 1", mediaKind: "image" as const, mediaUrl: asset.url }
          : { modelId: SEEDREAM, status: "idle" as const },
      })),
    ];
    const g = fresh(initial);

    // Unknown id in the list leaves all 15 nodes untouched.
    const bad = T.batch_delete_nodes(g, { nodeIds: [expandedIds[0]!, "exp-missing"] });
    assert.ok("error" in bad);
    assert.equal(g.nodes.length, 15);
    assert.equal(g.ops.length, 0);

    // Running node in the list also blocks partial deletion.
    g.nodes.find((n) => n.id === "exp-020dc4-video-2")!.data.status = "running";
    const busy = T.batch_delete_nodes(g, { nodeIds: expandedIds });
    assert.ok("error" in busy);
    assert.equal(g.nodes.length, 15);
    g.nodes.find((n) => n.id === "exp-020dc4-video-2")!.data.status = "idle";

    const ok = T.batch_delete_nodes(g, { nodeIds: expandedIds }) as { ok: boolean; deletedCount: number };
    assert.equal(ok.ok, true);
    assert.equal(ok.deletedCount, 14);
    assert.deepEqual(g.nodes.map((n) => n.id), ["media-jim"]);
    assert.equal(g.ops.filter((o) => o.kind === "remove_node").length, 14);
  });

  it("batch_update_nodes edits multiple nodes atomically and rolls back if any item fails", () => {
    const g = fresh();
    const p = T.add_prompt_node(g, { text: "old text" }) as { nodeId: string };
    const v = T.add_model_node(g, { modelId: HAILUO, prompt: "old motion", durationSeconds: 5 }) as { nodeId: string };
    const tts = T.add_model_node(g, {
      modelId: "scro:tts",
      prompt: "old line",
      toolParams: { language: "en", voicePreset: "brian" },
    }) as { nodeId: string };
    const opsBefore = g.ops.length;

    const failed = T.batch_update_nodes(g, {
      updates: [
        { nodeId: p.nodeId, text: "mutated" },
        { nodeId: tts.nodeId, toolParams: { language: "invalid-lang" } },
      ],
    });
    assert.ok("error" in failed);
    assert.equal(g.nodes.find((n) => n.id === p.nodeId)?.data.text, "old text");
    assert.equal(g.ops.length, opsBefore);

    const ok = T.batch_update_nodes(g, {
      updates: [
        { nodeId: p.nodeId, text: "new text" },
        { nodeId: v.nodeId, prompt: "new motion", durationSeconds: 10 },
        { nodeId: tts.nodeId, prompt: "new line", toolParams: { language: "yue", voicePreset: "alan" } },
      ],
    }) as { ok: boolean; updatedCount: number };
    assert.equal(ok.ok, true);
    assert.equal(ok.updatedCount, 3);
    assert.equal(g.nodes.find((n) => n.id === p.nodeId)?.data.text, "new text");
    assert.equal(g.nodes.find((n) => n.id === v.nodeId)?.data.durationSeconds, 10);
    assert.equal(
      (g.nodes.find((n) => n.id === tts.nodeId)?.data.toolParams as Record<string, unknown>)?.language,
      "yue",
    );
  });

  it("clears the edited node and every downstream preview so Run group regenerates them", () => {
    const done = { status: "completed" as const, outputUrl: "https://blob/x", lastJobId: "j" };
    const node = (id: string, modelId: string, extra = {}): CanvasNode => ({
      id,
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId, ...done, ...extra },
    });
    let n = 0;
    const g = createWorkingGraph({
      nodes: [
        node("exp-a-frame-1", "google:gemini-nano-banana-2.1", { prompt: "wood board" }),
        node("exp-a-video-1", HAILUO),
        node("exp-a-voice-1", "scro:tts"),
        node("exp-a-mux-1", "ffmpeg:audio-mux"),
        node("exp-a-concat-1", "ffmpeg:concat"),
      ],
      edges: [
        { id: "e1", source: "exp-a-frame-1", sourceHandle: "output", target: "exp-a-video-1", targetHandle: "startImage" },
        { id: "e2", source: "exp-a-video-1", sourceHandle: "output", target: "exp-a-mux-1", targetHandle: "video" },
        { id: "e3", source: "exp-a-voice-1", sourceHandle: "output", target: "exp-a-mux-1", targetHandle: "refAudio" },
        { id: "e4", source: "exp-a-mux-1", sourceHandle: "output", target: "exp-a-concat-1", targetHandle: "videos" },
      ],
      catalog: STATIC_CANVAS_MODELS,
      assets: [asset],
      nextId: () => `id${++n}`,
      now: () => "2026-11-23T08:00:00.000Z",
    });
    assert.ok(!("error" in T.update_node(g, { nodeId: "exp-a-frame-1", prompt: "blue board" })));
    const clear = g.ops.find((op) => op.kind === "clear_output");
    assert.deepEqual(clear, {
      kind: "clear_output",
      nodeIds: ["exp-a-frame-1", "exp-a-video-1", "exp-a-mux-1", "exp-a-concat-1"],
      clearedAt: "2026-11-23T08:00:00.000Z",
    });
    const byId = new Map(g.nodes.map((x) => [x.id, x]));
    assert.equal(byId.get("exp-a-video-1")?.data.outputUrl, undefined);
    assert.equal(byId.get("exp-a-voice-1")?.data.outputUrl, "https://blob/x");
    assert.equal(byId.get("exp-a-frame-1")?.data.prompt, "blue board");

    // Unwiring the voice changes what the mux renders, so the mux (already cleared) stays idle.
    g.ops.length = 0;
    assert.ok(!("error" in T.disconnect(g, { edgeId: "e3" })));
    assert.equal(g.ops.filter((op) => op.kind === "clear_output").length, 0);
  });

  it("batch_add_nodes builds and wires a multi-shot pipeline via local keys and rolls back on failure", () => {
    const g = fresh();

    // Bad wire targetPort on the last node rolls back earlier nodes in the same batch.
    const bad = T.batch_add_nodes(g, {
      nodes: [
        { key: "ref", assetId: "char-1" },
        { key: "img1", modelId: SEEDREAM, prompt: "shot 1", wires: [{ sourceId: "ref", targetPort: "videos" }] },
      ],
    });
    assert.ok("error" in bad);
    assert.doesNotMatch(String(bad.error), /Do not add this node again/);
    assert.equal(g.nodes.length, 0);
    assert.equal(g.ops.length, 0);
    assert.equal(g.addedNodes, 0);

    const ok = T.batch_add_nodes(g, {
      nodes: [
        { key: "ref", assetId: "char-1" },
        {
          key: "img1",
          modelId: SEEDREAM,
          promptText: "Mia holding mug front view",
          wires: [{ sourceId: "ref", targetPort: "refImages" }],
        },
        {
          key: "vid1",
          modelId: HAILUO,
          prompt: "slow push in",
          wires: [{ sourceId: "img1", targetPort: "startImage" }],
        },
        {
          key: "img2",
          modelId: SEEDREAM,
          prompt: "Mia sipping coffee side view",
          wires: [{ sourceId: "ref", targetPort: "refImages" }],
        },
        {
          key: "vid2",
          modelId: HAILUO,
          prompt: "gentle pan",
          wires: [{ sourceId: "img2", targetPort: "startImage" }],
        },
        {
          key: "concat",
          modelId: "ffmpeg:concat",
          wires: [
            { sourceId: "vid1", targetPort: "videos" },
            { sourceId: "vid2", targetPort: "videos" },
          ],
        },
      ],
    }) as { ok: boolean; addedCount: number; created: Array<{ key?: string; nodeId: string }> };

    assert.equal(ok.ok, true);
    // 1 media + (1 image + 1 prompt) + 1 video + 1 image + 1 video + 1 concat = 7 nodes.
    assert.equal(ok.addedCount, 7);
    assert.equal(g.nodes.length, 7);
    const concatId = ok.created.find((c) => c.key === "concat")!.nodeId;
    assert.equal(g.edges.filter((e) => e.target === concatId && e.targetHandle === "videos").length, 2);
  });

  it("exposes every handler as an AI SDK tool", () => {
    const tools = buildCanvasAgentTools(fresh());
    assert.deepEqual(Object.keys(tools).sort(), Object.keys(T).sort());
  });
});
