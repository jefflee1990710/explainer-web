import assert from "node:assert/strict";
import test from "node:test";
import {
  STORYBOARD_MODEL,
  STORYBOARD_THINKING_LEVEL,
  storyboardProviderOptions,
} from "@/service/director/model";

test("storyboard uses Argon at the lowest thinking level the API accepts", () => {
  assert.equal(STORYBOARD_MODEL, "gemini-4-argon");
  assert.equal(STORYBOARD_THINKING_LEVEL, "low");
  const options = storyboardProviderOptions();
  assert.equal(options.google.thinkingLevel, "low");
  assert.equal(options.google.thinkingSummaries, "none");
});
