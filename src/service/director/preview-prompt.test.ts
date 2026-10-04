import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIRECTOR_PREVIEW_STRIP_IDS,
  directorPreviewPrompt,
  directorPreviewStyleNames,
} from "@/service/director/preview-prompt";

const STYLE_NAMES: Record<string, string> = {
  doodle: "Whiteboard doodle",
  "flat-vector": "Flat vector",
  "paper-cutout": "Paper cut-out",
  clay: "Claymation",
  realistic: "Cinematic realistic",
};

test("director preview prompt is a left-to-right planning timeline", () => {
  const prompt = directorPreviewPrompt({
    title: "Opening",
    visual: "brand logo holds the last beat on a clean canvas",
    plan: "The logo arrives and settles.",
    styleNames: Object.values(STYLE_NAMES),
  });
  assert.match(prompt, /16:9/);
  assert.match(prompt, /left to right/i);
  assert.match(prompt, /Opening/);
  assert.match(prompt, /brand logo holds the last beat/);
  assert.match(prompt, /The logo arrives and settles/);
  assert.match(prompt, /ONE horizontal row of exactly 5/);
  assert.match(prompt, /Whiteboard doodle/);
  assert.match(prompt, /Cinematic realistic/);
  assert.match(prompt, /never repeated/i);
  assert.doesNotMatch(prompt, /SKILL\.md|system prompt/i);
});

test("directorPreviewStyleNames follows the strip and throws when a style is missing", () => {
  const styles = DIRECTOR_PREVIEW_STRIP_IDS.map((id) => ({ id, name: STYLE_NAMES[id] }));
  assert.deepEqual(directorPreviewStyleNames(styles), [
    "Whiteboard doodle",
    "Flat vector",
    "Paper cut-out",
    "Claymation",
    "Cinematic realistic",
  ]);
  assert.throws(
    () => directorPreviewStyleNames(styles.filter((style) => style.id !== "clay")),
    /clay.*Mongo/i,
  );
});
