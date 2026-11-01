import assert from "node:assert/strict";
import { test } from "node:test";
import { isStudioNavActive } from "@/presentation/studio/studio-nav-active";

test("a poster page highlights Post and not Create video lists", () => {
  assert.equal(isStudioNavActive("/app/posts/abc", "/app/posts"), true);
  assert.equal(isStudioNavActive("/app/posts/abc", "/app"), false);
  assert.equal(isStudioNavActive("/app/posts/abc", "/app/explainers"), false);
});

test("explainer and talking-head lists highlight their own Create items", () => {
  assert.equal(isStudioNavActive("/app/explainers", "/app/explainers"), true);
  assert.equal(isStudioNavActive("/app/talking-heads", "/app/talking-heads"), true);
  assert.equal(isStudioNavActive("/app/explainers", "/app/talking-heads"), false);
  assert.equal(isStudioNavActive("/app/projects/abc", "/app"), false);
});

test("character pages, including the generator, highlight Characters", () => {
  assert.equal(isStudioNavActive("/app/characters", "/app/characters"), true);
  assert.equal(isStudioNavActive("/app/characters/generate", "/app/characters"), true);
  assert.equal(isStudioNavActive("/app/characters/abc", "/app/characters"), true);
  assert.equal(isStudioNavActive("/app/characters/generate", "/app"), false);
});
