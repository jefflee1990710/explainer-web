import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal, StoryboardRow } from "@/model/project";
import { appendClipPlacement, appendClipUserPrompt } from "@/service/director/append-clip";

function row(clipNumber: number): StoryboardRow {
  return {
    clipNumber,
    timeRange: "x",
    durationSeconds: 5,
    narrativeJob: `job ${clipNumber}`,
    explainerScene: `scene ${clipNumber}`,
    motionCamera: "push",
    englishVo: `Line ${clipNumber}.`,
    bgmSfx: "none",
  };
}

function proposal(): PhaseAProposal {
  return {
    englishTitle: "Toast",
    localizedTitle: "吐司",
    targetDuration: "10s",
    clipCount: 2,
    loopMode: "linear",
    coreMessage: "熱度",
    hookStrategy: "警報",
    aspectRatio: "9:16",
    visualWorld: "剪紙",
    narrator: "旁白",
    englishWordCount: 4,
    characterLock: "依藍圖",
    palette: "紅",
    bgmDirection: "無",
    narrativeArc: "問題到解答",
    clips: [row(1), row(2)],
  };
}

test("a new clip can be written for the start, a gap, or the end", () => {
  const phaseA = proposal();
  assert.match(appendClipPlacement(phaseA, 1), /before the current first clip/);
  assert.match(appendClipUserPrompt(phaseA, "open", 1), /before clip 1/);
  assert.match(appendClipPlacement(phaseA, 2), /between clip 1 and clip 2/);
  assert.match(appendClipUserPrompt(phaseA, "bridge", 2), /after clip 1 and before clip 2/);
  assert.match(appendClipPlacement(phaseA, 3), /end of a finished storyboard/);
  assert.match(appendClipUserPrompt(phaseA, "close", 3), /after clip 2/);
});
