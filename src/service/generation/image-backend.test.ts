import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GPT_5_IMAGE_MODEL,
  IMAGE_ROUTE_BY_SCENE_TEXT,
  imageModelForSubmit,
  imageRouteForSceneText,
  resolveImageRoute,
} from "@/service/generation/image-backend";

test("each scene-text language uses OpenRouter GPT-5 Image that accepts blueprint refs", () => {
  assert.equal(GPT_5_IMAGE_MODEL, "openai/gpt-5-image");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.model, "openai/gpt-5-image");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT.en.editModel, "openai/gpt-5-image");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].model, "openai/gpt-5-image");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hant"].editModel, "openai/gpt-5-image");

  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].backend, "openrouter");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].model, "openai/gpt-5-image");
  assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT["zh-Hans"].editModel, "openai/gpt-5-image");
});

test("generation looks up the route and keeps OpenRouter GPT-5 Image when frames have references", () => {
  const en = imageRouteForSceneText("en");
  const hant = imageRouteForSceneText("zh-Hant");
  assert.equal(imageModelForSubmit(en, false), "openai/gpt-5-image");
  assert.equal(imageModelForSubmit(en, true), "openai/gpt-5-image");
  assert.equal(imageModelForSubmit(hant, false), "openai/gpt-5-image");
  assert.equal(imageModelForSubmit(hant, true), "openai/gpt-5-image");
  assert.equal(imageRouteForSceneText(undefined).model, "openai/gpt-5-image");
  assert.equal(imageRouteForSceneText(undefined).backend, "openrouter");
});

test("resolveImageRoute requires OPENROUTER_API_KEY for OpenRouter routes", () => {
  const prev = process.env.OPENROUTER_API_KEY;
  try {
    delete process.env.OPENROUTER_API_KEY;
    assert.throws(() => resolveImageRoute("en"), /OPENROUTER_API_KEY/);

    process.env.OPENROUTER_API_KEY = "sk-or-test";
    assert.equal(resolveImageRoute("en").model, "openai/gpt-5-image");
  } finally {
    if (prev === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prev;
  }
});
