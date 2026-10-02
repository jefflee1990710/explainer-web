import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { buildBlueprintPrompt } from "@/service/character/blueprint-prompt";
import { installTestStyles, uninstallTestStyles } from "@/service/style/test-styles";

before(() => installTestStyles());
after(() => uninstallTestStyles());

test("blueprint prompt lays out turnaround, walk cycle, and expression grid", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "一個穿藍色格子睡衣的小男孩，頭上有三根呆毛",
    hasReference: false,
  });
  assert.match(prompt, /front, back, left, and right/i);
  assert.match(prompt, /walk cycle/i);
  assert.match(prompt, /3 by 4 grid of head-and-shoulders expressions/i);
  assert.match(prompt, /Background: doodle canvas/i);
  assert.match(prompt, /3:2 landscape canvas/i);
  assert.match(prompt, /Leave at least 12% blank margin/i);
  assert.match(prompt, /Nothing may touch, clip, or extend beyond the image border/i);
  assert.match(prompt, /Final check: every drawing must be fully visible/i);
  assert.match(prompt, /doodle look/i);
  assert.match(prompt, /小男孩/);
  assert.doesNotMatch(prompt, /reference image/i);
});

test("blueprint prompt asks to preserve the reference when one is attached", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "x",
    referenceCount: 1,
  });
  assert.match(prompt, /Preserve the appearance of the character in the reference image/);
});

test("blueprint prompt fuses every attached photo into one identity", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "x",
    referenceCount: 3,
  });
  assert.match(prompt, /all attached reference images/i);
  assert.match(prompt, /same identity/i);
  assert.doesNotMatch(prompt, /Preserve the appearance of the character in the reference image/);
});

test("image-only create infers the character from the reference and style", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "   ",
    referenceCount: 1,
  });
  assert.doesNotMatch(prompt, /^Character:/m);
  assert.match(prompt, /Derive the character entirely from the attached reference image/);
  assert.match(prompt, /specified style/);
  assert.match(prompt, /doodle look/i);
  assert.doesNotMatch(prompt, /Preserve the appearance/);
});

test("edit mode keeps the sheet identical except for the change", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "x",
    referenceCount: 1,
    editInstruction: "把睡衣換成紅色",
  });
  assert.match(prompt, /Apply only the change below; keep everything else identical/);
  assert.match(prompt, /把睡衣換成紅色/);
});

test("chalkboard blueprint sits on a chalkboard, not white", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "chalkboard",
    description: "x",
    hasReference: false,
  });
  assert.match(prompt, /Background: chalkboard canvas/);
  const layoutInstructions = prompt
    .split("\n")
    .filter(
      (line) =>
        !["Background:", "Rendering:", "Palette:", "Never:"].some((prefix) =>
          line.startsWith(prefix),
        ),
    )
    .join("\n");
  assert.doesNotMatch(layoutInstructions, /white/i);
});
