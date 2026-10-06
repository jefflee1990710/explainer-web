import assert from "node:assert/strict";
import { test } from "node:test";
import {
  characterStyleAllowance,
  characterStyleLimit,
  isCharacterStyleLimitUnlocked,
} from "@/service/character/style-limit";

test("style allowance grows with the plan and is one without a subscription", () => {
  assert.equal(characterStyleLimit(null), 1);
  assert.equal(characterStyleLimit(undefined), 1);
  assert.equal(characterStyleLimit("starter"), 2);
  assert.equal(characterStyleLimit("pro"), 3);
  assert.equal(characterStyleLimit("studio"), 5);
  assert.equal(characterStyleLimit("scale"), 8);
});

test("only the unlocked address skips the per-character style cap", () => {
  assert.equal(isCharacterStyleLimitUnlocked("jeff.lee.1990710@gmail.com"), true);
  assert.equal(isCharacterStyleLimitUnlocked("  Jeff.Lee.1990710@gmail.com "), true);
  assert.equal(isCharacterStyleLimitUnlocked("other@gmail.com"), false);
  assert.equal(characterStyleAllowance("pro", "jeff.lee.1990710@gmail.com"), null);
  assert.equal(characterStyleAllowance(null, "other@gmail.com"), 1);
  assert.equal(characterStyleAllowance("studio", "other@gmail.com"), 5);
});
