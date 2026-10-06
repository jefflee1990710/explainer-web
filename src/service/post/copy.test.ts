import assert from "node:assert/strict";
import { test } from "node:test";
import { POSTER_LAYOUTS, posterLayout } from "@/service/post/layouts";
import {
  applyPosterCopy,
  buildPosterImagePrompt,
  posterSceneLanguage,
  truncateSlot,
  validatePostInstruction,
} from "@/service/post/copy";

test("designer text fills known slots and drops unknown keys", () => {
  const layout = posterLayout("layout-01");
  const layers = applyPosterCopy(layout, {
    "layout-01-headline": "  夏日市集  ",
    "not-a-slot": "ignore me",
  });
  const headline = layers.find((layer) => layer.id === "layout-01-headline");
  assert.equal(headline?.type, "text");
  if (headline?.type === "text") assert.equal(headline.text, "夏日市集");
  assert.equal(layers.some((layer) => layer.id === "not-a-slot"), false);
});

test("headline text is truncated to 40 characters", () => {
  assert.equal(truncateSlot("headline", "a".repeat(50)).length, 40);
});

test("CJK copy uses zh-Hant and Latin copy uses en", () => {
  assert.equal(posterSceneLanguage("夏日市集"), "zh-Hant");
  assert.equal(posterSceneLanguage("Summer market"), "en");
});

test("the image prompt names the wording and the blueprint", () => {
  const layers = applyPosterCopy(posterLayout("layout-16"), {
    "layout-16-headline": "Open studio",
  });
  const prompt = buildPosterImagePrompt(layers);
  assert.match(prompt, /Open studio/);
  assert.match(prompt, /layout blueprint/);
});

test("an empty instruction is rejected and a trimmed one is kept", () => {
  assert.equal(validatePostInstruction("   ").ok, false);
  const ok = validatePostInstruction("  hello  ");
  assert.equal(ok.ok && ok.instruction, "hello");
});

test("every layout has a headline slot and a blueprint path", () => {
  assert.equal(POSTER_LAYOUTS.length, 16);
  for (const layout of POSTER_LAYOUTS) {
    assert.match(layout.blueprintPath, /^\/posters\/layouts\/\d{2}\.png$/);
    assert.equal(
      layout.layers.some((layer) => layer.type === "text" && layer.role === "headline"),
      true,
    );
  }
});
