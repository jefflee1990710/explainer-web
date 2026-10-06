import assert from "node:assert/strict";
import { test } from "node:test";
import { isStudioNavActive } from "@/presentation/studio/studio-nav-active";

test("a poster page highlights Post and not Video", () => {
  assert.equal(isStudioNavActive("/app/posts/abc", "/app/posts"), true);
  assert.equal(isStudioNavActive("/app/posts/abc", "/app"), false);
  assert.equal(isStudioNavActive("/app/projects/abc", "/app"), true);
});
