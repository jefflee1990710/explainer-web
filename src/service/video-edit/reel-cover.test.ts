import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCoverSafeAreas } from "@/service/video-edit/cover-safe-area";
import {
  COVER_SUBMISSION_BUDGET,
  coverReferenceNote,
  isCoverRunning,
  joinCoverSubmission,
  parseCoverPrompt,
  reelCoverInFlight,
  reelCoverPrompt,
} from "@/service/video-edit/reel-cover";
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
  assert.doesNotMatch(prompt, /Sleep debt/);
  assert.match(prompt, /Do not write a title/);
  assert.match(prompt, /On-screen text, exactly once: "You cannot bank sleep."/);
  assert.doesNotMatch(prompt, /Missed sleep adds up/);
  assert.match(prompt, /cover still/i);
  assert.doesNotMatch(prompt, /Extra requirement/);
});

test("reelCoverPrompt appends a trimmed extra requirement", () => {
  const prompt = reelCoverPrompt(project({ coverPrompt: "  big title, no extra faces  " }));
  assert.match(prompt, /Extra requirement: big title, no extra faces/);
});

test("reelCoverPrompt keeps a full-screen Instagram cover and centers the character and title", () => {
  const prompt = reelCoverPrompt(project({ coverSafeAreas: ["ig-reel"] }));
  assert.match(prompt, /Full-screen cover/);
  assert.match(prompt, /edge to edge/);
  assert.match(prompt, /Place the character and the on-screen text inside the safe rectangle/);
  assert.match(prompt, /top bar/);
  assert.match(prompt, /bottom caption/);
  assert.match(prompt, /14%/);
  assert.match(prompt, /25%/);
  assert.match(prompt, /No white border/);
  assert.doesNotMatch(prompt, /TikTok covers/);
});

test("reelCoverPrompt uses the strictest rectangle when several safe areas are checked", () => {
  const prompt = reelCoverPrompt(project({ coverSafeAreas: ["youtube-shorts", "ig-reel"] }));
  assert.match(prompt, /Instagram Reels covers/);
  assert.match(prompt, /YouTube Shorts covers/);
  assert.match(prompt, /strictest inner rectangle/);
  assert.match(prompt, /18%/);
  assert.match(prompt, /8%/);
});

test("reelCoverPrompt carries the storyboard character and setting", () => {
  const prompt = reelCoverPrompt(
    project({
      phaseA: {
        ...project().phaseA!,
        visualWorld: "A dim bedroom with a glowing clock.",
        palette: "ink blue and warm lamp yellow",
        characterLock: "One tired everyman in a plain tee.",
      },
    }),
  );
  assert.match(prompt, /Setting: A dim bedroom with a glowing clock/);
  assert.match(prompt, /Palette: ink blue and warm lamp yellow/);
  assert.match(prompt, /Character: One tired everyman in a plain tee/);
});

test("parseCoverSafeAreas keeps known apps in a stable order", () => {
  assert.deepEqual(parseCoverSafeAreas(["youtube-shorts", "ig-reel", "ig-reel"]), {
    ok: true,
    areas: ["ig-reel", "youtube-shorts"],
  });
  assert.deepEqual(parseCoverSafeAreas(undefined), { ok: true, areas: [] });
  assert.equal(parseCoverSafeAreas(["myspace"]).ok, false);
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

test("coverReferenceNote numbers the still, then the character, then the logo", () => {
  const note = coverReferenceNote({ still: 1, character: 1, logo: 1 });
  assert.match(note, /Attached image 1 is a still/);
  assert.match(note, /Do not copy its framing or any words/);
  assert.match(note, /Attached image 2 lock how the character looks/);
  assert.match(note, /Attached image 3 is the brand logo/);
  assert.match(note, /Do not add a title/);
});

test("joinCoverSubmission drops the tail once the provider budget is exceeded", () => {
  const safe = "Full-screen cover. 14% from the top.";
  const tail = `Source: ${"word ".repeat(2000)}`;
  const prompt = joinCoverSubmission([safe, tail]);
  assert.ok(prompt.length <= COVER_SUBMISSION_BUDGET);
  assert.match(prompt, /14% from the top/);
  assert.ok(!prompt.includes("word ".repeat(2000)));
});

test("reelCoverPrompt does not paste the whole source", () => {
  const source = `long source ${"detail ".repeat(400)}`;
  const prompt = reelCoverPrompt(project({ source, coverSafeAreas: ["ig-reel"] }));
  assert.ok(prompt.length < COVER_SUBMISSION_BUDGET);
  assert.equal(prompt.includes(source), false);
  assert.match(prompt, /14%/);
});

test("isCoverRunning is true only while the cover job is generating", () => {
  assert.equal(isCoverRunning({ coverStatus: "generating" }), true);
  assert.equal(isCoverRunning({ coverStatus: "idle" }), false);
  assert.equal(isCoverRunning({}), false);
});
