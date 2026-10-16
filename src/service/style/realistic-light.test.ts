import assert from "node:assert/strict";
import test from "node:test";
import {
  isRealisticStyle,
  lockRealisticVideoLight,
  REALISTIC_FRAME_RENDER_RULE,
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_STYLE_FIELDS,
  REALISTIC_VIDEO_LIGHT_LOCK,
} from "@/service/style/realistic-light";

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

test("realistic style fields and rules describe camera capture, film stock, and optical flaws without quality buzzwords", () => {
  assert.match(REALISTIC_STYLE_FIELDS.look, /Kodak Gold 200/);
  assert.match(REALISTIC_STYLE_FIELDS.look, /Ricoh GR III|Canon AE-1/);
  assert.match(REALISTIC_STYLE_FIELDS.look, /chromatic aberration/);
  assert.match(REALISTIC_STYLE_FIELDS.negatives, /8K, ultra-realistic, hyperrealistic, masterpiece/);
  assert.match(REALISTIC_LIGHT_DIRECTOR_RULE, /Kodak Gold 200/);
  assert.match(REALISTIC_FRAME_RENDER_RULE, /chromatic aberration/);
});
