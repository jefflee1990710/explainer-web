import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  directorChangedTargets,
  directorHandles,
  directorNeedsReplan,
  directorNodeWithWiredCharacter,
  directorParams,
  directorRawOutput,
  explainerNodeWithWiredTopic,
  isExplainerDirectorNode,
  isPlanDirectorNode,
  parseDirectorHandle,
  planDirectorParams,
  readDirectorPlan,
  wiredDirectorCharacter,
  wiredDirectorReferenceImage,
  withoutDirectorCharacterEdges,
  type ExplainerDirectorPlan,
} from "@/service/canvas/directors/explainer-director";
import { isTalkingHeadDirectorNode, talkingHeadDirectorParams } from "@/service/canvas/directors/talking-head-director";

function director(toolParams: Record<string, unknown> = {}, prompt = "How LLMs work"): CanvasNode {
  return {
    id: "dir",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId: "scro:explainer",
      prompt,
      aspectRatio: "9:16",
      toolParams: {
        plannerMode: true,
        skillSlug: "paper-cutout-explainer-video-director",
        textStyleId: "neon",
        ...toolParams,
      },
    },
  };
}

function plan(n: number, base: CanvasNode): ExplainerDirectorPlan {
  return {
    plannerVideoId: "v1",
    plannedWith: directorParams(base),
    clips: Array.from({ length: n }, (_, i) => ({
      clipNumber: i + 1,
      framePrompt: `still ${i + 1} {{text_style}}`,
      videoPrompt: `motion ${i + 1}`,
      spokenLine: `line ${i + 1}`,
      durationSeconds: 6,
      refUrls: [],
    })),
  };
}

describe("explainer director", () => {
  it("recognizes only planner-mode explainer nodes", () => {
    assert.equal(isExplainerDirectorNode(director()), true);
    const talking = { ...director(), data: { ...director().data, modelId: "scro:talking-head" } };
    assert.equal(isExplainerDirectorNode(talking), false);
  });

  it("reads a valid plan and lists three handles per clip", () => {
    const base = director();
    const node = director({ plan: plan(2, base) });
    assert.deepEqual(directorHandles(readDirectorPlan(node)!), [
      "clip-1-frame",
      "clip-1-motion",
      "clip-1-voice",
      "clip-2-frame",
      "clip-2-motion",
      "clip-2-voice",
    ]);
    assert.equal(readDirectorPlan(director({ plan: { clips: "bad" } })), undefined);
    assert.deepEqual(parseDirectorHandle("clip-12-voice"), { clipNumber: 12, kind: "voice" });
    assert.equal(parseDirectorHandle("output"), undefined);
  });

  it("returns each output's raw text", () => {
    const base = director();
    const node = director({ plan: plan(1, base) });
    assert.equal(directorRawOutput(node, "clip-1-frame"), "still 1 {{text_style}}");
    assert.equal(directorRawOutput(node, "clip-1-voice"), "line 1");
    assert.equal(directorRawOutput(node, "clip-9-voice"), undefined);
  });

  it("treats a blank length as Auto, and a fixed length as a different plan", () => {
    const base = director();
    assert.equal(directorParams(base).durationPreset, "auto");
    const omitted = {
      ...plan(1, base).plannedWith,
    } as { durationPreset?: string };
    delete omitted.durationPreset;
    const old = { ...plan(1, base), plannedWith: omitted };
    assert.equal(directorNeedsReplan(director({ plan: old })), false);
    assert.equal(directorNeedsReplan(director({ plan: old, durationPreset: "15s" })), true);
    const fixed = director({ durationPreset: "30s" });
    assert.equal(directorNeedsReplan(director({ durationPreset: "auto", plan: plan(1, fixed) })), true);
  });

  it("uses a connected topic even after the card was edited", () => {
    const node = director({ promptEdited: true }, "typed on the card");
    assert.equal(explainerNodeWithWiredTopic(node, undefined).data.prompt, "typed on the card");
    assert.equal(explainerNodeWithWiredTopic(node, "from the text node").data.prompt, "from the text node");
    assert.equal(explainerNodeWithWiredTopic(node, "").data.prompt, "");
  });

  it("needs a replan when any parameter but the text style changed", () => {
    const base = director();
    const planned = director({ plan: plan(1, base) });
    assert.equal(directorNeedsReplan(planned), false);
    assert.equal(directorNeedsReplan(director({ plan: plan(1, base), textStyleId: "chalk" })), false);
    assert.equal(directorNeedsReplan(director({ plan: plan(1, base), presenterPosition: "lower-left" })), true);
    assert.equal(directorNeedsReplan({ ...planned, data: { ...planned.data, prompt: "New topic" } }), true);
    assert.equal(directorNeedsReplan(director()), false);
  });

  it("plans with the style's default background when none is saved", () => {
    const papercraft = director({ skillSlug: "papercraft-diorama-director" });
    assert.equal(directorParams(papercraft).directorBackgroundId, "cobalt");
    assert.equal(directorParams(director({ skillSlug: "cartoon-explainer-video-director" })).directorBackgroundId, undefined);
  });

  it("needs a replan when an older papercraft plan had no colour lock", () => {
    const papercraft = director({ skillSlug: "papercraft-diorama-director" });
    const { directorBackgroundId: _bg, ...unlocked } = directorParams(papercraft);
    const old = { ...plan(1, papercraft), plannedWith: unlocked };
    assert.equal(directorNeedsReplan(director({ skillSlug: "papercraft-diorama-director", plan: old })), true);
    // Paper-cutout stills already fell back to the default sheet, so an older plan stays current.
    const cutout = director();
    const { directorBackgroundId: _cut, ...cutoutOld } = directorParams(cutout);
    assert.equal(directorNeedsReplan(director({ plan: { ...plan(1, cutout), plannedWith: cutoutOld } })), false);
  });

  it("lists targets whose wired output text changed", () => {
    const base = director();
    const before = director({ plan: plan(1, base) });
    const after = director({ plan: plan(1, base), textStyleId: "chalk" });
    const edges: CanvasEdge[] = [
      { id: "a", source: "dir", sourceHandle: "clip-1-frame", target: "frame", targetHandle: "prompt" },
      { id: "b", source: "dir", sourceHandle: "clip-1-motion", target: "video", targetHandle: "prompt" },
    ];
    assert.deepEqual(directorChangedTargets(before, after, edges), ["frame"]);
  });

  it("reads an optional wired character and lets it replace the dropdown", () => {
    const nodes: CanvasNode[] = [
      {
        id: "jim",
        type: "character",
        position: { x: 0, y: 0 },
        data: { characterId: "jim-id", label: "Jim" },
      },
      { id: "photo", type: "media", position: { x: 0, y: 0 }, data: { mediaKind: "image", mediaUrl: "https://x/p.png" } },
    ];
    const wired = [{ source: "jim", target: "dir", targetHandle: "character" }];
    assert.deepEqual(wiredDirectorCharacter("dir", nodes, wired), {
      nodeId: "jim",
      characterId: "jim-id",
      label: "Jim",
    });
    assert.equal(
      wiredDirectorCharacter("dir", nodes, [{ source: "photo", target: "dir", targetHandle: "character" }]),
      undefined,
    );
    const node = director({ characterId: "dropdown" });
    const next = directorNodeWithWiredCharacter(node, nodes, wired);
    assert.equal(next.data.toolParams?.characterId, "jim-id");
    assert.equal(directorNodeWithWiredCharacter(node, nodes, []).data.toolParams?.characterId, "dropdown");
  });

  it("reads the reference image wired into the Director, and skips a 參考圖 card name", () => {
    const nodes: CanvasNode[] = [
      {
        id: "shot",
        type: "media",
        position: { x: 0, y: 0 },
        data: { label: "參考圖 1", fileName: "參考圖 1", mediaKind: "image", mediaUrl: "https://x/hero.png" },
      },
    ];
    assert.deepEqual(
      wiredDirectorReferenceImage("dir", nodes, [{ source: "shot", target: "dir", targetHandle: "refImages" }]),
      { nodeId: "shot", url: "https://x/hero.png" },
    );
    assert.equal(
      wiredDirectorReferenceImage("dir", nodes, [{ source: "shot", target: "dir", targetHandle: "prompt" }]),
      undefined,
    );
  });

  it("drops a character wire into an Explainer or Talking Head Director", () => {
    const nodes = [director(), { ...director(), id: "th", data: { ...director().data, modelId: "scro:talking-head" } }];
    const edges = [
      { target: "dir", targetHandle: "character" },
      { target: "th", targetHandle: "character" },
      { target: "dir", targetHandle: "settings" },
    ];
    assert.deepEqual(
      withoutDirectorCharacterEdges(nodes, edges).map((e) => `${e.target}:${e.targetHandle}`),
      ["dir:settings"],
    );
  });
});

describe("talking head director", () => {
  const thDirector = (toolParams: Record<string, unknown> = {}, prompt = "Hello camera"): CanvasNode => ({
    id: "th",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId: "scro:talking-head",
      prompt,
      aspectRatio: "9:16",
      toolParams: { plannerMode: true, characterId: "c1", language: "yue", framing: "collarbone-close", ...toolParams },
    },
  });
  const thPlan = (base: CanvasNode): ExplainerDirectorPlan => ({
    plannerVideoId: "v1",
    plannedWith: planDirectorParams(base),
    clips: [1, 2].map((n) => ({
      clipNumber: n,
      framePrompt: n === 1 ? "opening still" : "",
      videoPrompt: `motion ${n}`,
      spokenLine: `line ${n}`,
      durationSeconds: 8,
      refUrls: [],
    })),
  });

  it("is a plan Director but not an Explainer Director", () => {
    assert.equal(isTalkingHeadDirectorNode(thDirector()), true);
    assert.equal(isPlanDirectorNode(thDirector()), true);
    assert.equal(isExplainerDirectorNode(thDirector()), false);
    assert.equal(isPlanDirectorNode(director()), true);
    assert.equal(isTalkingHeadDirectorNode(thDirector({ plannerMode: false })), false);
  });

  it("outputs one shared opening still plus motion and script per clip", () => {
    const node = thDirector({ plan: thPlan(thDirector()) });
    assert.deepEqual(directorHandles(readDirectorPlan(node)!), [
      "clip-1-frame",
      "clip-1-motion",
      "clip-1-voice",
      "clip-2-motion",
      "clip-2-voice",
    ]);
    assert.equal(directorRawOutput(node, "clip-1-frame"), "opening still");
    assert.equal(directorRawOutput(node, "clip-2-voice"), "line 2");
  });

  it("needs a replan when the script, character, language, framing, or ratio changed", () => {
    const base = thDirector();
    const planned = thDirector({ plan: thPlan(base) });
    assert.deepEqual(talkingHeadDirectorParams(base), {
      script: "Hello camera",
      characterId: "c1",
      language: "yue",
      framing: "collarbone-close",
      aspectRatio: "9:16",
    });
    assert.equal(directorNeedsReplan(planned), false);
    assert.equal(directorNeedsReplan(thDirector({ plan: thPlan(base) }, "New script")), true);
    assert.equal(directorNeedsReplan(thDirector({ plan: thPlan(base), framing: "handheld-selfie" })), true);
    assert.equal(directorNeedsReplan(thDirector({ plan: thPlan(base), characterId: "c2" })), true);
    assert.equal(directorNeedsReplan({ ...planned, data: { ...planned.data, aspectRatio: "16:9" } }), true);
  });
});
