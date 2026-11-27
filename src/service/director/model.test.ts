import assert from "node:assert/strict";
import test from "node:test";
import {
  STORYBOARD_MODEL,
  STORYBOARD_THINKING_LEVEL,
  canvasChatUsesInteractions,
  storyboardProviderOptions,
} from "@/service/director/model";

test("storyboard uses Gemini 3.8 Flash at low thinking level for fast high-quality planning", () => {
  assert.equal(STORYBOARD_MODEL, "gemini-3.8-flash");
  assert.equal(STORYBOARD_THINKING_LEVEL, "low");
  const options = storyboardProviderOptions();
  assert.equal(options.google.thinkingLevel, "low");
  assert.equal(options.google.thinkingSummaries, "none");
});

test("Gemini 4 canvas chat uses the Interactions API and earlier Gemini ids do not", () => {
  for (const modelId of ["gemini-4-argon", "gemini-4-carbon", "gemini-4-neon", "gemini-4-hydrogen"]) {
    assert.equal(canvasChatUsesInteractions(modelId), true);
  }
  for (const modelId of ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"]) {
    assert.equal(canvasChatUsesInteractions(modelId), false);
  }
});
