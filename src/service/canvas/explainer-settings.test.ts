import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import type { ExplainerSettings } from "@/model/explainer-settings";
import {
  buildExplainerReplanCard,
  buildExplainerSettingsNode,
  composeExplainerPlanSource,
  explainerBackgroundPresets,
  explainerSettingsChanges,
  explainerSettingsEdges,
  explainerSettingsFromToolParams,
  explainerSettingsFromVideo,
  explainerSettingsToolParams,
  explainerVideoLookFields,
  normalizeExplainerSettings,
  topicFromPlanSource,
} from "@/service/canvas/explainer-settings";

const PAPER: ExplainerSettings = {
  skillSlug: "paper-cutout-explainer-video-director",
  backgroundId: "wood-cardboard",
  textStyleId: "handwritten",
  sceneTextLanguage: "zh-Hant",
  presenterPosition: "auto",
};

describe("explainer settings", () => {
  it("offers each director's preset backgrounds and none for the whiteboard", () => {
    assert.ok(explainerBackgroundPresets("paper-cutout-explainer-video-director").some((bg) => bg.id === "blueprint-paper"));
    assert.equal(explainerBackgroundPresets("papercraft-diorama-director").length, 6);
    assert.equal(explainerBackgroundPresets("cartoon-explainer-video-director").length, 0);
  });

  it("normalizes unknown values and a background that belongs to another director", () => {
    assert.deepEqual(normalizeExplainerSettings({ skillSlug: "nope", textStyleId: "x" }), {
      skillSlug: "cartoon-explainer-video-director",
      textStyleId: "handwritten",
      sceneTextLanguage: "zh-Hant",
      presenterPosition: "auto",
    });
    assert.equal(
      normalizeExplainerSettings({ skillSlug: "papercraft-diorama-director", backgroundId: "wood-cardboard" }).backgroundId,
      "cobalt",
    );
    assert.equal(normalizeExplainerSettings({ ...PAPER, backgroundId: "sky" }).backgroundId, "sky");
  });

  it("restyles in place only when the text style is the sole change", () => {
    assert.deepEqual(explainerSettingsChanges(PAPER, { ...PAPER, textStyleId: "neon" }), {
      changed: ["textStyleId"],
      restyleOnly: true,
    });
    const both = explainerSettingsChanges(PAPER, { ...PAPER, textStyleId: "neon", backgroundId: "sky" });
    assert.equal(both.restyleOnly, false);
    assert.deepEqual(both.changed.sort(), ["backgroundId", "textStyleId"]);
    assert.deepEqual(explainerSettingsChanges(PAPER, PAPER), { changed: [], restyleOnly: false });
  });

  it("appends presenter and narration blocks that topicFromPlanSource strips again", () => {
    const source = composeExplainerPlanSource({
      topic: "  Founders say things are moving  ",
      presenterPosition: "lower-right",
      narration: ["第一句", "第二句"],
    });
    assert.match(source, /^Founders say things are moving\n/);
    assert.match(source, /lower-right presenter zone/);
    assert.match(source, /1\. 第一句\n2\. 第二句/);
    assert.equal(topicFromPlanSource(source), "Founders say things are moving");
    assert.equal(
      composeExplainerPlanSource({ topic: "T", presenterPosition: "auto", narration: [] }),
      "T",
    );
  });

  it("round-trips settings through planner toolParams", () => {
    const tp = explainerSettingsToolParams({ ...PAPER, backgroundId: "sky", presenterPosition: "lower-left" });
    assert.deepEqual(tp, {
      skillSlug: "paper-cutout-explainer-video-director",
      directorBackgroundId: "sky",
      textStyleId: "handwritten",
      sceneTextLanguage: "zh-Hant",
      presenterPosition: "lower-left",
    });
    assert.deepEqual(explainerSettingsFromToolParams(tp), { ...PAPER, backgroundId: "sky", presenterPosition: "lower-left" });
  });

  it("maps planner toolParams onto backing-video look fields", () => {
    assert.deepEqual(
      explainerVideoLookFields(
        { directorBackgroundId: "sky", textStyleId: "neon", sceneTextLanguage: "none" },
        "paper-cutout-explainer-video-director",
        "yue",
      ),
      {
        directorBackgroundId: "sky",
        subtitleLook: "neon",
        textStyleId: "neon",
        onScreenTextStyleId: "neon",
        sceneTextEnabled: false,
        sceneTextLanguage: "zh-Hant",
      },
    );
    // Old cards without settings plan exactly as before.
    assert.deepEqual(explainerVideoLookFields({ directorBackgroundId: "cobalt" }, "paper-cutout-explainer-video-director", "en"), {
      subtitleLook: "handwritten",
      textStyleId: "handwritten",
      sceneTextEnabled: true,
      sceneTextLanguage: "en",
    });
  });

  it("reads settings from the backing video", () => {
    assert.deepEqual(
      explainerSettingsFromVideo({
        skillSlug: "paper-cutout-explainer-video-director",
        subtitleLook: "handwritten",
        sceneTextEnabled: true,
        sceneTextLanguage: "zh-Hant",
        source: composeExplainerPlanSource({ topic: "T", presenterPosition: "lower-left", narration: [] }),
      }),
      { ...PAPER, presenterPosition: "lower-left" },
    );
    assert.equal(
      explainerSettingsFromVideo({ skillSlug: "cartoon-explainer-video-director", sceneTextEnabled: false }).sceneTextLanguage,
      "none",
    );
  });

  it("builds the settings node and its edges into every frame", () => {
    const node = buildExplainerSettingsNode({
      groupId: "exp-abc123",
      position: { x: -400, y: 0 },
      data: { plannerVideoId: "v1", topic: "T", applied: PAPER },
    });
    assert.equal(node.id, "exp-abc123-settings");
    assert.equal(node.type, "settings");
    assert.equal(node.data.explainerSettings?.plannerVideoId, "v1");
    assert.deepEqual(explainerSettingsEdges("exp-abc123", ["exp-abc123-frame-1"]), [
      {
        id: "exp-abc123-settings->exp-abc123-frame-1:settings",
        source: "exp-abc123-settings",
        sourceHandle: "output",
        target: "exp-abc123-frame-1",
        targetHandle: "settings",
      },
    ]);
  });

  it("builds a re-plan card that keeps the narration, character, and new settings", () => {
    const voice = (n: number, line: string): CanvasNode => ({
      id: `exp-abc123-voice-${n}`,
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: "scro:tts", prompt: line, toolParams: { language: "yue" } },
    });
    const group: CanvasGroup = {
      id: "exp-abc123",
      title: "T",
      color: "lime",
      kind: "explainer",
      memberIds: ["exp-abc123-voice-2", "exp-abc123-voice-1"],
      params: { characterId: "char-1", language: "yue", durationPreset: "30s", aspectRatio: "9:16" },
    };
    const card = buildExplainerReplanCard({
      nodes: [voice(2, "second"), voice(1, "first")],
      group,
      settings: { plannerVideoId: "v1", topic: "Founder lies", applied: PAPER },
      next: { ...PAPER, backgroundId: "sky" },
      cardId: "model-new",
      position: { x: 10, y: 20 },
    });
    assert.equal(card.id, "model-new");
    assert.equal(card.data.modelId, "scro:explainer");
    assert.equal(card.data.aspectRatio, "9:16");
    assert.match(card.data.prompt ?? "", /^Founder lies\n[\s\S]*1\. first\n2\. second/);
    assert.deepEqual(card.data.toolParams, {
      plannerMode: true,
      characterId: "char-1",
      language: "yue",
      durationPreset: "30s",
      skillSlug: "paper-cutout-explainer-video-director",
      directorBackgroundId: "sky",
      textStyleId: "handwritten",
      sceneTextLanguage: "zh-Hant",
      presenterPosition: "auto",
    });
  });
});
