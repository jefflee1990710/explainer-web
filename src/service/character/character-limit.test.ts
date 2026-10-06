import assert from "node:assert/strict";
import { test } from "node:test";
import {
  characterAllowance,
  characterLimit,
  isCharacterLimitUnlocked,
} from "@/service/character/character-limit";

test("character allowance grows with the plan and is one without a subscription", () => {
  assert.equal(characterLimit(null), 1);
  assert.equal(characterLimit(undefined), 1);
  assert.equal(characterLimit("starter"), 5);
  assert.equal(characterLimit("pro"), 15);
  assert.equal(characterLimit("studio"), 40);
  assert.equal(characterLimit("scale"), 100);
});

test("only the unlocked address skips the character cap", () => {
  assert.equal(isCharacterLimitUnlocked("jeff.lee.1990710@gmail.com"), true);
  assert.equal(isCharacterLimitUnlocked("  Jeff.Lee.1990710@gmail.com "), true);
  assert.equal(isCharacterLimitUnlocked("other@gmail.com"), false);
  assert.equal(isCharacterLimitUnlocked(null), false);
  assert.equal(characterAllowance("starter", "jeff.lee.1990710@gmail.com"), null);
  assert.equal(characterAllowance(null, "other@gmail.com"), 1);
  assert.equal(characterAllowance("pro", "other@gmail.com"), 15);
});
