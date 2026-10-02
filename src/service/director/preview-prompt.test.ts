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

test("director preview prompt is a style grid of that director type", () => {
  const prompt = directorPreviewPrompt({
    title: "Listicle",
    visual: "numbered items snap onto the canvas",
  });
  assert.match(prompt, /3 by 3|3x3|grid/i);
  assert.match(prompt, /Listicle/);
  assert.match(prompt, /Whiteboard doodle/);
  assert.match(prompt, /Pixel art/);
  assert.match(prompt, /Cinematic realistic/);
  assert.match(prompt, /Watercolour storybook/);
});
