import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { upgradeLegacySettingsNodes } from "@/service/canvas/settings/migrate";

const applied = {
  skillSlug: "paper-cutout-explainer-video-director",
  backgroundId: "wood-cardboard",
  textStyleId: "handwritten",
  sceneTextLanguage: "zh-Hant",
  presenterPosition: "auto",
} as const;

describe("upgradeLegacySettingsNodes", () => {
  it("moves explainerSettings into settings with kind explainer", () => {
    const legacy = {
      id: "exp-abc123-settings",
      type: "settings",
      position: { x: 0, y: 0 },
      data: { label: "解說設定", explainerSettings: { plannerVideoId: "v1", topic: "t", applied } },
    } as unknown as CanvasNode;
    const res = upgradeLegacySettingsNodes([legacy]);
    assert.equal(res.changed, true);
    assert.deepEqual(res.nodes[0]!.data, {
      label: "解說設定",
      settings: { kind: "explainer", plannerVideoId: "v1", topic: "t", applied },
    });
    assert.equal(upgradeLegacySettingsNodes(res.nodes).changed, false);
  });
});
