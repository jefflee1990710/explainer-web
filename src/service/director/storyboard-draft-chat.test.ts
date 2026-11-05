import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPresetSketchElements,
  buildStoryboardDraftPhaseABlock,
  mergeAiDraftsWithExistingSketches,
  sanitizeClipDraftsInput,
} from "@/service/director/storyboard-draft-chat";

test("sanitizeClipDraftsInput filters empty rows, preserves structured cartoon/diagram fields, and renumbers sequentially", () => {
  const cleaned = sanitizeClipDraftsInput([
    {
      clipNumber: 1,
      explanation: "  Opening hook with chart  ",
      voDraft: "90% of companies fail!",
      diagramLayout: "split-compare",
      characterPosition: "left",
      characterAction: "Pointing at diagram",
      visualNodes: ["  「舊方法」混亂線團  ", "", "「新系統」綠色直線"],
    },
    { clipNumber: 2, explanation: "   ", voDraft: "   " },
    {
      clipNumber: 5,
      explanation: "",
      diagramLayout: "process-flow",
      characterPosition: "right",
      visualNodes: ["Step 1", "Step 2", "Step 3"],
      sketchUrl: "https://blob/sketch.png",
    },
  ]);
  assert.equal(cleaned.length, 2);
  assert.deepEqual(cleaned[0], {
    clipNumber: 1,
    explanation: "Opening hook with chart",
    voDraft: "90% of companies fail!",
    diagramLayout: "split-compare",
    characterPosition: "left",
    characterAction: "Pointing at diagram",
    visualNodes: ["「舊方法」混亂線團", "「新系統」綠色直線"],
  });
  assert.deepEqual(cleaned[1], {
    clipNumber: 2,
    explanation: "",
    diagramLayout: "process-flow",
    characterPosition: "right",
    visualNodes: ["Step 1", "Step 2", "Step 3"],
    sketchUrl: "https://blob/sketch.png",
  });
});

test("buildPresetSketchElements generates normalized 0..100 wireframe elements for diagram layouts and character position", () => {
  const elements = buildPresetSketchElements({
    diagramLayout: "split-compare",
    characterPosition: "left",
    visualNodes: ["「舊做法」慢", "「新系統」快"],
  });
  assert.equal(elements.some((el) => el.type === "person" && el.x < 35), true);
  assert.equal(elements.some((el) => el.type === "line"), true);
  assert.equal(elements.filter((el) => el.type === "rect").length >= 2, true);

  const noChar = buildPresetSketchElements({
    diagramLayout: "process-flow",
    characterPosition: "none",
    visualNodes: ["Step 1", "Step 2", "Step 3"],
  });
  assert.equal(noChar.some((el) => el.type === "person"), false);
  assert.equal(noChar.some((el) => el.type === "arrow"), true);
});

test("buildStoryboardDraftPhaseABlock formats explanation, VO, structured cartoon/diagram controls, and sketch notes for Phase A", () => {
  assert.equal(buildStoryboardDraftPhaseABlock([]), "");
  const block = buildStoryboardDraftPhaseABlock([
    {
      clipNumber: 1,
      explanation: "Draw a falling bar chart on the left.",
      voDraft: "原來9成公司死喺呢個原因！",
      diagramLayout: "split-compare",
      characterPosition: "left",
      characterAction: "指住圖表講解",
      visualNodes: ["「舊方法」混亂線團", "「新系統」綠色直線"],
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
  assert.match(block, /split-compare/i);
  assert.match(block, /Character Staging: position=left .* action=指住圖表講解/);
  assert.match(block, /「舊方法」混亂線團/);
  assert.match(block, /\[Clip 1 Hand-Drawn Sketch\]/);
  assert.match(block, /Clip 2:/);
});

test("mergeAiDraftsWithExistingSketches preserves user sketches and populates structured controls + preset sketchElements", () => {
  const merged = mergeAiDraftsWithExistingSketches(
    [
      {
        clipNumber: 1,
        explanation: "Updated Clip 1 explanation",
        voDraft: "VO 1",
        diagramLayout: "split-compare",
        characterPosition: "left",
        characterAction: "指住圖表講解",
        visualNodes: ["Node A", "Node B"],
      },
      {
        clipNumber: 2,
        explanation: "New Clip 2 explanation",
        voDraft: "VO 2",
        diagramLayout: "process-flow",
        characterPosition: "right",
        visualNodes: ["Step 1", "Step 2", "Step 3"],
      },
    ],
    [
      { clipNumber: 1, explanation: "Old", sketchUrl: "data:image/png;base64,AAA" },
    ],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].explanation, "Updated Clip 1 explanation");
  assert.equal(merged[0].sketchUrl, "data:image/png;base64,AAA");
  assert.equal(merged[0].diagramLayout, "split-compare");
  assert.equal(merged[0].characterPosition, "left");
  assert.equal(merged[0].characterAction, "指住圖表講解");
  assert.deepEqual(merged[0].visualNodes, ["Node A", "Node B"]);
  assert.equal(merged[1].sketchUrl, undefined);
  assert.equal((merged[1].sketchElements?.length ?? 0) > 0, true);
});
