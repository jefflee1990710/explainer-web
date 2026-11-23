import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { upgradeLegacySettingsNodes, withToolSettingsNodes } from "@/service/canvas/settings/migrate";

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

const at = { x: 400, y: 100 };
const teleportNodes: CanvasNode[] = [
  {
    id: "teleport-abc123-trim",
    type: "model",
    position: at,
    data: { modelId: "ffmpeg:trim-speed", toolParams: { ffmpegStartSec: 2, ffmpegEndSec: 8, ffmpegSpeed: 1 } },
  },
  {
    id: "teleport-abc123-render",
    type: "model",
    position: at,
    data: { modelId: "scro:teleport-render", aspectRatio: "16:9", durationSeconds: 6, outputUrl: "https://x/out.mp4" },
  },
  {
    id: "teleport-abc123-grade",
    type: "model",
    position: at,
    data: { modelId: "ffmpeg:color-grade", toolParams: { gradeLook: "jutsu" } },
  },
  { id: "teleport-abc123-mood", type: "prompt", position: at, data: { text: "neon rain" } },
];
const teleportEdges: CanvasEdge[] = [
  { id: "m", source: "teleport-abc123-mood", sourceHandle: "output", target: "teleport-abc123-render", targetHandle: "prompt" },
  { id: "rg", source: "teleport-abc123-render", sourceHandle: "output", target: "teleport-abc123-grade", targetHandle: "video" },
];
const teleportGroup: CanvasGroup = {
  id: "teleport-abc123",
  title: "Teleport",
  color: "sky",
  kind: "teleport",
  memberIds: teleportNodes.map((n) => n.id),
};

describe("withToolSettingsNodes", () => {
  it("adds a Teleport settings node from the existing nodes and moves the mood into it", () => {
    const res = withToolSettingsNodes({ nodes: teleportNodes, edges: teleportEdges, groups: [teleportGroup] });
    assert.equal(res.changed, true);
    const settings = res.nodes.find((n) => n.id === "teleport-abc123-settings")!;
    assert.deepEqual(settings.data.settings, {
      kind: "teleport",
      values: { sectionStart: 2, sectionLength: 6, aspectRatio: "16:9", mood: "neon rain", gradeLook: "jutsu" },
    });
    assert.ok(!res.nodes.some((n) => n.id === "teleport-abc123-mood"));
    assert.ok(!res.edges.some((e) => e.id === "m"));
    assert.deepEqual(
      res.edges.filter((e) => e.targetHandle === "settings").map((e) => e.target).sort(),
      ["teleport-abc123-grade", "teleport-abc123-render", "teleport-abc123-trim"],
    );
    assert.equal(res.groups[0]!.memberIds[0], "teleport-abc123-settings");
    assert.ok(!res.groups[0]!.memberIds.includes("teleport-abc123-mood"));
    assert.equal(res.nodes.find((n) => n.id === "teleport-abc123-render")!.data.staleOutputUrl, undefined);
  });

  it("reads Swap values from the render tool params and leaves a group that has settings alone", () => {
    const swapNodes: CanvasNode[] = [
      {
        id: "swap-def456-grade",
        type: "model",
        position: at,
        data: { modelId: "ffmpeg:color-grade", toolParams: { gradeLook: "jutsu" } },
      },
      {
        id: "swap-def456-render",
        type: "model",
        position: at,
        data: {
          modelId: "scro:swap-render",
          aspectRatio: "9:16",
          durationSeconds: 8,
          toolParams: { swapMode: "relight", lightLookId: "golden_halo" },
        },
      },
    ];
    const group: CanvasGroup = {
      id: "swap-def456",
      title: "Swap",
      color: "violet",
      kind: "swap",
      memberIds: swapNodes.map((n) => n.id),
    };
    const res = withToolSettingsNodes({ nodes: swapNodes, edges: [], groups: [group] });
    assert.deepEqual(res.nodes.find((n) => n.id === "swap-def456-settings")!.data.settings, {
      kind: "swap",
      values: {
        swapMode: "relight",
        lightLookId: "golden_halo",
        sectionStart: 0,
        sectionLength: 8,
        aspectRatio: "9:16",
        gradeLook: "jutsu",
      },
    });
    assert.equal(withToolSettingsNodes(res).changed, false);
  });
});
