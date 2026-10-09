import assert from "node:assert/strict";
import { test } from "node:test";
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

test("talking video rules forbid snap verbs and a frozen statue", () => {
  const rules = talkingVideoMotionRules("full-body");
  assert.match(rules, /lip-sync/);
  assert.match(rules, /real person filming a vertical reel/);
  assert.match(rules, /weight shifts hip to hip/);
  assert.match(rules, /Do not write snaps/);
  assert.doesNotMatch(rules, /Feet stay planted. One conversational gesture only/);
});
