import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import {
  buildCanvasAgentSystemPrompt,
  canvasAgentLanguageRule,
} from "@/service/canvas-agent/prompt";
import { createWorkingGraph } from "@/service/canvas-agent/working-graph";
import { CANVAS_AGENT_LANGUAGES } from "@/model/canvas-agent";

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

  it("lists OpenRouter, Scro, and FFmpeg models and the current nodes", () => {
    const text = buildCanvasAgentSystemPrompt({ language: "en", graph: graph() });
    assert.match(text, /minimax:MiniMax-H3/);
    assert.match(text, /scro:tts/);
    assert.match(text, /add_scro_group/);
    assert.match(text, /tool "talking-head"/);
    assert.doesNotMatch(text, /^scro:life \|/m);
    assert.match(text, /ffmpeg:concat/);
    assert.match(text, /ffmpeg:smooth-silence/);
    assert.match(text, /prompt-abc/);
    assert.match(text, /chat-image-1/);
    assert.doesNotMatch(text, /mentalok:/);
  });

  it("states that the agent never runs generation", () => {
    const text = buildCanvasAgentSystemPrompt({ language: "zh-Hant", graph: graph() });
    assert.match(text, /never run/i);
    assert.match(text, /2 to 4 short sentences/);
    assert.doesNotMatch(text, /GitHub README Markdown/);
    assert.doesNotMatch(text, /No Markdown symbols/);
    assert.match(text, /Run/);
    assert.match(text, /batch_delete_nodes/);
    assert.match(text, /batch_update_nodes/);
    assert.match(text, /batch_add_nodes/);
    assert.match(text, /call replace_group once/);
    assert.match(text, /\[Context\]/);
    assert.match(text, /update_group with that group's memberIds/);
    assert.match(text, /replace_group does not re-plan Swap or Teleport/);
  });
});
