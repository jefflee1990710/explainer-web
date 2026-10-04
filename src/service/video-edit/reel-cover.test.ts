import assert from "node:assert/strict";
import { test } from "node:test";
import { isCoverRunning, parseCoverPrompt, reelCoverInFlight, reelCoverPrompt } from "@/service/video-edit/reel-cover";
import type { Project } from "@/model/project";

function project(partial: Partial<Project> = {}): Project {
  return {
    aspectRatio: "9:16",
    source: "Why sleep matters",
    phaseA: {
      localizedTitle: "Sleep debt",
      englishTitle: "Sleep debt",
      coreMessage: "Missed sleep adds up.",
      hookStrategy: "Open on a drained face.",
      clips: [
        {
          clipNumber: 1,
          timeRange: "0-5",
          durationSeconds: 5,
          narrativeJob: "hook",
          explainerScene: "A tired person stares at a clock.",
          motionCamera: "push in",
          englishVo: "You cannot bank sleep.",
        },
      ],
    },
    ...partial,
  } as Project;
}

test("reelCoverPrompt uses the storyboard and aspect ratio", () => {
  const prompt = reelCoverPrompt(project());
  assert.match(prompt, /9:16/);
  assert.match(prompt, /Sleep debt/);
  assert.match(prompt, /Missed sleep adds up/);
  assert.match(prompt, /You cannot bank sleep/);
  assert.match(prompt, /cover still/i);
  assert.doesNotMatch(prompt, /Extra requirement/);
});

test("reelCoverPrompt appends a trimmed extra requirement", () => {
  const prompt = reelCoverPrompt(project({ coverPrompt: "  big title, no extra faces  " }));
  assert.match(prompt, /Extra requirement: big title, no extra faces/);
});

test("parseCoverPrompt trims and rejects a long extra requirement", () => {
  assert.deepEqual(parseCoverPrompt("  keep the title  "), { ok: true, prompt: "keep the title" });
  assert.equal(parseCoverPrompt("x".repeat(501)).ok, false);
});

test("reelCoverInFlight is true only while generating and younger than 15 minutes", () => {
  const now = new Date("2026-10-04T02:00:00Z");
  assert.equal(
    reelCoverInFlight({ coverStatus: "generating", coverStartedAt: new Date("2026-10-04T01:50:00Z") }, now),
    true,
  );
  assert.equal(
    reelCoverInFlight({ coverStatus: "generating", coverStartedAt: new Date("2026-10-04T01:40:00Z") }, now),
    false,
  );
  assert.equal(reelCoverInFlight({ coverStatus: "idle" }, now), false);
});

test("isCoverRunning is true only while the cover job is generating", () => {
  assert.equal(isCoverRunning({ coverStatus: "generating" }), true);
  assert.equal(isCoverRunning({ coverStatus: "idle" }), false);
  assert.equal(isCoverRunning({}), false);
});
