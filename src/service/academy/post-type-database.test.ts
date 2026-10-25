import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMY_POST_TYPES, POST_TYPE_GROUPS } from "@/service/academy/post-type-database";

test("every post type group has a title, a use, and a beat", () => {
  const ids = ACADEMY_POST_TYPES.map((item) => item.id);
  const titles = ACADEMY_POST_TYPES.map((item) => item.title);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(titles).size, titles.length);
  for (const group of POST_TYPE_GROUPS) {
    const rows = ACADEMY_POST_TYPES.filter((item) => item.group === group);
    assert.ok(rows.length >= 2, group);
    assert.ok(rows.every((item) => item.use.trim() && item.beats.trim()));
  }
});
