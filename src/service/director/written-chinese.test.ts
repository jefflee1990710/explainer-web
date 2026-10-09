import assert from "node:assert/strict";
import { test } from "node:test";
import { looksColloquial, toWrittenChinese } from "@/service/director/written-chinese";

test("Cantonese colloquial becomes written Chinese, and English stays", () => {
  assert.equal(looksColloquial("你啲貨幾靚都好喎"), true);
  assert.equal(toWrittenChinese("你啲貨幾靚都好喎"), "你些貨幾漂亮都好");
  assert.equal(toWrittenChinese("冇人知咪又係擺喺度？"), "沒有人知咪又係擺在度？");
  assert.equal(toWrittenChinese("Instagram"), "Instagram");
  assert.equal(toWrittenChinese("大家好"), "大家好");
});
