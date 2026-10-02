import assert from "node:assert/strict";
import { test } from "node:test";
import {
  planTalkingHeadClips,
  splitTalkingHeadSentences,
  talkingHeadCopiedBriefError,
  talkingHeadDirectorBlock,
  talkingHeadFramesCost,
  talkingHeadPlanError,
  talkingHeadScriptFromClips,
  talkingHeadSeconds,
  talkingHeadSourceError,
  withInheritedTalkingHeadStarts,
} from "@/service/director/talking-head";
import { FRAME_COST, FRAMES_COST } from "@/service/credit-costs";

const SCRIPT = [
  "大家好，我係 Jeff。",
  "今日想同你示範點樣用自己個樣，對住鏡頭讀完一句稿。",
  "一句就係一段片。",
  "字幕會固定喺畫面下面。",
  "如果一句太長，系統會叫你改短。",
].join("");

test("talking-head splits the script into one sentence per clip", () => {
  assert.deepEqual(splitTalkingHeadSentences(SCRIPT), [
    "大家好，我係 Jeff。",
    "今日想同你示範點樣用自己個樣，對住鏡頭讀完一句稿。",
    "一句就係一段片。",
    "字幕會固定喺畫面下面。",
    "如果一句太長，系統會叫你改短。",
  ]);
  assert.deepEqual(splitTalkingHeadSentences("第一句\n第二句"), ["第一句", "第二句"]);
});

test("talking-head seconds follow the word count and the pace", () => {
  assert.equal(talkingHeadSeconds("大家好，我係 Jeff。", "medium"), 2);
  assert.equal(talkingHeadSeconds("This product saves you an hour every week.", "medium"), 3);
  const line = "今日想同你示範點樣用自己個樣，對住鏡頭讀完一句稿。";
  assert.ok(talkingHeadSeconds(line, "slow") > talkingHeadSeconds(line, "medium"));
  assert.ok(talkingHeadSeconds(line, "fast") < talkingHeadSeconds(line, "medium"));
});

test("talking-head refuses more than 20 sentences or a sentence over 12 seconds", () => {
  const many = Array.from({ length: 21 }, (_, index) => `第${index + 1}句。`).join("");
  assert.match(talkingHeadPlanError(many, "medium") || "", /21 句/);
  const long = "甲".repeat(60) + "。";
  assert.match(talkingHeadPlanError(long, "medium") || "", /超過 12 秒/);
  assert.equal(talkingHeadPlanError(SCRIPT, "medium"), undefined);
});

test("talking-head plans clips from the director's spoken lines, not the brief", () => {
  assert.equal(talkingHeadSourceError("   "), "請輸入導演指示。");
  assert.equal(talkingHeadSourceError("Create a reel, you plan the content"), undefined);
  const script = talkingHeadScriptFromClips([
    { englishVo: "Video makes a product feel real." },
    { englishVo: "Show the problem, then the fix." },
  ]);
  assert.equal(script, "Video makes a product feel real.\nShow the problem, then the fix.");
  const clips = planTalkingHeadClips({ source: script, pace: "medium", language: "en" });
  assert.equal(clips.length, 2);
  assert.equal(clips[0].englishVo, "Video makes a product feel real.");
  assert.match(talkingHeadDirectorBlock(), /DIRECTOR INSTRUCTION/);
  const brief = "Create a reel Explain why video is so important, you plan the content for me";
  assert.match(talkingHeadCopiedBriefError(brief, brief) || "", /當成對白/);
  assert.equal(talkingHeadCopiedBriefError(brief, "Video makes ideas land."), undefined);
});

test("clip 2 starts on clip 1's end still", () => {
  const clips = planTalkingHeadClips({ source: SCRIPT, pace: "medium", language: "yue" });
  assert.equal(clips.length, 5);
  assert.equal(clips[1].startScene, clips[0].endScene);
  assert.equal(clips[4].startScene, clips[3].endScene);
  assert.match(clips[0].motionCamera, /底部字幕/);
  assert.equal(clips[0].englishVo, "大家好，我係 Jeff。");
  assert.ok(clips.every((clip) => clip.durationSeconds <= 12));
});

test("talking-head clip 2 start copies the previous end file and costs one still", () => {
  assert.equal(talkingHeadFramesCost("talking-head-director", 1), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("talking-head-director", 2), FRAME_COST);
  assert.equal(talkingHeadFramesCost("story-short-director", 2), FRAMES_COST);
  const frames = withInheritedTalkingHeadStarts(
    [
      { clipNumber: 1, position: "end" as const, status: "completed", blobUrl: "https://blob/end-1.png" },
      { clipNumber: 2, position: "start" as const, status: "queued" },
      { clipNumber: 2, position: "end" as const, status: "queued" },
    ],
    "talking-head-director",
  );
  assert.equal(frames[1].status, "completed");
  assert.equal(frames[1].blobUrl, "https://blob/end-1.png");
  assert.equal(frames[2].status, "queued");
});
