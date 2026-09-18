import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBlueprintPrompt } from "./blueprint-prompt";

test("blueprint prompt lays out turnaround, walk cycle, and expression grid", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "一個穿藍色格子睡衣的小男孩，頭上有三根呆毛",
    hasReference: false,
  });
  assert.match(prompt, /front, back, left, and right/i);
  assert.match(prompt, /walk cycle/i);
  assert.match(prompt, /3 by 4 grid of head-and-shoulders expressions/i);
  assert.match(prompt, /solid white background/i);
  assert.match(prompt, /generous white padding on all four sides/i);
  assert.match(prompt, /Nothing may touch, clip, or extend beyond the image border/i);
  assert.match(prompt, /bold irregular black marker outlines/i);
  assert.match(prompt, /小男孩/);
  assert.doesNotMatch(prompt, /reference image/i);
});

test("blueprint prompt asks to preserve the reference when one is attached", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "x",
    hasReference: true,
  });
  assert.match(prompt, /Preserve the appearance of the character in the reference image/);
});

test("image-only create infers the character from the reference and style", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "   ",
    hasReference: true,
  });
  assert.doesNotMatch(prompt, /^Character:/m);
  assert.match(prompt, /Derive the character entirely from the attached reference image/);
  assert.match(prompt, /specified style/);
  assert.match(prompt, /bold irregular black marker outlines/i);
  assert.doesNotMatch(prompt, /Preserve the appearance/);
});

test("edit mode keeps the sheet identical except for the change", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "x",
    hasReference: true,
    editInstruction: "把睡衣換成紅色",
  });
  assert.match(prompt, /Apply only the change below; keep everything else identical/);
  assert.match(prompt, /把睡衣換成紅色/);
});
