import assert from "node:assert/strict";
import test from "node:test";
import {
  FRAME_RENDER_DETAIL,
  PHASE_B_DETAIL_RULES,
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

test("Phase A scene detail never re-describes the character look", () => {
  assert.match(sceneDetailDirectorBlock(), /Never describe a character's appearance, hair, or outfit/);
  assert.match(FRAME_RENDER_DETAIL, /never copy a scene reference's person, face, or hairstyle/);
});

test("Phase B detail asks for timed action, expression change, and camera start/end", () => {
  assert.match(PHASE_B_DETAIL_RULES, /timed beats/);
  assert.match(PHASE_B_DETAIL_RULES, /expression change/);
  assert.match(PHASE_B_DETAIL_RULES, /camera start and end/);
  assert.match(PHASE_B_DETAIL_RULES, /lighting stays constant/);
});
