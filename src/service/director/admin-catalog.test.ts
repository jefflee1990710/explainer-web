import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DIRECTORS } from "@/service/director/catalog";
import { listHardcodedDirectorCatalog } from "@/service/director/admin-catalog";

describe("listHardcodedDirectorCatalog", () => {
  it("includes every hardcoded director prompt and setting", () => {
    const catalog = listHardcodedDirectorCatalog();
    assert.equal(catalog.directors.length, DIRECTORS.length);
    assert.equal(catalog.storyboardModel, "gemini-4-argon");
    for (const director of catalog.directors) {
      assert.ok(director.systemPrompt.length > 40, director.slug);
      assert.ok(director.phaseAPrompt.includes(director.systemPrompt), director.slug);
      assert.equal(director.behavior.length > 10, true, director.slug);
      assert.equal(director.profile.length, 8, director.slug);
    }
    const whiteboard = catalog.directors.find((director) => director.slug === "cartoon-explainer-video-director");
    assert.ok(whiteboard);
    assert.match(whiteboard.runtimeBlocks.map((block) => block.text).join("\n"), /at least four distinct/);
    const talking = catalog.directors.find((director) => director.slug === "talking-head-director");
    assert.ok(talking);
    assert.equal(talking.performance.length, 2);
    assert.ok(talking.references.length > 0);
    assert.match(talking.phaseBPrompt, /prompt-contract/);
  });
});
