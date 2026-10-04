import assert from "node:assert/strict";
import { test } from "node:test";
import { chalkboardColorDoc, chalkboardColorStyle } from "@/service/style/chalkboard-color";
import { applyChalkboardMonochrome } from "@/service/style/chalkboard-monochrome";

test("color chalkboard keeps pastel accents", () => {
  const style = chalkboardColorStyle();
  assert.equal(style.id, "chalkboard-color");
  assert.match(style.palette, /pastel chalk accents/);
  assert.match(style.look, /coloured chalk/);
  assert.doesNotMatch(style.palette, /white chalk only/i);
  assert.equal(applyChalkboardMonochrome(style).palette, style.palette);
});

test("color chalkboard doc copies lettering from the monochrome sibling", () => {
  const doc = chalkboardColorDoc({
    _id: "chalkboard",
    letteringLayout: "center VO",
    letteringLine1: "white chalk line",
    updatedAt: new Date(),
  });
  assert.equal(doc._id, "chalkboard-color");
  assert.equal(doc.letteringLayout, "center VO");
  assert.equal(doc.letteringLine1, "white chalk line");
  assert.match(doc.letteringLine2 ?? "", /yellow chalk/);
});
