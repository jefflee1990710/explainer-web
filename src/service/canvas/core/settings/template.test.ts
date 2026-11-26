import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { promptPlaceholders, renderPromptTemplate } from "@/service/canvas/core/settings/template";
import {
  ensureTextStylePlaceholder,
  explainerTextStyleLine,
  MAX_TEXT_STYLE_LINE_CHARS,
  templateTextStyleLine,
} from "@/service/canvas/core/settings/explainer-text-style";

describe("prompt templates", () => {
  it("lists placeholders once, in order, allowing spaces inside the braces", () => {
    assert.deepEqual(promptPlaceholders("A {{ mood }} {{style}} scene, {{mood}} again"), ["mood", "style"]);
  });

  it("fills known keys and reports the missing ones", () => {
    const out = renderPromptTemplate("A {{mood}} {{style}} scene", { mood: "rainy" });
    assert.equal(out.text, "A rainy {{style}} scene");
    assert.deepEqual(out.missing, ["style"]);
  });

  it("never reads inherited object keys", () => {
    assert.deepEqual(renderPromptTemplate("{{constructor}}", {}).missing, ["constructor"]);
  });
});

describe("explainer text style placeholder", () => {
  it("swaps the style line for {{text_style}} and back", () => {
    const line = explainerTextStyleLine("neon");
    const prompt = `ON-CANVAS TEXT: hook.\n${line}\nLettering follows that Look.`;
    const templated = templateTextStyleLine(prompt, "neon");
    assert.equal(templated.templated, true);
    assert.ok(!templated.prompt.includes(line));
    assert.equal(renderPromptTemplate(templated.prompt, { text_style: line }).text, prompt);
  });

  it("leaves a prompt without that line alone, and re-adds a dropped placeholder", () => {
    assert.equal(templateTextStyleLine("no lettering here", "neon").templated, false);
    assert.equal(ensureTextStylePlaceholder("short"), "short\n{{text_style}}");
    assert.equal(ensureTextStylePlaceholder("a {{text_style}} b"), "a {{text_style}} b");
  });

  it("knows the longest style line", () => {
    assert.ok(MAX_TEXT_STYLE_LINE_CHARS >= explainerTextStyleLine("clean").length);
  });
});
