import assert from "node:assert/strict";
import { test } from "node:test";
import { STYLE_IDS } from "@/model/style-id";
import {
  directorPreviewPrompt,
  directorPreviewStyleNames,
} from "@/service/director/preview-prompt";

const STYLE_NAMES = [
  "Whiteboard doodle",
  "Flat vector",
  "Paper cut-out",
  "Chalkboard",
  "Watercolour storybook",
  "Claymation",
  "Pixel art",
  "Ink manga",
  "Cinematic realistic",
];

test("director preview prompt names the format and visual world", () => {
  const prompt = directorPreviewPrompt({
    title: "Opening",
    visual: "brand logo holds the last beat on a clean canvas",
    styleNames: STYLE_NAMES,
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
    styleNames: STYLE_NAMES,
  });
  assert.match(prompt, /3 by 3|3x3|grid/i);
  assert.match(prompt, /Listicle/);
  assert.match(prompt, /Whiteboard doodle/);
  assert.match(prompt, /Pixel art/);
  assert.match(prompt, /Cinematic realistic/);
  assert.match(prompt, /Watercolour storybook/);
});

test("directorPreviewStyleNames follows STYLE_IDS and throws when a style is missing", () => {
  const styles = STYLE_IDS.map((id, index) => ({ id, name: STYLE_NAMES[index] }));
  assert.deepEqual(directorPreviewStyleNames(styles), STYLE_NAMES);
  assert.throws(
    () => directorPreviewStyleNames(styles.filter((style) => style.id !== "pixel")),
    /pixel.*Mongo/i,
  );
});
