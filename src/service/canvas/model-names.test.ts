import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STATIC_CANVAS_MODELS, findCanvasModel } from "@/service/canvas/model-catalog";
import { CANVAS_MODEL_LOCAL_NAMES, canvasModelDisplayName } from "@/service/canvas/model-names";

const LOCALES = ["zh-Hant", "zh-Hans", "ja", "ko"] as const;

describe("canvasModelDisplayName", () => {
  it("has a name in every primary locale for each Scro Tool and FFmpeg node", () => {
    const tools = STATIC_CANVAS_MODELS.filter((s) => s.provider === "scro" || s.provider === "ffmpeg");
    assert.ok(tools.length > 0);
    for (const spec of tools) {
      for (const locale of LOCALES) {
        assert.ok(CANVAS_MODEL_LOCAL_NAMES[spec.id]?.[locale], `${spec.id} missing ${locale}`);
      }
    }
  });

  it("uses the locale name and falls back to the English catalog name", () => {
    const spec = findCanvasModel("scro:talking-head", STATIC_CANVAS_MODELS)!;
    assert.equal(canvasModelDisplayName(spec, "en"), "Talking Head");
    assert.equal(canvasModelDisplayName(spec, "zh-Hant"), "Talking Head 口播");
    assert.equal(canvasModelDisplayName(spec, "ja"), "Talking Head トーク動画");
    assert.equal(canvasModelDisplayName(spec, "es"), "Talking Head");
    const seedream = findCanvasModel("openrouter:bytedance-seed/seedream-5-0-pro", STATIC_CANVAS_MODELS)!;
    assert.equal(canvasModelDisplayName(seedream, "zh-Hant"), seedream.name);
  });
});
