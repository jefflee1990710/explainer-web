import assert from "node:assert/strict";
import test from "node:test";
import {
  STORYBOARD_MODEL,
  STORYBOARD_THINKING_LEVEL,
  storyboardProviderOptions,
} from "@/service/director/model";

test("storyboard uses Gemini 3.8 Flash at low thinking level for fast high-quality planning", () => {
  assert.equal(STORYBOARD_MODEL, "gemini-3.8-flash");
  assert.equal(STORYBOARD_THINKING_LEVEL, "low");
  const options = storyboardProviderOptions();
  assert.equal(options.google.thinkingLevel, "low");
  assert.equal(options.google.thinkingSummaries, "none");
});
