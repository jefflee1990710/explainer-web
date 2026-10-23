import assert from "node:assert/strict";
import test from "node:test";
import type { CharacterSpec } from "@/model/character-spec";
import {
  cleanWardrobeEditText,
  cumulativeWardrobeEdit,
  parseWardrobeChanges,
  portraitWardrobeEditText,
  specAfterWardrobeEdit,
} from "@/service/character/wardrobe-edit";

const SPEC: CharacterSpec = {
  identity: "woman, mid 20s",
  face: "oval face, almond eyes",
  hair: "black shaggy wolf cut",
  skinTone: "light warm",
  body: "slim",
  marks: "",
  outfit: "black spaghetti strap dress with micro white floral pattern, brown canvas shoulder bag",
  palette: ["#111111", "#f1d3c0", "#000000", "#8a5a3c"],
};

const EDIT =
  "Hair: 90s center-parted curtain bangs; Top: Washed light blue denim halter top. Isolated wardrobe piece alwasheddenimtop.; Pants: Warm brown mini shorts. Isolated wardrobe piece albrnminishorts.";

test("parseWardrobeChanges reads each picked part and strips catalog tags", () => {
  const changes = parseWardrobeChanges(EDIT);
  assert.equal(changes.hair, "90s center-parted curtain bangs");
  assert.equal(changes.top, "Washed light blue denim halter top.");
  assert.equal(changes.pants, "Warm brown mini shorts.");
  assert.equal(changes.shoes, undefined);
});

test("cleanWardrobeEditText removes the internal 'Isolated wardrobe piece' tags", () => {
  const cleaned = cleanWardrobeEditText(EDIT);
  assert.doesNotMatch(cleaned, /Isolated wardrobe piece/);
  assert.match(cleaned, /Top: Washed light blue denim halter top\./);
});

test("specAfterWardrobeEdit replaces the stale hair and outfit with the picked items", () => {
  const next = specAfterWardrobeEdit(SPEC, EDIT);
  assert.ok(next);
  assert.equal(next.hair, "90s center-parted curtain bangs");
  assert.match(next.outfit, /denim halter top/);
  assert.match(next.outfit, /brown mini shorts/);
  assert.doesNotMatch(next.outfit, /spaghetti strap dress/);
  assert.deepEqual(next.palette, []);
  assert.equal(next.face, SPEC.face);
});

test("specAfterWardrobeEdit keeps the spec when the edit names no wardrobe part", () => {
  assert.deepEqual(specAfterWardrobeEdit(SPEC, "make her smile more"), SPEC);
  assert.equal(specAfterWardrobeEdit(undefined, EDIT), undefined);
});

test("portraitWardrobeEditText strips Pants and Shoes so head-and-shoulders portraits do not zoom out", () => {
  assert.equal(
    portraitWardrobeEditText(EDIT),
    "Hair: 90s center-parted curtain bangs; Top: Washed light blue denim halter top.",
  );
  assert.equal(
    portraitWardrobeEditText(
      "Pants: a white tennis skirt with sharp knife pleats; Shoes: Argentine alpargatas",
    ),
    "",
  );
  assert.equal(portraitWardrobeEditText("make her smile more"), "make her smile more");
});

function id(hex: string) {
  return { toHexString: () => hex };
}

test("cumulativeWardrobeEdit merges multi-version wardrobe edits from the root version", () => {
  const v1 = { id: id("v1") };
  const v2 = {
    id: id("v2"),
    parentVersionId: id("v1"),
    editInstruction:
      "Hair: short tight curls; Top: a structured oversized streetwear hoodie; Pants: matte black bike shorts; Shoes: white sneakers",
  };
  const v3 = {
    id: id("v3"),
    parentVersionId: id("v2"),
    editInstruction: "Top: a lightweight navy windbreaker",
  };
  const v4 = {
    id: id("v4"),
    parentVersionId: id("v3"),
    editInstruction: "Hair: 90s center-parted curtain bangs; Pants: straight blue jeans",
  };
  const versions = [v1, v2, v3, v4];
  assert.equal(
    cumulativeWardrobeEdit(versions, v4),
    "Hair: 90s center-parted curtain bangs; Top: a lightweight navy windbreaker; Pants: straight blue jeans; Shoes: white sneakers",
  );
});

test("cumulativeWardrobeEdit drops earlier pants when a full-body one-piece dress top is picked", () => {
  const v1 = { id: id("v1") };
  const v2 = {
    id: id("v2"),
    parentVersionId: id("v1"),
    editInstruction: "Top: a structured oversized streetwear hoodie; Pants: straight blue jeans",
  };
  const v3 = {
    id: id("v3"),
    parentVersionId: id("v2"),
    editInstruction:
      "Top: Bright red form-fitting milkmaid mini dress featuring short cap sleeves, a gathered scoop neckline, and ruched bodice detailing. Isolated wardrobe piece alredscoopdress.",
  };
  assert.equal(
    cumulativeWardrobeEdit([v1, v2, v3], v3),
    "Top: Bright red form-fitting milkmaid mini dress featuring short cap sleeves, a gathered scoop neckline, and ruched bodice detailing.",
  );
});
