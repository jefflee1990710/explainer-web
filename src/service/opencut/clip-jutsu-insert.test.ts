import test from "node:test";
import assert from "node:assert/strict";
import { buildJutsuClipInsertion } from "./clip-jutsu-insert";

test("buildJutsuClipInsertion inserts a new StoryboardRow and clip row at insertAt without mutating source clip", () => {
  const project = {
    phaseA: {
      clips: [
        {
          clipNumber: 1,
          durationSeconds: 6,
          startScene: "Opening",
          explainerScene: "Opening",
          motionCamera: "Static",
          narrativeJob: "Hook",
          englishVo: "(no dialogue)",
          bgmSfx: "none",
          timeRange: "0–6s",
        },
        {
          clipNumber: 2,
          durationSeconds: 6,
          startScene: "Closing",
          explainerScene: "Closing",
          motionCamera: "Static",
          narrativeJob: "Outro",
          englishVo: "(no dialogue)",
          bgmSfx: "none",
          timeRange: "6–12s",
        },
      ],
      clipCount: 2,
      targetDuration: "12s",
      englishWordCount: 20,
    },
    clips: [
      { clipNumber: 1, durationSeconds: 6, prompt: "Opening", status: "completed" as const },
      { clipNumber: 2, durationSeconds: 6, prompt: "Closing", status: "completed" as const },
    ],
  };

  const res = buildJutsuClipInsertion({
    project,
    sourceClipNumber: 1,
    insertAt: 2,
    mode: "swap",
    nowIso: new Date().toISOString(),
  });

  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.project.phaseA.clips.length, 3);
  assert.equal(res.newClipNumber, 2);
  // Original Clip 1 remains at clipNumber 1
  assert.equal(res.project.clips[0].clipNumber, 1);
  // Source clip was not modified
  assert.equal(res.project.clips[0].status, "completed");
  // New Clip 2 is in_progress
  assert.equal(res.project.clips[1].status, "in_progress");
  // Former Clip 2 shifted to Clip 3
  assert.equal(res.project.clips[2].clipNumber, 3);
});
