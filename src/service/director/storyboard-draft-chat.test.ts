import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStoryboardDraftPhaseABlock,
  mergeAiDraftsWithExistingSketches,
  sanitizeClipDraftsInput,
} from "@/service/director/storyboard-draft-chat";

test("sanitizeClipDraftsInput filters empty rows and renumbers sequentially", () => {
  const cleaned = sanitizeClipDraftsInput([
    { clipNumber: 1, explanation: "  Opening hook with chart  ", voDraft: "90% of companies fail!" },
    { clipNumber: 2, explanation: "   ", voDraft: "   " },
    { clipNumber: 5, explanation: "Solution diagram", sketchUrl: "https://blob/sketch.png" },
  ]);
  assert.equal(cleaned.length, 2);
  assert.deepEqual(cleaned[0], {
    clipNumber: 1,
    explanation: "Opening hook with chart",
    voDraft: "90% of companies fail!",
  });
  assert.deepEqual(cleaned[1], {
    clipNumber: 2,
    explanation: "Solution diagram",
    sketchUrl: "https://blob/sketch.png",
  });
});

test("buildStoryboardDraftPhaseABlock formats explanation, VO, and sketch notes for Phase A", () => {
  assert.equal(buildStoryboardDraftPhaseABlock([]), "");
  const block = buildStoryboardDraftPhaseABlock([
    {
      clipNumber: 1,
      explanation: "Draw a falling bar chart on the left.",
      voDraft: "原來9成公司死喺呢個原因！",
      sketchUrl: "https://blob/clip1-sketch.png",
    },
    {
      clipNumber: 2,
      explanation: "Compare old vs new social media strategy.",
    },
  ]);
  assert.match(block, /Clip 1:/);
  assert.match(block, /Draw a falling bar chart on the left\./);
  assert.match(block, /原來9成公司死喺呢個原因！/);
  assert.match(block, /\[Clip 1 Hand-Drawn Sketch\]/);
  assert.match(block, /Clip 2:/);
});

test("mergeAiDraftsWithExistingSketches preserves user sketches when AI updates text", () => {
  const merged = mergeAiDraftsWithExistingSketches(
    [
      { clipNumber: 1, explanation: "Updated Clip 1 explanation", voDraft: "VO 1" },
      { clipNumber: 2, explanation: "New Clip 2 explanation", voDraft: "VO 2" },
    ],
    [
      { clipNumber: 1, explanation: "Old", sketchUrl: "data:image/png;base64,AAA" },
    ],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].explanation, "Updated Clip 1 explanation");
  assert.equal(merged[0].sketchUrl, "data:image/png;base64,AAA");
  assert.equal(merged[1].sketchUrl, undefined);
});
