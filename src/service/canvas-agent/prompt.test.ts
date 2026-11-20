import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import {
  buildCanvasAgentSystemPrompt,
  canvasAgentLanguageRule,
} from "@/service/canvas-agent/prompt";
import { createWorkingGraph } from "@/service/canvas-agent/tools";
import { CANVAS_AGENT_LANGUAGES } from "@/service/canvas-agent/types";

function graph() {
  return createWorkingGraph({
    nodes: [{ id: "prompt-abc", type: "prompt", position: { x: 0, y: 0 }, data: { text: "fox" } }],
    edges: [],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
  });
}

describe("canvas agent prompt", () => {
  it("gives every language its own reply rule", () => {
    const rules = CANVAS_AGENT_LANGUAGES.map(canvasAgentLanguageRule);
    assert.equal(new Set(rules).size, rules.length);
    assert.match(canvasAgentLanguageRule("yue"), /Cantonese/);
    assert.match(canvasAgentLanguageRule("ja"), /Japanese/);
  });

  it("lists OpenRouter models and the current nodes", () => {
    const text = buildCanvasAgentSystemPrompt({ language: "en", graph: graph() });
    assert.match(text, /openrouter:minimax\/hailuo-3/);
    assert.match(text, /prompt-abc/);
    assert.doesNotMatch(text, /mentalok:/);
  });

  it("states that the agent never runs generation", () => {
    const text = buildCanvasAgentSystemPrompt({ language: "zh-Hant", graph: graph() });
    assert.match(text, /never run/i);
    assert.match(text, /Run/);
  });
});
