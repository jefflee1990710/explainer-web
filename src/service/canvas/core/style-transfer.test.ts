import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS, findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { validateEdgeConnection } from "@/service/canvas/core/graph";
import {
  STYLE_TRANSFER_MODEL_ID,
  STYLE_TRANSFER_PROMPT,
  prepareStyleTransferRun,
  styleTransferImageModels,
} from "@/service/canvas/core/style-transfer";

function modelNode(id: string, modelId: string, extra: CanvasNode["data"] = {}): CanvasNode {
  return { id, type: "model", position: { x: 0, y: 0 }, data: { modelId, ...extra } };
}

const style = modelNode("style", STYLE_TRANSFER_MODEL_ID);

describe("style transfer node", () => {
  it("lists image models that accept a reference and skips generators that cannot", () => {
    const models = styleTransferImageModels(STATIC_CANVAS_MODELS);
    const ids = models.map((spec) => spec.id);
    assert.ok(ids.includes("google:gemini-nano-banana-2.1"));
    assert.ok(ids.includes("openrouter:bytedance-seed/seedream-5-0-pro"));
    assert.equal(ids.includes("mentalok:flux-schnell"), false);
    assert.equal(ids.includes(STYLE_TRANSFER_MODEL_ID), false);
    assert.ok(models.every((spec) => spec.category === "image"));
    assert.ok(models.every((spec) => spec.inputs.some((port) => port.type === "image")));
    assert.equal(models.some((spec) => spec.output.type === "video"), false);
  });

  it("accepts an image, a character, or any other image output, and rejects other types", () => {
    const photo: CanvasNode = {
      id: "photo",
      type: "media",
      position: { x: 0, y: 0 },
      data: { mediaKind: "image", mediaUrl: "https://blob.example/photo.png" },
    };
    const character: CanvasNode = {
      id: "hero",
      type: "character",
      position: { x: 0, y: 0 },
      data: { characterId: "c1", mediaKind: "image", mediaUrl: "https://blob.example/hero.png" },
    };
    const still = modelNode("still", "google:gemini-nano-banana-2.1", {
      outputUrl: "https://blob.example/still.png",
      outputKind: "image",
    });
    const grab = modelNode("grab", "ffmpeg:frame-grab", {
      outputUrl: "https://blob.example/frame.png",
      outputKind: "image",
    });
    const clip: CanvasNode = {
      id: "clip",
      type: "media",
      position: { x: 0, y: 0 },
      data: { mediaKind: "video", mediaUrl: "https://blob.example/clip.mp4" },
    };
    const videoModel = modelNode("vid", "minimax:MiniMax-H3");
    const prompt: CanvasNode = {
      id: "prompt",
      type: "prompt",
      position: { x: 0, y: 0 },
      data: { text: "hello" },
    };

    for (const source of [photo, character, still, grab]) {
      const verdict = validateEdgeConnection([source, style], [], {
        source: source.id,
        sourceHandle: "output",
        target: "style",
        targetHandle: "image",
      });
      assert.equal(verdict.valid, true, source.id);
    }
    for (const source of [clip, videoModel, prompt]) {
      const verdict = validateEdgeConnection([source, style], [], {
        source: source.id,
        sourceHandle: "output",
        target: "style",
        targetHandle: "image",
      });
      assert.equal(verdict.valid, false, source.id);
    }
  });

  it("builds the chosen image model's prompt and reference image", () => {
    const node = modelNode("style", STYLE_TRANSFER_MODEL_ID, {
      toolParams: { imageModelId: "google:gemini-nano-banana-2.1" },
    });
    const prepared = prepareStyleTransferRun(
      node,
      { image: "https://blob.example/hero.png", refImages: [], videos: [] },
      STATIC_CANVAS_MODELS,
    );
    assert.equal(prepared.ok, true);
    if (!prepared.ok) return;
    assert.equal(prepared.spec.id, "google:gemini-nano-banana-2.1");
    assert.equal(prepared.spec.provider, "google");
    assert.equal(prepared.inputs.prompt, STYLE_TRANSFER_PROMPT);
    assert.deepEqual(prepared.inputs.refImages, ["https://blob.example/hero.png"]);
  });

  it("rejects a missing choice and a model that cannot take the picture", () => {
    const missing = prepareStyleTransferRun(
      style,
      { image: "https://blob.example/hero.png", refImages: [], videos: [] },
      STATIC_CANVAS_MODELS,
    );
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.deepEqual(missing.missingRequiredFields, ["imageModelId"]);

    const flux = prepareStyleTransferRun(
      modelNode("style", STYLE_TRANSFER_MODEL_ID, { toolParams: { imageModelId: "mentalok:flux-schnell" } }),
      { image: "https://blob.example/hero.png", refImages: [], videos: [] },
      STATIC_CANVAS_MODELS,
    );
    assert.equal(flux.ok, false);
    assert.equal(findCanvasModel(STYLE_TRANSFER_MODEL_ID)?.inputs[0]?.id, "image");
  });
});
