import assert from "node:assert/strict";
import { test } from "node:test";
import { characterStyleLimit } from "@/service/character/style-limit";

test("style allowance grows with the plan and is one without a subscription", () => {
  assert.equal(characterStyleLimit(null), 1);
  assert.equal(characterStyleLimit(undefined), 1);
  assert.equal(characterStyleLimit("starter"), 2);
  assert.equal(characterStyleLimit("pro"), 3);
  assert.equal(characterStyleLimit("studio"), 5);
  assert.equal(characterStyleLimit("scale"), 8);
});
