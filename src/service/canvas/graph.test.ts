import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  computeExecutionWaves,
  getNodeOutputPortType,
  resolveNodeInputs,
  validateEdgeConnection,
} from "@/service/canvas/graph";

function mediaNode(
  id: string,
  mediaKind: "image" | "video" | "audio",
  mediaUrl?: string,
): CanvasNode {
  return {
    id,
    type: "media",
    position: { x: 0, y: 0 },
    data: { mediaKind, mediaUrl },
  };
}

function promptNode(id: string, text?: string): CanvasNode {
  return {
    id,
    type: "prompt",
    position: { x: 0, y: 0 },
    data: { text },
  };
}

function modelNode(
  id: string,
  modelId: string,
  extra?: Partial<CanvasNode["data"]>,
): CanvasNode {
  return {
    id,
    type: "model",
    position: { x: 0, y: 0 },
    data: { modelId, ...extra },
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  targetHandle: string,
  sourceHandle = "output",
): CanvasEdge {
  return { id, source, sourceHandle, target, targetHandle };
}

describe("canvas graph — getNodeOutputPortType", () => {
  it("resolves output port types for media, prompt, and model nodes", () => {
    assert.equal(getNodeOutputPortType(mediaNode("m1", "image")), "image");
    assert.equal(getNodeOutputPortType(mediaNode("m2", "video")), "video");
    assert.equal(getNodeOutputPortType(mediaNode("m3", "audio")), "audio");
    assert.equal(getNodeOutputPortType(promptNode("p1", "hi")), "text");
    assert.equal(
      getNodeOutputPortType(modelNode("img1", "mentalok:flux-schnell")),
      "image",
    );
    assert.equal(
      getNodeOutputPortType(modelNode("vid1", "openrouter:minimax/hailuo-3")),
      "video",
    );
    assert.equal(
      getNodeOutputPortType(modelNode("bad", "mentalok:does-not-exist")),
      null,
    );
  });
});

describe("canvas graph — validateEdgeConnection", () => {
  it("accepts valid media(image) -> model(startImage) connection", () => {
    const nodes: CanvasNode[] = [
      mediaNode("img-in", "image", "https://blob.example/start.png"),
      modelNode("wan", "mentalok:wan-2-1"),
    ];
    const result = validateEdgeConnection(nodes, [], {
      source: "img-in",
      sourceHandle: "output",
      target: "wan",
      targetHandle: "startImage",
    });
    assert.deepEqual(result, { valid: true });
  });

  it("rejects incompatible media(video) -> model(startImage) with a clear reason", () => {
    const nodes: CanvasNode[] = [
      mediaNode("vid-in", "video", "https://blob.example/clip.mp4"),
      modelNode("wan", "mentalok:wan-2-1"),
    ];
    const result = validateEdgeConnection(nodes, [], {
      source: "vid-in",
      sourceHandle: "output",
      target: "wan",
      targetHandle: "startImage",
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.match(result.reason, /video/i);
      assert.match(result.reason, /image/i);
    }
  });

  it("rejects self-loops", () => {
    const nodes: CanvasNode[] = [
      modelNode("edit", "mentalok:qwen-image-edit-2511"),
    ];
    const result = validateEdgeConnection(nodes, [], {
      source: "edit",
      sourceHandle: "output",
      target: "edit",
      targetHandle: "image",
    });
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.match(result.reason, /itself|self/i);
    }
  });

  it("rejects cycles (Model A -> Model B -> Model A and 3-node cycles)", () => {
    const nodes: CanvasNode[] = [
      modelNode("a", "mentalok:qwen-image-edit-2511"),
      modelNode("b", "mentalok:qwen-image-edit-2511"),
      modelNode("c", "mentalok:qwen-image-edit-2511"),
    ];
    const twoNodeEdges: CanvasEdge[] = [edge("e1", "a", "b", "image")];
    const cycle2 = validateEdgeConnection(nodes, twoNodeEdges, {
      source: "b",
      sourceHandle: "output",
      target: "a",
      targetHandle: "image",
    });
    assert.equal(cycle2.valid, false);
    if (!cycle2.valid) {
      assert.match(cycle2.reason, /cycle/i);
    }

    const threeNodeEdges: CanvasEdge[] = [
      edge("e1", "a", "b", "image"),
      edge("e2", "b", "c", "image"),
    ];
    const cycle3 = validateEdgeConnection(nodes, threeNodeEdges, {
      source: "c",
      sourceHandle: "output",
      target: "a",
      targetHandle: "image",
    });
    assert.equal(cycle3.valid, false);
    if (!cycle3.valid) {
      assert.match(cycle3.reason, /cycle/i);
    }
  });

  it("enforces single-value cardinality by default and supports allowReplaceSingle option", () => {
    const nodes: CanvasNode[] = [
      mediaNode("img-1", "image", "https://blob.example/1.png"),
      mediaNode("img-2", "image", "https://blob.example/2.png"),
      modelNode("wan", "mentalok:wan-2-1"),
    ];
    const existing: CanvasEdge[] = [edge("e1", "img-1", "wan", "startImage")];

    // Default rejects connecting a second source to a single-value port.
    const rejected = validateEdgeConnection(nodes, existing, {
      source: "img-2",
      sourceHandle: "output",
      target: "wan",
      targetHandle: "startImage",
    });
    assert.equal(rejected.valid, false);
    if (!rejected.valid) {
      assert.match(rejected.reason, /at most 1|already/i);
    }

    // allowReplaceSingle permits replacing with a different source.
    const replaced = validateEdgeConnection(
      nodes,
      existing,
      {
        source: "img-2",
        sourceHandle: "output",
        target: "wan",
        targetHandle: "startImage",
      },
      undefined,
      { allowReplaceSingle: true },
    );
    assert.deepEqual(replaced, { valid: true });

    // Exact duplicate is still rejected even with allowReplaceSingle.
    const duplicate = validateEdgeConnection(
      nodes,
      existing,
      {
        source: "img-1",
        sourceHandle: "output",
        target: "wan",
        targetHandle: "startImage",
      },
      undefined,
      { allowReplaceSingle: true },
    );
    assert.equal(duplicate.valid, false);
  });

  it("enforces model-specific maxConnections on refImages (3 for qwen-image-edit-2511, 4 for minimax-h3-image)", () => {
    const nodes: CanvasNode[] = [
      mediaNode("r1", "image", "https://blob.example/1.png"),
      mediaNode("r2", "image", "https://blob.example/2.png"),
      mediaNode("r3", "image", "https://blob.example/3.png"),
      mediaNode("r4", "image", "https://blob.example/4.png"),
      mediaNode("r5", "image", "https://blob.example/5.png"),
      modelNode("qwen", "mentalok:qwen-image-edit-2511"),
      modelNode("h3img", "mentalok:minimax-h3-image"),
    ];

    // Qwen allows 3 refImages, rejects 4th.
    const qwenEdges: CanvasEdge[] = [
      edge("q1", "r1", "qwen", "refImages"),
      edge("q2", "r2", "qwen", "refImages"),
    ];
    assert.deepEqual(
      validateEdgeConnection(nodes, qwenEdges, {
        source: "r3",
        sourceHandle: "output",
        target: "qwen",
        targetHandle: "refImages",
      }),
      { valid: true },
    );
    const qwenFull = [...qwenEdges, edge("q3", "r3", "qwen", "refImages")];
    const qwen4th = validateEdgeConnection(nodes, qwenFull, {
      source: "r4",
      sourceHandle: "output",
      target: "qwen",
      targetHandle: "refImages",
    });
    assert.equal(qwen4th.valid, false);
    if (!qwen4th.valid) {
      assert.match(qwen4th.reason, /3/);
    }

    // MiniMax-H3-Image allows 4 refImages, rejects 5th.
    const h3Edges: CanvasEdge[] = [
      edge("h1", "r1", "h3img", "refImages"),
      edge("h2", "r2", "h3img", "refImages"),
      edge("h3", "r3", "h3img", "refImages"),
    ];
    assert.deepEqual(
      validateEdgeConnection(nodes, h3Edges, {
        source: "r4",
        sourceHandle: "output",
        target: "h3img",
        targetHandle: "refImages",
      }),
      { valid: true },
    );
    const h3Full = [...h3Edges, edge("h4", "r4", "h3img", "refImages")];
    const h35th = validateEdgeConnection(nodes, h3Full, {
      source: "r5",
      sourceHandle: "output",
      target: "h3img",
      targetHandle: "refImages",
    });
    assert.equal(h35th.valid, false);
    if (!h35th.valid) {
      assert.match(h35th.reason, /4/);
    }
  });

  it("rejects connecting into media or prompt nodes", () => {
    const nodes: CanvasNode[] = [
      mediaNode("m1", "image", "https://blob.example/1.png"),
      mediaNode("m2", "image", "https://blob.example/2.png"),
      promptNode("p1", "hello"),
    ];
    assert.equal(
      validateEdgeConnection(nodes, [], {
        source: "m1",
        sourceHandle: "output",
        target: "m2",
        targetHandle: "image",
      }).valid,
      false,
    );
    assert.equal(
      validateEdgeConnection(nodes, [], {
        source: "m1",
        sourceHandle: "output",
        target: "p1",
        targetHandle: "text",
      }).valid,
      false,
    );
  });
});

describe("canvas graph — resolveNodeInputs", () => {
  it("prefers connected Prompt node text over inline node.data.prompt", () => {
    const nodes: CanvasNode[] = [
      promptNode("p1", "Cinematic cyberpunk Tokyo at dusk"),
      modelNode("flux", "mentalok:flux-schnell", {
        prompt: "Fallback inline prompt",
      }),
    ];
    const edges: CanvasEdge[] = [edge("e1", "p1", "flux", "prompt")];

    const resolved = resolveNodeInputs("flux", nodes, edges);
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.inputs.prompt, "Cinematic cyberpunk Tokyo at dusk");
      assert.equal(resolved.promptFromNode, true);
    }

    // Without connected prompt node, uses inline prompt.
    const inlineOnly = resolveNodeInputs("flux", nodes, []);
    assert.equal(inlineOnly.ok, true);
    if (inlineOnly.ok) {
      assert.equal(inlineOnly.inputs.prompt, "Fallback inline prompt");
      assert.equal(inlineOnly.promptFromNode, false);
    }
  });

  it("gathers startImage, endImage, refImages, image, video, and refAudio from media and completed model nodes", () => {
    const nodes: CanvasNode[] = [
      promptNode("p1", "Hero glides across neon skyline"),
      modelNode("upstream-start", "mentalok:flux-schnell", {
        status: "completed",
        outputUrl: "https://blob.example/gen-start.png",
        outputKind: "image",
      }),
      mediaNode("end-media", "image", "https://blob.example/end.png"),
      mediaNode("ref-media", "image", "https://blob.example/ref1.png"),
      modelNode("upstream-ref", "mentalok:sdxl-lightning", {
        status: "completed",
        outputUrl: "https://blob.example/gen-ref2.png",
        outputKind: "image",
      }),
      mediaNode("audio-media", "audio", "https://blob.example/voice.mp3"),
      modelNode("ref2va", "mentalok:minimax-h3-ref2va"),
      modelNode("upscale-img", "mentalok:seedvr2-image"),
      modelNode("upscale-vid", "mentalok:relayvsr"),
      mediaNode("vid-media", "video", "https://blob.example/raw.mp4"),
    ];
    const edges: CanvasEdge[] = [
      edge("e1", "p1", "ref2va", "prompt"),
      edge("e2", "upstream-start", "ref2va", "startImage"),
      edge("e3", "end-media", "ref2va", "endImage"),
      edge("e4", "ref-media", "ref2va", "refImages"),
      edge("e5", "upstream-ref", "ref2va", "refImages"),
      edge("e6", "audio-media", "ref2va", "refAudio"),
      edge("e7", "upstream-start", "upscale-img", "image"),
      edge("e8", "vid-media", "upscale-vid", "video"),
    ];

    const resRef2va = resolveNodeInputs("ref2va", nodes, edges);
    assert.equal(resRef2va.ok, true);
    if (resRef2va.ok) {
      assert.equal(resRef2va.inputs.prompt, "Hero glides across neon skyline");
      assert.equal(
        resRef2va.inputs.startImage,
        "https://blob.example/gen-start.png",
      );
      assert.equal(resRef2va.inputs.endImage, "https://blob.example/end.png");
      assert.deepEqual(resRef2va.inputs.refImages, [
        "https://blob.example/ref1.png",
        "https://blob.example/gen-ref2.png",
      ]);
      assert.equal(resRef2va.inputs.refAudio, "https://blob.example/voice.mp3");
    }

    const resImg = resolveNodeInputs("upscale-img", nodes, edges);
    assert.equal(resImg.ok, true);
    if (resImg.ok) {
      assert.equal(resImg.inputs.image, "https://blob.example/gen-start.png");
    }

    const resVid = resolveNodeInputs("upscale-vid", nodes, edges);
    assert.equal(resVid.ok, true);
    if (resVid.ok) {
      assert.equal(resVid.inputs.video, "https://blob.example/raw.mp4");
    }
  });

  it("reports missingUpstreamNodeIds when an upstream model has not produced outputUrl yet", () => {
    const nodes: CanvasNode[] = [
      modelNode("gen-img", "mentalok:flux-schnell", {
        prompt: "Portrait",
        status: "idle",
      }),
      modelNode("edit", "mentalok:qwen-image-edit-2511", {
        prompt: "Add sunglasses",
      }),
    ];
    const edges: CanvasEdge[] = [edge("e1", "gen-img", "edit", "image")];

    const resolved = resolveNodeInputs("edit", nodes, edges);
    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.deepEqual(resolved.missingUpstreamNodeIds, ["gen-img"]);
      assert.deepEqual(resolved.missingRequiredFields, ["image"]);
    }
  });

  it("reports missingRequiredFields when required inputs are absent", () => {
    const nodes: CanvasNode[] = [
      modelNode("avatar", "openrouter:heygen/avatar-iv"),
    ];
    const resolved = resolveNodeInputs("avatar", nodes, []);
    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.deepEqual(resolved.missingUpstreamNodeIds, []);
      assert.deepEqual(resolved.missingRequiredFields, [
        "startImage",
        "refAudio",
      ]);
    }
  });
});

describe("canvas graph — computeExecutionWaves", () => {
  it("groups independent models into parallel waves in topological order", () => {
    const nodes: CanvasNode[] = [
      promptNode("p-shared", "Sci-fi desert rover"),
      mediaNode("m-audio", "audio", "https://blob.example/vo.mp3"),
      modelNode("img-start", "mentalok:flux-schnell"),
      modelNode("img-end", "mentalok:sdxl-lightning"),
      modelNode("video", "mentalok:minimax-h3-ref2va"),
      modelNode("upscale", "mentalok:relayvsr"),
    ];
    const edges: CanvasEdge[] = [
      edge("e0", "p-shared", "img-start", "prompt"),
      edge("e1", "p-shared", "img-end", "prompt"),
      edge("e2", "img-start", "video", "startImage"),
      edge("e3", "img-end", "video", "endImage"),
      edge("e4", "m-audio", "video", "refAudio"),
      edge("e5", "video", "upscale", "video"),
    ];

    const waves = computeExecutionWaves(nodes, edges);
    assert.deepEqual(waves, [
      ["img-start", "img-end"],
      ["video"],
      ["upscale"],
    ]);
  });

  it("limits execution waves to targetModelNodeIds and their upstream model ancestors", () => {
    const nodes: CanvasNode[] = [
      modelNode("img-a", "mentalok:flux-schnell"),
      modelNode("img-b", "mentalok:sdxl-lightning"),
      modelNode("vid-a", "mentalok:wan-2-1"),
      modelNode("upscale-b", "mentalok:seedvr2-image"),
    ];
    const edges: CanvasEdge[] = [
      edge("e1", "img-a", "vid-a", "startImage"),
      edge("e2", "img-b", "upscale-b", "image"),
    ];

    assert.deepEqual(computeExecutionWaves(nodes, edges, ["vid-a"]), [
      ["img-a"],
      ["vid-a"],
    ]);
    assert.deepEqual(computeExecutionWaves(nodes, edges, []), []);
  });

  it("deduplicates parallel edges between the same pair of models", () => {
    const nodes: CanvasNode[] = [
      modelNode("img", "mentalok:flux-schnell"),
      modelNode("vid", "mentalok:ltx-2-5"),
    ];
    const edges: CanvasEdge[] = [
      edge("e1", "img", "vid", "startImage"),
      edge("e2", "img", "vid", "endImage"),
    ];

    assert.deepEqual(computeExecutionWaves(nodes, edges), [["img"], ["vid"]]);
  });

  it("throws when the graph contains a cycle", () => {
    const nodes: CanvasNode[] = [
      modelNode("a", "mentalok:qwen-image-edit-2511"),
      modelNode("b", "mentalok:qwen-image-edit-2511"),
    ];
    const edges: CanvasEdge[] = [
      edge("e1", "a", "b", "image"),
      edge("e2", "b", "a", "image"),
    ];

    assert.throws(() => computeExecutionWaves(nodes, edges), /cycle/i);
  });
});
