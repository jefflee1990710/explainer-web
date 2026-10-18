import assert from "node:assert/strict";
import { test } from "node:test";
import { planTalkingHeadClips, talkingHeadDirectorBlock } from "@/service/director/talking-head";

const SCRIPT =
  "Stop scrolling right now, because this matters. Here is the one lighting trick that pros use every day. Try it today and tell me how it looks.";

test("realistic talking-head stills carry light source, skin detail, and foreground depth", () => {
  const clips = planTalkingHeadClips({ source: SCRIPT, language: "en", aspectRatio: "9:16", realistic: true });
  assert.ok(clips.length >= 2);
  for (const clip of clips) {
    for (const scene of [clip.startScene, clip.endScene]) {
      assert.match(scene, /Light source: .*rim light/);
      assert.match(scene, /Skin: visible pores/);
      assert.match(scene, /Depth: natural shallow depth of field/);
      // Subtitle stays last so the clip 2+ subtitle swap keeps the realism clause.
      assert.ok(scene.indexOf("Realism:") < scene.indexOf("Subtitle:"));
    }
    assert.match(clip.motionCamera, /Realism: natural blinks/);
  }
  // Clip 2 still opens on clip 1's end, with only the subtitle swapped.
  assert.equal(
    clips[1].startScene.replace(/\s*Subtitle:.*$/u, ""),
    clips[0].endScene.replace(/\s*Subtitle:.*$/u, ""),
  );
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
  assert.match(clips[0].startScene, /Skin: visible pores/);
  assert.doesNotMatch(clips[0].startScene, /Light source:|foreground element/);
  assert.doesNotMatch(clips[0].motionCamera, /rim light/);
});

test("Cantonese realistic stills use the Cantonese realism clause", () => {
  const clips = planTalkingHeadClips({ source: "今日教你一招。記住試下。", language: "yue", realistic: true });
  assert.match(clips[0].startScene, /真實感：光源：.*皮膚：睇到毛孔.*景深：/);
  assert.match(clips[0].motionCamera, /真實感：每幾秒自然眨眼/);
});

test("full-body realism keeps the foreground off the body", () => {
  const clips = planTalkingHeadClips({ source: SCRIPT, language: "en", shot: "full-body", realistic: true });
  assert.match(clips[0].startScene, /no foreground objects blocking any corner/);
});
