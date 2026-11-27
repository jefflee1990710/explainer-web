import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fusedOutputRef, isFusedOutputRef, planFusedChain } from "@/service/canvas/core/chain-fusion";

const model = (id: string, modelId: string) => ({ id, type: "model", data: { modelId } });
const wire = (source: string, target: string, targetHandle = "video", sourceHandle = "output") => ({
  source,
  target,
  sourceHandle,
  targetHandle,
});

const nodes = [
  { id: "src", type: "media", data: { mediaUrl: "https://blob/x.mp4" } },
  model("trim", "ffmpeg:trim-speed"),
  model("crop", "ffmpeg:crop"),
  model("fade", "ffmpeg:fade"),
  model("export", "ffmpeg:export"),
];

describe("planFusedChain", () => {
  it("follows a straight run of single-input FFmpeg nodes, ending at an export", () => {
    const edges = [wire("src", "trim"), wire("trim", "crop"), wire("crop", "fade"), wire("fade", "export")];
    const chain = planFusedChain({ nodes, edges, headId: "trim", willRun: () => true });
    assert.deepEqual(chain, ["trim", "crop", "fade", "export"]);
  });

  it("stops where a node feeds two consumers or a non-video port", () => {
    const branch = [wire("trim", "crop"), wire("crop", "fade"), wire("crop", "export")];
    assert.deepEqual(planFusedChain({ nodes, edges: branch, headId: "trim", willRun: () => true }), ["trim", "crop"]);
    const mux = [
      ...nodes,
      model("mux", "ffmpeg:audio-mux"),
    ];
    const toAudio = [wire("trim", "mux", "refAudio")];
    assert.deepEqual(planFusedChain({ nodes: mux, edges: toAudio, headId: "trim", willRun: () => true }), ["trim"]);
  });

  it("skips nodes this flow will not run and inputs still being made", () => {
    const edges = [wire("trim", "crop"), wire("crop", "fade")];
    assert.deepEqual(
      planFusedChain({ nodes, edges, headId: "trim", willRun: (id) => id !== "crop" }),
      ["trim"],
    );
    const withMusic = [...nodes, model("tts", "scro:tts"), model("mix", "ffmpeg:audio-mix")];
    const mixEdges = [wire("trim", "mix"), wire("tts", "mix", "refAudio")];
    assert.deepEqual(
      planFusedChain({ nodes: withMusic, edges: mixEdges, headId: "trim", willRun: () => true }),
      ["trim"],
    );
    assert.deepEqual(
      planFusedChain({ nodes: withMusic, edges: mixEdges, headId: "trim", willRun: (id) => id !== "tts" }),
      ["trim", "mix"],
    );
  });

  it("never continues past a non-mp4 step, a claimed node, or the step cap", () => {
    const afterExport = [...nodes, model("crop2", "ffmpeg:crop")];
    const edges = [wire("fade", "export"), wire("export", "crop2")];
    assert.deepEqual(planFusedChain({ nodes: afterExport, edges, headId: "fade", willRun: () => true }), [
      "fade",
      "export",
    ]);
    const line = [wire("trim", "crop"), wire("crop", "fade")];
    assert.deepEqual(
      planFusedChain({ nodes, edges: line, headId: "trim", willRun: () => true, canClaim: (id) => id !== "fade" }),
      ["trim", "crop"],
    );
    assert.deepEqual(planFusedChain({ nodes, edges: line, headId: "trim", willRun: () => true, maxSteps: 2 }), [
      "trim",
      "crop",
    ]);
  });

  it("marks stand-in inputs", () => {
    assert.equal(fusedOutputRef("a"), "fused://a");
    assert.equal(isFusedOutputRef("fused://a"), true);
    assert.equal(isFusedOutputRef("https://blob/a.mp4"), false);
  });
});
