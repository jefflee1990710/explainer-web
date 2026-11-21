import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXPLAINER_HAILUO_MODEL_ID,
  buildExplainerExpansion,
  explainerVoicePreset,
  replacePlannerWithExpansion,
  type ExplainerExpansionClip,
} from "@/service/canvas/explainer-expand";

function clips(n: number, silent: number[] = []): ExplainerExpansionClip[] {
  return Array.from({ length: n }, (_, i) => ({
    clipNumber: i + 1,
    framePrompt: `frame ${i + 1}`,
    videoPrompt: `video ${i + 1}`,
    durationSeconds: i === 0 ? 3 : 20,
    spokenLine: silent.includes(i + 1) ? "(no dialogue)" : `line ${i + 1}`,
  }));
}

const base = {
  idPrefix: "x",
  origin: { x: 100, y: 50 },
  plannerVideoId: "vid1",
  aspectRatio: "9:16" as const,
  language: "en" as const,
  voicePreset: "bella",
};

describe("buildExplainerExpansion", () => {
  it("builds frame, voice, video, mux per clip and one concat for 3 clips", () => {
    const out = buildExplainerExpansion({ ...base, clips: clips(3) });
    const byModel = (id: string) => out.nodes.filter((n) => n.data.modelId === id);
    assert.equal(byModel("scro:explainer-frame").length, 3);
    assert.equal(byModel("scro:tts").length, 3);
    assert.equal(byModel(EXPLAINER_HAILUO_MODEL_ID).length, 3);
    assert.equal(byModel("ffmpeg:audio-mux").length, 3);
    assert.equal(byModel("ffmpeg:concat").length, 1);
    assert.equal(out.edges.length, 3 * 4);
    assert.deepEqual(out.expandedNodeIds, out.nodes.map((n) => n.id));
    assert.equal(new Set(out.nodes.map((n) => n.id)).size, out.nodes.length);
  });

  it("prefills prompts, params, and clamps durations to 5-15", () => {
    const out = buildExplainerExpansion({ ...base, characterId: "char1", clips: clips(2) });
    const frame = out.nodes.find((n) => n.data.modelId === "scro:explainer-frame")!;
    assert.equal(frame.data.prompt, "frame 1");
    assert.deepEqual(frame.data.toolParams, { plannerVideoId: "vid1", clipNumber: 1 });
    const videos = out.nodes.filter((n) => n.data.modelId === EXPLAINER_HAILUO_MODEL_ID);
    assert.deepEqual(videos.map((v) => v.data.durationSeconds), [5, 15]);
    assert.equal(videos[0]!.data.prompt, "video 1");
    const tts = out.nodes.find((n) => n.data.modelId === "scro:tts")!;
    assert.equal(tts.data.prompt, "line 1");
    assert.deepEqual(tts.data.toolParams, {
      language: "en",
      voicePreset: "bella",
      ttsSpeed: 1.25,
      characterId: "char1",
    });
  });

  it("wires silent clips straight into concat", () => {
    const out = buildExplainerExpansion({ ...base, clips: clips(2, [2]) });
    assert.equal(out.nodes.filter((n) => n.data.modelId === "scro:tts").length, 1);
    const concat = out.nodes.find((n) => n.data.modelId === "ffmpeg:concat")!;
    const video2 = out.nodes.filter((n) => n.data.modelId === EXPLAINER_HAILUO_MODEL_ID)[1]!;
    assert.ok(out.edges.some((e) => e.source === video2.id && e.target === concat.id && e.targetHandle === "videos"));
  });

  it("chains concat nodes so none exceeds 8 inputs", () => {
    for (const n of [9, 12, 16]) {
      const out = buildExplainerExpansion({ ...base, clips: clips(n) });
      const concats = out.nodes.filter((node) => node.data.modelId === "ffmpeg:concat");
      for (const c of concats) {
        const inputs = out.edges.filter((e) => e.target === c.id).length;
        assert.ok(inputs <= 8, `concat ${c.id} has ${inputs} inputs for n=${n}`);
      }
      const finals = concats.filter((c) => !out.edges.some((e) => e.source === c.id));
      assert.equal(finals.length, 1);
    }
  });
});

describe("replacePlannerWithExpansion", () => {
  it("removes the planning card and its wires, then adds new nodes once", () => {
    const graph = {
      nodes: [{ id: "topic" }, { id: "plan" }, { id: "keep" }],
      edges: [
        { id: "e1", source: "topic", target: "plan" },
        { id: "e2", source: "topic", target: "keep" },
      ],
    };
    const expansion = {
      nodes: [{ id: "f1" }, { id: "keep" }],
      edges: [{ id: "e3", source: "f1", target: "keep" }],
    };
    const out = replacePlannerWithExpansion(graph, "plan", expansion);
    assert.deepEqual(out.nodes.map((n) => n.id), ["topic", "keep", "f1"]);
    assert.deepEqual(out.edges.map((e) => e.id), ["e2", "e3"]);
  });

  it("starts the first row at the planning card position", () => {
    const out = buildExplainerExpansion({ ...base, clips: clips(1) });
    const frame = out.nodes.find((n) => n.data.modelId === "scro:explainer-frame")!;
    assert.deepEqual(frame.position, base.origin);
  });
});

describe("explainerVoicePreset", () => {
  it("maps language and gender to narrator presets", () => {
    assert.equal(explainerVoicePreset("yue", "female"), "cathy");
    assert.equal(explainerVoicePreset("yue", "male"), "alan");
    assert.equal(explainerVoicePreset("zh", "female"), "una");
    assert.equal(explainerVoicePreset("zh", "male"), "yu");
    assert.equal(explainerVoicePreset("en", "male"), "brian");
    assert.equal(explainerVoicePreset("en"), "bella");
  });
});
