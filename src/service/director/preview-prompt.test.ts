import assert from "node:assert/strict";
import { test } from "node:test";
import { directorPreviewPrompt } from "@/service/director/preview-prompt";

test("director preview prompt names the format and visual world", () => {
  const prompt = directorPreviewPrompt({
    title: "Opening",
    visual: "brand logo holds the last beat on a clean canvas",
  });
  assert.match(prompt, /16:9/);
  assert.match(prompt, /Opening/);
  assert.match(prompt, /brand logo holds the last beat/);
  assert.doesNotMatch(prompt, /SKILL\.md|system prompt/i);
});
