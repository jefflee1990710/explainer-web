import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveStyleLettering } from "@/service/style/lettering";
import { testStyle } from "@/service/style/test-styles";

test("a style without lettering fields does not invent doodle copy", () => {
  const lettering = resolveStyleLettering(testStyle("doodle"));
  assert.equal(lettering.letteringLayout, "");
  assert.equal(lettering.letteringLine1, "");
  assert.equal(lettering.letteringLine2, "");
  assert.equal(lettering.beatTitleLayout, "");
  assert.equal(lettering.reelLayout, "");
  const text = Object.values(lettering).join("\n");
  assert.doesNotMatch(text, /52%|64%|warm-yellow|black hand-drawn/);
});

test("resolveStyleLettering returns only the fields stored on the style", () => {
  const lettering = resolveStyleLettering(
    testStyle("paper-cutout", {
      letteringLayout: "Layout: cut-paper VO at 40% height.",
      letteringLine1: "Line 1 is torn dark-ink paper.",
      letteringLine2: "  Line 2 is a sunflower paper strip.  ",
    }),
  );
  assert.equal(lettering.letteringLayout, "Layout: cut-paper VO at 40% height.");
  assert.equal(lettering.letteringLine1, "Line 1 is torn dark-ink paper.");
  assert.equal(lettering.letteringLine2, "Line 2 is a sunflower paper strip.");
  assert.equal(lettering.beatTitleLayout, "");
  assert.equal(lettering.reelLayout, "");
});
