import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PERFORMANCE,
  parsePerformanceSlots,
  parseSystemPerformance,
  resolvePerformance,
} from "@/service/director/performance";
import { planTalkingHeadClips, talkingHeadDirectorBlock } from "@/service/director/talking-head";

test("resolvePerformance falls back to the shot defaults without a skill", () => {
  assert.deepEqual(resolvePerformance(undefined, "face", "en"), DEFAULT_PERFORMANCE.face.en);
  assert.deepEqual(resolvePerformance(undefined, "face", "yue"), DEFAULT_PERFORMANCE.face.yue);
  // zh uses the Cantonese scaffolding, same as the motion line.
  assert.deepEqual(resolvePerformance(undefined, "full-body", "zh"), DEFAULT_PERFORMANCE["full-body"].yue);
});

test("resolvePerformance ignores stale DB skill.performance and uses current DEFAULT_PERFORMANCE unless customPerformance changed it", () => {
  const staleSkill = {
    performance: {
      en: {
        ...DEFAULT_PERFORMANCE.face.en,
        headMotion: "stale hyperactive head motion with chin drop and glancing at hands",
      },
      yue: {
        ...DEFAULT_PERFORMANCE.face.yue,
        headMotion: "思考時眼神短暫望向側邊或者望一望雙手再望返鏡頭、下巴跌一跌再抬起",
      },
    },
  };
  assert.equal(
    resolvePerformance(staleSkill, "face", "yue").headMotion,
    DEFAULT_PERFORMANCE.face.yue.headMotion,
  );
  assert.doesNotMatch(DEFAULT_PERFORMANCE.face.yue.headMotion, /望一望雙手|下巴跌一跌|明顯前傾/);
  assert.doesNotMatch(DEFAULT_PERFORMANCE.face.yue.emphasisBeat, /口張大約半秒/);
  assert.doesNotMatch(DEFAULT_PERFORMANCE.face.en.headMotion, /chin drop|shoulders rock/);
  assert.doesNotMatch(DEFAULT_PERFORMANCE.face.en.emphasisBeat, /half a second/);
});

test("a custom English edit wins per key in every language; untouched keys keep template text", () => {
  const skill = {
    performance: DEFAULT_PERFORMANCE.face,
    customPerformance: {
      ...DEFAULT_PERFORMANCE.face.en,
      restingFace: "a deadpan stare",
      anchorProp: "",
    },
  };
  const en = resolvePerformance(skill, "face", "en");
  assert.equal(en.restingFace, "a deadpan stare");
  assert.equal(en.anchorProp, "");
  assert.equal(en.set, DEFAULT_PERFORMANCE.face.en.set);
  const yue = resolvePerformance(skill, "face", "yue");
  assert.equal(yue.restingFace, "a deadpan stare");
  assert.equal(yue.anchorProp, "");
  assert.equal(yue.set, DEFAULT_PERFORMANCE.face.yue.set);
});

test("a blank custom slot other than anchorProp keeps the template text", () => {
  const skill = {
    performance: DEFAULT_PERFORMANCE.face,
    customPerformance: { ...DEFAULT_PERFORMANCE.face.en, set: "   " },
  };
  assert.equal(resolvePerformance(skill, "face", "en").set, DEFAULT_PERFORMANCE.face.en.set);
});

test("parsePerformanceSlots drops unknown keys and rejects long text", () => {
  const ok = parsePerformanceSlots({ restingFace: "calm", bogus: "x" });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.slots.restingFace, "calm");
    assert.equal(ok.slots.set, "");
    assert.equal("bogus" in ok.slots, false);
  }
  const long = parsePerformanceSlots({ restingFace: "x".repeat(601) });
  assert.equal(long.ok, false);
});

test("parseSystemPerformance requires every key in both languages", () => {
  assert.doesNotThrow(() => parseSystemPerformance(DEFAULT_PERFORMANCE.face));
  const missing: Record<string, string> = { ...DEFAULT_PERFORMANCE.face.yue };
  delete missing.light;
  assert.throws(() => parseSystemPerformance({ en: DEFAULT_PERFORMANCE.face.en, yue: missing }), /yue\.light/);
});

test("talking-head plan and director block render custom slots", () => {
  const performance = {
    ...DEFAULT_PERFORMANCE.face.en,
    anchorProp: "a chunky vintage telephone handset held to the ear",
    set: "a sunlit balcony with potted plants",
    light: "golden hour side light",
  };
  const clips = planTalkingHeadClips({ source: "Hello there. This is a test.", language: "en", performance });
  assert.match(clips[0].startScene, /vintage telephone handset/);
  assert.match(clips[0].startScene, /sunlit balcony/);
  assert.match(clips[0].startScene, /golden hour/);
  assert.doesNotMatch(clips[0].startScene, /homemade microphone|bookshelf/);
  assert.match(clips[0].motionCamera, /vintage telephone handset/);
  const block = talkingHeadDirectorBlock("talking-head-director", "9:16", performance);
  assert.match(block, /vintage telephone handset/);
  assert.match(block, /sunlit balcony/);
  assert.doesNotMatch(block, /homemade microphone/);
});
