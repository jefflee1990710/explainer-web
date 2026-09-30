import assert from "node:assert/strict";
import { test } from "node:test";
import { castPickStatus } from "@/presentation/components/app/projects/[id]/cast-pick-status";

test("Q&A needs exactly two characters before the line is ok", () => {
  assert.deepEqual(castPickStatus(0, 2, 2), {
    ok: false,
    text: "必須正好 2 個角色，還差 2 個",
  });
  assert.deepEqual(castPickStatus(1, 2, 2), {
    ok: false,
    text: "必須正好 2 個角色，還差 1 個",
  });
  assert.deepEqual(castPickStatus(2, 2, 2), { ok: true, text: "已選 2 / 2" });
});

test("optional cast just counts toward the max", () => {
  assert.deepEqual(castPickStatus(0, 0, 4), { ok: true, text: "已選 0 / 4" });
});
