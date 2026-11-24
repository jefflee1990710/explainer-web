import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ExplainerSettings } from "@/model/explainer-settings";
import {
  composeExplainerPlanSource,
  explainerBackgroundPresets,
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
    assert.ok(explainerBackgroundPresets("paper-cutout-explainer-video-director").some((bg) => bg.id === "studio-blue"));
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
});
