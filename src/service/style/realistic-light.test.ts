import assert from "node:assert/strict";
import test from "node:test";
import {
  isRealisticStyle,
  lockRealisticVideoLight,
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
