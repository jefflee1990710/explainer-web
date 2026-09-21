import assert from "node:assert/strict";
import { test } from "node:test";
import { lockWanVideoPrompt, WAN_FIRST_LAST_FRAME_LOCK } from "./wan-video-prompt";

test("lockWanVideoPrompt forces first/last frames and forbids reference mode", () => {
  const locked = lockWanVideoPrompt(
    "Keep the character locked to the visual guideline reference image.",
  );
  assert.match(locked, /FIRST FRAME/);
  assert.match(locked, /LAST FRAME/);
  assert.match(locked, /Do not treat them as .*reference/i);
  assert.match(locked, /visual guideline reference image/);
  assert.ok(locked.startsWith(WAN_FIRST_LAST_FRAME_LOCK));
});

test("lockWanVideoPrompt does not stack the lock prefix", () => {
  const once = lockWanVideoPrompt("walk to the box");
  assert.equal(lockWanVideoPrompt(once), once);
});
