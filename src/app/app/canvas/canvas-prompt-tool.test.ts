import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasPromptToolVisible } from "@/app/app/canvas/canvas-prompt-tool";

describe("canvasPromptToolVisible", () => {
  it("shows Prompt on the Tools tab until a category chip or an unrelated search hides it", () => {
    assert.equal(canvasPromptToolVisible("", false), true);
    assert.equal(canvasPromptToolVisible("pro", false), true);
    assert.equal(canvasPromptToolVisible("提示", false), true);
    assert.equal(canvasPromptToolVisible("hailuo", false), false);
    assert.equal(canvasPromptToolVisible("", true), false);
  });
});
