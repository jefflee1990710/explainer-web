import assert from "node:assert/strict";
import { test } from "node:test";
import { characterSpecLine, sanitizeSpecSkinTone } from "@/model/character-spec";
import { planTalkingHeadClips, talkingHeadDirectorBlock } from "@/service/director/talking-head";

const SCRIPT =
  "Stop scrolling right now, because this matters. Here is the one lighting trick that pros use every day. Try it today and tell me how it looks.";

test("realistic talking-head stills carry light source, skin detail, and foreground depth", () => {
  const clips = planTalkingHeadClips({ source: SCRIPT, language: "en", aspectRatio: "9:16", realistic: true });
  assert.equal(clips.length, 1);
  for (const clip of clips) {
    for (const scene of [clip.startScene, clip.endScene]) {
      assert.match(scene, /Light source: .*rim light/);
      assert.match(scene, /Skin & camera sensor: .*visible pores/);
      assert.match(scene, /iPhone 16 Pro 24mm f\/1\.8|Sony ZV-E1/);
      assert.match(scene, /zero heavy vintage 35mm film grain/);
      assert.match(scene, /Depth: natural shallow depth of field/);
      assert.doesNotMatch(scene, /Subtitle:/);
    }
    assert.match(clip.motionCamera, /Realism: natural blinks/);
    assert.match(clip.motionCamera, /no heavy vintage film grain/);
  }
});

test("non-realistic styles keep the old talking-head prompts", () => {
  const plain = planTalkingHeadClips({ source: SCRIPT, language: "en", aspectRatio: "9:16" });
  for (const clip of plain) {
    assert.doesNotMatch(clip.startScene, /Realism:|pores|foreground element/);
    assert.doesNotMatch(clip.motionCamera, /Realism:/);
  }
  assert.doesNotMatch(talkingHeadDirectorBlock(undefined, "9:16"), /Realism/);
  assert.match(talkingHeadDirectorBlock(undefined, "9:16", undefined, false, false, true), /Realism \(Cinematic realistic\)/);
});

test("an opening photo keeps its own light and framing; only skin detail is added", () => {
  const clips = planTalkingHeadClips({
    source: SCRIPT,
    language: "en",
    aspectRatio: "9:16",
    openingPhoto: true,
    realistic: true,
  });
  assert.match(clips[0].startScene, /Skin & camera sensor: .*visible pores/);
  assert.doesNotMatch(clips[0].startScene, /Light source:|foreground element/);
  assert.doesNotMatch(clips[0].motionCamera, /rim light/);
});

test("Cantonese realistic stills use the Cantonese realism clause", () => {
  const clips = planTalkingHeadClips({ source: "今日教你一招。記住試下。", language: "yue", realistic: true });
  assert.match(clips[0].startScene, /真實感：光源：.*皮膚與相機質感：.*睇到毛孔.*景深：/);
  assert.match(clips[0].motionCamera, /真實感：每幾秒自然眨眼/);
});

test("full-body realism keeps the foreground off the body", () => {
  const clips = planTalkingHeadClips({ source: SCRIPT, language: "en", shot: "full-body", realistic: true });
  assert.match(clips[0].startScene, /no foreground objects blocking any corner/);
});

test("realistic talking-head skin forbids glossy or oily sheen and sanitizes beauty-smoothed character specs", () => {
  const clips = planTalkingHeadClips({ source: SCRIPT, language: "en", aspectRatio: "9:16", realistic: true });
  for (const clip of clips) {
    assert.match(clip.startScene, /zero oily, waxy, or glossy specular sheen/);
    assert.doesNotMatch(clip.startScene, /light natural sheen on the forehead/i);
    assert.match(clip.motionCamera, /zero plastic or oily specular sheen/);
  }
  const yue = planTalkingHeadClips({ source: "今日教你一招。記住試下。", language: "yue", realistic: true });
  assert.doesNotMatch(yue[0].startScene, /額頭同鼻有少少自然油光/);
  assert.match(yue[0].startScene, /絕對唔好有油光/);

  assert.equal(
    sanitizeSpecSkinTone("fair, pinkish undertones, smooth matte finish, rosy cheeks"),
    "fair, pinkish undertones, visible natural pores, matte-natural skin micro-texture, rosy cheeks",
  );
  const line = characterSpecLine({
    identity: "East Asian woman, early 20s",
    face: "oval face, large dark brown almond eyes, soft curved dark brows, small rounded nose, full pink lips",
    hair: "long straight dark brown hair with see-through wispy bangs",
    skinTone: "fair, pinkish undertones, smooth matte finish, rosy cheeks",
    body: "slender petite build",
    marks: "none",
    outfit: "black vest",
    palette: [],
  });
  assert.match(line, /visible natural pores/);
  assert.doesNotMatch(line, /smooth matte finish/);
});
