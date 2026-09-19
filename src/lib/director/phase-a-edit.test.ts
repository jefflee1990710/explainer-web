import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/types/project";
import {
  applyPhaseAEdits,
  keepProposalRegenerateClips,
  phaseAToEditInput,
  spokenUnits,
} from "./phase-a-edit";

function proposal(): PhaseAProposal {
  return {
    englishTitle: "Why toast burns",
    localizedTitle: "為什麼吐司會燒焦",
    targetDuration: "15s",
    clipCount: 2,
    loopMode: "linear",
    coreMessage: "小心熱度",
    hookStrategy: "警報聲",
    aspectRatio: "9:16",
    visualWorld: "剪紙世界",
    narrator: "Math Tutor",
    englishWordCount: 8,
    characterLock: "依藍圖",
    palette: "紅藍黃",
    bgmDirection: "輕快",
    narrativeArc: "問題到解答",
    clips: [
      {
        clipNumber: 1,
        timeRange: "0-5s",
        durationSeconds: 5,
        narrativeJob: "hook",
        explainerScene: "警報掉下來",
        motionCamera: "推近",
        englishVo: "Danger?",
        referenceTranslation: "危險？",
        bgmSfx: "alarm",
      },
      {
        clipNumber: 2,
        timeRange: "5-10s",
        durationSeconds: 5,
        narrativeJob: "payoff",
        explainerScene: "其實是吐司",
        motionCamera: "拉開",
        englishVo: "Just toast.",
        referenceTranslation: "只是吐司。",
        bgmSfx: "ding",
      },
    ],
  };
}

test("spokenUnits counts words in English and characters in Chinese", () => {
  assert.equal(spokenUnits("Just toast."), 2);
  assert.equal(spokenUnits("只是吐司。", "zh"), 5);
});

test("applyPhaseAEdits keeps clip timing and rewrites user-facing fields", () => {
  const current = proposal();
  const input = phaseAToEditInput(current);
  input.localizedTitle = "吐司警報";
  input.clips[0].explainerScene = "巨大警報器砸下";
  input.clips[0].englishVo = "Is that danger?";

  const result = applyPhaseAEdits(current, input, "en");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.phaseA.localizedTitle, "吐司警報");
  assert.equal(result.phaseA.clips[0].explainerScene, "巨大警報器砸下");
  assert.equal(result.phaseA.clips[0].timeRange, "0-5s");
  assert.equal(result.phaseA.clips[0].bgmSfx, "alarm");
  assert.equal(result.phaseA.englishWordCount, 5);
});

test("applyPhaseAEdits rejects a blank scene or a changed clip count", () => {
  const current = proposal();
  const blank = phaseAToEditInput(current);
  blank.clips[0].explainerScene = "   ";
  const blankResult = applyPhaseAEdits(current, blank);
  assert.equal(blankResult.ok, false);
  if (blankResult.ok) return;
  assert.match(blankResult.error, /畫面描述不能空白/);

  const dropped = phaseAToEditInput(current);
  dropped.clips = dropped.clips.slice(0, 1);
  const droppedResult = applyPhaseAEdits(current, dropped);
  assert.equal(droppedResult.ok, false);
  if (droppedResult.ok) return;
  assert.match(droppedResult.error, /分鏡段數不能增減/);
});

test("keepProposalRegenerateClips keeps the proposal and takes new clip rows", () => {
  const current = proposal();
  const generated = proposal();
  generated.localizedTitle = "AI 亂改的標題";
  generated.coreMessage = "被改掉";
  generated.clips = [
    {
      ...generated.clips[0],
      explainerScene: "新的開場畫面",
      englishVo: "New hook.",
    },
  ];
  generated.clipCount = 1;

  const merged = keepProposalRegenerateClips(current, generated);
  assert.equal(merged.localizedTitle, "為什麼吐司會燒焦");
  assert.equal(merged.coreMessage, "小心熱度");
  assert.equal(merged.clipCount, 1);
  assert.equal(merged.clips[0].explainerScene, "新的開場畫面");
  assert.equal(merged.clips[0].englishVo, "New hook.");
});
