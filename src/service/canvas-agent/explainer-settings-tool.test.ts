import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import type { ExplainerSettings } from "@/model/explainer-settings";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import { updateExplainerSettings } from "@/service/canvas-agent/explainer-settings-tool";
import { CANVAS_AGENT_TOOL_HANDLERS as T, createWorkingGraph } from "@/service/canvas-agent/tools";

const APPLIED: ExplainerSettings = {
  skillSlug: "paper-cutout-explainer-video-director",
  backgroundId: "wood-cardboard",
  textStyleId: "handwritten",
  sceneTextLanguage: "zh-Hant",
  presenterPosition: "auto",
};

function canvas(extra: CanvasNode[] = []) {
  const settings: CanvasNode = {
    id: "exp-023928-settings",
    type: "settings",
    position: { x: 0, y: 0 },
    data: { explainerSettings: { plannerVideoId: "v1", topic: "Founder lies", applied: APPLIED } },
  };
  const frame: CanvasNode = {
    id: "exp-023928-frame-1",
    type: "model",
    position: { x: 400, y: 0 },
    data: { modelId: "google:gemini-nano-banana-2.1", prompt: "p", aspectRatio: "9:16" },
  };
  const voice: CanvasNode = {
    id: "exp-023928-voice-1",
    type: "model",
    position: { x: 400, y: 500 },
    data: { modelId: "scro:tts", prompt: "搞緊啦", toolParams: { language: "yue" } },
  };
  const nodes = [settings, frame, voice, ...extra];
  const group: CanvasGroup = {
    id: "exp-023928",
    title: "T",
    color: "lime",
    kind: "explainer",
    memberIds: nodes.map((n) => n.id),
    params: { characterId: "char-1", language: "yue", skillSlug: APPLIED.skillSlug, aspectRatio: "9:16" },
  };
  let n = 0;
  return createWorkingGraph({
    nodes,
    edges: [],
    groups: [group],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    characters: [{ id: "char-1", name: "Jim", previewUrl: "https://blob/jim.png" }],
    nextId: () => `id${++n}`,
  });
}

describe("update_explainer_settings", () => {
  it("writes pending settings onto the settings node for the client to apply", () => {
    const g = canvas();
    const res = updateExplainerSettings(g, { background: "blueprint-paper" }) as { ok: boolean; changed: string[] };
    assert.equal(res.ok, true);
    assert.deepEqual(res.changed, ["backgroundId"]);
    const node = g.nodes.find((x) => x.id === "exp-023928-settings")!;
    assert.deepEqual(node.data.explainerSettings?.pending, { ...APPLIED, backgroundId: "blueprint-paper" });
    assert.deepEqual(node.data.explainerSettings?.applied, APPLIED);
    assert.equal(g.ops.length, 1);
    assert.equal(g.ops[0]?.kind, "update_node");
  });

  it("rejects a background the chosen art style does not offer and no-op changes", () => {
    const g = canvas();
    const bad = updateExplainerSettings(g, { background: "cobalt" }) as { error: string };
    assert.match(bad.error, /blueprint-paper/);
    assert.ok("error" in updateExplainerSettings(g, { textStyle: "handwritten" }));
  });

  it("resets the background to the new director's default when only the art style changes", () => {
    const g = canvas();
    updateExplainerSettings(g, { artStyle: "papercraft-diorama-director" });
    const pending = g.nodes.find((x) => x.type === "settings")!.data.explainerSettings?.pending;
    assert.equal(pending?.skillSlug, "papercraft-diorama-director");
    assert.equal(pending?.backgroundId, "cobalt");
  });

  it("keeps the old group's settings when replace_group re-plans it", () => {
    const g = canvas();
    const res = T.replace_group(g, { groupId: "exp-023928", prompt: "New topic" }) as { nodeId: string };
    const card = g.nodes.find((x) => x.id === res.nodeId)!;
    assert.equal(card.data.toolParams?.directorBackgroundId, "wood-cardboard");
    assert.equal(card.data.toolParams?.textStyleId, "handwritten");
    assert.equal(card.data.toolParams?.sceneTextLanguage, "zh-Hant");
    assert.equal(card.data.toolParams?.skillSlug, APPLIED.skillSlug);
  });
});
