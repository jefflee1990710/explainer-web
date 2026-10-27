import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal, StoryboardRow } from "@/model/project";
import {
  type ClipOrderProject,
  applyClipOrder,
  insertClips,
  moveClipIds,
  placeAppendedClip,
  removeClip,
  selectedClipAfterRemoval,
} from "@/service/clip/clip-order";

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
  assert.equal(next.clips[2].timeRange, "10–15s");
  assert.equal(next.clips[2].durationSeconds, 5);
  assert.equal(next.targetDuration, "15s");
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

test("removeClip drops one clip and renumbers the rest", () => {
  const phaseA = proposal();
  phaseA.clips = [row(1, 4), row(2, 5), row(3, 6)];
  phaseA.clipCount = 3;
  const result = removeClip(
    {
      phaseA,
      clips: [
        { clipNumber: 1, durationSeconds: 4, prompt: "a", status: "completed" as const },
        { clipNumber: 2, durationSeconds: 5, prompt: "b", status: "completed" as const },
        { clipNumber: 3, durationSeconds: 6, prompt: "c", status: "completed" as const },
      ],
      frames: [
        { clipNumber: 2, position: "start" as const, prompt: "gone", status: "completed" as const },
        { clipNumber: 3, position: "end" as const, prompt: "kept", status: "completed" as const },
      ],
      backgroundPlates: [{ setId: "room", clipNumbers: [1, 2, 3] }],
      autoVideoClips: [2, 3],
      edit: {
        transitions: {
          "clip-1__clip-2": { effect: "fade" as const, durationSec: 0.4 },
          "clip-2__clip-3": { effect: "dissolve" as const, durationSec: 0.4 },
          "intro__clip-3": { effect: "fade" as const, durationSec: 0.2 },
        },
      },
      reelUrl: "https://blob/old.mp4",
    },
    2,
    { language: "en" },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.project.phaseA?.clips.map((clip) => [clip.clipNumber, clip.narrativeJob, clip.timeRange]),
    [
      [1, "job 1", "0–4s"],
      [2, "job 3", "4–10s"],
    ],
  );
  assert.equal(result.project.phaseA?.clipCount, 2);
  assert.equal(result.project.phaseA?.targetDuration, "10s");
  assert.deepEqual(
    result.project.clips.map((clip) => clip.prompt),
    ["a", "c"],
  );
  assert.equal(result.project.frames?.[0].prompt, "kept");
  assert.equal(result.project.frames?.[0].clipNumber, 2);
  assert.deepEqual(result.project.backgroundPlates?.[0].clipNumbers, [1, 2]);
  assert.deepEqual(result.project.autoVideoClips, [2]);
  assert.deepEqual(result.project.edit?.transitions, {
    "intro__clip-2": { effect: "fade", durationSec: 0.2 },
  });
  assert.equal(result.project.reelUrl, undefined);
  assert.equal(selectedClipAfterRemoval(3, 2, 2), 2);
  assert.equal(selectedClipAfterRemoval(1, 2, 2), 1);
  assert.equal(selectedClipAfterRemoval(2, 2, 2), 2);
});

test("insertClips puts a row between clips and shifts the rest", () => {
  const result = insertClips(
    {
      phaseA: proposal(),
      clips: [
        { clipNumber: 1, durationSeconds: 5, prompt: "a", status: "completed" as const },
        { clipNumber: 2, durationSeconds: 5, prompt: "b", status: "completed" as const },
      ],
      frames: [{ clipNumber: 2, position: "start" as const, prompt: "later", status: "completed" as const }],
      backgroundPlates: [{ setId: "room", clipNumbers: [1, 2] }],
      edit: { transitions: { "clip-1__clip-2": { effect: "fade" as const, durationSec: 0.4 } } },
      reelUrl: "https://blob/old.mp4",
    },
    [row(9, 4)],
    2,
    { language: "en" },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.project.phaseA?.clips.map((clip) => [clip.clipNumber, clip.narrativeJob, clip.timeRange]),
    [
      [1, "job 1", "0–5s"],
      [2, "job 9", "5–10s"],
      [3, "job 2", "10–15s"],
    ],
  );
  assert.equal(result.project.phaseA?.clips[1].backgroundSetId, "room");
  assert.equal(result.project.clips[1].prompt, "b");
  assert.equal(result.project.clips[1].clipNumber, 3);
  assert.equal(result.project.frames?.[0].clipNumber, 3);
  assert.deepEqual(result.project.backgroundPlates?.[0].clipNumbers, [1, 3, 2]);
  assert.deepEqual(result.project.edit?.transitions, {
    "clip-1__clip-3": { effect: "fade", durationSec: 0.4 },
  });
  assert.equal(result.project.reelUrl, undefined);
  assert.equal(insertClips({ phaseA: proposal(), clips: [] }, [row(1)], 0).ok, false);
});

test("removeClip keeps the last clip", () => {
  const phaseA = proposal();
  phaseA.clips = [row(1)];
  phaseA.clipCount = 1;
  const result = removeClip({ phaseA, clips: [] }, 1);
  assert.equal(result.ok, false);
});

// Plates carry a clip number only; the marker tells which clip's plate it is.
function plate(clipNumber: number, mark: string) {
  return { clipNumber, status: "completed" as const, blobUrl: mark };
}

test("applyClipOrder renumbers subtitle plates with their clip", () => {
  const project = {
    phaseA: proposal(),
    clips: [],
    subtitlePlates: [plate(1, "first"), plate(2, "second")],
  };
  const result = applyClipOrder(project, [2, 1]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.project.subtitlePlates?.map((item) => [item.clipNumber, (item as { blobUrl: string }).blobUrl]),
    [
      [1, "second"],
      [2, "first"],
    ],
  );
});

test("removeClip drops the deleted clip's plate and renumbers the rest", () => {
  const phaseA = { ...proposal(), clipCount: 3, clips: [row(1), row(2), row(3)] };
  const project = {
    phaseA,
    clips: [],
    subtitlePlates: [plate(1, "one"), plate(2, "two"), plate(3, "three")],
  };
  const result = removeClip(project, 2);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.project.subtitlePlates?.map((item) => [item.clipNumber, (item as { blobUrl: string }).blobUrl]),
    [
      [1, "one"],
      [2, "three"],
    ],
  );
});

test("insertClips shifts later plates and leaves the new slot without one", () => {
  const project = {
    phaseA: proposal(),
    clips: [],
    subtitlePlates: [plate(1, "one"), plate(2, "two")],
  };
  const result = insertClips(project, [row(9)], 2);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.project.subtitlePlates?.map((item) => [item.clipNumber, (item as { blobUrl: string }).blobUrl]),
    [
      [1, "one"],
      [3, "two"],
    ],
  );
});

test("a project with no plates stays without plates", () => {
  const result = applyClipOrder({ phaseA: proposal(), clips: [] } as ClipOrderProject, [2, 1]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.project.subtitlePlates, undefined);
});
