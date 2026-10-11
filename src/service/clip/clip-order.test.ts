import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal, StoryboardRow } from "@/model/project";
import { applyClipOrder, moveClipIds, placeAppendedClip } from "@/service/clip/clip-order";

function row(clipNumber: number, seconds = 5): StoryboardRow {
  return {
    clipNumber,
    timeRange: "x",
    durationSeconds: seconds,
    narrativeJob: `job ${clipNumber}`,
    explainerScene: `scene ${clipNumber}`,
    motionCamera: "push",
    englishVo: `Line ${clipNumber}.`,
    bgmSfx: "none",
    backgroundSetId: "room",
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

test("moveClipIds lands a rightward drag on the target slot", () => {
  assert.deepEqual(moveClipIds(["1", "2", "3", "4"], "2", "4"), ["1", "3", "4", "2"]);
  assert.deepEqual(moveClipIds(["1", "2", "3", "4"], "4", "2"), ["1", "4", "2", "3"]);
  assert.deepEqual(moveClipIds(["1", "2"], "1", "1"), ["1", "2"]);
});

test("placeAppendedClip numbers the new row after the last clip", () => {
  const next = placeAppendedClip(proposal(), row(9, 4), { language: "en" });
  assert.equal(next.clipCount, 3);
  assert.equal(next.clips[2].clipNumber, 3);
  assert.equal(next.clips[2].timeRange, "10–14s");
  assert.equal(next.clips[2].durationSeconds, 4);
  assert.equal(next.targetDuration, "14s");
  assert.equal(next.clips[0].clipNumber, 1);
});

test("applyClipOrder moves frames, chats, and transitions with the clip", () => {
  const project = {
    phaseA: proposal(),
    clips: [
      { clipNumber: 1, durationSeconds: 5, prompt: "a", status: "completed" as const },
      { clipNumber: 2, durationSeconds: 5, prompt: "b", status: "completed" as const },
    ],
    frames: [{ clipNumber: 1, position: "start" as const, prompt: "p", status: "completed" as const }],
    sceneChats: [
      {
        clipNumber: 1,
        messages: [{ changedClips: [{ clipNumber: 1 }] }],
      },
    ],
    backgroundPlates: [{ setId: "room", clipNumbers: [1, 2] }],
    edit: { transitions: { "clip-1__clip-2": { effect: "fade" as const, durationSec: 0.4 } } },
  };
  const result = applyClipOrder(project, [2, 1]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.project.phaseA?.clips.map((clip) => clip.narrativeJob),
    ["job 2", "job 1"],
  );
  assert.equal(result.project.phaseA?.clips[0].timeRange, "0–5s");
  assert.equal(result.project.phaseA?.clips[1].timeRange, "5–10s");
  assert.equal(result.project.clips[0].prompt, "b");
  assert.equal(result.project.clips[0].clipNumber, 1);
  assert.equal(result.project.frames?.[0].clipNumber, 2);
  assert.equal(result.project.sceneChats?.[0].clipNumber, 2);
  assert.equal(result.project.sceneChats?.[0].messages[0].changedClips?.[0].clipNumber, 2);
  assert.deepEqual(result.project.backgroundPlates?.[0].clipNumbers, [2, 1]);
  assert.deepEqual(result.project.edit?.transitions, {
    "clip-2__clip-1": { effect: "fade", durationSec: 0.4 },
  });
});

test("applyClipOrder rejects an order that drops a clip", () => {
  const result = applyClipOrder({ phaseA: proposal(), clips: [] }, [1]);
  assert.equal(result.ok, false);
});
