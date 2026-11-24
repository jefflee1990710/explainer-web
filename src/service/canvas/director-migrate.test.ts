import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { migrateLegacySettings } from "@/service/canvas/director-migrate";
import { isExplainerDirectorNode } from "@/service/canvas/explainer-director";

const model = (id: string, modelId: string, data: Partial<CanvasNode["data"]> = {}): CanvasNode => ({
  id,
  type: "model",
  position: { x: 100, y: 0 },
  data: { modelId, ...data },
});
const settingsNode = (id: string, settings: unknown): CanvasNode =>
  ({ id, type: "settings", position: { x: 0, y: 0 }, data: { settings } }) as unknown as CanvasNode;
const wire = (s: string, t: string): CanvasEdge => ({
  id: `${s}->${t}`,
  source: s,
  sourceHandle: "output",
  target: t,
  targetHandle: "settings",
});

describe("migrateLegacySettings", () => {
  it("writes Swap values onto the wired nodes and removes the settings node", () => {
    const nodes = [
      settingsNode("swap-1-settings", {
        kind: "swap",
        values: {
          swapMode: "object",
          objectTarget: "hat",
          sectionStart: 1,
          sectionLength: 5,
          aspectRatio: "16:9",
          gradeLook: "talking-head",
        },
      }),
      model("swap-1-trim", "ffmpeg:trim-speed"),
      model("swap-1-render", "scro:swap-render"),
      model("swap-1-grade", "ffmpeg:color-grade"),
    ];
    const edges = ["swap-1-trim", "swap-1-render", "swap-1-grade"].map((t) => wire("swap-1-settings", t));
    const groups: CanvasGroup[] = [
      { id: "swap-1", title: "S", color: "violet", kind: "swap", memberIds: nodes.map((n) => n.id) },
    ];
    const out = migrateLegacySettings({ nodes, edges, groups });
    const byId = (id: string) => out.nodes.find((n) => n.id === id);
    assert.equal(out.changed, true);
    assert.ok(!out.nodes.some((n) => n.type === "settings"));
    assert.equal(byId("swap-1-render")?.data.toolParams?.objectTarget, "hat");
    assert.equal(byId("swap-1-render")?.data.durationSeconds, 5);
    assert.equal(byId("swap-1-render")?.data.aspectRatio, "16:9");
    assert.equal(byId("swap-1-grade")?.data.toolParams?.gradeLook, "talking-head");
    assert.equal(byId("swap-1-trim")?.data.toolParams?.ffmpegEndSec, 6);
    assert.equal(out.edges.length, 0);
    assert.ok(!out.groups[0]!.memberIds.includes("swap-1-settings"));
  });

  it("puts a Teleport mood into the render prompt", () => {
    const nodes = [
      settingsNode("tp-1-settings", {
        kind: "teleport",
        values: { sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", mood: "warm lantern light", gradeLook: "jutsu" },
      }),
      model("tp-1-render", "scro:teleport-render", { prompt: "" }),
    ];
    const out = migrateLegacySettings({ nodes, edges: [wire("tp-1-settings", "tp-1-render")], groups: [] });
    assert.equal(out.nodes.find((n) => n.id === "tp-1-render")?.data.prompt, "warm lantern light");
  });

  it("turns an Explainer settings node into an idle Director and drops its frame wires", () => {
    const applied = {
      skillSlug: "paper-cutout-explainer-video-director",
      backgroundId: "wood-cardboard",
      textStyleId: "neon",
      sceneTextLanguage: "zh-Hant",
      presenterPosition: "lower-left",
    };
    const nodes = [
      settingsNode("exp-abc123-settings", { kind: "explainer", plannerVideoId: "v", topic: "LLM", applied }),
      model("exp-abc123-frame-1", "google:gemini-nano-banana-2.1", { prompt: "baked" }),
    ];
    const groups: CanvasGroup[] = [
      {
        id: "exp-abc123",
        title: "E",
        color: "rose",
        kind: "explainer",
        memberIds: nodes.map((n) => n.id),
        params: { characterId: "c1", language: "yue", aspectRatio: "9:16" },
      },
    ];
    const out = migrateLegacySettings({
      nodes,
      edges: [wire("exp-abc123-settings", "exp-abc123-frame-1")],
      groups,
    });
    const dir = out.nodes.find((n) => n.id === "exp-abc123-director")!;
    assert.equal(isExplainerDirectorNode(dir), true);
    assert.equal(dir.data.prompt, "LLM");
    assert.equal(dir.data.toolParams?.textStyleId, "neon");
    assert.equal(dir.data.toolParams?.directorBackgroundId, "wood-cardboard");
    assert.equal(dir.data.toolParams?.characterId, "c1");
    assert.equal(dir.data.toolParams?.planStatus, undefined);
    assert.equal(out.edges.length, 0);
    assert.equal(out.nodes.find((n) => n.id === "exp-abc123-frame-1")?.data.prompt, "baked");
    assert.deepEqual(out.groups[0]!.memberIds, ["exp-abc123-director", "exp-abc123-frame-1"]);
  });

  it("keeps a legacy Setting's vars as a plain Setting", () => {
    const out = migrateLegacySettings({
      nodes: [settingsNode("s", { kind: "custom", vars: { mood: "calm" } })],
      edges: [],
      groups: [],
    });
    assert.deepEqual(out.nodes[0]!.data.settings, { vars: { mood: "calm" } });
  });

  it("moves the oldest explainerSettings field into a Director", () => {
    const node = {
      id: "exp-def456-settings",
      type: "settings",
      position: { x: 0, y: 0 },
      data: { explainerSettings: { plannerVideoId: "v", topic: "Rates", applied: {} } },
    } as unknown as CanvasNode;
    const out = migrateLegacySettings({ nodes: [node], edges: [], groups: [] });
    assert.equal(out.changed, true);
    assert.equal(out.nodes[0]!.id, "exp-def456-director");
    assert.equal(out.nodes[0]!.data.prompt, "Rates");
  });

  it("leaves a migrated canvas unchanged", () => {
    const out = migrateLegacySettings({ nodes: [settingsNode("s", { vars: {} })], edges: [], groups: [] });
    assert.equal(out.changed, false);
  });
});
