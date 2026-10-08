import assert from "node:assert/strict";
import test from "node:test";
import { clipsWithUnsentFlag } from "@/service/clip/cancel-pending-video";
import type { ProjectClip } from "@/model/project";

function clip(status: ProjectClip["status"], clipNumber = 1): ProjectClip {
  return { clipNumber, durationSeconds: 5, prompt: "", status };
}

test("only a queued clip with a pending job can be cancelled", () => {
  const next = clipsWithUnsentFlag(
    [clip("queued", 1), clip("queued", 2), clip("in_progress", 3)],
    new Set([0]),
  );
  assert.equal(next[0].unsent, true);
  assert.equal(next[1].unsent, false);
  assert.equal(next[2].unsent, undefined);
});
