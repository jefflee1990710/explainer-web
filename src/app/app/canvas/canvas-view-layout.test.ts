import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasViewLayoutFromStorage } from "@/app/app/canvas/canvas-view-layout";

describe("canvasViewLayoutFromStorage", () => {
  it("defaults to the editor layout", () => {
    assert.equal(canvasViewLayoutFromStorage(null), "editor");
    assert.equal(canvasViewLayoutFromStorage("editor"), "editor");
    assert.equal(canvasViewLayoutFromStorage("nope"), "editor");
    assert.equal(canvasViewLayoutFromStorage("agent"), "agent");
  });
});
