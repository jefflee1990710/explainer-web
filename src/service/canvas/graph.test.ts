import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  adoptServerPreview,
  applyCompletedJobOutputs,
  computeExecutionWaves,
  restoreBusyNodesFromCompletedJobs,
  getNodeOutputPortType,
  mergeCanvasNodeSnapshots,
  reorderTargetHandleEdges,
  resolveNodeInputs,
  validateEdgeConnection,
} from "@/service/canvas/graph";
import { explainerTextStyleLine } from "@/service/canvas/settings/explainer-text-style";

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
  const plannedDirector: CanvasNode = {
    id: "dir",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId: "scro:explainer",
      prompt: "t",
      aspectRatio: "9:16",
      toolParams: {
        plannerMode: true,
        textStyleId: "neon",
        plan: {
          plannerVideoId: "v",
          plannedWith: {
            topic: "t",
            aspectRatio: "9:16",
            skillSlug: "cartoon-explainer-video-director",
            language: "yue",
            presenterPosition: "auto",
          },
          clips: [
            {
              clipNumber: 1,
              framePrompt: "{{mood}} board {{text_style}}",
              videoPrompt: "pan",
              spokenLine: "hi",
              durationSeconds: 6,
              refUrls: [],
            },
          ],
        },
      },
    },
  };
  const settingNode = (id: string, vars: Record<string, string>): CanvasNode => ({
    id,
    type: "settings",
    position: { x: 0, y: 0 },
    data: { settings: { vars } },
  });

  it("reads a Director clip output as the prompt and merges vars with the receiver winning", () => {
    const nodes: CanvasNode[] = [
      plannedDirector,
      settingNode("s-dir", { mood: "calm" }),
      settingNode("s-img", { mood: "busy" }),
      modelNode("img", "mentalok:flux-schnell"),
    ];
    const edges: CanvasEdge[] = [
      edge("e1", "dir", "img", "prompt", "clip-1-frame"),
      edge("e2", "s-dir", "dir", "settings"),
      edge("e3", "s-img", "img", "settings"),
    ];
    assert.equal(
      validateEdgeConnection(nodes, [], { source: "dir", sourceHandle: "clip-1-frame", target: "img", targetHandle: "prompt" }).valid,
      true,
    );
    assert.equal(
      validateEdgeConnection(nodes, [], { source: "dir", sourceHandle: "clip-2-frame", target: "img", targetHandle: "prompt" }).valid,
      false,
    );
    assert.equal(
      validateEdgeConnection(nodes, [], { source: "dir", target: "img", targetHandle: "prompt" }).valid,
      false,
    );
    const character: CanvasNode = {
      id: "jim",
      type: "character",
      position: { x: 0, y: 0 },
      data: { characterId: "jim-id", label: "Jim" },
    };
    assert.equal(
      validateEdgeConnection([character, plannedDirector], [], {
        source: "jim",
        sourceHandle: "output",
        target: "dir",
        targetHandle: "character",
      }).valid,
      false,
    );
    assert.equal(
      validateEdgeConnection([mediaNode("photo", "image", "https://blob.example/p.png"), plannedDirector], [], {
        source: "photo",
        sourceHandle: "output",
        target: "dir",
        targetHandle: "character",
      }).valid,
      false,
    );
    const talkingHead: CanvasNode = {
      id: "th",
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: "scro:talking-head", prompt: "Hello", status: "idle", toolParams: { plannerMode: true } },
    };
    assert.equal(
      validateEdgeConnection([character, talkingHead], [], {
        source: "jim",
        sourceHandle: "output",
        target: "th",
        targetHandle: "character",
      }).valid,
      false,
    );
    assert.equal(
      validateEdgeConnection([mediaNode("photo", "image", "https://blob.example/p.png"), talkingHead], [], {
        source: "photo",
        sourceHandle: "output",
        target: "th",
        targetHandle: "character",
      }).valid,
      false,
    );
    const resolved = resolveNodeInputs("img", nodes, edges);
    assert.equal(resolved.inputs.prompt, `{{mood}} board ${explainerTextStyleLine("neon")}`);
    assert.equal(
      validateEdgeConnection(nodes, [], { source: "s-img", target: "img", targetHandle: "settings" }).valid,
      false,
    );
  });

  it("fills {{text_style}} from the Director card, ignoring a Setting wired to the Director", () => {
    const nodes: CanvasNode[] = [plannedDirector, settingNode("s-dir", { mood: "calm" }), modelNode("img", "mentalok:flux-schnell")];
    const edges: CanvasEdge[] = [edge("e1", "dir", "img", "prompt", "clip-1-frame"), edge("e2", "s-dir", "dir", "settings")];
    const prompt = resolveNodeInputs("img", nodes, edges).inputs.prompt ?? "";
    assert.equal(prompt.includes("{{mood}}"), true);
    assert.equal(prompt.includes(explainerTextStyleLine("neon")), true);
    assert.equal(prompt.includes("calm"), false);
  });

  it("reports an unplanned Director as a missing upstream", () => {
    const dir: CanvasNode = {
      id: "dir",
      type: "model",
      position: { x: 0, y: 0 },
      data: { modelId: "scro:explainer", toolParams: { plannerMode: true } },
    };
    const nodes: CanvasNode[] = [dir, modelNode("img", "mentalok:flux-schnell")];
    const resolved = resolveNodeInputs("img", nodes, [edge("e1", "dir", "img", "prompt", "clip-1-frame")]);
    assert.equal(resolved.ok, false);
    if (!resolved.ok) assert.deepEqual(resolved.missingUpstreamNodeIds, ["dir"]);
  });

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

  it("fills {{key}} from the Setting wired to the Prompt node", () => {
    const setting = (id: string, vars: Record<string, string>): CanvasNode => ({
      id,
      type: "settings",
      position: { x: 0, y: 0 },
      data: { settings: { vars } },
    });
    const nodes: CanvasNode[] = [
      setting("s-prompt", { mood: "rainy", style: "ink" }),
      setting("s-model", { style: "neon" }),
      promptNode("p", "A {{mood}} street, {{style}} look"),
      modelNode("img", "mentalok:flux-schnell"),
    ];
    const edges: CanvasEdge[] = [
      edge("e1", "p", "img", "prompt"),
      edge("e2", "s-prompt", "p", "settings"),
      edge("e3", "s-model", "img", "settings"),
    ];
    assert.equal(validateEdgeConnection(nodes, [], { source: "s-prompt", target: "p", targetHandle: "settings" }).valid, true);
    assert.equal(validateEdgeConnection(nodes, [], { source: "s-model", target: "img", targetHandle: "settings" }).valid, false);
    const resolved = resolveNodeInputs("img", nodes, edges);
    assert.equal(resolved.inputs.prompt, "A rainy street, ink look");
  });

  it("blocks a run while a {{key}} has no value", () => {
    const nodes: CanvasNode[] = [modelNode("img", "mentalok:flux-schnell", { prompt: "A {{mood}} street" })];
    const resolved = resolveNodeInputs("img", nodes, []);
    assert.equal(resolved.ok, false);
    if (!resolved.ok) assert.deepEqual(resolved.missingRequiredFields, ["{{mood}}"]);
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

  it("validates audio output -> refAudio, rejects audio -> videos, and preserves videos order", () => {
    const nodes: CanvasNode[] = [
      modelNode("tts", "scro:tts", {
        prompt: "Hello world",
        status: "completed",
        outputUrl: "https://blob.example/tts.mp3",
        outputKind: "audio",
      }),
      mediaNode("v1", "video", "https://blob.example/clip1.mp4"),
      mediaNode("v2", "video", "https://blob.example/clip2.mp4"),
      modelNode("mux", "ffmpeg:audio-mux"),
      modelNode("concat", "ffmpeg:concat"),
    ];

    const okAudio = validateEdgeConnection(nodes, [], {
      source: "tts",
      sourceHandle: "output",
      target: "mux",
      targetHandle: "refAudio",
    });
    assert.deepEqual(okAudio, { valid: true });

    const badAudio = validateEdgeConnection(nodes, [], {
      source: "tts",
      sourceHandle: "output",
      target: "concat",
      targetHandle: "videos",
    });
    assert.equal(badAudio.valid, false);

    const edges: CanvasEdge[] = [
      edge("e1", "v1", "concat", "videos"),
      edge("e2", "v2", "concat", "videos"),
    ];
    const resolved = resolveNodeInputs("concat", nodes, edges);
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.deepEqual(
        (resolved.inputs as { videos?: string[] }).videos,
        ["https://blob.example/clip1.mp4", "https://blob.example/clip2.mp4"],
      );
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

describe("canvas graph — completed output recovery", () => {
  it("keeps a stored outputUrl when a stale save omits it", () => {
    const existing = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        status: "completed",
        outputUrl: "https://blob.example/flux.png",
        outputKind: "image",
      }),
    ];
    const incoming = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        status: "idle",
        prompt: "A perfume bottle",
      }),
    ];

    const merged = mergeCanvasNodeSnapshots(existing, incoming);
    assert.equal(merged[0]?.data.outputUrl, "https://blob.example/flux.png");
    assert.equal(merged[0]?.data.outputKind, "image");
    assert.equal(merged[0]?.data.prompt, "A perfume bottle");
  });

  it("prefers a newer incoming outputUrl over the stored one", () => {
    const existing = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        outputUrl: "https://blob.example/old.png",
      }),
    ];
    const incoming = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        outputUrl: "https://blob.example/new.png",
      }),
    ];

    const merged = mergeCanvasNodeSnapshots(existing, incoming);
    assert.equal(merged[0]?.data.outputUrl, "https://blob.example/new.png");
  });

  it("restores the newest completed job output onto a model node", () => {
    const nodes = [
      modelNode("img", "mentalok:flux-2-klein-4b", { status: "idle" }),
    ];
    const restored = applyCompletedJobOutputs(nodes, [
      {
        nodeId: "img",
        outputUrl: "https://blob.example/old.png",
        outputKind: "image",
        updatedAt: new Date("2026-11-20T00:00:00.000Z"),
      },
      {
        nodeId: "img",
        outputUrl: "https://blob.example/new.png",
        outputKind: "image",
        updatedAt: new Date("2026-11-20T00:02:00.000Z"),
      },
    ]);

    assert.equal(restored[0]?.data.outputUrl, "https://blob.example/new.png");
    assert.equal(restored[0]?.data.status, "completed");
  });

  it("does not restore an output the user or assistant just cleared", () => {
    const existing = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        status: "completed",
        outputUrl: "https://blob.example/old.png",
      }),
    ];
    const incoming = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        status: "idle",
        outputClearedAt: "2026-11-23T08:00:00.000Z",
      }),
    ];
    const merged = mergeCanvasNodeSnapshots(existing, incoming);
    assert.equal(merged[0]?.data.outputUrl, undefined);
  });

  it("does not restore an output the user or assistant just cleared even when existing has a lastJobId", () => {
    const existing = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        status: "completed",
        lastJobId: "6740000200000000000000bb",
        outputUrl: "https://blob.example/old.png",
        outputKind: "image",
        lastCostUsd: 0.135,
      }),
    ];
    const incoming = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        status: "idle",
        outputClearedAt: "2026-11-26T14:00:00.000Z",
      }),
    ];
    const merged = mergeCanvasNodeSnapshots(existing, incoming);
    assert.equal(merged[0]?.data.status, "idle");
    assert.equal(merged[0]?.data.outputUrl, undefined);
    assert.equal(merged[0]?.data.lastJobId, undefined);
    assert.equal(merged[0]?.data.outputClearedAt, "2026-11-26T14:00:00.000Z");
  });

  it("still restores a new output when a stale snapshot carries the same clear stamp", () => {
    const stamp = "2026-11-23T08:00:00.000Z";
    const existing = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        status: "completed",
        outputUrl: "https://blob.example/new.png",
        outputClearedAt: stamp,
      }),
    ];
    const incoming = [
      modelNode("img", "mentalok:flux-2-klein-4b", { status: "idle", outputClearedAt: stamp }),
    ];
    const merged = mergeCanvasNodeSnapshots(existing, incoming);
    assert.equal(merged[0]?.data.outputUrl, "https://blob.example/new.png");
  });

  it("ignores jobs that finished before the preview was cleared", () => {
    const nodes = [
      modelNode("img", "mentalok:flux-2-klein-4b", {
        status: "idle",
        outputClearedAt: "2026-11-23T08:00:00.000Z",
      }),
    ];
    const before = applyCompletedJobOutputs(nodes, [
      { nodeId: "img", outputUrl: "https://blob.example/old.png", updatedAt: new Date("2026-11-23T07:59:00.000Z") },
    ]);
    assert.equal(before[0]?.data.outputUrl, undefined);
    const after = applyCompletedJobOutputs(nodes, [
      { nodeId: "img", outputUrl: "https://blob.example/new.png", updatedAt: new Date("2026-11-23T08:01:00.000Z") },
    ]);
    assert.equal(after[0]?.data.outputUrl, "https://blob.example/new.png");
  });

  it("does not save the previous video over a finished rerun of the same job", () => {
    const jobId = "6740000200000000000000bb";
    const existing = [
      modelNode("vid", "ffmpeg:concat", {
        status: "completed",
        lastJobId: jobId,
        outputUrl: "https://blob.example/new.mp4",
        outputKind: "video",
      }),
    ];
    const incoming = [
      modelNode("vid", "ffmpeg:concat", {
        status: "completed",
        lastJobId: jobId,
        outputUrl: "https://blob.example/old.mp4",
        outputKind: "video",
      }),
    ];
    const merged = mergeCanvasNodeSnapshots(existing, incoming);
    assert.equal(merged[0]?.data.outputUrl, "https://blob.example/new.mp4");
    assert.equal(merged[0]?.data.status, "completed");
  });

  it("does not let a stale Running save overwrite a finished job", () => {
    const jobId = "6740000100000000000000aa";
    const existing = [
      modelNode("vid", "openrouter:bytedance/seedance-2.0", {
        status: "completed",
        lastJobId: jobId,
        outputUrl: "https://blob.example/new.mp4",
        outputKind: "video",
      }),
    ];
    const incoming = [
      modelNode("vid", "openrouter:bytedance/seedance-2.0", {
        status: "running",
        lastJobId: jobId,
        outputUrl: "https://blob.example/old.mp4",
        outputKind: "video",
        prompt: "updated prompt",
      }),
    ];
    const merged = mergeCanvasNodeSnapshots(existing, incoming);
    assert.equal(merged[0]?.data.status, "completed");
    assert.equal(merged[0]?.data.outputUrl, "https://blob.example/new.mp4");
    assert.equal(merged[0]?.data.prompt, "updated prompt");
  });

  it("keeps a newer run when the stored node is an older completed job", () => {
    const existing = [
      modelNode("vid", "openrouter:bytedance/seedance-2.0", {
        status: "completed",
        lastJobId: "6740000000000000000000aa",
        outputUrl: "https://blob.example/old.mp4",
      }),
    ];
    const incoming = [
      modelNode("vid", "openrouter:bytedance/seedance-2.0", {
        status: "running",
        lastJobId: "6740000200000000000000aa",
        outputUrl: "https://blob.example/old.mp4",
      }),
    ];
    const merged = mergeCanvasNodeSnapshots(existing, incoming);
    assert.equal(merged[0]?.data.status, "running");
    assert.equal(merged[0]?.data.lastJobId, "6740000200000000000000aa");
  });

  it("marks a Running node completed when its job already has a video", () => {
    const jobId = "6740000100000000000000aa";
    const nodes = [
      modelNode("vid", "openrouter:bytedance/seedance-2.0", {
        status: "running",
        lastJobId: jobId,
        outputUrl: "https://blob.example/old.mp4",
      }),
    ];
    const restored = restoreBusyNodesFromCompletedJobs(nodes, [
      {
        id: jobId,
        nodeId: "vid",
        outputUrl: "https://blob.example/new.mp4",
        outputKind: "video",
        chargedUsd: 0.4,
      },
    ]);
    assert.deepEqual(restored.restoredIds, ["vid"]);
    assert.equal(restored.nodes[0]?.data.status, "completed");
    assert.equal(restored.nodes[0]?.data.outputUrl, "https://blob.example/new.mp4");
  });

  it("replaces a finished node's previous video with that job's file", () => {
    const jobId = "6740000200000000000000bb";
    const nodes = [
      modelNode("vid", "ffmpeg:concat", {
        status: "completed",
        lastJobId: jobId,
        outputUrl: "https://blob.example/old.mp4",
        outputKind: "video",
        staleOutputUrl: "https://blob.example/old.mp4",
      }),
    ];
    const restored = restoreBusyNodesFromCompletedJobs(nodes, [
      {
        id: jobId,
        nodeId: "vid",
        outputUrl: "https://blob.example/new.mp4",
        outputKind: "video",
      },
    ]);
    assert.deepEqual(restored.restoredIds, ["vid"]);
    assert.equal(restored.nodes[0]?.data.outputUrl, "https://blob.example/new.mp4");
    assert.equal(restored.nodes[0]?.data.status, "completed");
    assert.equal(restored.nodes[0]?.data.staleOutputUrl, undefined);
  });

  it("paints the saved file onto a tab that still has the previous video", () => {
    const local = modelNode("vid", "ffmpeg:concat", {
      status: "completed",
      lastJobId: "6740000200000000000000bb",
      outputUrl: "https://blob.example/old.mp4",
      prompt: "keep me",
    });
    const server = modelNode("vid", "ffmpeg:concat", {
      status: "completed",
      lastJobId: "6740000200000000000000bb",
      outputUrl: "https://blob.example/new.mp4",
      outputKind: "video",
    });
    const adopted = adoptServerPreview(local, server);
    assert.equal(adopted.data.outputUrl, "https://blob.example/new.mp4");
    assert.equal(adopted.data.prompt, "keep me");
    assert.equal(adopted.data.staleOutputUrl, undefined);
  });

  it("does not paint an older save over a newer local run", () => {
    const local = modelNode("vid", "ffmpeg:concat", {
      status: "running",
      lastJobId: "6740000300000000000000cc",
      outputUrl: "https://blob.example/older.mp4",
    });
    const server = modelNode("vid", "ffmpeg:concat", {
      status: "completed",
      lastJobId: "6740000200000000000000bb",
      outputUrl: "https://blob.example/middle.mp4",
    });
    const adopted = adoptServerPreview(local, server);
    assert.equal(adopted.data.outputUrl, "https://blob.example/older.mp4");
    assert.equal(adopted.data.status, "running");
  });

  it("does not adopt an older server preview after the local node was cleared", () => {
    const local = modelNode("vid", "ffmpeg:concat", {
      status: "idle",
      outputClearedAt: "2026-11-26T14:00:00.000Z",
    });
    const server = modelNode("vid", "ffmpeg:concat", {
      status: "completed",
      lastJobId: "6740000200000000000000bb",
      outputUrl: "https://blob.example/old.mp4",
      outputKind: "video",
    });
    const adopted = adoptServerPreview(local, server);
    assert.equal(adopted.data.status, "idle");
    assert.equal(adopted.data.outputUrl, undefined);
    assert.equal(adopted.data.lastJobId, undefined);
  });

  it("adopts a new server preview when local and server share the same clear stamp", () => {
    const stamp = "2026-11-26T14:00:00.000Z";
    const local = modelNode("vid", "ffmpeg:concat", {
      status: "idle",
      outputClearedAt: stamp,
    });
    const server = modelNode("vid", "ffmpeg:concat", {
      status: "completed",
      lastJobId: "6740000300000000000000cc",
      outputUrl: "https://blob.example/new.mp4",
      outputKind: "video",
      outputClearedAt: stamp,
    });
    const adopted = adoptServerPreview(local, server);
    assert.equal(adopted.data.status, "completed");
    assert.equal(adopted.data.outputUrl, "https://blob.example/new.mp4");
  });

  it("leaves a finished node alone when it already shows that job's file", () => {
    const jobId = "6740000200000000000000bb";
    const nodes = [
      modelNode("vid", "ffmpeg:concat", {
        status: "completed",
        lastJobId: jobId,
        outputUrl: "https://blob.example/new.mp4",
        staleOutputUrl: "https://blob.example/new.mp4",
      }),
    ];
    const restored = restoreBusyNodesFromCompletedJobs(nodes, [
      { id: jobId, nodeId: "vid", outputUrl: "https://blob.example/new.mp4", outputKind: "video" },
    ]);
    assert.deepEqual(restored.restoredIds, []);
    assert.equal(restored.nodes[0]?.data.staleOutputUrl, "https://blob.example/new.mp4");
  });

  it("leaves a Running node alone when a different job finished", () => {
    const nodes = [
      modelNode("vid", "openrouter:bytedance/seedance-2.0", {
        status: "running",
        lastJobId: "6740000200000000000000aa",
        outputUrl: "https://blob.example/old.mp4",
      }),
    ];
    const restored = restoreBusyNodesFromCompletedJobs(nodes, [
      { id: "6740000100000000000000aa", nodeId: "vid", outputUrl: "https://blob.example/older.mp4" },
    ]);
    assert.deepEqual(restored.restoredIds, []);
    assert.equal(restored.nodes[0]?.data.status, "running");
  });

  it("gives the Explainer Settings node no output port", () => {
    assert.equal(
      getNodeOutputPortType({ id: "s", type: "settings", position: { x: 0, y: 0 }, data: {} }),
      null,
    );
  });
});

describe("canvas graph — character outfit inputs", () => {
  const person = {
    id: "character-1",
    type: "character" as const,
    position: { x: 0, y: 0 },
    data: { characterId: "char-1", mediaUrl: "https://blob.example/jim.png", label: "Jim" },
  };

  it("accepts an image on an outfit input and rejects the wrong type", () => {
    assert.equal(getNodeOutputPortType(person), "image");
    const image = mediaNode("cloth", "image", "https://blob.example/blazer.png");
    assert.equal(
      validateEdgeConnection([image, person], [], {
        source: "cloth",
        target: "character-1",
        targetHandle: "top",
      }).valid,
      true,
    );
    const video = mediaNode("clip", "video", "https://blob.example/clip.mp4");
    const rejected = validateEdgeConnection([video, person], [], {
      source: "clip",
      target: "character-1",
      targetHandle: "top",
    });
    assert.equal(rejected.valid, false);
  });
});

describe("canvas graph — reorderTargetHandleEdges", () => {
  const nodes: CanvasNode[] = [
    mediaNode("v1", "video", "https://blob.example/clip1.mp4"),
    mediaNode("v2", "video", "https://blob.example/clip2.mp4"),
    mediaNode("v3", "video", "https://blob.example/clip3.mp4"),
    mediaNode("audio", "audio", "https://blob.example/vo.mp3"),
    modelNode("concat", "ffmpeg:concat"),
    modelNode("mux", "ffmpeg:audio-mux"),
  ];

  it("moves one videos edge and keeps concat input order", () => {
    const edges: CanvasEdge[] = [
      edge("e1", "v1", "concat", "videos"),
      edge("mux-audio", "audio", "mux", "refAudio"),
      edge("e2", "v2", "concat", "videos"),
      edge("e3", "v3", "concat", "videos"),
    ];

    const moved = reorderTargetHandleEdges(edges, "concat", "videos", 0, 2);
    assert.deepEqual(
      moved.map((item) => item.id),
      ["e2", "mux-audio", "e3", "e1"],
    );

    const resolved = resolveNodeInputs("concat", nodes, moved);
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.deepEqual(resolved.inputs.videos, [
        "https://blob.example/clip2.mp4",
        "https://blob.example/clip3.mp4",
        "https://blob.example/clip1.mp4",
      ]);
    }
  });

  it("leaves the graph unchanged when the move is out of range", () => {
    const edges: CanvasEdge[] = [
      edge("e1", "v1", "concat", "videos"),
      edge("e2", "v2", "concat", "videos"),
    ];
    assert.deepEqual(reorderTargetHandleEdges(edges, "concat", "videos", 0, 5), edges);
    assert.deepEqual(reorderTargetHandleEdges(edges, "concat", "videos", 1, 1), edges);
  });
});

describe("canvas graph — settings edges", () => {
  const settingsNode: CanvasNode = {
    id: "s",
    type: "settings",
    position: { x: 0, y: 0 },
    data: { settings: { vars: {} } },
  };
  const grade: CanvasNode = { id: "g", type: "model", position: { x: 0, y: 0 }, data: { modelId: "ffmpeg:color-grade" } };
  const prompt: CanvasNode = { id: "p", type: "prompt", position: { x: 0, y: 0 }, data: { text: "A {{mood}} scene" } };
  const tts: CanvasNode = { id: "t", type: "model", position: { x: 0, y: 0 }, data: { modelId: "scro:tts" } };
  const candidate = (target: string, targetHandle = "settings") => ({
    source: "s",
    sourceHandle: "output",
    target,
    targetHandle,
  });

  it("allows a settings node onto a Prompt node's settings handle", () => {
    assert.deepEqual(validateEdgeConnection([settingsNode, prompt], [], candidate("p")), { valid: true });
  });

  it("rejects a Setting wire onto a model, including other handles", () => {
    assert.equal(validateEdgeConnection([settingsNode, tts], [], candidate("t")).valid, false);
    assert.equal(validateEdgeConnection([settingsNode, grade], [], candidate("g")).valid, false);
    assert.equal(validateEdgeConnection([settingsNode, grade], [], candidate("g", "video")).valid, false);
  });

  it("rejects a second settings wire unless replacing", () => {
    const existing: CanvasEdge[] = [{ id: "e", source: "s2", sourceHandle: "output", target: "p", targetHandle: "settings" }];
    const other = { ...settingsNode, id: "s2" };
    assert.equal(validateEdgeConnection([settingsNode, other, prompt], existing, candidate("p")).valid, false);
    assert.deepEqual(
      validateEdgeConnection([settingsNode, other, prompt], existing, candidate("p"), undefined, { allowReplaceSingle: true }),
      { valid: true },
    );
  });

  it("rejects a normal output onto a settings handle", () => {
    assert.equal(
      validateEdgeConnection([prompt, grade], [], { source: "p", sourceHandle: "output", target: "g", targetHandle: "settings" }).valid,
      false,
    );
  });
});
