import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import { canvasCharacterIds } from "@/service/canvas-agent/explainer-replace";
import { CANVAS_AGENT_TOOL_HANDLERS as T, createWorkingGraph } from "@/service/canvas-agent/tools";

const JIM = "6afaa18cbdd00015c634043e";
const BLOB = "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters";
const JIM_PHOTO = `${BLOB}/${JIM}/6afaa18cbdd00015c634043d-standing`;
const JIM_LOCK = `${BLOB}/${JIM}/6b02731111f71d4525049483`;

function model(id: string, modelId: string, extra: Partial<CanvasNode["data"]> = {}): CanvasNode {
  return { id, type: "model", position: { x: 900, y: 2000 }, data: { modelId, status: "idle", ...extra } };
}

// The canvas from the bug report: Jim's photo plus a half-deleted expanded Explainer.
function canvas(extraNodes: CanvasNode[] = []) {
  const nodes: CanvasNode[] = [
    { id: "media-5c839307", type: "media", position: { x: 542, y: 1199 }, data: { label: "Jim", mediaKind: "image", mediaUrl: JIM_PHOTO } },
    { id: "exp-020dc4-ref-1", type: "media", position: { x: 538, y: 1524 }, data: { label: "參考圖 1", mediaKind: "image", mediaUrl: JIM_LOCK } },
    model("exp-020dc4-frame-1", "google:gemini-nano-banana-2.1", { aspectRatio: "9:16" }),
    model("exp-020dc4-video-1", "openrouter:minimax/hailuo-3", { aspectRatio: "9:16" }),
    ...extraNodes,
  ];
  const edges: CanvasEdge[] = [
    { id: "a", source: "exp-020dc4-ref-1", sourceHandle: "output", target: "exp-020dc4-frame-1", targetHandle: "refImages" },
    { id: "b", source: "exp-020dc4-frame-1", sourceHandle: "output", target: "exp-020dc4-video-1", targetHandle: "startImage" },
  ];
  let n = 0;
  return createWorkingGraph({
    nodes,
    edges,
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    characters: [
      { id: JIM, name: "Jim", previewUrl: JIM_PHOTO },
      { id: "6afaa18cbdd00015c6340000", name: "Cathy" },
    ],
    nextId: () => `id${++n}`,
  });
}

describe("replace_explainer", () => {
  it("swaps the whole expanded group for one planning card that keeps Jim", () => {
    const g = canvas();
    const res = T.replace_explainer(g, { prompt: "1. As a parent, I am scared." }) as {
      ok: boolean;
      nodeId: string;
      removedCount: number;
      characterName: string;
    };
    assert.equal(res.ok, true);
    assert.equal(res.removedCount, 3);
    assert.equal(res.characterName, "Jim");
    assert.deepEqual(g.nodes.map((n) => n.id), ["media-5c839307", res.nodeId]);
    assert.equal(g.edges.length, 0);

    const card = g.nodes.find((n) => n.id === res.nodeId)!;
    assert.equal(card.data.modelId, "scro:explainer");
    assert.equal(card.data.prompt, "1. As a parent, I am scared.");
    assert.equal(card.data.aspectRatio, "9:16");
    assert.deepEqual(card.data.toolParams, { characterId: JIM, plannerMode: true });
    assert.deepEqual(card.position, { x: 538, y: 1199 + 325 });
    assert.deepEqual(g.ops.map((o) => o.kind), ["remove_node", "remove_node", "remove_node", "add_node"]);
  });

  it("keeps language, style, and character from the old voice and planner params", () => {
    const g = canvas([
      model("exp-020dc4-voice-1", "scro:tts", { toolParams: { language: "yue", characterId: JIM } }),
    ]);
    const res = T.replace_explainer(g, { prompt: "new", skillSlug: "papercraft-diorama-director" }) as { nodeId: string };
    const card = g.nodes.find((n) => n.id === res.nodeId)!;
    assert.deepEqual(card.data.toolParams, {
      characterId: JIM,
      language: "yue",
      skillSlug: "papercraft-diorama-director",
      plannerMode: true,
    });
  });

  it("asks for nodeId when several Explainers are on the canvas, and changes nothing", () => {
    const g = canvas([model("exp-abcdef-frame-1", "google:gemini-nano-banana-2.1")]);
    const res = T.replace_explainer(g, { prompt: "new" });
    assert.match(String(res.error), /nodeId/);
    assert.equal(g.ops.length, 0);
    const picked = T.replace_explainer(g, { prompt: "new", nodeId: "exp-abcdef-frame-1" }) as { removedCount: number };
    assert.equal(picked.removedCount, 1);
    assert.ok(g.nodes.some((n) => n.id === "exp-020dc4-frame-1"));
  });

  it("refuses while a node of the group is generating", () => {
    const g = canvas();
    g.nodes.find((n) => n.id === "exp-020dc4-video-1")!.data.status = "running";
    assert.match(String(T.replace_explainer(g, { prompt: "new" }).error), /generating/);
    assert.equal(g.nodes.length, 4);
  });

  it("errors when there is no Explainer to replace", () => {
    const g = createWorkingGraph({ nodes: [], edges: [], catalog: STATIC_CANVAS_MODELS, assets: [] });
    assert.match(String(T.replace_explainer(g, { prompt: "new" }).error), /No Explainer/);
  });
});

describe("reusing the canvas character", () => {
  it("finds Jim from his photo and his lock image", () => {
    const g = canvas();
    assert.deepEqual(canvasCharacterIds(g, g.nodes), [JIM]);
  });

  it("add_model_node scro:explainer reuses Jim when no character is named", () => {
    const g = canvas();
    const res = T.add_model_node(g, { modelId: "scro:explainer", prompt: "What is an LLM" }) as { nodeId: string };
    assert.equal(g.nodes.find((n) => n.id === res.nodeId)?.data.toolParams?.characterId, JIM);
  });

  it("keeps an explicitly named character", () => {
    const g = canvas();
    const res = T.add_model_node(g, {
      modelId: "scro:explainer",
      prompt: "What is an LLM",
      toolParams: { characterId: "6afaa18cbdd00015c6340000" },
    }) as { nodeId: string };
    assert.equal(g.nodes.find((n) => n.id === res.nodeId)?.data.toolParams?.characterId, "6afaa18cbdd00015c6340000");
  });
});
