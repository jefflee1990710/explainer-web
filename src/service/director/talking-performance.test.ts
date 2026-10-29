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

test("full-body talking motion has lip-sync, single-hand co-speech gesture excursion, and a weight shift", () => {
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
  assert.match(motion, /right hand makes one brief ~0\.5s co-speech gesture excursion/);
  assert.doesNotMatch(motion, /right then left hand/);
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
  assert.match(motion, /24mm(?: at)? f\/1\.8/);
  assert.match(motion, /handheld 1–2° micro-sway|collarbone-up selfie/);
  assert.match(motion, /seated/);
  assert.doesNotMatch(motion, /unseen phone/);
  assert.match(motion, /eyes locked on the lens/);
});

test("talking motion follows 5-phase co-speech gesture kinematics (rest -> preparation -> stroke -> hold -> retraction) with one dominant hand", () => {
  const motion = talkingMotionLine({
    language: "en",
    seconds: 7,
    line: "It saves ninety percent of your tokens.",
    shot: "face",
    clipNumber: 1,
    totalClips: 3,
  });
  assert.match(motion, /calm, composed, relaxed neutral expression with lips gently closed or softly parted/);
  assert.match(motion, /subtle brow lift/);
  assert.match(motion, /preparation.*stroke.*hold.*retraction/i);
  assert.match(motion, /both hands resting calmly on the lap/);
  assert.doesNotMatch(motion, /right then left hand|left then right hand/);
  assert.doesNotMatch(motion, /every 1–2 seconds/);
  assert.doesNotMatch(motion, /two-handed open-palm shrug/);
  assert.match(motion, /composed relaxed neutral expression with lips gently closed or barely parted ready to speak \(no wide toothy grin, no squinting eyes\) as the hook/);
  assert.doesNotMatch(motion, /unseen phone/);
  assert.doesNotMatch(motion, /sharing a secret/);
});

test("the last talking clip closes on a softer CTA beat without hyperactive hand switching", () => {
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
  assert.doesNotMatch(yue, /每 1–2 秒換一個手勢|右手再左手|左手再右手/);
  assert.doesNotMatch(yue, /口張大約半秒/);
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
  assert.match(motion, /right hand makes one brief ~0\.5s co-speech gesture excursion/);
  const rules = talkingVideoMotionRules("face", perf);
  assert.match(rules, /serious, furrowed brow/);
  assert.doesNotMatch(rules, /homemade microphone/);
  assert.match(rules, /dominant hand/);
});

test("a continued clip never quotes the previous spoken line or embeds subtitles", () => {
  const previous = "有無諗過你個Instagram都可以變成你嘅生財工具？";
  const line = "係呢個市況唔好嘅大環境，大家更加要學多一個技能啦。";
  const motion = talkingMotionLine({
    language: "yue",
    seconds: 8,
    line,
    previousLine: previous,
    shot: "face",
    clipNumber: 2,
    totalClips: 2,
    belowCenter: true,
  });
  assert.doesNotMatch(motion, /由「/);
  assert.doesNotMatch(motion, /生財/);
  assert.match(motion, /口型跟住講「係呢個市況唔好嘅大環境/);
  assert.doesNotMatch(motion, /字幕/);
});

test("talking video rules forbid snap verbs and a frozen statue", () => {
  const rules = talkingVideoMotionRules("full-body");
  assert.match(rules, /lip-sync/);
  assert.match(rules, /real person filming a vertical reel/);
  assert.match(rules, /weight shifts hip to hip/);
  assert.match(rules, /Do not write snaps/);
  assert.doesNotMatch(rules, /Feet stay planted. One conversational gesture only/);
});

test("continued talking-head clips begin lip-sync from 0s and speak through 4.7s without a long end pause", () => {
  const motion = talkingMotionLine({
    language: "en",
    seconds: 5,
    line: "That's why you use Scro.io.",
    previousLine: "but who has time to script and edit every day?",
    shot: "face",
    clipNumber: 4,
    totalClips: 7,
    belowCenter: true,
  });
  assert.match(motion, /0–4\.7s she speaks "That's why you use Scro\.io\."/);
  assert.match(motion, /never holding the first frame frozen/);
  assert.doesNotMatch(motion, /eyes glancing down toward the hands/);
  assert.doesNotMatch(motion, /two fingers/);
});

test("every clip variant locks gaze straight on the lens center and moves at natural 1.0x real-time speed", () => {
  for (let clipNumber = 1; clipNumber <= 6; clipNumber += 1) {
    const en = talkingMotionLine({
      language: "en",
      seconds: 5,
      line: `Clip ${clipNumber} spoken line.`,
      shot: "face",
      clipNumber,
      totalClips: 6,
    });
    assert.match(en, /natural 1\.0x real-time human speed/);
    assert.match(en, /eyes (?:locked (?:directly )?on|on) the lens/);
    assert.doesNotMatch(
      en,
      /glancing briefly off to the upper-right|glancing down briefly at the gesturing hands|three-quarter|15 degrees|12 degrees/i,
    );

    const yue = talkingMotionLine({
      language: "yue",
      seconds: 5,
      line: `第${clipNumber}段講稿。`,
      shot: "face",
      clipNumber,
      totalClips: 6,
    });
    assert.match(yue, /自然 1\.0x 真人說話速度/);
    assert.match(yue, /直望鏡頭/);
    assert.doesNotMatch(yue, /望一望右上|低頭望一望比畫緊嘅雙手|三七面|15 度|12 度/);
    assert.match(en, /no exaggerated mouth opening or excessive jaw swing/);
    assert.match(yue, /口型精準克制、下巴同唇部開合細緻自然、無誇張大嘴/);
    assert.doesNotMatch(yue, /正面對住鏡頭微笑、雙眼全程直望鏡頭/);
  }
});
