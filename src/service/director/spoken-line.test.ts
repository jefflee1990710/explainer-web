import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIALOGUE_SPEAK_LOCK,
  lockDialogueSpeech,
  narratorSpeechLock,
  spokenLineCopy,
  subtitleText,
} from "@/service/director/spoken-line";

test("surprise-interview field copy says 對白; story-short and explainer say 旁白", () => {
  const surpriseCopy = spokenLineCopy("surprise-interview-director");
  assert.equal(surpriseCopy.section, "對白");
  assert.equal(surpriseCopy.field("English"), "對白（English）");

  const storyCopy = spokenLineCopy("story-short-director");
  assert.equal(storyCopy.section, "旁白");
  assert.equal(storyCopy.field("English"), "旁白（English）");
});

test("explainer field copy stays 旁白", () => {
  const copy = spokenLineCopy("cartoon-explainer-video-director");
  assert.equal(copy.section, "旁白");
  assert.equal(copy.field("English"), "旁白（English）");
  assert.match(copy.emptyError, /旁白/);
});

test("lockDialogueSpeech makes surprise-interview require on-screen lip-sync, while story-short and other directors use off-screen narration with mouths closed", () => {
  const surpriseLocked = lockDialogueSpeech(" Camera drops.", "surprise-interview-director", "Wait what?!");
  assert.match(surpriseLocked, /visible mouth/);
  assert.match(surpriseLocked, /lip-syncs every syllable/);

  const storyLocked = lockDialogueSpeech("Walk toward the box.", "story-short-director", "He found the secret.");
  assert.match(storyLocked, /^AUDIO REQUIRED, spoken once by an unseen off-screen narrator/);
  assert.match(storyLocked, /mouth stays closed/);
  assert.match(storyLocked, /never lip-syncs/);
  assert.match(storyLocked, /third-person observer camera/);
  assert.equal(lockDialogueSpeech(storyLocked, "story-short-director", "He found the secret."), storyLocked);
});

test("story-short video prompts keep third-person camera lock, while Q&A uses off-screen narration", () => {
  const locked = lockDialogueSpeech("Two friends chat.", "story-short-director", "They meet at dusk.");
  assert.match(locked, /third-person observer camera/);
  assert.equal(lockDialogueSpeech(locked, "story-short-director", "They meet at dusk."), locked);
  const qaLocked = lockDialogueSpeech("Asker reacts.", "dialogue-qa-director", "What is the best tool?");
  assert.doesNotMatch(qaLocked, /third-person observer camera/);
  assert.match(qaLocked, /unseen off-screen narrator/);
  assert.match(qaLocked, /mouth stays closed/);
});

test("subtitleText drops speaker names and quotes from dialogue lines", () => {
  assert.equal(
    subtitleText('Scro - Cinematic: "One clone, unlimited environments."'),
    "One clone, unlimited environments.",
  );
  assert.equal(subtitleText('阿明：「你來了。」 Mary: "Finally!"'), "你來了。 Finally!");
  assert.equal(subtitleText("(no dialogue)"), "");
  assert.equal(subtitleText("Plain line, no speaker."), "Plain line, no speaker.");
});

test("lockDialogueSpeech leaves explainer prompts unchanged until a spoken line is supplied", () => {
  assert.equal(
    lockDialogueSpeech("Narrator reads the line.", "cartoon-explainer-video-director"),
    "Narrator reads the line.",
  );
  assert.equal(
    lockDialogueSpeech("She puts on the skirt.", "outfit-reel-director"),
    "She puts on the skirt.",
  );
});

test("cartoon explainer puts the narrator line first so the clip cannot stay silent", () => {
  const line = "Boosting cannot revive a dead post.";
  const locked = lockDialogueSpeech("Animate the magnifier.", "cartoon-explainer-video-director", line);
  assert.match(locked, /^AUDIO REQUIRED/);
  assert.match(locked, /Boosting cannot revive a dead post/);
  assert.match(locked, /never silent/);
  assert.match(locked, /mouth stays closed/);
  assert.match(locked, /Sound effects never replace this voice/);
  assert.equal(lockDialogueSpeech(locked, "cartoon-explainer-video-director", line), locked);
  assert.equal(
    lockDialogueSpeech("Animate.", "cartoon-explainer-video-director", "(no dialogue)"),
    "Animate.",
  );
  assert.equal(narratorSpeechLock("(no dialogue)"), "");
});

test("cartoon explainer narratorSpeechLock locks the character's female voice timbre on the unseen narrator", () => {
  const line = "Fun AI clips are everywhere right now.";
  const speakers = [
    {
      name: "Scro Official",
      voice: {
        gender: "female" as const,
        age: "young-adult" as const,
        pitch: "mid-high" as const,
        resonance: "bright" as const,
        texture: "soft" as const,
        weight: "light" as const,
        note: "youthful and clear with an airy tone",
      },
    },
  ];
  const locked = lockDialogueSpeech(
    "AUDIO REQUIRED, spoken once by an unseen off-screen narrator, starting in the first half-second, loud and clear, word for word: \"Fun AI clips are everywhere right now.\". Sound effects never replace this voice. This clip is never silent. The on-screen character's mouth stays closed.\n\nAnimate the block.",
    "cartoon-explainer-video-director",
    line,
    ["Scro Official"],
    undefined,
    { voiceGender: "female", speakers },
  );
  assert.match(
    locked,
    /^AUDIO REQUIRED, spoken once by an unseen off-screen narrator \(young adult female, mid-high, bright, soft, light, youthful and clear with an airy tone — never switch to a male voice\)/,
  );
  assert.equal(locked.split("AUDIO REQUIRED").length - 1, 1);
});

test("lockDialogueSpeech adds lip-sync rules for talking-head directors only", () => {
  const locked = lockDialogueSpeech("She reads the line.", "full-body-talking-head-director");
  assert.match(locked, /visible mouth/);
  assert.match(locked, /lip-sync/);
  assert.match(locked, /chest height/);
  assert.equal(lockDialogueSpeech(locked, "full-body-talking-head-director"), locked);
});

test("lockDialogueSpeech for talking-head locks on-screen female voice at the top, strips narrator/SFX contradictions, and deduplicates motion rules under 6800 chars", () => {
  const line = "That's why you use Scro.io.";
  const speakers = [
    {
      name: "Scro",
      voice: {
        gender: "female" as const,
        age: "young-adult" as const,
        pitch: "mid-high" as const,
        resonance: "mixed" as const,
        texture: "soft" as const,
        weight: "light" as const,
        note: "airy and quiet delivery",
      },
    },
  ];
  const fullMotion =
    '0–0.4s she stays in the exact framing; 0–4.2s she speaks "That\'s why you use Scro.io." with continuous lip-sync, a live real-person face — a warm, chatty smile with a hint of teeth, changing shape every 1–2 seconds in time with the words.\n\nCopy each voice lock verbatim.\nScro: young adult female, mid-high, mixed, soft, light, airy and quiet delivery.\nThe unseen off-screen narrator MUST use this exact female voice timbre (young adult female, mid-high, mixed, soft, light, airy and quiet delivery); never switch to a male voice.\nSpoken audio and short synced SFX only.\n\nOn-screen characters MUST speak the dialogue aloud with visible mouth movement. No off-screen narrator. If a line is NAME: "text", that named character in the frame says it. A silent beat stays silent.\n\nThis clip is on-camera speech, like a real person recording a reel, not a snap action and not a frozen pose. On-camera speech like a real person filming a vertical reel on a phone: eyes stay locked on the lens the whole time, talking to one friend, never a news-anchor statue. ' +
    "x ".repeat(1200) +
    "Camera locked.";
  const locked = lockDialogueSpeech(
    fullMotion,
    "talking-head-director",
    line,
    ["Scro"],
    undefined,
    { voiceGender: "female", speakers },
  );
  assert.match(
    locked,
    /^ON-SCREEN SPEECH REQUIRED \(young adult female, mid-high, mixed, soft, light, airy and quiet delivery — never switch to a male voice, no off-screen narrator, no sound effects\): from 0s the character on screen speaks aloud with continuous visible lip-sync: "That's why you use Scro\.io\."\./,
  );
  assert.doesNotMatch(locked, /unseen off-screen narrator/i);
  assert.doesNotMatch(locked, /short synced SFX/i);
  assert.match(locked, /no sound effects \(no clapping, tapping, typing, or Foley SFX\)/i);
  assert.ok(locked.length < 4000, `expected deduplicated prompt < 4000 chars, got ${locked.length}`);
  assert.equal(
    lockDialogueSpeech(locked, "talking-head-director", line, ["Scro"], undefined, {
      voiceGender: "female",
      speakers,
    }),
    locked,
  );
});

test("DIALOGUE_SPEAK_LOCK tells MiniMax the on-screen character speaks", () => {
  assert.match(DIALOGUE_SPEAK_LOCK, /On-screen characters MUST speak/);
  assert.match(DIALOGUE_SPEAK_LOCK, /visible mouth/);
});

test("surprise-interview video prompts name the speaking mouth, while Q&A keeps all mouths closed under narration", () => {
  const line = 'Joyce: "What\'s the best marketing tool right now?"';
  const surpriseLocked = lockDialogueSpeech("She looks up.", "surprise-interview-director", line, [
    "Joyce",
  ]);
  assert.match(surpriseLocked, /Joyce's mouth lip-syncs every syllable/);

  const qaLocked = lockDialogueSpeech("They sit at a table.", "dialogue-qa-director", line, [
    "Joyce",
    "Scro Official",
  ]);
  assert.match(qaLocked, /unseen off-screen narrator/);
  assert.match(qaLocked, /mouth stays closed/);
  assert.equal(
    lockDialogueSpeech(qaLocked, "dialogue-qa-director", line, ["Joyce", "Scro Official"]),
    qaLocked,
  );
});
