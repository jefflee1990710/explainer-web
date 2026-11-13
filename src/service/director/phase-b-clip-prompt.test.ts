import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/model/project";
import {
  clipPhaseBUserPrompt,
  phaseBCharacterLine,
  phaseBLetteringLock,
  phaseBWardrobeLock,
} from "@/service/director/phase-b-clip-prompt";

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
  voiceGender: "female" as const,
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
  assert.doesNotMatch(prompt, /HOOK RETENTION \(Clip 1/);

  const clip1 = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 1 });
  assert.match(clip1, /HOOK RETENTION \(Clip 1/);
  assert.match(clip1, /teaching element/);
  assert.match(clip1, /zero lip-sync/);
  assert.match(clip1, /Never look into the lens/);
  assert.doesNotMatch(clip1, /HOOK EXPRESSION/);
  assert.doesNotMatch(clip1, /toward camera/);
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

test("video prompt asks for human timing, not one constant slow glide", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    skillSlug: "story-short-director",
    phaseA: proposal(),
    clipNumber: 2,
  });
  assert.match(prompt, /real human timing, not one constant speed/);
  assert.match(prompt, /snaps fast and decisive/);
  assert.match(prompt, /Never call the body motion smooth, slow/);
  assert.doesNotMatch(prompt, /interpolate that travel smoothly/);

  const explainer = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 2 });
  assert.match(explainer, /State A -> State B/);
  assert.match(explainer, /FULL duration/);
  assert.match(explainer, /CAMERA LOCK \(2D PLANAR\)/);
});

test("talking-head Phase B uses speech motion instead of snap verbs", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    skillSlug: "talking-head-director",
    phaseA: proposal(),
    clipNumber: 2,
  });
  assert.match(prompt, /lip-sync/);
  assert.match(prompt, /Do not write snaps/);
  assert.match(prompt, /real person filming a vertical reel/);
  assert.doesNotMatch(prompt, /snaps fast and decisive/);
});

test("outfit-change Phase B hard-cuts to a new look on a locked camera", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    skillSlug: "outfit-change-director",
    phaseA: proposal(),
    clipNumber: 2,
  });
  assert.match(prompt, /THIS clip's complete look/);
  assert.match(prompt, /hard cut to a different complete look/i);
  assert.match(prompt, /Same locked camera/);
  assert.match(prompt, /No spoken words/);
  assert.match(prompt, /No background music/);
  assert.doesNotMatch(prompt, /slow gimbal move/);
  assert.doesNotMatch(prompt, /DIFFERENT camera move/);
});

test("outfit-reel Phase B keeps the outfit on and moves only the camera", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    skillSlug: "outfit-reel-director",
    phaseA: proposal(),
    clipNumber: 2,
  });
  assert.match(prompt, /already wearing the complete outfit/);
  assert.match(prompt, /slow gimbal move/);
  assert.doesNotMatch(prompt, /sharp and quick/);
  assert.match(prompt, /DIFFERENT camera move/);
  assert.match(prompt, /No background music/);
  assert.match(prompt, /No spoken words/);
  assert.doesNotMatch(prompt, /one new garment/);
  assert.doesNotMatch(prompt, /snaps fast and decisive/);
});

test("surprise hook Phase B drops from above and zooms in", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    skillSlug: "surprise-interview-director",
    phaseA: proposal(),
    clipNumber: 1,
  });
  assert.match(prompt, /right-side up/);
  assert.match(prompt, /downward/);
  assert.match(prompt, /zoom/i);
  assert.match(prompt, /sharp and clear/);
  assert.doesNotMatch(prompt, /same screen position and scale/);
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

test("Phase B user prompt locks narrator gender and forbids background music", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    speechPace: "fast",
    phaseA: proposal(),
    clipNumber: 2,
  });
  assert.match(prompt, /adult female voice/);
  assert.match(prompt, /same narrator on every clip/i);
  assert.match(prompt, /mid pitch/);
  assert.match(prompt, /brisk, energetic pace/);
  assert.match(prompt, /No background music/);
  assert.match(prompt, /no BGM/i);
  assert.doesNotMatch(prompt, /driving beat|keep narration dominant over BGM/i);
});

test("story-short Phase B prompt uses the voice lock instead of guessing", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    bansNarration: true,
    phaseA: proposal(),
    clipNumber: 2,
  });
  assert.match(prompt, /There is no narrator/);
  assert.match(prompt, /voice lock verbatim/i);
  assert.match(prompt, /adult female/);
  assert.doesNotMatch(prompt, /same narrator on every clip/i);
  assert.doesNotMatch(prompt, /infer/i);
});

test("unknown clip throws", () => {
  assert.throws(() => clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 9 }));
});

test("Phase B with a cast forbids describing or changing clothing", () => {
  assert.match(phaseBCharacterLine({ cast: [{ name: "Ada" }] }), /Never describe clothing, wardrobe, or gear/);
  assert.match(phaseBWardrobeLock({ cast: [{ name: "Ada" }] }), /exactly the outfit shown in the first and last frames/);
  assert.match(phaseBWardrobeLock({ characterImageUrl: "https://blob/hero.png" }), /No added or changed clothing/);
  assert.equal(phaseBWardrobeLock({}), "");
  assert.match(
    phaseBWardrobeLock({ cast: [{ name: "Ada" }], skillSlug: "outfit-reel-director" }),
    /already show the complete outfit/,
  );
  assert.match(
    phaseBCharacterLine({ cast: [{ name: "Ada" }], skillSlug: "outfit-reel-director" }),
    /Do not dress her/,
  );
  assert.match(
    phaseBWardrobeLock({ cast: [{ name: "Ada" }], skillSlug: "outfit-change-director" }),
    /THIS clip's complete look/,
  );
  assert.match(
    phaseBCharacterLine({ cast: [{ name: "Ada" }], skillSlug: "outfit-change-director" }),
    /Do not keep the previous clip's clothes/,
  );
});

test("diagram explainer lettering stays concise in 「」 labels without full VO dumps", () => {
  const lock = phaseBLetteringLock({ skillSlug: "cartoon-explainer-video-director", durationSeconds: 5 });
  assert.match(lock, /concise 「」 labels and optional short beat headline/);
  assert.match(lock, /Do not morph, scramble, or invent extra full-sentence text/);
  assert.match(lock, /not a subtitle/);
  assert.doesNotMatch(lock, /wipes off/);
  assert.doesNotMatch(lock, /Subtitle:/);
  assert.equal(phaseBLetteringLock({ skillSlug: "story-short-director", durationSeconds: 5 }), "");
  const paper = phaseBLetteringLock({
    skillSlug: "paper-cutout-explainer-video-director",
    durationSeconds: 6,
  });
  assert.match(paper, /concise 「」 labels/);
  assert.doesNotMatch(paper, /wipes off/);
});

test("explainer dual-keyframe motion attaches first/last frames and keeps lettering crisp", () => {
  const fixed = phaseBLetteringLock({
    skillSlug: "workflow-promo-director",
    durationSeconds: 5,
    fixedLettering: true,
  });
  assert.match(fixed, /start frame carries the marker line/);
  assert.doesNotMatch(fixed, /wipes off/);
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 2, smoothMotion: true });
  assert.match(prompt, /first\/last frames/);
  assert.match(prompt, /State A -> State B/);
  assert.match(prompt, /CAMERA LOCK \(2D PLANAR\)/);
  assert.doesNotMatch(prompt, /There is no end image and no last frame/);

  const realisticLiveAction = clipPhaseBUserPrompt({
    ...base,
    phaseA: proposal(),
    clipNumber: 2,
    skillSlug: "story-short-director",
    smoothMotion: true,
    realistic: true,
  });
  assert.match(realisticLiveAction, /one clean continuous shot per beat and no repeats/);
  assert.match(realisticLiveAction, /authentic live-action physics/);
  assert.match(realisticLiveAction, /Never use whiteboard cardboard cutout physics/);
  assert.doesNotMatch(realisticLiveAction, /Whiteboard cardboard physics/);
});

test("dialogue Phase B names the speaking mouth and forbids an invented timbre", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    phaseA: proposal(),
    clipNumber: 1,
    bansNarration: true,
    skillSlug: "dialogue-qa-director",
  });
  assert.match(prompt, /only the character named/);
  assert.match(prompt, /mouth stays closed|keeps their mouth closed/);
  assert.match(prompt, /Do not invent a timbre/);
});

test("one-take-director Phase B prompt stays silent and never injects lip-sync or speaking mouth instructions", () => {
  const prompt = clipPhaseBUserPrompt({
    ...base,
    phaseA: proposal(),
    clipNumber: 1,
    bansNarration: true,
    skillSlug: "one-take-director",
  });
  assert.doesNotMatch(prompt, /only the character named in this clip's englishVo lip-syncs/i);
  assert.doesNotMatch(prompt, /MUST speak the dialogue aloud/i);
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
