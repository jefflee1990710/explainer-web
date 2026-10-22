import assert from "node:assert/strict";
import { test } from "node:test";
import { STARTER_CAST } from "@/service/character/starter-cast";
import { isStyleId } from "@/model/style-id";

test("new accounts receive five characters of different styles and both genders", () => {
  assert.equal(STARTER_CAST.length, 5);
  assert.equal(new Set(STARTER_CAST.map((item) => item.styleId)).size, 5);
  assert.equal(new Set(STARTER_CAST.map((item) => item.name)).size, 5);
  assert.equal(new Set(STARTER_CAST.map((item) => item.file)).size, 5);
  assert.equal(STARTER_CAST.some((item) => item.gender === "woman"), true);
  assert.equal(STARTER_CAST.some((item) => item.gender === "man"), true);
  for (const item of STARTER_CAST) {
    assert.equal(isStyleId(item.styleId), true);
    assert.equal(item.spec.identity.length > 0, true);
    assert.equal(item.prompt.length > 0, true);
  }
});
