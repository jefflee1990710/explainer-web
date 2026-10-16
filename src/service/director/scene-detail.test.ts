import assert from "node:assert/strict";
import test from "node:test";
import {
  FRAME_RENDER_DETAIL,
  PHASE_B_DETAIL_RULES,
  reconcileSightline,
  SIGHTLINE_RULE,
  sceneDetailDirectorBlock,
} from "@/service/director/scene-detail";

test("Phase A scene detail asks for four parts and a timed motion beat", () => {
  const block = sceneDetailDirectorBlock();
  assert.match(block, /expression, pose, action, and eyeline/);
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
  assert.match(PHASE_B_DETAIL_RULES, /camera start and end/);
  assert.match(PHASE_B_DETAIL_RULES, /lighting stays constant/);
  assert.match(PHASE_B_DETAIL_RULES, /grazing directional light/);
  assert.match(PHASE_B_DETAIL_RULES, /negative fill/);
});

test("scene detail and frame render detail enforce grazing directional light and anti-plastic rules", () => {
  const block = sceneDetailDirectorBlock();
  assert.match(block, /grazing directional key light/);
  assert.match(block, /negative fill on the shadow side/);
  assert.match(block, /visible warm practical lamp/);
  assert.match(block, /soft highlight roll-off/);
  assert.match(FRAME_RENDER_DETAIL, /grazing directional light/);
  assert.match(FRAME_RENDER_DETAIL, /never flat front beauty lighting or waxy airbrushed skin/);
});
