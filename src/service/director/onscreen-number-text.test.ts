import assert from "node:assert/strict";
import test from "node:test";
import { displayNumbersForOnScreenText } from "@/service/director/onscreen-number-text";

test("displayNumbersForOnScreenText paints Ninety percent as 90%", () => {
  assert.equal(
    displayNumbersForOnScreenText(
      "Ninety percent of people do not realize they are sitting on monetizable knowledge.",
    ),
    "90% of people do not realize they are sitting on monetizable knowledge.",
  );
  assert.equal(
    displayNumbersForOnScreenText("Your daily experience is valuable."),
    "Your daily experience is valuable.",
  );
});

test("displayNumbersForOnScreenText paints other quantities as digits", () => {
  assert.equal(displayNumbersForOnScreenText("twenty-five percent"), "25%");
  assert.equal(displayNumbersForOnScreenText("one hundred and five people"), "105 people");
  assert.equal(displayNumbersForOnScreenText("a hundred per cent"), "100%");
  assert.equal(displayNumbersForOnScreenText("three point five percent"), "3.5%");
  assert.equal(displayNumbersForOnScreenText("90 percent done"), "90% done");
  assert.equal(displayNumbersForOnScreenText("1,200 users"), "1200 users");
  assert.equal(displayNumbersForOnScreenText("one and two"), "1 and 2");
  assert.equal(displayNumbersForOnScreenText("Scro.io has a second chance"), "Scro.io has a second chance");
  assert.equal(displayNumbersForOnScreenText("百分之九十的人有十五個想法"), "90%的人有15個想法");
});
