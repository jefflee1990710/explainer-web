import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import {
  attachClipOverrides,
  clipsShareContinuity,
  resolveClipProject,
} from "@/service/clip/clip-context";
import { clipStateFor, clipFrameCost } from "@/service/clip-stage";
import { FRAME_COST, FRAMES_COST } from "@/service/credit-costs";
import { clipEndIsNextStart, clipDrawsNoEndStill } from "@/service/director/steady-stills";
import { clipVideoCost } from "@/service/production-plan";
import { toPublicVideo } from "@/presentation/serialize";
import type { Project, StoryboardRow } from "@/model/project";

function makeRow(clipNumber: number, overrides: Partial<StoryboardRow> = {}): StoryboardRow {
  return {
    clipNumber,
    timeRange: "0–5s",
    durationSeconds: 5,
    narrativeJob: "Hook",
    explainerScene: "A scene",
    motionCamera: "Static",
    englishVo: "Hello world",
    bgmSfx: "pop",
    ...overrides,
  };
}

function makeProject(clips: StoryboardRow[]): Project {
  return {
    _id: new ObjectId("65f000000000000000000001"),
    userId: new ObjectId("65f000000000000000000002"),
    clerkUserId: "user_1",
    skillId: new ObjectId("65f000000000000000000003"),
    skillSlug: "talking-head-director",
    styleId: "realistic",
    source: "Original brief",
    aspectRatio: "9:16",
    durationPreset: "auto",
    language: "yue",
    narrationEnabled: true,
    voiceGender: "male",
    speechPace: "medium",
    sceneTextEnabled: true,
    sceneTextLanguage: "zh-Hant",
    cast: [
      {
        characterId: new ObjectId("65f000000000000000000010"),
        versionId: new ObjectId("65f000000000000000000011"),
        name: "Alex",
        blueprintUrl: "https://example.com/alex.png",
        blueprintKind: "board",
        prompt: "Alex in suit",
      },
    ],
    status: "production",
    phaseA: {
      englishTitle: "Title",
      localizedTitle: "標題",
      targetDuration: "10s",
      clipCount: clips.length,
      loopMode: "linear",
      coreMessage: "Core",
      hookStrategy: "Hook",
      aspectRatio: "9:16",
      visualWorld: "Office",
      narrator: "Host",
      englishWordCount: 10,
      characterLock: "Alex lock",
      palette: "warm",
      bgmDirection: "upbeat",
      narrativeArc: "A -> B",
      clips,
    },
    clips: [],
    creditsCharged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("resolveClipProject", () => {
  it("returns the original project when the clip has no director overrides", () => {
    const project = makeProject([makeRow(1)]);
    const resolved = resolveClipProject(project, 1);
    assert.equal(resolved, project);
    assert.equal(resolved.skillSlug, "talking-head-director");
    assert.equal(resolved.styleId, "realistic");
  });

  it("overrides director, style, cast, language, voice, and characterLock when present on the clip", () => {
    const newSkillId = new ObjectId("65f000000000000000000099");
    const newCast = [
      {
        characterId: new ObjectId("65f000000000000000000020"),
        versionId: new ObjectId("65f000000000000000000021"),
        name: "Bella",
        blueprintUrl: "https://example.com/bella.png",
        blueprintKind: "board" as const,
        prompt: "Bella doodle",
      },
    ];
    const row2 = attachClipOverrides(makeRow(2), {
      skillId: newSkillId,
      skillSlug: "cartoon-explainer-video-director",
      styleId: "doodle",
      cast: newCast,
      language: "en",
      voiceGender: "female",
      speechPace: "fast",
      sceneTextEnabled: false,
      sceneTextLanguage: "none",
    });
    const project = makeProject([makeRow(1), row2]);

    const resolved1 = resolveClipProject(project, 1);
    assert.equal(resolved1.skillSlug, "talking-head-director");
    assert.equal(resolved1.styleId, "realistic");

    const resolved2 = resolveClipProject(project, 2);
    assert.equal(resolved2.skillId.toHexString(), newSkillId.toHexString());
    assert.equal(resolved2.skillSlug, "cartoon-explainer-video-director");
    assert.equal(resolved2.styleId, "doodle");
    assert.equal(resolved2.language, "en");
    assert.equal(resolved2.voiceGender, "female");
    assert.equal(resolved2.speechPace, "fast");
    assert.equal(resolved2.sceneTextEnabled, false);
    assert.equal(resolved2.sceneTextLanguage, "none");
    assert.equal(resolved2.cast?.[0]?.name, "Bella");
    assert.match(resolved2.phaseA?.characterLock ?? "", /Bella/);
  });
});

describe("clipsShareContinuity", () => {
  it("returns true when two clips share effective skillSlug and styleId", () => {
    const project = makeProject([makeRow(1), makeRow(2)]);
    assert.equal(clipsShareContinuity(project, 1, 2), true);
  });

  it("returns false when adjacent clips use different skillSlug or styleId", () => {
    const row2 = attachClipOverrides(makeRow(2), {
      skillSlug: "cartoon-explainer-video-director",
      styleId: "doodle",
    });
    const project = makeProject([makeRow(1), row2]);
    assert.equal(clipsShareContinuity(project, 1, 2), false);
  });

  it("serializes ObjectId instances inside phaseA.clips overrides via toPublicVideo", () => {
    const row2 = attachClipOverrides(makeRow(2), {
      skillId: new ObjectId("65f000000000000000000099"),
      cast: [
        {
          characterId: new ObjectId("65f000000000000000000020"),
          versionId: new ObjectId("65f000000000000000000021"),
          presetId: new ObjectId("65f000000000000000000022"),
          name: "Bella",
          blueprintUrl: "https://example.com/bella.png",
          prompt: "Bella doodle",
        },
      ],
      products: [
        {
          productId: new ObjectId("65f000000000000000000030"),
          name: "Mug",
          blueprintUrl: "https://example.com/mug.png",
        },
      ],
    });
    const pub = toPublicVideo(makeProject([makeRow(1), row2]));
    const pubClip2 = pub.phaseA?.clips[1];
    assert.equal(typeof pubClip2?.skillId, "string");
    assert.equal(pubClip2?.skillId, "65f000000000000000000099");
    assert.equal(typeof pubClip2?.cast?.[0]?.characterId, "string");
    assert.equal(typeof pubClip2?.cast?.[0]?.versionId, "string");
    assert.equal(typeof pubClip2?.cast?.[0]?.presetId, "string");
    assert.equal(typeof pubClip2?.products?.[0]?.productId, "string");
  });
});

describe("per-clip stage and steady-stills resolution", () => {
  it("computes frameCost and clipDrawsNoEndStill per clip when a talking-head video appends a start-only explainer clip", () => {
    const row1 = makeRow(1);
    const row2 = attachClipOverrides(makeRow(2), {
      skillSlug: "cartoon-explainer-video-director",
      styleId: "doodle",
    });
    const project = makeProject([row1, row2]);

    // Clip 1 (talking-head) followed by Clip 2 (cartoon-explainer) does not share continuity,
    // so Clip 1 cannot use Clip 2's start frame as its end frame and must draw both stills.
    assert.equal(clipEndIsNextStart(project, 1), false);
    assert.equal(clipDrawsNoEndStill(project, 1), false);
    assert.equal(clipFrameCost(project, 1), FRAMES_COST);
    // Clip 2 is cartoon-explainer (start-only), so it draws no end still (1 frame = FRAME_COST).
    assert.equal(clipDrawsNoEndStill(project, 2), true);
    assert.equal(clipFrameCost(project, 2), FRAME_COST);

    const state2 = clipStateFor(project, 2);
    assert.equal(state2.frameCost, FRAME_COST);
    assert.equal(clipVideoCost(project, 1), 20);
    assert.equal(clipVideoCost(project, 2), 50);
    assert.equal(state2.videoCost, 50);
  });
});

