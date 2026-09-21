import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/types/project";
import { clipPhaseBUserPrompt, phaseBCharacterLine } from "./phase-b-clip-prompt";

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
  characterLine:
    "Keep the Phase A characterLock. Do not mention reference images in the MiniMax H3 prompt — MiniMax H3 only receives this clip's first and last frames.",
};

test("middle clip quotes both neighbours and asks for that clip only", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 2 });
  assert.match(prompt, /clip 2 ONLY/);
  assert.match(prompt, /first\/last frames/);
  assert.match(prompt, /follows clip 1, which ends on: coin drops/);
  assert.match(prompt, /hands off to clip 3, which opens with: house appears/);
  assert.match(prompt, /first and last frames/);
  assert.doesNotMatch(prompt, /Character reference image:/);
});

test("Phase B motion rules never call start/end stills a reference image", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 2 });
  assert.match(prompt, /first\/last frames/);
  assert.match(prompt, /Never call those stills a reference image/);
});

test("video prompt forbids a last-frame snap and asks for element-by-element interpolation", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 2 });
  assert.match(prompt, /FULL duration/);
  assert.match(prompt, /element-by-element/);
  assert.match(prompt, /do not .*snap/i);
});

test("first clip has no previous neighbour", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 1 });
  assert.match(prompt, /first clip/);
  assert.doesNotMatch(prompt, /follows clip/);
  assert.match(prompt, /hands off to clip 2/);
});

test("last clip always ends clean — never loops back to clip 1", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    phaseA: proposal("linear"),
    clipNumber: 3,
  });
  assert.match(prompt, /last clip; end on a clean resting payoff/);
  assert.doesNotMatch(prompt, /matches clip 1's opening/);
});

test("unknown clip throws", () => {
  assert.throws(() => clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 9 }));
});

test("Phase B character line never hands Wan a reference-image URL", () => {
  assert.equal(phaseBCharacterLine({}), base.characterLine);
  assert.match(
    phaseBCharacterLine({
      cast: [{ name: "Ada" }],
    }),
    /Ada/,
  );
  assert.doesNotMatch(
    phaseBCharacterLine({
      characterImageUrl: "https://blob/hero.png",
      cast: [{ name: "Ada" }],
    }),
    /https:\/\//,
  );
  assert.doesNotMatch(phaseBCharacterLine({ characterImageUrl: "https://blob/hero.png" }), /https:\/\//);
});
