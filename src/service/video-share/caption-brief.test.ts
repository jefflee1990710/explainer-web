import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/model/project";
import {
  CAPTION_GUIDES,
  captionBrief,
  shareCaptionPrompt,
} from "@/service/video-share/caption-brief";
import { VIDEO_SHARE_IDS } from "@/service/video-share/platforms";

function phaseA(): PhaseAProposal {
  return {
    englishTitle: "Why toast burns",
    localizedTitle: "為什麼吐司會燒焦",
    targetDuration: "15s",
    clipCount: 2,
    loopMode: "linear",
    coreMessage: "小心熱度",
    hookStrategy: "警報聲",
    aspectRatio: "9:16",
    visualWorld: "剪紙世界",
    narrator: "Math Tutor",
    englishWordCount: 8,
    characterLock: "依藍圖",
    palette: "紅藍黃",
    bgmDirection: "輕快",
    narrativeArc: "問題到解答",
    clips: [
      {
        clipNumber: 1,
        timeRange: "0-5s",
        durationSeconds: 5,
        narrativeJob: "hook",
        explainerScene: "警報掉下來",
        motionCamera: "推近",
        englishVo: "Danger?",
        bgmSfx: "alarm",
      },
      {
        clipNumber: 2,
        timeRange: "5-10s",
        durationSeconds: 5,
        narrativeJob: "payoff",
        explainerScene: "其實是吐司",
        motionCamera: "拉開",
        startVo: "Just toast.",
        endVo: "Lower the heat.",
        englishVo: "",
        bgmSfx: "ding",
      },
    ],
  };
}

test("brief uses title, core message, and spoken lines", () => {
  const brief = captionBrief({ source: "Toast burns when the heat is too high.", phaseA: phaseA() });
  assert.match(brief, /為什麼吐司會燒焦/);
  assert.match(brief, /小心熱度/);
  assert.match(brief, /Danger\?/);
  assert.match(brief, /Just toast/);
  assert.match(brief, /警報掉下來/);
  assert.match(brief, /Toast burns/);
});

test("every share platform has a caption guide", () => {
  for (const id of VIDEO_SHARE_IDS) {
    assert.ok(CAPTION_GUIDES[id].length > 20, id);
  }
});

test("x prompt asks for a short post without a url", () => {
  const prompt = shareCaptionPrompt({
    platform: "x",
    language: "zh",
    brief: "Title: 吐司",
  });
  assert.match(prompt.system, /240/);
  assert.match(prompt.system, /繁體中文/);
  assert.match(prompt.system, /No URL/);
  assert.equal(prompt.user, "Title: 吐司");
});

test("youtube prompt asks for title then description", () => {
  const prompt = shareCaptionPrompt({
    platform: "youtube",
    language: "en",
    brief: "Title: Toast",
  });
  assert.match(prompt.system, /YouTube title/);
  assert.match(prompt.system, /American English/);
});
