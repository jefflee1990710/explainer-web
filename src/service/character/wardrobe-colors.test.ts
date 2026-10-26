import assert from "node:assert/strict";
import test from "node:test";
import { characterWardrobeEditInstruction } from "@/service/character/character-look";
import {
  appendWardrobeColorToPrompt,
  defaultWardrobeColorForOption,
  detectCharacterWardrobeColors,
  effectiveWardrobeColor,
  mergeWardrobePicksForColorEdits,
  normalizeWardrobeHexColor,
  wardrobePromptWithColor,
} from "@/service/character/wardrobe-colors";

test("normalizeWardrobeHexColor accepts #RRGGBB", () => {
  assert.equal(normalizeWardrobeHexColor("#aabbcc"), "#AABBCC");
  assert.equal(normalizeWardrobeHexColor("aabbcc"), "#AABBCC");
  assert.equal(normalizeWardrobeHexColor("nope"), null);
});

test("defaultWardrobeColorForOption infers from catalog prompts", () => {
  assert.equal(defaultWardrobeColorForOption("top", "tee"), "#4A5568");
  assert.equal(defaultWardrobeColorForOption("pants", "jeans"), "#2563EB");
  assert.equal(defaultWardrobeColorForOption("shoes", "sneakers"), "#F5F5F0");
  assert.equal(defaultWardrobeColorForOption("top", "bandhgala"), "#1B2B4B");
});

test("wardrobePromptWithColor appends suffix when user overrides", () => {
  const base = "a fitted heavyweight crew-neck t-shirt";
  assert.equal(
    wardrobePromptWithColor(base, "top", "tee", { top: "#FF0000" }),
    `${base}, exact color #FF0000`,
  );
  assert.equal(wardrobePromptWithColor(base, "top", "tee", {}), base);
});

test("characterWardrobeEditInstruction embeds color overrides", () => {
  const edit = characterWardrobeEditInstruction(
    { top: "tee" },
    "",
    undefined,
    undefined,
    { top: "#FF0000" },
  );
  assert.match(edit, /Top: a fitted heavyweight crew-neck t-shirt, exact color #FF0000/);
  assert.deepEqual(detectCharacterWardrobeColors(edit), { top: "#FF0000" });
});

test("mergeWardrobePicksForColorEdits keeps worn id when only color changes", () => {
  const merged = mergeWardrobePicksForColorEdits({}, { top: "#FF0000" }, { top: "tee" });
  assert.deepEqual(merged, { top: "tee" });
});

test("appendWardrobeColorToPrompt replaces prior suffix", () => {
  assert.equal(
    appendWardrobeColorToPrompt("jeans, exact color #111111", "#222222"),
    "jeans, exact color #222222",
  );
});

test("effectiveWardrobeColor prefers explicit override", () => {
  assert.equal(
    effectiveWardrobeColor("pants", "jeans", { pants: "#ABCDEF" }),
    "#ABCDEF",
  );
});
