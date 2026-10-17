import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IMAGE_ROUTE_BY_SCENE_TEXT,
  SEEDREAM_5_PRO_IMAGE_MODEL,
  imageModelForSubmit,
  imageRouteForSceneText,
  resolveImageRoute,
} from "@/service/generation/image-backend";

test("each scene-text language uses OpenRouter Seedream 5.0 Pro that accepts blueprint refs", () => {
  assert.equal(SEEDREAM_5_PRO_IMAGE_MODEL, "bytedance-seed/seedream-5-0-pro");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.model, "bytedance-seed/seedream-5-0-pro");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.editModel, "bytedance-seed/seedream-5-0-pro");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].model, "bytedance-seed/seedream-5-0-pro");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].editModel, "bytedance-seed/seedream-5-0-pro");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].model, "bytedance-seed/seedream-5-0-pro");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].editModel, "bytedance-seed/seedream-5-0-pro");
});

test("generation looks up the route and keeps OpenRouter Seedream 5.0 Pro when frames have references", () => {
  const en = imageRouteForSceneText("en");
  const hant = imageRouteForSceneText("zh-Hant");
  assert.equal(imageModelForSubmit(en, false), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageModelForSubmit(en, true), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageModelForSubmit(hant, false), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageModelForSubmit(hant, true), "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageRouteForSceneText(undefined).model, "bytedance-seed/seedream-5-0-pro");
  assert.equal(imageRouteForSceneText(undefined).backend, "openrouter");
});

test("resolveImageRoute requires OPENROUTER_API_KEY for OpenRouter routes", () => {
  const prev = process.env.OPENROUTER_API_KEY;
  try {
    delete process.env.OPENROUTER_API_KEY;
    assert.throws(() => resolveImageRoute("en"), /OPENROUTER_API_KEY/);

    process.env.OPENROUTER_API_KEY = "sk-or-test";
    assert.equal(resolveImageRoute("en").model, "bytedance-seed/seedream-5-0-pro");
  } finally {
    if (prev === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prev;
  }
});
