import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CARTOON_EXPLAINER_SKILL_SLUG,
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
  dualBeatDirectorBlock,
  isDualBeatSkill,
  joinSceneBeats,
  joinVoBeats,
  normalizeDualBeatRow,
  splitSceneBeats,
  splitVoBeats,
  syncDualBeatFields,
} from "@/service/director/dual-beat";

test("only the whiteboard explainer skill is dual-beat", () => {
  assert.equal(isDualBeatSkill(CARTOON_EXPLAINER_SKILL_SLUG), true);
  assert.equal(isDualBeatSkill("story-short-director"), false);
  assert.equal(isDualBeatSkill(undefined), false);
});

test("splitVoBeats cuts on the first sentence end", () => {
  assert.deepEqual(splitVoBeats("Hello there. Next beat!"), {
    start: "Hello there.",
    end: "Next beat!",
  });
  assert.deepEqual(splitVoBeats("先講這句。再講那句。"), {
    start: "先講這句。",
    end: "再講那句。",
  });
  assert.deepEqual(splitVoBeats("Only one line"), {
    start: "Only one line",
    end: "Only one line",
  });
});

test("splitSceneBeats reads 起始／結尾 labels", () => {
  assert.deepEqual(splitSceneBeats("起始：拿尺對齊散點。結尾（5秒後）：尺變成回歸線。"), {
    start: "拿尺對齊散點",
    end: "尺變成回歸線。",
  });
  assert.deepEqual(splitSceneBeats("單一畫面"), {
    start: "單一畫面",
    end: "單一畫面",
  });
});

test("clip accessors prefer dedicated fields over combined text", () => {
  const row = {
    explainerScene: "起始：舊起始。結尾：舊結尾。",
    englishVo: "Old start. Old end.",
    startScene: "新起始",
    endScene: "新結尾",
    startVo: "新旁白起",
    endVo: "新旁白終",
  };
  assert.equal(clipStartScene(row), "新起始");
  assert.equal(clipEndScene(row), "新結尾");
  assert.equal(clipStartVo(row), "新旁白起");
  assert.equal(clipEndVo(row), "新旁白終");
});

test("syncDualBeatFields writes combined explainerScene and englishVo", () => {
  const synced = syncDualBeatFields({
    explainerScene: "",
    motionCamera: "推近",
    englishVo: "",
    startScene: "開場拿尺",
    endScene: "尺卡位",
    startVo: "Start here.",
    endVo: "End there.",
  });
  assert.equal(synced.explainerScene, joinSceneBeats("開場拿尺", "尺卡位"));
  assert.equal(synced.englishVo, joinVoBeats("Start here.", "End there."));
  assert.equal(synced.startScene, "開場拿尺");
  assert.equal(synced.endVo, "End there.");
});

test("normalizeDualBeatRow fills missing dedicated fields from combined text", () => {
  const row = normalizeDualBeatRow({
    clipNumber: 1,
    timeRange: "0-5s",
    durationSeconds: 5,
    narrativeJob: "hook",
    explainerScene: "起始：A。結尾：B。",
    motionCamera: "cam",
    englishVo: "One. Two.",
    bgmSfx: "",
  });
  assert.equal(row.startScene, "A");
  assert.equal(row.endScene, "B。");
  assert.equal(row.startVo, "One.");
  assert.equal(row.endVo, "Two.");
});

test("dual-beat director block mentions two VO/subtitle beats and style-specific lettering", () => {
  const on = dualBeatDirectorBlock(true);
  assert.match(on, /ONLY startVo/);
  assert.match(on, /ONLY endVo/);
  assert.match(on, /52%/);
  assert.match(on, /warm-yellow highlight box/);
  assert.match(on, /visual style catalog/);
  assert.match(on, /one frozen pose/);
  assert.match(on, /landed resting pose/);
  assert.match(on, /motionCamera/);
  assert.match(dualBeatDirectorBlock(false), /no writing/);
  assert.match(dualBeatDirectorBlock(false), /Do not invent extra titles/);
});

test("dual-beat director block keeps in-world labels when only captions are off", () => {
  const block = dualBeatDirectorBlock(false, { inWorldLabels: true });
  assert.match(block, /captions OFF/);
  assert.match(block, /yellow tags/);
  assert.match(block, /3–4 visual devices/);
  assert.doesNotMatch(block, /no writing on either still/);
  // ON wins over the option: labels mode only exists when captions are off.
  assert.match(dualBeatDirectorBlock(true, { inWorldLabels: true }), /ONLY startVo/);
  assert.doesNotMatch(dualBeatDirectorBlock(true, { inWorldLabels: true }), /captions OFF/);
});
