import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";
import { buildBlueprintPrompt } from "@/service/character/blueprint-prompt";
import { resetStyleOverlay, resolvedStyle } from "@/service/style/load-style";
import { renderableFromSystem } from "@/service/style/renderable-style";
import { installTestStyles, testStyle, uninstallTestStyles } from "@/service/style/test-styles";

before(() => installTestStyles());
after(() => uninstallTestStyles());

function loadedStyle(id: "doodle" | "chalkboard") {
  return renderableFromSystem(resolvedStyle(id));
}

test("blueprint prompt lays out turnaround, walk cycle, and expression grid", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
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

test("blueprint prompt locks 五官比例 and 整體氣質 from one reference", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 1,
  });
  assert.match(prompt, /五官比例/);
  assert.match(prompt, /整體氣質/);
  assert.match(prompt, /Style is required/);
  assert.match(prompt, /doodle name style/);
  assert.match(prompt, /must not replace the face proportions, temperament, or the required style/);
  assert.doesNotMatch(prompt, /outrank the style/);
  assert.doesNotMatch(prompt, /Preserve the appearance of the character in the reference image/);
});

test("blueprint prompt fuses every attached photo into one identity", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 3,
  });
  assert.match(prompt, /all attached reference images/i);
  assert.match(prompt, /same identity/i);
  assert.match(prompt, /五官比例/);
  assert.match(prompt, /整體氣質/);
  assert.match(prompt, /Style is required/);
  assert.doesNotMatch(prompt, /Preserve the appearance of the character in the reference image/);
});

test("image-only create infers the character from the reference and style", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "   ",
    referenceCount: 1,
  });
  assert.doesNotMatch(prompt, /^Character:/m);
  assert.match(prompt, /Derive the character entirely from the attached reference image/);
  assert.match(prompt, /doodle name model sheet/);
  assert.match(prompt, /Style is required/);
  assert.match(prompt, /doodle look/i);
  assert.match(prompt, /五官比例/);
  assert.match(prompt, /整體氣質/);
  assert.doesNotMatch(prompt, /Preserve the appearance/);
});

test("edit mode keeps the sheet identical except for the change", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 1,
    editInstruction: "把睡衣換成紅色",
  });
  assert.match(prompt, /Apply only the change below; keep everything else identical/);
  assert.match(prompt, /五官比例/);
  assert.match(prompt, /整體氣質/);
  assert.match(prompt, /把睡衣換成紅色/);
});

test("edit mode with originals tells the model the sheet is first and photos follow", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("doodle"),
    description: "x",
    referenceCount: 3,
    editInstruction: "把睡衣換成紅色",
  });
  assert.match(prompt, /first reference image is that current character sheet/);
  assert.match(prompt, /original photo/);
  assert.match(prompt, /does not drift/);
  assert.match(prompt, /把睡衣換成紅色/);
});

test("a preloaded user style supplies look and does not resolve that id", () => {
  const custom = renderableFromSystem(testStyle("paper-cutout", {
    look: "torn kraft edges",
  }));
  custom.id = new ObjectId().toHexString();
  resetStyleOverlay();
  try {
    const prompt = buildBlueprintPrompt({ style: custom, description: "a hero" });
    assert.match(prompt, /torn kraft edges/);
    assert.match(prompt, /a hero/);
  } finally {
    installTestStyles();
  }
});

test("chalkboard with a reference stays white chalk, not photo colour", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("chalkboard"),
    description: "x",
    referenceCount: 1,
  });
  assert.match(prompt, /Chalkboard is monochrome/);
  assert.match(prompt, /white chalk stroke/);
  assert.match(prompt, /never as skin tone/);
});

test("chalkboard blueprint sits on a chalkboard, not white", () => {
  const prompt = buildBlueprintPrompt({
    style: loadedStyle("chalkboard"),
    description: "x",
    hasReference: false,
  });
  assert.match(prompt, /Background: chalkboard canvas/);
  assert.doesNotMatch(prompt, /Chalkboard is monochrome/);
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
