import assert from "node:assert/strict";
import { test } from "node:test";
import {
  planTalkingHeadClips,
  splitTalkingHeadSentences,
  talkingHeadDirectorBlock,
  talkingHeadFramesCost,
  talkingHeadPlanError,
  talkingHeadScriptFromClips,
  talkingHeadSeconds,
  talkingHeadShot,
  talkingHeadSourceError,
  talkingHeadSpokenError,
  talkingHeadPhaseBPrompt,
  withInheritedTalkingHeadStarts,
} from "@/service/director/talking-head";
import { FRAME_COST, FRAMES_COST } from "@/service/credit-costs";

const TALKING_HEAD_TOO_LONG = 20 * 12 * 4 + 8;

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

test("talking-head refuses a script that cannot fit in 20 clips", () => {
  const many = Array.from({ length: 21 }, (_, index) => `第${index + 1}句。`).join("");
  assert.equal(talkingHeadPlanError(many, "medium"), undefined);
  const tooLong = `${"甲".repeat(TALKING_HEAD_TOO_LONG)}。`;
  assert.match(talkingHeadPlanError(tooLong, "medium") || "", /最多 240 秒/);
  const long = "甲".repeat(60) + "。";
  assert.equal(talkingHeadPlanError(long, "medium"), undefined);
  assert.equal(talkingHeadPlanError(SCRIPT, "medium"), undefined);
});

test("talking-head keeps instruction and spoken script as separate fields", () => {
  assert.equal(talkingHeadSourceError("   "), "請輸入導演指示。");
  assert.equal(talkingHeadSourceError("Keep it punchy and look at the lens"), undefined);
  assert.equal(talkingHeadSpokenError("   "), "請輸入角色要讀的講稿。");
  assert.equal(talkingHeadSpokenError(SCRIPT, "medium"), undefined);
  const script = talkingHeadScriptFromClips([
    { englishVo: "Video makes a product feel real." },
    { englishVo: "Show the problem, then the fix." },
  ]);
  assert.equal(script, "Video makes a product feel real.\nShow the problem, then the fix.");
  const clips = planTalkingHeadClips({ source: script, pace: "medium", language: "en" });
  assert.equal(clips.length, 1);
  assert.match(clips[0].englishVo, /Video makes a product feel real/);
  assert.match(clips[0].englishVo, /Show the problem, then the fix/);
  assert.equal(clips[0].durationSeconds, 5);
  assert.match(talkingHeadDirectorBlock(), /spoken script is locked/i);
  assert.match(talkingHeadDirectorBlock(), /seated medium shot/);
  assert.match(talkingHeadDirectorBlock(), /homemade microphone/);
  assert.match(clips[0].startScene, /seated/);
  assert.match(clips[0].startScene, /homemade microphone/);
  assert.match(clips[0].startScene, /beside a bookshelf/);
  assert.doesNotMatch(clips[0].startScene, /\bbed\b/);
  const withRoom = planTalkingHeadClips({
    source: script,
    pace: "medium",
    language: "en",
    background: true,
  });
  assert.match(withRoom[0].startScene, /attached scene reference photo/);
  assert.doesNotMatch(withRoom[0].startScene, /beside a bookshelf/);
  assert.doesNotMatch(talkingHeadDirectorBlock(), /medium close-up/i);
});

test("clip 2 starts on clip 1's end still", () => {
  const clips = planTalkingHeadClips({ source: SCRIPT, pace: "medium", language: "yue" });
  assert.ok(clips.length >= 2);
  assert.equal(clips[1].startScene, clips[0].endScene);
  assert.match(clips[0].motionCamera, /底部字幕/);
  assert.match(clips[0].motionCamera, /口型跟住講/);
  assert.match(clips.map((clip) => clip.englishVo).join(""), /大家好，我係 Jeff/);
  assert.ok(clips.every((clip) => clip.durationSeconds >= 5 && clip.durationSeconds <= 12));
  assert.match(clips[0].startScene, /坐住/);
  assert.match(clips[0].startScene, /自製咪/);
  assert.doesNotMatch(clips[0].startScene, /中近景|medium close-up/);
});

const FULL_BODY_VISUAL =
  "One locked full-body shot with the character centered and facing the camera.";

test("9:16 talking-head subtitles sit a little below center; 16:9 stays at the bottom", () => {
  const script = "Hi, everyone. I am Scro.";
  const reel = planTalkingHeadClips({
    source: script,
    pace: "medium",
    language: "en",
    aspectRatio: "9:16",
  });
  assert.match(reel[0].startScene, /a little below the vertical center/);
  assert.match(reel[0].motionCamera, /a little below the vertical center/);
  assert.doesNotMatch(reel[0].startScene, /one bottom line/);
  const wide = planTalkingHeadClips({
    source: script,
    pace: "medium",
    language: "en",
    aspectRatio: "16:9",
    shot: "full-body",
  });
  assert.match(wide[0].startScene, /one bottom line/);
  assert.match(wide[0].motionCamera, /at the bottom/);
  assert.match(talkingHeadDirectorBlock("talking-head-director", "9:16"), /a little below the vertical center/);
  assert.match(talkingHeadDirectorBlock("full-body-talking-head-director", "16:9"), /across the bottom/);
});

test("talking-head Phase B reuses motionCamera from Phase A", () => {
  const clips = planTalkingHeadClips({ source: "Hello world.", pace: "medium", language: "en" });
  const phaseA = { clips };
  const prompt = talkingHeadPhaseBPrompt({ phaseA, clipNumber: 1 });
  assert.ok(prompt);
  assert.equal(prompt?.clipNumber, 1);
  assert.equal(prompt?.prompt, clips[0].motionCamera);
  assert.equal(talkingHeadPhaseBPrompt({ phaseA, clipNumber: 99 }), undefined);
});

test("talking-head keeps a full English word inside a Cantonese line", () => {
  const source = [
    "有無諗過你個Instagram也可以變成你嘅生財工具？",
    "我係下星期一有一個Webinar就係教大家點樣做，",
    "係呢個市況唔好嘅大環境，大家更加要學多一個技能啦，仲要免費！",
    "大家DM留言報名啦！",
  ].join("");
  const clips = planTalkingHeadClips({ source, pace: "medium", language: "yue" });
  const spoken = clips.map((clip) => clip.englishVo).join("\n");
  assert.match(spoken, /Instagram/);
  assert.match(spoken, /Webinar/);
  assert.match(spoken, /DM/);
  const voiced = clips.find((clip) => clip.englishVo.includes("嘅"));
  assert.ok(voiced);
  assert.match(voiced.motionCamera, /口型跟住講「[^」]*嘅/);
  assert.match(voiced.startScene, /逐字係「[^」]*的/);
  assert.doesNotMatch(voiced.startScene, /逐字係「[^」]*嘅/);
  assert.doesNotMatch(spoken, /Instagra\s/);
  assert.doesNotMatch(spoken, /Webi\s/);
  assert.ok(clips.every((clip) => clip.durationSeconds >= 5 && clip.durationSeconds <= 12));
});

test("talking-head evens word count and keeps a named shot", () => {
  const script = [
    "Hi, everyone. I am Scro.",
    "I am a tools for you to generate short video in few click, for you to promote your product or service.",
    "Like this video, I created in few minute, I just need to focus at content, and Scro.io do the rest.",
    "Try it now!",
  ].join(" ");
  assert.deepEqual(splitTalkingHeadSentences("and Scro.io do the rest."), ["and Scro.io do the rest."]);
  const clips = planTalkingHeadClips({
    source: script,
    pace: "medium",
    language: "en",
    shot: talkingHeadShot(FULL_BODY_VISUAL),
  });
  const words = clips.map((clip) => clip.englishVo.split(/\s+/).length);
  const durations = clips.map((clip) => clip.durationSeconds);
  assert.ok(clips.length >= 2);
  assert.ok(clips.some((clip) => clip.englishVo.includes("Scro.io")));
  assert.ok(Math.max(...words) - Math.min(...words) <= 8);
  assert.ok(Math.max(...durations) - Math.min(...durations) <= 3);
  assert.ok(durations.every((seconds) => seconds >= 5 && seconds <= 12));
  assert.match(clips[0].startScene, /locked full-body/);
  assert.match(clips[0].startScene, /mouth just opening/);
  assert.match(clips[0].startScene, /eyes locked into the lens/);
  assert.match(clips[0].endScene || "", /chest height/);
  assert.match(clips[0].endScene || "", /weight on the other hip/);
  assert.match(clips[0].motionCamera, /continuous lip-sync/);
  assert.match(clips[0].motionCamera, /chest height/);
  assert.match(clips[0].motionCamera, /weight shifting hip to hip/);
  assert.doesNotMatch(clips[0].startScene, /medium close-up/);
  assert.equal(talkingHeadShot(undefined), undefined);
});

test("talking-head clip 2 start copies the previous end file and costs one still", () => {
  assert.equal(talkingHeadFramesCost("talking-head-director", 1), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("talking-head-director", 2), FRAME_COST);
  assert.equal(talkingHeadFramesCost("full-body-talking-head-director", 2), FRAME_COST);
  assert.equal(talkingHeadFramesCost("story-short-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("outfit-reel-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("follow-shot-director", 2), FRAME_COST);
  assert.equal(talkingHeadFramesCost("surprise-interview-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("surprise-interview-director", 3), FRAMES_COST);
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
