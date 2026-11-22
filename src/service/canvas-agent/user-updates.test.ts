// Simulates the tool calls a user triggers from the canvas agent: new explainer
// script, a different character, clip length, a lighter frame model, and Swap / Teleport edits.
// No live model calls.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  NANO_BANANA_CANVAS_MODEL_ID,
  STATIC_CANVAS_MODELS,
  findCanvasModel,
} from "@/service/canvas/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/pricing";
import type { CanvasLibraryAsset } from "@/service/canvas/projects";
import { SEEDREAM_MODEL_ID } from "@/service/canvas/scro-groups/builder";
import { CANVAS_AGENT_TOOL_HANDLERS as T, createWorkingGraph } from "@/service/canvas-agent/tools";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/tools";

const JIM = "6afaa18cbdd00015c634043e";
const CATHY = "6afaa18cbdd00015c6340000";
const LITE = "openrouter:bytedance-seed/seedream-5-0-lite";
const HAILUO = "openrouter:minimax/hailuo-3";
const BLOB = "https://blob.example/characters";

const assets: CanvasLibraryAsset[] = [
  { id: JIM, source: "character", name: "Jim", mediaKind: "image", url: `${BLOB}/${JIM}/photo.png`, createdAt: "2026-11-20T00:00:00.000Z" },
  { id: CATHY, source: "character", name: "Cathy", mediaKind: "image", url: `${BLOB}/${CATHY}/photo.png`, createdAt: "2026-11-20T00:00:00.000Z" },
];

function model(id: string, modelId: string, extra: Partial<CanvasNode["data"]> = {}): CanvasNode {
  return { id, type: "model", position: { x: 800, y: 400 }, data: { modelId, status: "idle", ...extra } };
}

function graph(nodes: CanvasNode[], edges: CanvasEdge[] = []): CanvasAgentWorkingGraph {
  let n = 0;
  return createWorkingGraph({
    nodes,
    edges,
    catalog: STATIC_CANVAS_MODELS,
    assets,
    characters: assets.map((a) => ({ id: a.id, name: a.name, previewUrl: a.url })),
    nextId: () => `id${++n}`,
  });
}

function must<T>(res: T, label = "tool"): T {
  const error = (res as { error?: unknown }).error;
  assert.equal(error, undefined, `${label}: ${String(error)}`);
  return res;
}

function node(g: CanvasAgentWorkingGraph, id: string): CanvasNode {
  const found = g.nodes.find((n) => n.id === id);
  assert.ok(found, id);
  return found;
}

function bySuffix(g: CanvasAgentWorkingGraph, groupId: string, suffix: string): CanvasNode {
  const found = g.nodes.find((n) => n.id === `${groupId}-${suffix}`);
  assert.ok(found, `${groupId}-${suffix}`);
  return found;
}

// The expanded explainer from a previous plan: Jim's photo, two stills, two clips.
function explainer(): CanvasAgentWorkingGraph {
  const nodes: CanvasNode[] = [
    { id: "media-jim", type: "media", position: { x: 80, y: 80 }, data: { label: "Jim", mediaKind: "image", mediaUrl: `${BLOB}/${JIM}/photo.png` } },
    { id: "exp-020dc4-ref-1", type: "media", position: { x: 80, y: 400 }, data: { label: "參考圖 1", mediaKind: "image", mediaUrl: `${BLOB}/${JIM}/lock.png` } },
    model("exp-020dc4-frame-1", NANO_BANANA_CANVAS_MODEL_ID, { aspectRatio: "9:16", prompt: "Hook still of Jim" }),
    model("exp-020dc4-frame-2", NANO_BANANA_CANVAS_MODEL_ID, { aspectRatio: "9:16", prompt: "Second still of Jim" }),
    model("exp-020dc4-video-1", HAILUO, { aspectRatio: "9:16", durationSeconds: 6 }),
    model("exp-020dc4-video-2", HAILUO, { aspectRatio: "9:16", durationSeconds: 6 }),
    model("exp-020dc4-voice-1", "scro:tts", { prompt: "I am scared.", toolParams: { language: "yue", characterId: JIM } }),
  ];
  const edges: CanvasEdge[] = [
    { id: "e1", source: "exp-020dc4-ref-1", sourceHandle: "output", target: "exp-020dc4-frame-1", targetHandle: "refImages" },
    { id: "e2", source: "exp-020dc4-frame-1", sourceHandle: "output", target: "exp-020dc4-video-1", targetHandle: "startImage" },
    { id: "e3", source: "exp-020dc4-frame-2", sourceHandle: "output", target: "exp-020dc4-video-2", targetHandle: "startImage" },
  ];
  return graph(nodes, edges);
}

function studio(): CanvasAgentWorkingGraph {
  return graph([
    {
      id: "clip",
      type: "media",
      position: { x: 0, y: 0 },
      data: { label: "Source", mediaKind: "video", mediaUrl: "https://blob.example/clip.mp4" },
    },
  ]);
}

// Deletes one model node and adds another in its place, then keeps it in the same group.
function replaceMemberModel(g: CanvasAgentWorkingGraph, nodeId: string, modelId: string): string {
  const current = node(g, nodeId);
  const group = g.groups.find((gr) => gr.memberIds.includes(nodeId));
  const incoming = g.edges.filter((e) => e.target === nodeId);
  const outgoing = g.edges.filter((e) => e.source === nodeId);
  must(T.delete_node(g, { nodeId }), "delete_node");
  const added = must(
    T.add_model_node(g, {
      modelId,
      prompt: current.data.prompt,
      aspectRatio: current.data.aspectRatio as CanvasAspectRatio | undefined,
      wires: incoming.map((e) => ({ sourceId: e.source, targetPort: e.targetHandle ?? "prompt" })),
    }),
    "add_model_node",
  ) as { nodeId: string };
  for (const edge of outgoing) {
    must(
      T.connect(g, { sourceId: added.nodeId, targetId: edge.target, targetPort: edge.targetHandle ?? "image" }),
      "connect",
    );
  }
  if (group) {
    must(
      T.update_group(g, {
        groupId: group.id,
        memberIds: group.memberIds.map((id) => (id === nodeId ? added.nodeId : id)),
      }),
      "update_group",
    );
  }
  return added.nodeId;
}

describe("user updates an Explainer from the agent", () => {
  it("replaces the script and keeps Jim, the language, and the frame shape", () => {
    const g = explainer();
    const res = must(
      T.replace_group(g, { prompt: "1. As a parent, I am scared.\n2. Here is what helps." }),
    ) as { nodeId: string; characterName: string };
    const card = node(g, res.nodeId);
    assert.equal(res.characterName, "Jim");
    assert.equal(card.data.modelId, "scro:explainer");
    assert.match(card.data.prompt ?? "", /As a parent/);
    assert.equal(card.data.aspectRatio, "9:16");
    assert.equal(card.data.toolParams?.characterId, JIM);
    assert.equal(card.data.toolParams?.language, "yue");
    assert.equal(g.groups.length, 0);
    assert.equal(g.nodes.some((n) => n.id.startsWith("exp-020dc4")), false);
  });

  it("switches the on-screen character to Cathy", () => {
    const g = explainer();
    const res = must(T.replace_group(g, { prompt: "Cathy explains tax.", characterId: CATHY })) as {
      nodeId: string;
      characterName: string;
    };
    assert.equal(res.characterName, "Cathy");
    assert.equal(node(g, res.nodeId).data.toolParams?.characterId, CATHY);
  });

  it("adds a character onto an explainer that had none", () => {
    const g = graph([
      model("exp-aabbcc-frame-1", NANO_BANANA_CANVAS_MODEL_ID, { aspectRatio: "9:16", prompt: "A scale" }),
      model("exp-aabbcc-video-1", HAILUO, { aspectRatio: "9:16", durationSeconds: 6 }),
    ]);
    const res = must(T.replace_group(g, { prompt: "What is a balance scale?", characterId: CATHY })) as {
      nodeId: string;
    };
    assert.equal(node(g, res.nodeId).data.toolParams?.characterId, CATHY);
  });

  it("changes the planned length and the existing clip length", () => {
    const g = explainer();
    const groupId = g.groups.find((gr) => gr.kind === "explainer")!.id;
    must(T.update_group_nodes(g, { groupId, role: "video", durationSeconds: 8 }));
    for (const video of g.nodes.filter((n) => n.data.modelId === HAILUO)) {
      assert.equal(video.data.durationSeconds, 8);
    }
    const res = must(T.replace_group(g, { prompt: "A longer cut.", durationPreset: "60s" })) as { nodeId: string };
    assert.equal(node(g, res.nodeId).data.toolParams?.durationPreset, "60s");
    assert.equal(node(g, res.nodeId).data.toolParams?.characterId, JIM);
  });
});

describe("user changes frame image models", () => {
  it("swaps both Explainer stills to Seedream Lite and keeps the wires and the group", () => {
    const g = explainer();
    const before = findCanvasModel(NANO_BANANA_CANVAS_MODEL_ID)!;
    const after = findCanvasModel(LITE)!;
    assert.equal(estimateCanvasModelCostUsd(before), 0.0504);
    assert.equal(estimateCanvasModelCostUsd(after), 0.0525);

    const first = replaceMemberModel(g, "exp-020dc4-frame-1", LITE);
    const second = replaceMemberModel(g, "exp-020dc4-frame-2", LITE);
    assert.equal(node(g, first).data.modelId, LITE);
    assert.equal(node(g, first).data.prompt, "Hook still of Jim");
    assert.equal(node(g, second).data.prompt, "Second still of Jim");
    assert.equal(g.nodes.some((n) => n.data.modelId === NANO_BANANA_CANVAS_MODEL_ID), false);

    const group = g.groups.find((gr) => gr.kind === "explainer")!;
    assert.equal(group.id, "exp-020dc4");
    assert.ok(group.memberIds.includes(first));
    assert.ok(group.memberIds.includes(second));
    assert.ok(group.memberIds.includes("exp-020dc4-video-1"));
    assert.equal(group.memberIds.includes("exp-020dc4-frame-1"), false);

    assert.ok(g.edges.some((e) => e.source === "exp-020dc4-ref-1" && e.target === first && e.targetHandle === "refImages"));
    assert.ok(g.edges.some((e) => e.source === first && e.target === "exp-020dc4-video-1" && e.targetHandle === "startImage"));
    assert.ok(g.edges.some((e) => e.source === second && e.target === "exp-020dc4-video-2"));

    const blocked = T.add_model_node(g, { modelId: "mentalok:flux-schnell", prompt: "x" }) as { error?: string };
    assert.match(blocked.error ?? "", /Unknown model/);
  });
});

describe("user updates Swap and Teleport from the agent", () => {
  it("edits the swap instruction and length, then rebuilds it with another character", () => {
    const g = studio();
    const created = must(
      T.add_scro_group(g, {
        tool: "swap",
        videoNodeId: "clip",
        characterId: JIM,
        prompt: "wear a blue jacket",
        sectionLength: 6,
        aspectRatio: "9:16",
      }),
    ) as { groupId: string };
    must(T.update_node(g, { nodeId: bySuffix(g, created.groupId, "instruction").id, text: "wear a red jacket" }));
    must(T.update_group_nodes(g, { groupId: created.groupId, role: "trim", toolParams: { ffmpegEndSec: 10 } }));
    must(T.update_group_nodes(g, { groupId: created.groupId, role: "render", durationSeconds: 10 }));

    assert.equal(bySuffix(g, created.groupId, "instruction").data.text, "wear a red jacket");
    assert.equal(bySuffix(g, created.groupId, "trim").data.toolParams?.ffmpegEndSec, 10);
    assert.equal(bySuffix(g, created.groupId, "trim").data.toolParams?.ffmpegSpeed, 1);
    assert.equal(bySuffix(g, created.groupId, "render").data.durationSeconds, 10);

    const refused = T.replace_group(g, { prompt: "new", groupId: created.groupId }) as { error?: string };
    assert.match(refused.error ?? "", /only re-plans/);

    must(T.delete_group(g, { groupId: created.groupId }));
    assert.ok(g.nodes.some((n) => n.id === "clip"));
    const rebuilt = must(
      T.add_scro_group(g, {
        tool: "swap",
        videoNodeId: "clip",
        characterId: CATHY,
        prompt: "wear a red jacket",
        sectionLength: 10,
      }),
    ) as { groupId: string };
    const reference = g.nodes.find((n) => n.id.startsWith(`${rebuilt.groupId}-`) && n.type === "media");
    assert.equal(reference?.data.mediaUrl, `${BLOB}/${CATHY}/photo.png`);
    assert.equal(g.groups.find((gr) => gr.id === rebuilt.groupId)?.kind, "swap");
    assert.equal(g.groups.some((gr) => gr.id === created.groupId), false);
  });

  it("edits the teleport scene, mood, and length, then uses a lighter scene plate", () => {
    const g = studio();
    const created = must(
      T.add_scro_group(g, {
        tool: "teleport",
        videoNodeId: "clip",
        sceneText: "a rainy neon alley",
        prompt: "colder light",
        sectionLength: 6,
      }),
    ) as { groupId: string };
    assert.equal(bySuffix(g, created.groupId, "scene").data.modelId, SEEDREAM_MODEL_ID);

    must(T.update_node(g, { nodeId: bySuffix(g, created.groupId, "scene-prompt").id, text: "a night market, no rain" }));
    must(T.update_node(g, { nodeId: bySuffix(g, created.groupId, "mood").id, text: "warm lantern light" }));
    must(T.update_group_nodes(g, { groupId: created.groupId, role: "trim", toolParams: { ffmpegEndSec: 12 } }));
    must(T.update_group_nodes(g, { groupId: created.groupId, role: "render", durationSeconds: 12 }));

    assert.equal(bySuffix(g, created.groupId, "scene-prompt").data.text, "a night market, no rain");
    assert.equal(bySuffix(g, created.groupId, "mood").data.text, "warm lantern light");
    assert.equal(bySuffix(g, created.groupId, "render").data.durationSeconds, 12);

    const plate = replaceMemberModel(g, `${created.groupId}-scene`, LITE);
    assert.equal(node(g, plate).data.modelId, LITE);
    const group = g.groups.find((gr) => gr.id === created.groupId)!;
    assert.equal(group.kind, "teleport");
    assert.ok(group.memberIds.includes(plate));
    assert.ok(g.edges.some((e) => e.source === plate && e.target === `${created.groupId}-render` && e.targetHandle === "image"));
    assert.ok(g.nodes.some((n) => n.id === "clip"));
  });

  it("changes a Life Photo scene without rebuilding the character", () => {
    const g = studio();
    const created = must(
      T.add_scro_group(g, { tool: "life", characterId: JIM, prompt: "sitting by a cafe window" }),
    ) as { groupId: string };
    const scene = g.nodes.find((n) => n.id.startsWith(`${created.groupId}-`) && n.type === "prompt");
    assert.ok(scene);
    must(T.update_node(g, { nodeId: scene.id, text: "standing on a rooftop at dusk" }));
    assert.equal(node(g, scene.id).data.text, "standing on a rooftop at dusk");
    assert.equal(g.groups.find((gr) => gr.id === created.groupId)?.kind, "life");
    assert.ok(g.nodes.some((n) => n.data.mediaUrl === `${BLOB}/${JIM}/photo.png`));
  });
});
