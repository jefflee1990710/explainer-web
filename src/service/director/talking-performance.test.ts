import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PERFORMANCE } from "@/service/director/performance";
import {
  clipUsesTalkingPerformance,
  talkingMotionLine,
  talkingShotForSkill,
  talkingVideoMotionRules,
} from "@/service/director/talking-performance";

test("only the two talking-head directors use talking performance", () => {
  assert.equal(talkingShotForSkill("talking-head-director"), "face");
  assert.equal(talkingShotForSkill("full-body-talking-head-director"), "full-body");
  assert.equal(talkingShotForSkill("outfit-reel-director"), undefined);
  assert.equal(talkingShotForSkill("surprise-interview-director"), undefined);
  assert.equal(clipUsesTalkingPerformance("talking-head-director"), true);
  assert.equal(clipUsesTalkingPerformance("full-body-talking-head-director"), true);
  assert.equal(clipUsesTalkingPerformance("outfit-reel-director"), false);
});

test("full-body talking motion has lip-sync, head, hands, and a weight shift", () => {
  const motion = talkingMotionLine({
    language: "en",
    seconds: 5,
    line: "Hi, everyone. I am Scro.",
    shot: "full-body",
    clipNumber: 1,
  });
  assert.match(motion, /continuous lip-sync/);
  assert.match(motion, /reel-person face/);
  assert.match(motion, /head tilting and nodding/);
  assert.match(motion, /right then left hand gesturing at chest height/);
  assert.match(motion, /weight shifting hip to hip/);
  assert.match(motion, /eyes locked on the lens/);
  assert.doesNotMatch(motion, /snap|flick|whip/i);
});

test("face talking motion still uses the hands and head, eyes on the lens", () => {
  const motion = talkingMotionLine({
    language: "en",
    seconds: 5,
    line: "Hello.",
    shot: "face",
  });
  assert.match(motion, /continuous lip-sync/);
  assert.match(motion, /head tilting and nodding/);
  assert.match(motion, /homemade microphone/);
  assert.match(motion, /seated/);
  assert.match(motion, /eyes locked on the lens/);
});

test("talking motion carries the reel expression and gesture pattern", () => {
  const motion = talkingMotionLine({
    language: "en",
    seconds: 7,
    line: "It saves ninety percent of your tokens.",
    shot: "face",
    clipNumber: 1,
    totalClips: 3,
  });
  // Resting smile, brow-pop on stresses, free hand changing every 1–2 seconds.
  assert.match(motion, /warm, chatty smile with a hint of teeth/);
  assert.match(motion, /eyes widen, the eyebrows pop up/);
  assert.match(motion, /changes shape every 1–2 seconds/);
  assert.match(motion, /side-to-side sway/);
  // Clip 1 hooks with a big smile; the left hand gestures while the right holds the mic.
  assert.match(motion, /big warm smile as the hook/);
  assert.match(motion, /right hand holding a small homemade microphone/);
  assert.match(motion, /left hand does all the gesturing/);
  assert.doesNotMatch(motion, /sharing a secret/);
});

test("the last talking clip closes on a softer CTA beat", () => {
  const en = talkingMotionLine({
    language: "en",
    seconds: 6,
    line: "Comment site and I will send it.",
    shot: "face",
    clipNumber: 3,
    totalClips: 3,
  });
  assert.match(en, /sharing a secret/);
  assert.doesNotMatch(en, /as the hook/);
  const yue = talkingMotionLine({
    language: "yue",
    seconds: 6,
    line: "留言 site 我發畀你。",
    shot: "full-body",
    clipNumber: 2,
    totalClips: 2,
  });
  assert.match(yue, /講緊秘密/);
  assert.match(yue, /每 1–2 秒換一個手勢/);
  assert.match(yue, /眼睛睜大、眉毛快速上挑/);
});

test("custom performance slots replace the default text in motion and rules", () => {
  // A fork that drops the microphone and changes the resting face.
  const perf = {
    ...DEFAULT_PERFORMANCE.face.en,
    restingFace: "a serious, furrowed brow and a flat mouth",
    anchorProp: "",
    set: "standing in front of a bare white wall",
  };
  const motion = talkingMotionLine({ language: "en", seconds: 6, line: "Listen.", shot: "face", performance: perf });
  assert.match(motion, /serious, furrowed brow/);
  assert.doesNotMatch(motion, /homemade microphone/);
  // No prop → both hands gesture, even on the seated shot.
  assert.match(motion, /right then left hand gesturing at chest height/);
  const rules = talkingVideoMotionRules("face", perf);
  assert.match(rules, /serious, furrowed brow/);
  assert.doesNotMatch(rules, /homemade microphone/);
  assert.match(rules, /one hand leads, the other follows/);
});

test("talking video rules forbid snap verbs and a frozen statue", () => {
  const rules = talkingVideoMotionRules("full-body");
  assert.match(rules, /lip-sync/);
  assert.match(rules, /real person filming a vertical reel/);
  assert.match(rules, /weight shifts hip to hip/);
  assert.match(rules, /Do not write snaps/);
  assert.doesNotMatch(rules, /Feet stay planted. One conversational gesture only/);
});
