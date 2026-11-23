import { explainerSettingsOf } from "@/service/canvas/settings/registry";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import type { ExplainerSettingsNodeData } from "@/model/explainer-settings";
import {
  explainerGroupsMissingSettings,
  withExplainerSettingsNodes,
} from "@/service/canvas/explainer-settings-migrate";

const node = (id: string, x: number, y: number, type: CanvasNode["type"] = "model"): CanvasNode => ({
  id,
  type,
  position: { x, y },
  data: { modelId: "x" },
});

const group = (id: string, memberIds: string[], kind: CanvasGroup["kind"] = "explainer"): CanvasGroup => ({
  id,
  title: "T",
  color: "lime",
  kind,
  memberIds,
});

const DATA: ExplainerSettingsNodeData = {
  plannerVideoId: "6b032e0000000000000023928",
  topic: "Founder lies",
  applied: {
    skillSlug: "paper-cutout-explainer-video-director",
    backgroundId: "wood-cardboard",
    textStyleId: "handwritten",
    sceneTextLanguage: "zh-Hant",
    presenterPosition: "auto",
  },
};

describe("explainer settings migration", () => {
  const nodes = [
    node("exp-023928-ref-1", 100, 50, "media"),
    node("exp-023928-frame-1", 500, 50),
    node("exp-023928-frame-2", 500, 900),
    node("exp-023928-video-1", 900, 50),
  ];
  const groups = [group("exp-023928", nodes.map((n) => n.id)), group("life-aaaaaa", ["life-aaaaaa-x"], "life")];

  it("finds Explainer groups that have frames but no settings node", () => {
    assert.deepEqual(explainerGroupsMissingSettings(nodes, groups).map((g) => g.id), ["exp-023928"]);
    const done = [...nodes, node("exp-023928-settings", 0, 0, "settings")];
    const doneGroups = [group("exp-023928", done.map((n) => n.id))];
    assert.deepEqual(explainerGroupsMissingSettings(done, doneGroups), []);
  });

  it("adds the settings node left of the group, wires every frame, and joins the group", () => {
    const res = withExplainerSettingsNodes({ nodes, edges: [], groups }, new Map([["exp-023928", DATA]]));
    const settings = res.nodes.find((n) => n.id === "exp-023928-settings");
    assert.equal(settings?.type, "settings");
    assert.deepEqual(settings?.position, { x: 100 - 390, y: 50 });
    assert.deepEqual(settings ? explainerSettingsOf(settings.data) : undefined, DATA);
    assert.deepEqual(
      res.edges.map((e) => e.target),
      ["exp-023928-frame-1", "exp-023928-frame-2"],
    );
    assert.ok(res.groups.find((g) => g.id === "exp-023928")?.memberIds.includes("exp-023928-settings"));
    assert.equal(res.changed, true);
  });

  it("leaves groups without found data alone", () => {
    const res = withExplainerSettingsNodes({ nodes, edges: [], groups }, new Map());
    assert.equal(res.changed, false);
    assert.equal(res.nodes.length, nodes.length);
  });
});
