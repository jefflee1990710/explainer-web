import assert from "node:assert/strict";
import test from "node:test";
import {
  FRAME_RENDER_DETAIL,
  frameRenderDetail,
  PHASE_B_DETAIL_RULES,
  phaseBDetailRules,
  reconcileSightline,
  SIGHTLINE_RULE,
  sceneDetailDirectorBlock,
} from "@/service/director/scene-detail";

test("Phase A scene detail asks for four parts and a timed motion beat", () => {
  const block = sceneDetailDirectorBlock();
  assert.match(block, /expression, pose, action, and eyeline/);
  assert.match(block, /vivid, specific facial expression/);
  assert.match(block, /location, set dressing, props, foreground \/ midground \/ background/);
  assert.match(block, /light direction, colour temperature, mood/);
  assert.match(block, /shot size, camera angle, composition/);
  assert.match(block, /written as timed beats across the clip/);
});

test("Phase A motionCamera is a transition script that covers every start → end difference", () => {
  const block = sceneDetailDirectorBlock();
  assert.match(block, /motionCamera is the transition script from the start still to the end still/);
  assert.match(block, /Every difference between the start and end still/);
  assert.match(block, /in the end still but not in the start still/);
  assert.match(block, /in the start still but not in the end still/);
  assert.match(block, /character's own left or right/);
  assert.match(block, /same light and the same place/);
  assert.match(block, /after motionCamera has finished/);
  assert.match(block, /every object motionCamera touches already exists in the start still/);
});

test("Phase A scene detail only shows what the camera can see", () => {
  assert.match(sceneDetailDirectorBlock(), /Sightline: show only what this camera can see/);
  assert.match(SIGHTLINE_RULE, /Never turn a person or a prop around/);
  assert.equal(sceneDetailDirectorBlock().includes(SIGHTLINE_RULE), true);
});

test("a scene that asks to see both sides of something keeps the content on the side facing its user", () => {
  const screen = reconcileSightline(
    "over-the-shoulder shot from behind, showing her back and the glowing computer screen in front of her, clearly visible.",
  );
  assert.match(screen, /Do not turn anyone or anything around/);
  assert.doesNotMatch(screen, /glowing|clearly visible|in front of her/);

  const page = reconcileSightline("camera on the back of the book, the page text clearly readable.");
  assert.match(page, /stays on the side that faces its user/);

  const sign = reconcileSightline("rear view of the sign, the words displaying toward the lens.");
  assert.match(sign, /Draw only the side this camera already sees/);

  const front = "slightly low angle, the monitor displaying the dashboard.";
  assert.equal(reconcileSightline(front), front);
  assert.equal(reconcileSightline("showing the character from behind."), "showing the character from behind.");
});

test("Phase A scene detail never re-describes the character look", () => {
  assert.match(sceneDetailDirectorBlock(), /Never describe a character's appearance, hair, or outfit/);
  assert.match(FRAME_RENDER_DETAIL, /never copy a scene reference's person, face, or hairstyle/);
});

test("Phase B detail asks for timed action, expression change, and camera start/end", () => {
  assert.match(PHASE_B_DETAIL_RULES, /timed beats/);
  assert.match(PHASE_B_DETAIL_RULES, /expression change/);
  assert.match(PHASE_B_DETAIL_RULES, /animate rich, expressive facial changes across the beats/);
  assert.match(PHASE_B_DETAIL_RULES, /camera start and end/);
  assert.match(PHASE_B_DETAIL_RULES, /lighting stays constant/);
});

test("de-plastic light and camera optics rules reach realistic only, never flat styles", () => {
  for (const text of [sceneDetailDirectorBlock(), FRAME_RENDER_DETAIL, PHASE_B_DETAIL_RULES]) {
    assert.doesNotMatch(text, /grazing|negative fill|film grain|Realistic light|85mm portrait lens|creamy bokeh/);
  }
  const block = sceneDetailDirectorBlock({ realistic: true });
  assert.match(block, /soft diffused ambient room light or gentle window daylight/);
  assert.match(block, /low, gradual tonal transition across the face/);
  assert.match(block, /zero skin reflectivity/);
  assert.match(block, /soft neutral daylight with gently cooler shadows/);
  assert.match(block, /never vague phrases like beautiful colors/);
  assert.match(block, /warm practical lamp, sunset, or fire is visible/);
  assert.match(block, /24mm wide-angle lens \/ 35mm lens \/ 50mm lens \/ 85mm portrait lens/);
  assert.match(block, /deep focus, f\/11/);
  assert.match(block, /f\/1\.4, creamy bokeh background/);
  assert.match(block, /no film grain/);
  assert.doesNotMatch(block, /Portra-style|film feel|subtle film grain/);
  assert.match(block, /full shot \/ medium shot \/ close-up \/ extreme close-up/);
  const render = frameRenderDetail({ realistic: true });
  assert.match(render, /never waxy airbrushed skin, reflective skin hot spots, oily specular sheen, or vague 'beautiful colors'/);
  assert.match(render, /24mm \/ 35mm \/ 50mm \/ 85mm portrait lens/);
  assert.match(render, /deep focus f\/11 for environment or f\/4 to f\/1\.4 creamy bokeh background/);
  assert.match(render, /no film grain/);
  assert.doesNotMatch(render, /Portra-style|film feel|subtle film grain/);
  assert.match(phaseBDetailRules({ realistic: true }), /No flat beauty-filter fill and no waxy or reflective plastic skin/);
  assert.equal(frameRenderDetail(), FRAME_RENDER_DETAIL);
  assert.equal(phaseBDetailRules(), PHASE_B_DETAIL_RULES);
});
