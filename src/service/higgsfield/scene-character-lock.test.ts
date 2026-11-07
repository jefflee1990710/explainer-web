import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  resolveBoardLockUrlFromVersion,
  sceneLockPlan,
  syncProjectCastFromCharacters,
} from "@/service/higgsfield/scene-character-lock";
import { rootBoardImages } from "@/service/character/generate";
import { completionDefaults } from "@/service/character/sync";
import type { Character, CharacterVersion } from "@/model/character";

test("a standing profile is the one character lock", () => {
  assert.deepEqual(
    sceneLockPlan({
      profileUrl: "https://blob/standing.png",
      blueprintWidth: 1344,
      blueprintHeight: 752,
    }),
    { kind: "profile", url: "https://blob/standing.png" },
  );
});

test("a wide sheet without a profile uses the front figure only", () => {
  assert.deepEqual(sceneLockPlan({ blueprintWidth: 1344, blueprintHeight: 752 }), { kind: "front" });
});

test("an already-single portrait stays as the blueprint", () => {
  assert.deepEqual(sceneLockPlan({ blueprintWidth: 720, blueprintHeight: 1280 }), { kind: "blueprint" });
});

test("resolveBoardLockUrlFromVersion prefers completed DB version blueprintUrl over stale cast snapshot", () => {
  const ver: CharacterVersion = {
    id: new ObjectId(),
    styleId: "doodle",
    prompt: "test",
    blueprintKind: "board",
    portraitUrl: "https://blob/doodle-portrait.png",
    profileUrl: "https://blob/doodle-standing.png",
    blueprintUrl: "https://blob/doodle-board.png",
    status: "completed",
    creditsCharged: false,
    createdAt: new Date(),
  };
  assert.equal(
    resolveBoardLockUrlFromVersion("https://blob/realistic-board.png", ver, { preferPortrait: false }),
    "https://blob/doodle-board.png",
  );
  assert.equal(
    resolveBoardLockUrlFromVersion("https://blob/realistic-board.png", ver, { preferPortrait: true }),
    "https://blob/doodle-portrait.png",
  );
});

test("rootBoardImages anchors edits and style conversions to baseVersionId portrait and full-body", () => {
  const v1Id = new ObjectId();
  const baseId = new ObjectId();
  const editId = new ObjectId();
  const autoStyleId = new ObjectId();
  const character = {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "u1",
    name: "Aria",
    styleId: "realistic",
    baseVersionId: baseId,
    versions: [
      {
        id: v1Id,
        styleId: "realistic",
        prompt: "v1",
        blueprintKind: "board" as const,
        portraitUrl: "https://blob/v1-portrait.png",
        profileUrl: "https://blob/v1-standing.png",
        blueprintUrl: "https://blob/v1-board.png",
        status: "completed" as const,
        creditsCharged: true,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: baseId,
        styleId: "realistic",
        prompt: "v2 new base",
        blueprintKind: "board" as const,
        portraitUrl: "https://blob/base-portrait.png",
        profileUrl: "https://blob/base-standing.png",
        blueprintUrl: "https://blob/base-board.png",
        status: "completed" as const,
        creditsCharged: true,
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
      {
        id: editId,
        styleId: "realistic",
        parentVersionId: baseId,
        prompt: "edit",
        editInstruction: "Top: black jacket",
        blueprintKind: "board" as const,
        status: "queued" as const,
        creditsCharged: true,
        createdAt: new Date("2026-01-03T00:00:00Z"),
      },
      {
        id: autoStyleId,
        styleId: "doodle",
        sourceRealisticVersionId: baseId,
        prompt: "v2 new base",
        blueprintKind: "board" as const,
        status: "queued" as const,
        creditsCharged: false,
        createdAt: new Date("2026-01-04T00:00:00Z"),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies Character;

  assert.deepEqual(rootBoardImages(character, character.versions[2]!), [
    "https://blob/base-portrait.png",
    "https://blob/base-standing.png",
  ]);
  assert.deepEqual(rootBoardImages(character, character.versions[3]!), [
    "https://blob/base-portrait.png",
    "https://blob/base-standing.png",
  ]);
});

test("completionDefaults skips isBaseCandidate versions and sets baseVersionId on initial realistic v1", () => {
  const v1Id = new ObjectId();
  const candidateId = new ObjectId();
  const char = {
    _id: new ObjectId(),
    userId: new ObjectId(),
    clerkUserId: "u1",
    name: "Aria",
    styleId: "realistic",
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies Character;

  const v1Defaults = completionDefaults(char, { id: v1Id, styleId: "realistic" } as CharacterVersion, "realistic");
  assert.equal(v1Defaults.defaultVersionId, v1Id);
  assert.equal(v1Defaults.baseVersionId, v1Id);

  const candidateDefaults = completionDefaults(
    { ...char, baseVersionId: v1Id, defaultVersionId: v1Id },
    { id: candidateId, styleId: "realistic", isBaseCandidate: true } as CharacterVersion,
    "realistic",
  );
  assert.deepEqual(candidateDefaults, {});
});

test("syncProjectCastFromCharacters detects in-flight top-level and per-clip cast versions and updates completed blueprintUrls", () => {
  const charId = new ObjectId();
  const vQueuedId = new ObjectId();
  const vDoneId = new ObjectId();
  const charDoc: Character = {
    _id: charId,
    userId: new ObjectId(),
    clerkUserId: "u1",
    name: "Aria",
    styleId: "realistic",
    versions: [
      {
        id: vQueuedId,
        styleId: "doodle",
        prompt: "p",
        blueprintKind: "board",
        status: "in_progress",
        creditsCharged: false,
        createdAt: new Date(),
      },
      {
        id: vDoneId,
        styleId: "pixel",
        prompt: "p",
        blueprintKind: "board",
        blueprintUrl: "https://blob/pixel-done-board.png",
        status: "completed",
        creditsCharged: false,
        createdAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Top-level cast still in_progress -> pending = true
  const res1 = syncProjectCastFromCharacters(
    {
      cast: [
        {
          characterId: charId,
          versionId: vQueuedId,
          name: "Aria",
          blueprintUrl: "https://blob/realistic-board.png",
          prompt: "p",
        },
      ],
    },
    [charDoc],
  );
  assert.equal(res1.pending, true);

  // Per-clip cast in_progress -> pending = true, and completed version updates blueprintUrl
  const res2 = syncProjectCastFromCharacters(
    {
      cast: [
        {
          characterId: charId,
          versionId: vDoneId,
          name: "Aria",
          blueprintUrl: "https://blob/realistic-board.png",
          prompt: "p",
        },
      ],
      phaseA: {
        clips: [
          {
            clipNumber: 1,
            cast: [
              {
                characterId: charId,
                versionId: vQueuedId,
                name: "Aria",
                blueprintUrl: "https://blob/realistic-board.png",
                prompt: "p",
              },
            ],
          },
        ],
      },
    },
    [charDoc],
  );
  assert.equal(res2.pending, true);
  assert.equal(res2.changed, true);
  assert.equal(res2.updatedCast?.[0]?.blueprintUrl, "https://blob/pixel-done-board.png");
});


