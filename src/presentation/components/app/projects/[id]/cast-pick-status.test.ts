import assert from "node:assert/strict";
import { test } from "node:test";
import { castPickStatus } from "@/presentation/components/app/projects/[id]/cast-pick-status";
import { createTranslate, getMessages } from "@/util/i18n";

const t = createTranslate(getMessages("zh-Hant"));

test("Q&A needs exactly two characters before the line is ok", () => {
  assert.deepEqual(castPickStatus(0, 2, 2, t), {
    ok: false,
    text: "必須正好 2 個角色，還差 2 個",
  });
  assert.deepEqual(castPickStatus(1, 2, 2, t), {
    ok: false,
    text: "必須正好 2 個角色，還差 1 個",
  });
  assert.deepEqual(castPickStatus(2, 2, 2, t), { ok: true, text: "已選 2 / 2" });
});

test("optional cast just counts toward the max", () => {
  assert.deepEqual(castPickStatus(0, 0, 4, t), { ok: true, text: "已選 0 / 4" });
});
