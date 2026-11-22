import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GROUP_ESTIMATED_SIZE } from "@/service/canvas/group-layout";
import { concatBatches } from "@/service/canvas/scro-groups/concat-chain";
import {
  buildTalkingHeadExpansion,
  type TalkingHeadExpansionInput,
} from "@/service/canvas/scro-groups/talking-head";

const input = (clipCount: number, framing = "collarbone-close"): TalkingHeadExpansionInput => ({
  idPrefix: "th",
  origin: { x: 0, y: 0 },
  aspectRatio: "9:16",
  language: "yue",
  characterId: "c1",
  voicePreset: "alan",
  framing,
  framePrompt: "opening still",
  clips: Array.from({ length: clipCount }, (_, i) => ({
    clipNumber: i + 1,
    spokenLine: `line ${i + 1}`,
    heygenPrompt: `hg ${i + 1}`,
  })),
});

const byModel = (nodes: ReturnType<typeof buildTalkingHeadExpansion>["nodes"], id: string) =>
  nodes.filter((n) => n.data.modelId === id);

describe("buildTalkingHeadExpansion", () => {
  it("wires reference images into the Seedream opening still in order", () => {
    const out = buildTalkingHeadExpansion({
      ...input(1),
      frameResolution: "2k",
      frameRefUrls: ["https://lock.png", "https://photo.png", "https://lock.png"],
    });
    const frame = out.nodes.find((n) => n.id === "th-frame-1")!;
    assert.equal(frame.data.modelId, "openrouter:bytedance-seed/seedream-5-0-pro");
    assert.equal(frame.data.resolution, "2k");
    const refs = out.edges
      .filter((e) => e.target === frame.id && e.targetHandle === "refImages")
      .map((e) => out.nodes.find((n) => n.id === e.source)!.data.mediaUrl);
    assert.deepEqual(refs, ["https://lock.png", "https://photo.png"]);
  });

  it("wires one shared frame into every clip's HeyGen node", () => {
    const out = buildTalkingHeadExpansion(input(2));
    assert.equal(byModel(out.nodes, "openrouter:bytedance-seed/seedream-5-0-pro").length, 1);
    const tts = byModel(out.nodes, "scro:tts");
    assert.equal(tts.length, 2);
    assert.deepEqual(tts[0]!.data.toolParams, {
      language: "yue",
      voicePreset: "alan",
      ttsConversational: true,
      characterId: "c1",
    });
    const videos = byModel(out.nodes, "openrouter:heygen/avatar-iv");
    assert.deepEqual(videos.map((n) => n.data.prompt), ["hg 1", "hg 2"]);
    assert.equal(byModel(out.nodes, "ffmpeg:smooth-silence").length, 2);
    const grades = byModel(out.nodes, "ffmpeg:color-grade");
    assert.deepEqual(grades.map((n) => n.data.toolParams?.gradeLook), ["talking-head", "talking-head"]);
    assert.equal(byModel(out.nodes, "ffmpeg:concat").length, 1);

    const edge = (s: string, t: string, h: string) =>
      out.edges.some((e) => e.source === `th-${s}` && e.target === `th-${t}` && e.targetHandle === h);
    assert.ok(edge("frame-1", "video-1", "startImage"));
    assert.ok(edge("frame-1", "video-2", "startImage"));
    assert.ok(edge("voice-2", "video-2", "refAudio"));
    assert.ok(edge("video-1", "silence-1", "video"));
    assert.ok(edge("silence-1", "grade-1", "video"));
    const concatInputs = out.edges.filter((e) => e.target === "th-concat-1").map((e) => e.source);
    assert.deepEqual(concatInputs, ["th-grade-1", "th-grade-2"]);
    assert.deepEqual(out.expandedNodeIds, out.nodes.map((n) => n.id));
  });

  it("uses the selfie grade for handheld-selfie framing", () => {
    const out = buildTalkingHeadExpansion(input(1, "handheld-selfie"));
    assert.equal(byModel(out.nodes, "ffmpeg:color-grade")[0]!.data.toolParams?.gradeLook, "talking-head-selfie");
  });

  it("skips concat for one clip and chains concats past eight clips", () => {
    assert.equal(byModel(buildTalkingHeadExpansion(input(1)).nodes, "ffmpeg:concat").length, 0);
    const ten = buildTalkingHeadExpansion(input(10));
    assert.equal(byModel(ten.nodes, "ffmpeg:concat").length, 2);
    assert.ok(ten.edges.some((e) => e.source === "th-concat-1" && e.target === "th-concat-2"));
  });

  it("lays nodes out without overlap", () => {
    const { nodes } = buildTalkingHeadExpansion(input(3));
    const { width, height } = GROUP_ESTIMATED_SIZE.model;
    for (const a of nodes) {
      for (const b of nodes) {
        if (a.id >= b.id) continue;
        const overlap =
          Math.abs(a.position.x - b.position.x) < width && Math.abs(a.position.y - b.position.y) < height;
        assert.ok(!overlap, `${a.id} overlaps ${b.id}`);
      }
    }
  });
});

describe("concatBatches", () => {
  it("fills 8 then 7 per chained concat", () => {
    const items = Array.from({ length: 16 }, (_, i) => `c${i}`);
    assert.deepEqual(concatBatches(items).map((b) => b.length), [8, 7, 1]);
    assert.deepEqual(concatBatches([]), [[]]);
  });
});
