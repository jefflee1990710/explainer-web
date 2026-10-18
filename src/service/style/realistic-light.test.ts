import assert from "node:assert/strict";
import test from "node:test";
import type { Project } from "@/model/project";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { sceneDetailDirectorBlock, phaseBDetailRules } from "@/service/director/scene-detail";
import {
  isRealisticStyle,
  lockRealisticVideoLight,
  REALISTIC_FRAME_RENDER_RULE,
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_PRODUCT_RENDER_RULE,
  REALISTIC_PROP_RENDER_RULE,
  REALISTIC_SET_RENDER_RULE,
  REALISTIC_STYLE_FIELDS,
  REALISTIC_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_LIGHT_LOCK,
} from "@/service/style/realistic-light";
import type { RenderableStyle } from "@/service/style/renderable-style";

test("realistic and its user forks count as realistic; flat styles do not", () => {
  assert.equal(isRealisticStyle({ id: "realistic" }), true);
  assert.equal(isRealisticStyle({ id: "6abc", baseStyleId: "realistic" }), true);
  assert.equal(isRealisticStyle({ id: "doodle" }), false);
  assert.equal(isRealisticStyle({ id: "6abc", baseStyleId: "chalkboard" }), false);
  assert.equal(isRealisticStyle(null), false);
});

test("the video light lock is appended once", () => {
  const locked = lockRealisticVideoLight("0–2s she lifts the mug.");
  assert.ok(locked.endsWith(REALISTIC_VIDEO_LIGHT_LOCK));
  assert.equal(lockRealisticVideoLight(locked), locked);
  assert.equal(lockRealisticVideoLight("  "), "");
});

test("realistic style fields and rules enforce the 12 de-plastic rules across Phase A, frames, reference sheets, and video", () => {
  // Rule 01: honest light direction, no quality/grading intensity buzzwords
  assert.match(REALISTIC_STYLE_FIELDS.negatives, /8K, ultra-realistic, hyperrealistic, masterpiece/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /prompt honest light direction rather than exaggerated colour-grading intensity/);

  // Rule 03 & 04: underwater/fog/smoke lifted black point + blue underwater shadows & neutral night shadows
  assert.match(REALISTIC_STYLE_FIELDS.palette, /lift the black point in underwater, fog, or smoke scenes \(with blue-shifted underwater shadows and neutral-black night shadows\)/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /Lift the black point in underwater, fog, or smoke scenes \(underwater shadows stay blue-shifted; night shadows stay neutral black\)/);
  assert.match(REALISTIC_FRAME_RENDER_RULE, /lift the black point in underwater, fog, or smoke scenes \(with blue-shifted underwater shadows and neutral night shadows\)/);

  // Rule 05: extreme dark scenes keep 90% of shadows neutral-desaturated, chroma only on the light source
  assert.match(REALISTIC_STYLE_FIELDS.palette, /keep 90% of shadow areas neutral-desaturated and put chroma only on the light source/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /keep 90% of shadow areas neutral-desaturated and put chroma only on the light source/);
  assert.match(REALISTIC_FRAME_RENDER_RULE, /keep 90% of shadows neutral-desaturated with colour only on the light source/);

  // Rule 06: glowing emitters stay below pure-white clipping with subtle halation
  assert.match(REALISTIC_STYLE_FIELDS.look, /keeping glowing sources below pure-white clipping/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /Keep glowing objects below pure-white clipping with subtle halation/);
  assert.match(REALISTIC_FRAME_RENDER_RULE, /keep glowing objects below pure-white clipping/);
  assert.match(REALISTIC_VIDEO_LIGHT_LOCK, /highlights stay below pure-white clipping/);

  // Rule 07: film grain and crushed blacks are mutually exclusive — slightly lift shadow blacks
  assert.match(REALISTIC_STYLE_FIELDS.look, /slightly lifted shadow blacks so 35mm film grain is never swallowed by crushed zero-blacks/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /keep shadow blacks slightly lifted whenever film grain is present so crushed blacks never swallow the grain/);
  assert.match(REALISTIC_FRAME_RENDER_RULE, /keep shadow blacks slightly lifted so film grain is never swallowed by crushed zero-blacks/);
  assert.match(REALISTIC_VIDEO_LIGHT_LOCK, /subtle film grain with slightly lifted shadow blacks/);

  // Rule 09: per-shot contrast and black point from each shot's own scene light
  assert.match(REALISTIC_STYLE_FIELDS.palette, /scene-motivated honest colour and contrast per shot/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /set contrast and black point per shot from that shot's own scene light/);

  // Rule 10: neutral or cool highlights by default; warm highlights only when a warm practical source is visible
  assert.match(REALISTIC_STYLE_FIELDS.palette, /neutral or cool highlights by default, reserving warm highlights strictly for shots with a visible practical warm lamp, fire, or sunset in frame/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in frame/);
  assert.match(REALISTIC_FRAME_RENDER_RULE, /Keep highlights neutral or cool by default, reserving warm highlights strictly for shots with a visible warm practical lamp, fire, or sunset in frame/);
  assert.match(REALISTIC_PROP_RENDER_RULE, /keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible/);
  assert.match(REALISTIC_PRODUCT_RENDER_RULE, /keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible/);
  assert.match(REALISTIC_SET_RENDER_RULE, /Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible/);

  // Rule 11: grazing directional key light + negative fill on the shadow side + matte-natural skin (no flat front beauty light, no oily sheen)
  assert.match(REALISTIC_STYLE_FIELDS.look, /grazing directional key light from the visible light-source side with negative fill on the shadow side/);
  assert.match(REALISTIC_STYLE_FIELDS.look, /matte-natural skin finish with zero oily or plastic specular sheen/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /grazing directional key from the side or three-quarter angle with negative fill on the shadow side/);
  assert.match(REALISTIC_FRAME_RENDER_RULE, /sculpt faces and surfaces with grazing directional light, negative fill on the shadow side/);
  assert.match(REALISTIC_VIDEO_DETAIL_RULE, /grazing directional light, negative fill on the shadow side, matte-natural skin pores/);
});

test("all directors receive realistic de-plastic rules for both built-in realistic and user forks of realistic", () => {
  const directorSlugs = [
    "talking-head-director",
    "full-body-talking-head-director",
    "cartoon-explainer-video-director",
    "story-short-director",
    "dialogue-qa-director",
    "listicle-director",
    "comparison-card-director",
    "talking-broll-director",
    "surprise-interview-director",
    "outfit-reel-director",
    "follow-shot-director",
    "opening-director",
  ];
  const userForkStyle: RenderableStyle = {
    ...REALISTIC_STYLE_FIELDS,
    id: "66f000000000000000000099",
    baseStyleId: "realistic",
    letteringLayout: "",
    letteringLine1: "",
    letteringLine2: "",
    beatTitleLayout: "",
    reelLayout: "",
  };

  assert.match(sceneDetailDirectorBlock({ realistic: isRealisticStyle(userForkStyle) }), /Realistic light & camera:/);
  assert.match(phaseBDetailRules({ realistic: isRealisticStyle(userForkStyle) }), /Realistic light & live-action capture:/);

  for (const skillSlug of directorSlugs) {
    const mockProject = {
      _id: "p1",
      clerkUserId: "u1",
      title: "Test",
      skillSlug,
      styleId: userForkStyle.id,
      source: "test",
      aspectRatio: "9:16",
      durationPreset: "15s",
      language: "en",
      sceneTextEnabled: false,
      status: "phase_a_ready",
      createdAt: new Date(),
      updatedAt: new Date(),
      phaseA: {
        englishTitle: "Test",
        localizedTitle: "Test",
        targetDuration: "5s",
        clipCount: 1,
        loopMode: "linear",
        coreMessage: "msg",
        hookStrategy: "hook",
        aspectRatio: "9:16",
        visualWorld: "A real studio.",
        narrator: "Narrator",
        englishWordCount: 3,
        characterLock: "Alex: follows blueprint.",
        palette: REALISTIC_STYLE_FIELDS.palette,
        bgmDirection: "none",
        narrativeArc: "arc",
        clips: [
          {
            clipNumber: 1,
            timeRange: "0–5s",
            durationSeconds: 5,
            narrativeJob: "Hook",
            explainerScene:
              "1) Character: Alex stands by a desk. 2) Set: A workshop. 3) Light: grazing directional daylight from a side window with negative fill on the shadow side. 4) Camera: medium shot on a 35mm lens at f/1.4, subtle film grain.",
            startScene:
              "1) Character: Alex stands by a desk. 2) Set: A workshop. 3) Light: grazing directional daylight from a side window with negative fill on the shadow side. 4) Camera: medium shot on a 35mm lens at f/1.4, subtle film grain.",
            endScene:
              "1) Character: Alex nods by the desk. 2) Set: A workshop. 3) Light: grazing directional daylight from a side window with negative fill on the shadow side. 4) Camera: medium shot on a 35mm lens at f/1.4, subtle film grain.",
            motionCamera: "0–5s: slow camera hold on 35mm f/1.4.",
            englishVo: "Here it is.",
            bgmSfx: "room tone",
          },
        ],
      },
    } as unknown as Project;

    const framePrompt = buildFramePrompt(mockProject, 1, "start", { style: userForkStyle });
    assert.match(framePrompt, /Realistic light & camera:/, `missing realistic frame render rule for ${skillSlug}`);
    assert.match(framePrompt, /grazing directional light, negative fill on the shadow side/, `missing Rule 11 in ${skillSlug}`);
    assert.match(framePrompt, /below pure-white clipping/, `missing Rule 06 in ${skillSlug}`);
    assert.match(framePrompt, /keep shadow blacks slightly lifted/, `missing Rule 07 in ${skillSlug}`);
    assert.match(framePrompt, /neutral or cool by default/, `missing Rule 10 in ${skillSlug}`);
  }
});
