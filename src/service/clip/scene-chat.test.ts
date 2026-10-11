import assert from "node:assert/strict";
import { test } from "node:test";
import type { StoryboardRow } from "@/model/project";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import {
  applySceneChatEdits,
  applySceneChatToClips,
  clipWithSceneDraft,
  highlightedSceneFields,
  regenStoryboardInput,
  sceneDraftFromClip,
  sceneRedrawFinishedAt,
  sceneRedrawPhase,
} from "@/service/clip/scene-chat";

function row(partial: Partial<StoryboardRow> = {}): StoryboardRow {
  return {
    clipNumber: 1,
    timeRange: "0-4s",
    durationSeconds: 4,
    narrativeJob: "hook",
    explainerScene: "Start: a desk. End: the same desk, closer.",
    motionCamera: "push in",
    englishVo: "Five tools.",
    bgmSfx: "",
    ...partial,
  };
}

test("scene draft reads a labeled single scene as start and end", () => {
  const draft = sceneDraftFromClip(row());
  assert.equal(draft.startScene, "a desk");
  assert.equal(draft.endScene, "the same desk, closer.");
  assert.equal(draft.motionCamera, "push in");
  assert.equal(draft.englishVo, "Five tools.");
});

test("apply keeps untouched fields and rejects a blank start", () => {
  const draft = sceneDraftFromClip(row());
  const changed = applySceneChatEdits(draft, [
    { field: "motionCamera", content: "  crane up  " },
  ]);
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.deepEqual(changed.changed, ["motionCamera"]);
  assert.equal(changed.draft.startScene, draft.startScene);
  assert.equal(changed.draft.motionCamera, "crane up");

  const blank = applySceneChatEdits(draft, [{ field: "startScene", content: "   " }]);
  assert.equal(blank.ok, false);
});

test("a single-scene clip stores Start/End in explainerScene and drops split fields", () => {
  const clip = row({ startScene: "old start", endScene: "old end" });
  const next = clipWithSceneDraft(
    clip,
    { startScene: "overhead paper", endScene: "paper with a giant 5", motionCamera: "drop in", englishVo: "Five tools." },
    "listicle-director",
  );
  assert.equal(next.startScene, undefined);
  assert.equal(next.endScene, undefined);
  assert.equal(next.explainerScene, "Start: overhead paper. End: paper with a giant 5");
  assert.equal(next.motionCamera, "drop in");
  assert.equal(next.englishVo, "Five tools.");
  const regen = regenStoryboardInput(next, "listicle-director");
  assert.equal(regen.startScene, undefined);
  assert.equal(regen.explainerScene, next.explainerScene);
});

test("a dual-beat clip keeps separate start and end stills", () => {
  const clip = row({
    startScene: "holds a ruler",
    endScene: "points at the chart",
    startVo: "First line.",
    endVo: "Second line.",
    englishVo: "First line. Second line.",
  });
  const next = clipWithSceneDraft(
    clip,
    { startScene: "crouches", endScene: "stands up", motionCamera: "jump", englishVo: "First line. Second line." },
    CARTOON_EXPLAINER_SKILL_SLUG,
  );
  assert.equal(next.startScene, "crouches");
  assert.equal(next.endScene, "stands up");
  assert.equal(next.startVo, "First line.");
  assert.equal(next.endVo, "Second line.");
  assert.match(next.explainerScene, /crouches/);
  assert.match(next.explainerScene, /stands up/);
});

test("editing the camera text drops the director's start-still choice", () => {
  const clip = row({ endUsesStartStill: true });
  const voiced = clipWithSceneDraft(
    clip,
    { startScene: "a desk", endScene: "the same desk, closer.", motionCamera: "push in", englishVo: "Six tools." },
    "listicle-director",
  );
  assert.equal(voiced.endUsesStartStill, true);
  const moved = clipWithSceneDraft(
    clip,
    { startScene: "a desk", endScene: "the same desk, closer.", motionCamera: "orbit", englishVo: "Five tools." },
    "listicle-director",
  );
  assert.equal(moved.endUsesStartStill, undefined);
});

test("a spoken-line edit is saved onto the clip", () => {
  const draft = sceneDraftFromClip(row({ englishVo: "一個 Webinar" }));
  const changed = applySceneChatEdits(draft, [{ field: "englishVo", content: "一個線上研討會" }]);
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.deepEqual(changed.changed, ["englishVo"]);
  const next = clipWithSceneDraft(row({ englishVo: "一個 Webinar" }), changed.draft, "talking-head-director");
  assert.equal(next.englishVo, "一個線上研討會");

  const blank = applySceneChatEdits(draft, [{ field: "englishVo", content: "  " }]);
  assert.equal(blank.ok, false);
});

test("current scope ignores other clips; all scope rewrites each one", () => {
  const clips = [
    row({ clipNumber: 1, englishVo: "一個 Webinar" }),
    row({ clipNumber: 2, englishVo: "下一個 Webinar" }),
  ];
  const edits = [
    { clipNumber: 1, field: "englishVo" as const, content: "一個線上研討會" },
    { clipNumber: 2, field: "englishVo" as const, content: "下一個線上研討會" },
  ];
  const current = applySceneChatToClips({ clips, currentClip: 1, scope: "current", edits });
  assert.equal(current.ok, true);
  if (!current.ok) return;
  assert.deepEqual(current.changed, [{ clipNumber: 1, fields: ["englishVo"] }]);
  assert.equal(current.clips[1].englishVo, "下一個 Webinar");

  const all = applySceneChatToClips({ clips, currentClip: 1, scope: "all", edits });
  assert.equal(all.ok, true);
  if (!all.ok) return;
  assert.equal(all.clips[0].englishVo, "一個線上研討會");
  assert.equal(all.clips[1].englishVo, "下一個線上研討會");
});

test("highlight follows the newest assistant turn only", () => {
  const chats = [
    {
      clipNumber: 1,
      messages: [
        {
          role: "assistant" as const,
          createdAt: new Date("2026-10-10T01:00:00Z"),
          changedClips: [{ clipNumber: 1, fields: ["englishVo" as const] }],
        },
        {
          role: "assistant" as const,
          createdAt: new Date("2026-10-10T02:00:00Z"),
          changedClips: [
            { clipNumber: 1, fields: ["motionCamera" as const] },
            { clipNumber: 2, fields: ["englishVo" as const] },
          ],
        },
      ],
    },
  ];
  assert.deepEqual(highlightedSceneFields(chats, 1), ["motionCamera"]);
  assert.deepEqual(highlightedSceneFields(chats, 2), ["englishVo"]);
  assert.deepEqual(highlightedSceneFields(chats, 3), []);
});

test("a scene redraw is done when the fresh stills finish, even if the video failed", () => {
  const messageAt = "2026-10-10T02:00:00.000Z";
  const older = {
    messageAt,
    frames: [{ status: "completed", submittedAt: "2026-10-10T01:00:00.000Z" }],
  };
  assert.equal(sceneRedrawPhase(older), "ready");
  assert.equal(sceneRedrawFinishedAt(older), undefined);
  assert.equal(
    sceneRedrawPhase({
      messageAt,
      frames: [{ status: "in_progress", submittedAt: "2026-10-10T02:01:00.000Z" }],
    }),
    "running",
  );
  const finished = {
    messageAt,
    frames: [
      { status: "completed", submittedAt: "2026-10-10T02:01:00.000Z" },
      { status: "completed", submittedAt: "2026-10-10T02:02:00.000Z" },
    ],
  };
  assert.equal(sceneRedrawPhase(finished), "done");
  assert.equal(sceneRedrawFinishedAt(finished), "2026-10-10T02:02:00.000Z");
  assert.equal(
    sceneRedrawPhase({
      messageAt,
      frames: [{ status: "failed", submittedAt: "2026-10-10T02:01:00.000Z" }],
    }),
    "failed",
  );
});
