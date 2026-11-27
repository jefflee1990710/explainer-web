import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { CANVAS_HEYGEN_MAX_VIDEO_SECONDS } from "@/model/canvas-model";
import { ARGOLINK_STATIC_MODELS } from "@/service/canvas/catalog/argolink-models";
import { FFMPEG_STATIC_MODELS } from "@/service/canvas/catalog/ffmpeg-models";
import { GOOGLE_STATIC_MODELS, NANO_BANANA_CANVAS_MODEL_ID } from "@/service/canvas/catalog/google-models";
import { MENTALOK_STATIC_MODELS } from "@/service/canvas/catalog/mentalok-models";
import { MINIMAX_STATIC_MODELS, OPENROUTER_STATIC_MODELS } from "@/service/canvas/catalog/openrouter-minimax-models";
import { SCRO_STATIC_MODELS } from "@/service/canvas/catalog/scro-models";
import { STATIC_CANVAS_MODELS, findCanvasModel } from "@/service/canvas/catalog/model-catalog";

describe("service/canvas/catalog modular split", () => {
  it("keeps src/model/canvas-model.ts and src/model/canvas.ts free of @/service/canvas/model-catalog imports", () => {
    const modelFile = readFileSync(join(process.cwd(), "src/model/canvas-model.ts"), "utf8");
    const canvasFile = readFileSync(join(process.cwd(), "src/model/canvas.ts"), "utf8");
    assert.doesNotMatch(modelFile, /from\s+["']@\/service\//);
    assert.doesNotMatch(canvasFile, /from\s+["']@\/service\/canvas\/model-catalog/);
    assert.equal(CANVAS_HEYGEN_MAX_VIDEO_SECONDS, 120);
  });

  it("composes STATIC_CANVAS_MODELS in exact provider order and resolves legacy MiniMax IDs", () => {
    const expectedTotal =
      MENTALOK_STATIC_MODELS.length +
      OPENROUTER_STATIC_MODELS.length +
      MINIMAX_STATIC_MODELS.length +
      GOOGLE_STATIC_MODELS.length +
      ARGOLINK_STATIC_MODELS.length +
      SCRO_STATIC_MODELS.length +
      FFMPEG_STATIC_MODELS.length;
    assert.equal(STATIC_CANVAS_MODELS.length, expectedTotal);
    assert.equal(MENTALOK_STATIC_MODELS.length, 16);
    assert.equal(FFMPEG_STATIC_MODELS.length, 26);
    assert.ok(NANO_BANANA_CANVAS_MODEL_ID.startsWith("google:"));
    assert.equal(findCanvasModel("openrouter:minimax/hailuo-3")?.provider, "minimax");
  });
});
