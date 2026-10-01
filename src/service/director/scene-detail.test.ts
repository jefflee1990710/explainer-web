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
  assert.match(block, /motionCamera as a timed beat list/);
});

test("Phase A scene detail never re-describes the character look", () => {
  assert.match(sceneDetailDirectorBlock(), /Never describe a character's appearance, hair, or outfit/);
  assert.match(FRAME_RENDER_DETAIL, /never restyle the character's look or outfit/);
});

test("Phase B detail asks for timed action, expression change, and camera start/end", () => {
  assert.match(PHASE_B_DETAIL_RULES, /timed beats/);
  assert.match(PHASE_B_DETAIL_RULES, /expression change/);
  assert.match(PHASE_B_DETAIL_RULES, /camera start and end/);
  assert.match(PHASE_B_DETAIL_RULES, /lighting stays constant/);
});
