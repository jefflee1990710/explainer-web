import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TALKING_HEAD_MAX_SECONDS,
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
import { talkingHeadPhaseASchema, phaseBClipSchema } from "@/model/director";
import { FRAMES_COST } from "@/service/credit-costs";

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
  assert.match(talkingHeadDirectorBlock(), /handheld iPhone/);
  assert.match(talkingHeadDirectorBlock(), /24mm at f\/1\.8/);
  assert.match(talkingHeadDirectorBlock(), /60–65%/);
  assert.match(clips[0].startScene, /seated|selfie|collarbone/i);
  assert.match(clips[0].startScene, /24mm at f\/1\.8|24mm f\/1\.8/);
  assert.match(clips[0].startScene, /lived-in bedroom corner|bedhead or door frame/);
  assert.match(clips[0].startScene, /handheld|micro-sway|60–65%/);
  assert.doesNotMatch(clips[0].startScene, /unseen phone/);
  assert.doesNotMatch(clips[0].startScene, /\bsofa at home\b/);
  const withRoom = planTalkingHeadClips({
    source: script,
    pace: "medium",
    language: "en",
    background: true,
  });
  assert.match(withRoom[0].startScene, /attached scene reference photo/);
  assert.doesNotMatch(withRoom[0].startScene, /beside a bookshelf/);
  assert.doesNotMatch(talkingHeadDirectorBlock(), /medium close-up/i);
  const withPhoto = planTalkingHeadClips({
    source: SCRIPT,
    pace: "medium",
    language: "en",
    openingPhoto: true,
  });
  assert.equal(withPhoto.length, 1);
  assert.match(withPhoto[0].startScene, /attached opening photo/);
  assert.match(withPhoto[0].endScene, /user's opening photo/);
  assert.doesNotMatch(withPhoto[0].startScene, /beside a bookshelf/);
});

test("talking-head-director keeps a script up to 120s in a single clip and splits only over 120s", () => {
  assert.equal(TALKING_HEAD_MAX_SECONDS, 120);
  const clips = planTalkingHeadClips({ source: SCRIPT, pace: "medium", language: "yue" });
  assert.equal(clips.length, 1);
  assert.doesNotMatch(clips[0].startScene, /字幕：|Subtitle:/);
  assert.doesNotMatch(clips[0].endScene, /字幕：|Subtitle:/);
  assert.doesNotMatch(clips[0].motionCamera, /底部字幕|大字幕|中線下面少少嘅字幕/);
  assert.match(clips[0].motionCamera, /口型跟住講/);
  assert.match(clips[0].englishVo, /大家好，我係 Jeff/);
  assert.match(clips[0].englishVo, /如果一句太長，系統會叫你改短/);
  assert.ok(clips[0].durationSeconds >= 10 && clips[0].durationSeconds <= 120);
  assert.match(clips[0].startScene, /鎖骨以上自拍大特寫|60–65%/);
  assert.match(clips[0].startScene, /24mm f\/1\.8/);
  assert.match(clips[0].startScene, /手持 iPhone 前置自拍|微晃/);
  assert.doesNotMatch(clips[0].startScene, /中近景|medium close-up/);

  // A 150s script (> 120s) splits into 2 clips, each <= 120s, and clip 2 chains from clip 1.
  const over120s = Array.from({ length: 15 }, (_, i) => `第${i + 1}段，${"甲".repeat(38)}。`).join("");
  const multiClips = planTalkingHeadClips({ source: over120s, pace: "medium", language: "yue" });
  assert.equal(multiClips.length, 2);
  assert.ok(multiClips.every((c) => c.durationSeconds >= 5 && c.durationSeconds <= 120));
  assert.match(multiClips[1].startScene, /口部合上/);
  assert.match(multiClips[1].motionCamera, /唔好跳鏡/);

  // Schemas accept up to 120s durationSeconds.
  assert.equal(phaseBClipSchema.safeParse({ clipNumber: 1, durationSeconds: 120, prompt: "ok" }).success, true);
  assert.equal(
    talkingHeadPhaseASchema.shape.clips.safeParse([
      {
        clipNumber: 1,
        timeRange: "0–120s",
        durationSeconds: 120,
        narrativeJob: "clip 1 of 1",
        explainerScene: "s",
        motionCamera: "m",
        englishVo: "v",
        bgmSfx: "none",
      },
    ]).success,
    true,
  );
});

const FULL_BODY_VISUAL =
  "One locked full-body shot with the character centered and facing the camera.";

test("talking-head stills and motion never generate on-screen subtitles in 9:16 or 16:9", () => {
  const script = "Hi, everyone. I am Scro.";
  const reel = planTalkingHeadClips({
    source: script,
    pace: "medium",
    language: "en",
    aspectRatio: "9:16",
  });
  assert.doesNotMatch(reel[0].startScene, /Subtitle:|字幕：/i);
  assert.doesNotMatch(reel[0].endScene, /Subtitle:|字幕：/i);
  assert.doesNotMatch(reel[0].motionCamera, /subtitle|fades and slides/i);
  const wide = planTalkingHeadClips({
    source: script,
    pace: "medium",
    language: "en",
    aspectRatio: "16:9",
    shot: "full-body",
  });
  assert.doesNotMatch(wide[0].startScene, /Subtitle:|字幕：/i);
  assert.doesNotMatch(wide[0].motionCamera, /subtitle/i);
  assert.match(talkingHeadDirectorBlock("talking-head-director", "9:16"), /no letters, no subtitle/i);
  assert.match(talkingHeadDirectorBlock("full-body-talking-head-director", "16:9"), /no letters, no subtitle/i);
});

test("none on-screen text keeps talking-head stills and motion free of writing", () => {
  const clips = planTalkingHeadClips({
    source: "Hello there. See you.",
    pace: "medium",
    language: "en",
    aspectRatio: "9:16",
    noText: true,
  });
  assert.doesNotMatch(clips[0].startScene, /Subtitle:/);
  assert.doesNotMatch(clips[0].motionCamera, /subtitle/i);
  assert.match(talkingHeadDirectorBlock("talking-head-director", "9:16", undefined, false, true), /no letters/);
});

test("talking-head Phase B never injects subtitle handoff", () => {
  const prompt = talkingHeadPhaseBPrompt({
    subtitleHandoff: true,
    language: "en",
    clipNumber: 1,
    phaseA: {
      clips: [
        { clipNumber: 1, durationSeconds: 5, englishVo: "Hello there.", motionCamera: "She speaks the line." },
        { clipNumber: 2, durationSeconds: 5, englishVo: "See you.", motionCamera: "She waves." },
      ],
    },
  });
  assert.doesNotMatch(prompt?.prompt || "", /subtitle/i);
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

test("an old clip 2 prompt drops the previous line before it is sent", () => {
  const previous = "有無諗過你個Instagram都可以變成你嘅生財工具？";
  const line = "係呢個市況唔好嘅大環境，大家更加要學多一個技能啦。";
  const prompt = talkingHeadPhaseBPrompt({
    language: "yue",
    clipNumber: 2,
    phaseA: {
      clips: [
        { clipNumber: 1, durationSeconds: 9, englishVo: previous, motionCamera: "第一段" },
        {
          clipNumber: 2,
          durationSeconds: 8,
          englishVo: line,
          motionCamera: `口型跟住講「${line}」。中線下面少少嘅字幕由「${previous}」換成「${line}」。`,
        },
      ],
    },
  });
  assert.match(prompt?.prompt || "", /唔好讀出舊字/);
  assert.equal(prompt?.prompt.includes(previous), false);
  assert.equal(prompt?.prompt.includes("換成"), false);
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
  assert.doesNotMatch(voiced.startScene, /逐字係「/);
  assert.doesNotMatch(spoken, /Instagra\s/);
  assert.doesNotMatch(spoken, /Webi\s/);
  assert.equal(clips.length, 1);
  assert.ok(clips[0].durationSeconds >= 5 && clips[0].durationSeconds <= 120);
});

test("a talking-head script under 120s stays in one clip, and the selfie crop hides hands", () => {
  const source = [
    "What if you have zero budget for marketing?",
    "Stop overthinking ads.",
    "Your best asset is Content Marketing via Instagram Reels.",
    "Reels organic reach is insane right now, but who has time to script and edit every day?",
    "That's why you use Scro.io.",
    "It turns your raw marketing ideas into professional Reel clips.",
  ].join(" ");
  const clips = planTalkingHeadClips({
    source,
    pace: "medium",
    language: "en",
    aspectRatio: "9:16",
  });
  assert.equal(clips.length, 1);
  assert.ok(clips[0].durationSeconds >= 15 && clips[0].durationSeconds <= 120);
  assert.doesNotMatch(clips[0].motionCamera, /left then right hand|right then left hand/);
  assert.doesNotMatch(clips[0].motionCamera, /hand holding/);
  assert.match(clips[0].endScene, /No zoom, no reframe, no jump/);
  assert.doesNotMatch(clips[0].startScene, /Subtitle:/);
  assert.doesNotMatch(clips[0].motionCamera, /fades and slides/);
  for (const clip of clips) {
    assert.match(clip.startScene, /eyes (?:locked (?:into|on)|on) the lens/);
    assert.match(clip.endScene, /eyes (?:locked (?:into|on)|on) the lens/);
    assert.match(clip.startScene, /NO hands visible|no hands/i);
    assert.match(clip.endScene, /No hands|no hands/i);
    assert.doesNotMatch(clip.startScene, /index finger raised mid-gesture|looking down at her gesturing hands|glancing upward-left|looking off-camera|two fingers|two-handed open-palm shrug/);
    assert.doesNotMatch(clip.endScene, /index finger raised mid-gesture|looking down at her gesturing hands|glancing upward-left|looking off-camera|two fingers|two-handed open-palm shrug/);
  }
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
  assert.match(clips[0].startScene, /lips gently closed or barely parted ready to speak/);
  assert.match(clips[0].startScene, /eyes locked into the lens/);
  assert.match(clips[0].endScene || "", /chest height/);
  assert.match(clips[0].endScene || "", /weight on the other hip/);
  assert.match(clips[0].motionCamera, /continuous lip-sync/);
  assert.match(clips[0].motionCamera, /chest height/);
  assert.match(clips[0].motionCamera, /weight shifting hip to hip/);
  assert.doesNotMatch(clips[0].startScene, /medium close-up/);
  assert.equal(talkingHeadShot(undefined), undefined);
});

test("start-only directors draw their own start; talking-head draws its own start", () => {
  assert.equal(talkingHeadFramesCost("talking-head-director", 1), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("talking-head-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("full-body-talking-head-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("story-short-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("outfit-reel-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("follow-shot-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("surprise-interview-director", 1), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("surprise-interview-director", 2), FRAMES_COST);
  assert.equal(talkingHeadFramesCost("surprise-interview-director", 3), FRAMES_COST);
  const rows = [
    { clipNumber: 1, position: "end" as const, status: "completed", blobUrl: "https://blob/end-1.png" },
    { clipNumber: 2, position: "start" as const, status: "queued" },
    { clipNumber: 2, position: "end" as const, status: "queued" },
  ];
  const talking = withInheritedTalkingHeadStarts(rows, "talking-head-director");
  assert.equal(talking[1].status, "queued");
  assert.equal(talking[1].blobUrl, undefined);
  const follow = withInheritedTalkingHeadStarts(rows, "follow-shot-director");
  assert.equal(follow[1].status, "queued");
  assert.equal(follow[1].blobUrl, undefined);
  const surprise = withInheritedTalkingHeadStarts(rows, "surprise-interview-director");
  assert.equal(surprise[1].status, "queued");
  assert.equal(surprise[1].blobUrl, undefined);
});

test("overlay talking-head scenes keep the voice line and drop the subtitle", () => {
  const clips = planTalkingHeadClips({
    source: "Hello there. See you.",
    pace: "medium",
    language: "en",
    aspectRatio: "9:16",
    overlay: true,
  });
  assert.match(clips[0].motionCamera, /Hello there/);
  assert.doesNotMatch(clips[0].startScene, /Subtitle:/);
  assert.doesNotMatch(clips[0].endScene, /Subtitle:/);
  assert.doesNotMatch(clips[0].motionCamera, /subtitle/i);
  const block = talkingHeadDirectorBlock("talking-head-director", "9:16", undefined, true);
  assert.match(block, /no letters/i);
  assert.doesNotMatch(block, /Write the subtitle into startScene/);
});

test("talking-head honours a custom background instruction in directorInstruction or visualWorld instead of hardcoding home sofa and bookshelf", () => {
  const yueClips = planTalkingHeadClips({
    source: "好多老闆成日問我，點解請極人都請唔到？其實問題唔在於人工，而係公司無一套清晰嘅自動化流程。",
    directorInstruction: "Change the background at office, with HK sea view",
    visualWorld: "現代寫字樓室內自然光環境，背景有落地玻璃窗透出真實香港維港海景，配搭35mm電影級自然逆光與淺景深效果，全程單一固定機位，畫面乾淨無任何文字或字幕。",
    pace: "medium",
    language: "yue",
    aspectRatio: "9:16",
    realistic: true,
  });
  assert.equal(yueClips.length, 1);
  for (const clip of yueClips) {
    assert.match(clip.startScene, /現代寫字樓室內自然光環境/);
    assert.match(clip.startScene, /office, with HK sea view/);
    assert.match(clip.startScene, /唔好再畫書架、屋企沙發/);
    assert.doesNotMatch(clip.startScene, /全程同一張屋企沙發，書架喺頭後面/);
    assert.doesNotMatch(clip.endScene, /全程同一張屋企沙發，書架喺頭後面/);
  }

  const enClips = planTalkingHeadClips({
    source: "Stop scrolling right now. Here is why your team is stuck.",
    directorInstruction: "Change the background at office, with HK sea view",
    pace: "medium",
    language: "en",
    aspectRatio: "9:16",
    realistic: true,
  });
  for (const clip of enClips) {
    assert.match(clip.startScene, /Set: the same setting in every clip \(office, with HK sea view\)/);
    assert.match(clip.startScene, /Do not draw a bookshelf, a home sofa/);
    assert.doesNotMatch(clip.startScene, /the same sofa at home in every clip, a bookshelf behind the head/);
    assert.doesNotMatch(clip.endScene, /on the sofa/);
  }
});

test("every talking-head clip endScene explicitly closes the mouth so next-clip keyframes never lock a static toothy grin", () => {
  const yueSource = [
    "有無諗過你個Instagram都可以變成你嘅生財工具？",
    "我係下星期一有一個Webinar就係教大家點樣做。",
    "係呢個市況唔好嘅大環境下單靠打份工真係好難有安全感。",
    "所以大家更加要趁早學多一個技能幫自己增加收入啦。",
    "呢個直播課堂仲要係完全免費㗎大家快啲DM留言報名啦！",
  ].join("\n");
  const yueClips = planTalkingHeadClips({
    source: yueSource,
    pace: "fast",
    language: "yue",
    aspectRatio: "9:16",
    realistic: true,
  });
  assert.equal(yueClips.length, 1);
  for (const clip of yueClips) {
    assert.match(clip.endScene, /口部合上/, `clip ${clip.clipNumber} endScene must specify 口部合上`);
    assert.match(clip.motionCamera, /每個字都有清晰明顯嘅嘴唇同下巴開合對嘴動作/);
  }
  for (let i = 1; i < yueClips.length; i++) {
    assert.match(yueClips[i].startScene, /口部合上/, `clip ${i + 1} startScene must inherit 口部合上`);
  }
});

test("talking-head pose framing zooms from full-body to collarbone-close", () => {
  const full = planTalkingHeadClips({
    source: SCRIPT,
    language: "en",
    aspectRatio: "9:16",
    talkingHeadPoseId: "full-body",
    realistic: true,
  });
  assert.match(full[0].startScene, /head to feet fully visible/);
  assert.match(full[0].startScene, /locked full-body/);
  assert.doesNotMatch(full[0].startScene, /face fills 60–65%/);

  const waist = planTalkingHeadClips({
    source: SCRIPT,
    language: "en",
    aspectRatio: "9:16",
    talkingHeadPoseId: "waist-up",
    realistic: true,
  });
  assert.match(waist[0].startScene, /framed from the waist up/);
  assert.match(waist[0].startScene, /both hands resting calmly on the lap/);

  const close = planTalkingHeadClips({
    source: SCRIPT,
    language: "en",
    aspectRatio: "9:16",
    talkingHeadPoseId: "collarbone-close",
    realistic: true,
  });
  assert.match(close[0].startScene, /collarbone-up selfie close-up/);
  assert.match(close[0].startScene, /face fills 60–65%/);
});
