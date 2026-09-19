import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/types/project";
import { clipPhaseBUserPrompt } from "./phase-b-clip-prompt";

function proposal(loopMode: PhaseAProposal["loopMode"] = "linear"): PhaseAProposal {
  const row = (clipNumber: number, scene: string) => ({
    clipNumber,
    timeRange: `${(clipNumber - 1) * 5}-${clipNumber * 5}s`,
    durationSeconds: 5,
    narrativeJob: "job",
    explainerScene: scene,
    motionCamera: `camera ${clipNumber}`,
    englishVo: `vo ${clipNumber}`,
    bgmSfx: "none",
  });
  return {
    englishTitle: "T",
    localizedTitle: "標題",
    targetDuration: "15s",
    clipCount: 3,
    loopMode,
    coreMessage: "m",
    hookStrategy: "h",
    aspectRatio: "16:9",
    visualWorld: "w",
    narrator: "n",
    englishWordCount: 10,
    characterLock: "lock",
    palette: "p",
    bgmDirection: "b",
    narrativeArc: "a",
    clips: [row(1, "coin drops"), row(2, "jar fills"), row(3, "house appears")],
  };
}

const base = {
  languageLabel: "English",
  languageSublabel: "American",
  characterLine: "Character reference image: none",
};

test("middle clip quotes both neighbours and asks for that clip only", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 2 });
  assert.match(prompt, /clip 2 ONLY/);
  assert.match(prompt, /follows clip 1, which ends on: coin drops/);
  assert.match(prompt, /hands off to clip 3, which opens with: house appears/);
  assert.match(prompt, /Character reference image: none/);
});

test("first clip has no previous neighbour", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 1 });
  assert.match(prompt, /first clip/);
  assert.doesNotMatch(prompt, /follows clip/);
  assert.match(prompt, /hands off to clip 2/);
});

test("last clip: linear ends clean, infinite loops back to clip 1", () => {
  assert.match(
    clipPhaseBUserPrompt({ ...base, phaseA: proposal("linear"), clipNumber: 3 }),
    /last clip; end on a clean resting state/,
  );
  assert.match(
    clipPhaseBUserPrompt({ ...base, phaseA: proposal("infinite"), clipNumber: 3 }),
    /matches clip 1's opening/,
  );
});

test("unknown clip throws", () => {
  assert.throws(() => clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 9 }));
});
