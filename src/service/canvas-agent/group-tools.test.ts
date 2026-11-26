import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { canvasCharacterIds } from "@/service/canvas-agent/canvas-characters";
import { CANVAS_AGENT_TOOL_HANDLERS as T } from "@/service/canvas-agent/tools";
import { createWorkingGraph } from "@/service/canvas-agent/working-graph";

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
    model("exp-020dc4-video-1", "minimax:MiniMax-H3", { aspectRatio: "9:16" }),
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

describe("replace_group", () => {
  it("swaps the whole expanded group for one planning card that keeps Jim", () => {
    const g = canvas();
    const res = T.replace_group(g, { prompt: "1. As a parent, I am scared." }) as {
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
    assert.deepEqual(g.ops.map((o) => o.kind), [
      "remove_node",
      "remove_node",
      "remove_node",
      "remove_group",
      "add_node",
    ]);
    assert.deepEqual(g.groups, []);
  });

  it("keeps language, style, and character from the old voice and planner params", () => {
    const g = canvas([
      model("exp-020dc4-voice-1", "scro:tts", { toolParams: { language: "yue", characterId: JIM } }),
    ]);
    const res = T.replace_group(g, { prompt: "new", skillSlug: "papercraft-diorama-director" }) as { nodeId: string };
    const card = g.nodes.find((n) => n.id === res.nodeId)!;
    assert.deepEqual(card.data.toolParams, {
      characterId: JIM,
      language: "yue",
      skillSlug: "papercraft-diorama-director",
      plannerMode: true,
    });
  });

  it("asks for groupId when several director groups are on the canvas, and changes nothing", () => {
    const g = canvas([
      model("exp-abcdef-frame-1", "google:gemini-nano-banana-2.1"),
      model("exp-abcdef-video-1", "minimax:MiniMax-H3"),
    ]);
    const res = T.replace_group(g, { prompt: "new" });
    assert.match(String(res.error), /groupId/);
    assert.equal(g.ops.length, 0);
    const picked = T.replace_group(g, { prompt: "new", groupId: "exp-abcdef" }) as { removedCount: number };
    assert.equal(picked.removedCount, 2);
    assert.ok(g.nodes.some((n) => n.id === "exp-020dc4-frame-1"));
    const byNode = T.replace_group(g, { prompt: "new", nodeId: "exp-020dc4-video-1" }) as { removedCount: number };
    assert.equal(byNode.removedCount, 3);
  });

  it("re-plans a Talking Head group with its character and framing", () => {
    const g = canvas();
    g.groups.push({
      id: "th-abc123",
      title: "Talking Head",
      color: "sky",
      kind: "talking-head",
      memberIds: [],
      params: { characterId: JIM, language: "en", framing: "waist-up", aspectRatio: "16:9" },
    });
    g.nodes.push(model("th-abc123-frame-1", "openrouter:bytedance-seed/seedream-5-0-pro"));
    g.groups[g.groups.length - 1]!.memberIds.push("th-abc123-frame-1");
    const res = T.replace_group(g, { prompt: "Hello", groupId: "th-abc123" }) as { nodeId: string };
    const card = g.nodes.find((n) => n.id === res.nodeId)!;
    assert.equal(card.data.modelId, "scro:talking-head");
    assert.equal(card.data.aspectRatio, "16:9");
    assert.deepEqual(card.data.toolParams, {
      plannerMode: true,
      characterId: JIM,
      language: "en",
      framing: "waist-up",
    });
  });

  it("gives a Talking Head Director the new script and replans it in place", () => {
    const g = canvas();
    const director = model("th-dir", "scro:talking-head", {
      prompt: "Old script",
      aspectRatio: "9:16",
      toolParams: { plannerMode: true, characterId: JIM, language: "yue", framing: "waist-up", planStatus: "planned" },
    });
    g.nodes.push(director, model("th-abc123-video-1", "openrouter:heygen/avatar-iv"));
    g.groups.push({
      id: "th-abc123",
      title: "Talking Head",
      color: "sky",
      kind: "talking-head",
      memberIds: ["th-dir", "th-abc123-video-1"],
    });
    const before = g.nodes.length;
    const res = T.replace_group(g, { prompt: "New script", groupId: "th-abc123", language: "en" }) as {
      nodeId: string;
      removedCount: number;
    };
    assert.equal(res.nodeId, "th-dir");
    assert.equal(res.removedCount, 0);
    assert.equal(g.nodes.length, before);
    const updated = g.nodes.find((n) => n.id === "th-dir")!;
    assert.equal(updated.data.prompt, "New script");
    assert.equal(updated.data.toolParams?.language, "en");
    assert.equal(updated.data.toolParams?.framing, "waist-up");
    assert.equal(updated.data.toolParams?.replanRequested, true);
    assert.deepEqual(g.ops.map((o) => o.kind), ["update_node"]);
  });

  it("refuses non-director groups", () => {
    const g = canvas();
    T.group_nodes(g, { nodeIds: ["media-5c839307"] });
    const groupId = g.groups.find((gr) => gr.kind === "custom")!.id;
    assert.match(String(T.replace_group(g, { prompt: "new", groupId }).error), /only re-plans/);
  });

  it("refuses while a node of the group is generating", () => {
    const g = canvas();
    g.nodes.find((n) => n.id === "exp-020dc4-video-1")!.data.status = "running";
    assert.match(String(T.replace_group(g, { prompt: "new" }).error), /generating/);
    assert.equal(g.nodes.length, 4);
  });

  it("errors when there is no Explainer to replace", () => {
    const g = createWorkingGraph({ nodes: [], edges: [], catalog: STATIC_CANVAS_MODELS, assets: [] });
    assert.match(String(T.replace_group(g, { prompt: "new" }).error), /No Explainer/);
  });
});

describe("group management tools", () => {
  it("get_canvas lists the inferred Explainer group and each member's groupId", () => {
    const g = canvas();
    const res = T.get_canvas(g) as {
      groups: Array<{ id: string; kind: string; memberIds: string[] }>;
      nodes: Array<{ id: string; groupId?: string }>;
    };
    assert.deepEqual(res.groups.map((gr) => [gr.id, gr.kind, gr.memberIds.length]), [["exp-020dc4", "explainer", 3]]);
    assert.equal(res.nodes.find((n) => n.id === "exp-020dc4-video-1")?.groupId, "exp-020dc4");
    assert.equal(res.nodes.find((n) => n.id === "media-5c839307")?.groupId, undefined);
  });

  it("group_nodes moves members out of their old group; update_group and ungroup edit only the frame", () => {
    const g = canvas();
    const res = T.group_nodes(g, { nodeIds: ["media-5c839307", "exp-020dc4-ref-1"], title: "Refs" }) as { groupId: string };
    assert.deepEqual(g.groups.find((gr) => gr.id === "exp-020dc4")?.memberIds, ["exp-020dc4-frame-1", "exp-020dc4-video-1"]);
    T.update_group(g, { groupId: res.groupId, color: "rose", collapsed: true });
    assert.equal(g.groups.find((gr) => gr.id === res.groupId)?.color, "rose");
    T.ungroup(g, { groupId: res.groupId });
    assert.equal(g.groups.some((gr) => gr.id === res.groupId), false);
    assert.equal(g.nodes.length, 4);
    assert.deepEqual(g.ops.map((o) => o.kind), ["add_group", "update_group", "remove_group"]);
  });

  it("update_group_nodes edits matching members atomically", () => {
    const g = canvas();
    const res = T.update_group_nodes(g, { groupId: "exp-020dc4", role: "video", durationSeconds: 6 }) as { error?: string };
    assert.equal(res.error, undefined);
    assert.equal(g.nodes.find((n) => n.id === "exp-020dc4-video-1")?.data.durationSeconds, 6);
    assert.equal(g.nodes.find((n) => n.id === "exp-020dc4-frame-1")?.data.durationSeconds, undefined);
    assert.match(String(T.update_group_nodes(g, { groupId: "exp-020dc4", role: "voice", prompt: "x" }).error), /No model node/);
  });

  it("delete_group removes the group and all members, or nothing while one is running", () => {
    const g = canvas();
    g.nodes.find((n) => n.id === "exp-020dc4-video-1")!.data.status = "running";
    assert.match(String(T.delete_group(g, { groupId: "exp-020dc4" }).error), /generating|running/);
    assert.equal(g.nodes.length, 4);
    g.nodes.find((n) => n.id === "exp-020dc4-video-1")!.data.status = "idle";
    const res = T.delete_group(g, { groupId: "exp-020dc4" }) as { removedCount: number };
    assert.equal(res.removedCount, 3);
    assert.deepEqual(g.nodes.map((n) => n.id), ["media-5c839307"]);
    assert.deepEqual(g.groups, []);
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
