import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { directorParams } from "@/service/canvas/directors/explainer-director";
import { updateExplainerDirector } from "@/service/canvas-agent/explainer-director-tool";
import { CANVAS_AGENT_TOOL_HANDLERS as T, createWorkingGraph } from "@/service/canvas-agent/tools";

function canvas() {
  const base: CanvasNode = {
    id: "exp-023928-director",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId: "scro:explainer",
      prompt: "Founder lies",
      aspectRatio: "9:16",
      toolParams: {
        plannerMode: true,
        skillSlug: "paper-cutout-explainer-video-director",
        textStyleId: "neon",
        language: "yue",
      },
    },
  };
  const director: CanvasNode = {
    ...base,
    data: {
      ...base.data,
      toolParams: {
        ...base.data.toolParams,
        plan: {
          plannerVideoId: "v1",
          plannedWith: directorParams(base),
          clips: [{ clipNumber: 1, framePrompt: "still {{text_style}}", videoPrompt: "pan", spokenLine: "搞緊啦", durationSeconds: 6, refUrls: [] }],
        },
      },
    },
  };
  const frame: CanvasNode = {
    id: "exp-023928-frame-1",
    type: "model",
    position: { x: 400, y: 0 },
    data: { modelId: "google:gemini-nano-banana-2.1", prompt: "", outputUrl: "https://blob/f.png", status: "completed" },
  };
  const voice: CanvasNode = {
    id: "exp-023928-voice-1",
    type: "model",
    position: { x: 400, y: 500 },
    data: { modelId: "scro:tts", prompt: "", outputUrl: "https://blob/v.mp3", status: "completed" },
  };
  const edges: CanvasEdge[] = [
    { id: "a", source: director.id, sourceHandle: "clip-1-frame", target: frame.id, targetHandle: "prompt" },
    { id: "b", source: director.id, sourceHandle: "clip-1-voice", target: voice.id, targetHandle: "prompt" },
  ];
  const group: CanvasGroup = {
    id: "exp-023928",
    title: "T",
    color: "lime",
    kind: "explainer",
    memberIds: [director.id, frame.id, voice.id],
    params: { characterId: "char-1", language: "yue", aspectRatio: "9:16" },
  };
  let n = 0;
  return createWorkingGraph({
    nodes: [director, frame, voice],
    edges,
    groups: [group],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    characters: [{ id: "char-1", name: "Jim", previewUrl: "https://blob/jim.png" }],
    nextId: () => `id${++n}`,
  });
}

const directorOf = (g: ReturnType<typeof canvas>) => g.nodes.find((n) => n.id === "exp-023928-director")!;

describe("update_explainer_settings on a Director", () => {
  it("text style only: no replan, and only the stills become old versions", () => {
    const g = canvas();
    const res = updateExplainerDirector(g, { textStyle: "chalk" }) as { ok: boolean; replan: boolean };
    assert.equal(res.ok, true);
    assert.equal(res.replan, false);
    assert.equal(directorOf(g).data.toolParams?.replanRequested, undefined);
    assert.equal(directorOf(g).data.toolParams?.textStyleId, "chalk");
    assert.deepEqual(g.ops.find((op) => op.kind === "mark_stale"), { kind: "mark_stale", nodeIds: ["exp-023928-frame-1"] });
  });

  it("other changes request a replan", () => {
    const g = canvas();
    const res = updateExplainerDirector(g, { presenter: "lower-left" }) as { replan: boolean };
    assert.equal(res.replan, true);
    assert.equal(directorOf(g).data.toolParams?.replanRequested, true);
    assert.equal(directorOf(g).data.toolParams?.presenterPosition, "lower-left");
  });

  it("rejects backgrounds the art style does not offer, and no-op edits", () => {
    const g = canvas();
    assert.ok("error" in updateExplainerDirector(g, { background: "cobalt" }));
    assert.ok("error" in updateExplainerDirector(g, { textStyle: "neon" }));
  });

  it("replace_group on an Explainer with a Director edits the Director instead of removing nodes", () => {
    const g = canvas();
    const res = T.replace_group(g, { groupId: "exp-023928", prompt: "New topic", durationPreset: "60s" }) as {
      ok: boolean;
      directorId: string;
    };
    assert.equal(res.ok, true);
    assert.equal(g.nodes.length, 3);
    assert.equal(directorOf(g).data.prompt, "New topic");
    assert.equal(directorOf(g).data.toolParams?.durationPreset, "60s");
    assert.equal(directorOf(g).data.toolParams?.replanRequested, true);
  });
});
