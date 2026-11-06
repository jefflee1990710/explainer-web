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
import { frameSubmitPlan, framesWithClip } from "@/service/higgsfield/frame-prompts";
import { clipVideoCost } from "@/service/production-plan";
import { installTestStyles, uninstallTestStyles } from "@/service/style/test-styles";
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

  it("ignores LLM-invented styleId values like cinematic-realistic and keeps the project styleId", () => {
    const row1 = makeRow(1, { styleId: "cinematic-realistic" });
    const project = makeProject([row1]);
    const resolved = resolveClipProject(project, 1);
    assert.equal(resolved.styleId, "realistic");
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

  it("preserves the original base project across nested resolveClipProject calls when clip 1 has no overrides", () => {
    const row2 = attachClipOverrides(makeRow(2), {
      skillSlug: "cartoon-explainer-video-director",
      styleId: "doodle",
    });
    const project = makeProject([makeRow(1), row2]);
    const clip2Proj = resolveClipProject(project, 2);
    assert.equal(resolveClipProject(clip2Proj, 1), project);
    assert.equal(clipsShareContinuity(clip2Proj, 1, 2), false);
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

  it("isolates frameSubmitPlan anchors across director changes and builds per-clip frames in framesWithClip", () => {
    installTestStyles();
    try {
      const row1 = makeRow(1, { motionCamera: "Static locked shot" });
      const row2 = attachClipOverrides(makeRow(2, { motionCamera: "Static locked shot" }), {
        skillSlug: "cartoon-explainer-video-director",
        styleId: "doodle",
      });
      const row3 = attachClipOverrides(makeRow(3, { motionCamera: "Static locked shot" }), {
        skillSlug: "talking-head-director",
        styleId: "pixel",
      });
      const project: Project = {
        ...makeProject([row1, row2, row3]),
        frames: [
          {
            clipNumber: 1,
            position: "start",
            status: "completed",
            prompt: "c1 start",
            outputUrl: "https://example.com/c1-start.png",
          },
          {
            clipNumber: 1,
            position: "end",
            status: "completed",
            prompt: "c1 end",
            outputUrl: "https://example.com/c1-end.png",
          },
          {
            clipNumber: 2,
            position: "start",
            status: "completed",
            prompt: "c2 start",
            outputUrl: "https://example.com/c2-start.png",
          },
        ],
      };

      // Clip 2 switches from talking-head/realistic to cartoon-explainer/doodle:
      // must NOT anchor to Clip 1's end frame.
      const plan2 = frameSubmitPlan(project, 2, "start");
      assert.equal(plan2.anchor, undefined);

      // Clip 3 uses talking-head/pixel while Clip 1 is talking-head/realistic:
      // must NOT anchor to Clip 1's start frame because styleId differs.
      const plan3 = frameSubmitPlan(project, 3, "start");
      assert.equal(plan3.anchor, undefined);

      // framesWithClip for Clip 2 (cartoon-explainer) only queues a start frame.
      const rebuiltFrames = framesWithClip(project, 2);
      const clip2Frames = rebuiltFrames.filter((f) => f.clipNumber === 2);
      assert.deepEqual(
        clip2Frames.map((f) => f.position),
        ["start"],
      );
    } finally {
      uninstallTestStyles();
    }
  });
});

