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

test("full-body talking motion has lip-sync, a nod, and a waist-height open palm", () => {
  const motion = talkingMotionLine({
    language: "en",
    seconds: 5,
    line: "Hi, everyone. I am Scro.",
    shot: "full-body",
    clipNumber: 1,
  });
  assert.match(motion, /continuous lip-sync/);
  assert.match(motion, /small nod/);
  assert.match(motion, /eyebrow lift/);
  assert.match(motion, /right hand rising to waist height with an open palm/);
  assert.match(motion, /warm small smile/);
  assert.doesNotMatch(motion, /snap|flick|whip/i);
});

test("face talking motion keeps hands still", () => {
  const motion = talkingMotionLine({
    language: "en",
    seconds: 5,
    line: "Hello.",
    shot: "face",
  });
  assert.match(motion, /continuous lip-sync/);
  assert.doesNotMatch(motion, /open palm/);
});

test("talking video rules forbid snap verbs", () => {
  const rules = talkingVideoMotionRules("full-body");
  assert.match(rules, /lip-sync/);
  assert.match(rules, /open palm/);
  assert.match(rules, /Do not write snaps/);
});
