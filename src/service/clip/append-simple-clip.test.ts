import test from "node:test";
import assert from "node:assert/strict";
import { buildSimpleClipDraftRow } from "./append-simple-clip";

test("buildSimpleClipDraftRow creates a valid StoryboardRow with simple video prompt", () => {
  const row = buildSimpleClipDraftRow({
    prompt: "A drone shot flying through neon cyberpunk skyscrapers",
    durationSeconds: 6,
    clipNumber: 2,
  });
  assert.equal(row.clipNumber, 2);
  assert.equal(row.durationSeconds, 6);
  assert.match(row.explainerScene, /neon cyberpunk/);
  assert.equal(row.englishVo, "(no dialogue)");
});

test("buildSimpleClipDraftRow clamps duration between 5 and 12 seconds", () => {
  const rowShort = buildSimpleClipDraftRow({
    prompt: "Short clip",
    durationSeconds: 2,
    clipNumber: 1,
  });
  assert.equal(rowShort.durationSeconds, 5);

  const rowLong = buildSimpleClipDraftRow({
    prompt: "Long clip",
    durationSeconds: 20,
    clipNumber: 1,
  });
  assert.equal(rowLong.durationSeconds, 12);
});
