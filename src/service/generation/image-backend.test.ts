import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IMAGE_ROUTE_BY_SCENE_TEXT,
  imageModelForSubmit,
  imageRouteForSceneText,
} from "@/service/generation/image-backend";

test("each scene-text language uses OpenRouter gpt-5.4-image-2", () => {
  for (const language of ["en", "zh-Hant", "zh-Hans"] as const) {
    assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT[language].backend, "openrouter");
    assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT[language].model, "openai/gpt-5.4-image-2");
    assert.equal(IMAGE_ROUTE_BY_SCENE_TEXT[language].editModel, "openai/gpt-5.4-image-2");
  }
});

test("generation looks up the route and keeps the same model with references", () => {
  const en = imageRouteForSceneText("en");
  const hant = imageRouteForSceneText("zh-Hant");
  assert.equal(imageModelForSubmit(en, false), "openai/gpt-5.4-image-2");
  assert.equal(imageModelForSubmit(en, true), "openai/gpt-5.4-image-2");
  assert.equal(imageModelForSubmit(hant, true), "openai/gpt-5.4-image-2");
  assert.equal(imageRouteForSceneText(undefined).backend, "openrouter");
});
