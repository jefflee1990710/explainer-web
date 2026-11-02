# OpenCut Editor: Add Clip & Add New Video via Director Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users in the OpenCut editor to open a full Director creation dialog for both "Add clip" (single clip inserted after a chosen clip) and "Add new video" (multi-clip full Phase A storyboard appended to the end), with per-clip director/style/cast/voice overrides.

**Architecture:** We extend `StoryboardRow` and `ClipAppend` with `ClipDirectorOverrides`, introduce a pure `resolveClipProject(project, clipNumber)` helper so frame/video generation and pricing respect per-clip overrides while falling back to the project defaults, upgrade `appendDirectorClipAction` / `writeQueuedClip` to support both single-clip (`draftAppendedClips`) and full-video (`runPhaseA`) modes, and build a reusable `AppendDirectorDialog` wired to the OpenCut Assets panel menu.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, React 19, Tailwind CSS, Zod, MongoDB, Node built-in test runner (`node:test` + `tsx`).

**Spec:** `docs/superpowers/specs/2026-11-02-opencut-append-director-video-design.md`

## Global Constraints

- Never call live paid provider APIs (Higgsfield / OpenRouter / Gemini) during unit tests; use pure functions or mock dependencies.
- Keep newly created UI components in separate files with `'use client'` at the top when hooks are used.
- Use Server Actions (`src/presentation/actions/*.ts`) for server calls.
- Aspect ratio in `AppendDirectorDialog` is locked to `project.aspectRatio` so all clips on the OpenCut timeline share the same canvas dimensions.
- Maximum clip count per video remains `APPEND_CLIP_MAX = 20`.

---

### Task 1: Model & Per-Clip Context Resolution (`ClipDirectorOverrides` & `resolveClipProject`)

**Files:**
- Modify: `src/model/project.ts`
- Modify: `src/presentation/serialize.ts`
- Create: `src/service/clip/clip-context.ts`
- Test: `src/service/clip/clip-context.test.ts`

**Interfaces:**
- Produces:
  - `ClipDirectorOverrides` and `ClipAppendMode` in `src/model/project.ts`
  - `resolveClipProject<T extends ClipContextSource>(project: T, clipNumber: number): T` in `src/service/clip/clip-context.ts`
  - `clipsShareContinuity(project: ClipContextSource, prevClipNumber: number, nextClipNumber: number): boolean` in `src/service/clip/clip-context.ts`
  - ` attachClipOverrides(row: StoryboardRow, overrides?: ClipDirectorOverrides): StoryboardRow` in `src/service/clip/clip-context.ts`

- [ ] **Step 1: Write the failing test in `src/service/clip/clip-context.test.ts`**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import {
  attachClipOverrides,
  clipsShareContinuity,
  resolveClipProject,
} from "@/service/clip/clip-context";
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/service/clip/clip-context.test.ts`
Expected: FAIL with `Cannot find module '@/service/clip/clip-context'`

- [ ] **Step 3: Update `src/model/project.ts`, `src/presentation/serialize.ts`, and create `src/service/clip/clip-context.ts`**

In `src/model/project.ts`, add `ClipDirectorOverrides` and `ClipAppendMode` and extend `StoryboardRow`, `ClipAppend`, `storyboardRowSchema`, and `projectSchema`:

```ts
// Per-clip director, style, cast, and voice overrides when a clip or appended video
// is created with settings different from the parent Project.
export type ClipDirectorOverrides = {
  skillId?: ObjectId | string;
  skillSlug?: string;
  styleId?: string;
  cast?: CastMember[];
  products?: ProductShot[];
  language?: VoLanguage;
  narrationEnabled?: boolean;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextChoice;
  directorBackgroundId?: string;
  backgroundImageUrls?: string[];
  talkingHeadBackgroundId?: string;
  talkingHeadPoseId?: string;
  logoUrl?: string;
};

export type ClipAppendMode = "single_clip" | "full_video";
```

Extend `StoryboardRow` in `src/model/project.ts` with `ClipDirectorOverrides` fields (`skillId?: ObjectId | string; skillSlug?: string; cast?: CastMember[]; products?: ProductShot[]; language?: VoLanguage; narrationEnabled?: boolean; voiceGender?: VoiceGender; speechPace?: SpeechPace; sceneTextEnabled?: boolean; sceneTextLanguage?: SceneTextChoice; directorBackgroundId?: string; backgroundImageUrls?: string[]; talkingHeadBackgroundId?: string; talkingHeadPoseId?: string; logoUrl?: string;`), and extend `ClipAppend`:

```ts
export type ClipAppend = {
  id: string;
  content: string;
  spokenScript?: string;
  mode?: ClipAppendMode;
  durationPreset?: DurationPreset;
  uploadedVoUrl?: string;
  uploadedVoDurationSeconds?: number;
  overrides?: ClipDirectorOverrides;
  // 1-based slot on the storyboard at enqueue time. Later inserts shift this.
  insertAt: number;
  status: ClipAppendStatus;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
};
```

Update `storyboardRowSchema` and `clipAppends` in `projectSchema` in `src/model/project.ts` to allow these optional fields.

In `src/presentation/serialize.ts`, ensure `phaseA` serialization converts any `ObjectId` inside `clip.skillId`, `clip.cast`, or `clip.products` (or keep a small helper `serializePhaseA(video.phaseA)` so `PublicVideo` never leaks raw `ObjectId` instances to Client Components).

Create `src/service/clip/clip-context.ts`:

```ts
import { ObjectId } from "mongodb";
import { characterLockFromCast } from "@/service/character/cast-prompt";
import type {
  ClipDirectorOverrides,
  PhaseAProposal,
  Project,
  StoryboardRow,
} from "@/model/project";

export type ClipContextSource = {
  skillId?: ObjectId | string;
  skillSlug?: string;
  styleId?: string;
  cast?: unknown[];
  products?: unknown[];
  language?: Project["language"];
  narrationEnabled?: boolean;
  voiceGender?: Project["voiceGender"];
  speechPace?: Project["speechPace"];
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: Project["sceneTextLanguage"];
  directorBackgroundId?: string;
  backgroundImageUrls?: string[];
  talkingHeadBackgroundId?: string;
  talkingHeadPoseId?: string;
  logoUrl?: string;
  phaseA?: {
    characterLock?: string;
    clips: Array<Partial<StoryboardRow> & { clipNumber: number }>;
  };
};

// Attach non-undefined per-clip director overrides onto a drafted StoryboardRow.
export function attachClipOverrides(
  row: StoryboardRow,
  overrides?: ClipDirectorOverrides,
): StoryboardRow {
  if (!overrides) return row;
  return {
    ...row,
    ...(overrides.skillId !== undefined ? { skillId: overrides.skillId } : {}),
    ...(overrides.skillSlug !== undefined ? { skillSlug: overrides.skillSlug } : {}),
    ...(overrides.styleId !== undefined ? { styleId: overrides.styleId } : {}),
    ...(overrides.cast !== undefined ? { cast: overrides.cast } : {}),
    ...(overrides.products !== undefined ? { products: overrides.products } : {}),
    ...(overrides.language !== undefined ? { language: overrides.language } : {}),
    ...(overrides.narrationEnabled !== undefined
      ? { narrationEnabled: overrides.narrationEnabled }
      : {}),
    ...(overrides.voiceGender !== undefined ? { voiceGender: overrides.voiceGender } : {}),
    ...(overrides.speechPace !== undefined ? { speechPace: overrides.speechPace } : {}),
    ...(overrides.sceneTextEnabled !== undefined
      ? { sceneTextEnabled: overrides.sceneTextEnabled }
      : {}),
    ...(overrides.sceneTextLanguage !== undefined
      ? { sceneTextLanguage: overrides.sceneTextLanguage }
      : {}),
    ...(overrides.directorBackgroundId !== undefined
      ? { directorBackgroundId: overrides.directorBackgroundId }
      : {}),
    ...(overrides.backgroundImageUrls !== undefined
      ? { backgroundImageUrls: overrides.backgroundImageUrls }
      : {}),
    ...(overrides.talkingHeadBackgroundId !== undefined
      ? { talkingHeadBackgroundId: overrides.talkingHeadBackgroundId }
      : {}),
    ...(overrides.talkingHeadPoseId !== undefined
      ? { talkingHeadPoseId: overrides.talkingHeadPoseId }
      : {}),
    ...(overrides.logoUrl !== undefined ? { logoUrl: overrides.logoUrl } : {}),
  };
}

function hasAnyClipOverride(row: Partial<StoryboardRow> | undefined): boolean {
  if (!row) return false;
  return (
    row.skillId !== undefined ||
    row.skillSlug !== undefined ||
    row.styleId !== undefined ||
    row.cast !== undefined ||
    row.products !== undefined ||
    row.language !== undefined ||
    row.narrationEnabled !== undefined ||
    row.voiceGender !== undefined ||
    row.speechPace !== undefined ||
    row.sceneTextEnabled !== undefined ||
    row.sceneTextLanguage !== undefined ||
    row.directorBackgroundId !== undefined ||
    row.backgroundImageUrls !== undefined ||
    row.talkingHeadBackgroundId !== undefined ||
    row.talkingHeadPoseId !== undefined ||
    row.logoUrl !== undefined
  );
}

// Return a shallow Project view whose top-level director/style/cast/voice fields
// reflect the clip's own overrides when present, falling back to the project defaults.
export function resolveClipProject<T extends ClipContextSource>(
  project: T,
  clipNumber: number,
): T {
  const row = project.phaseA?.clips.find((c) => c.clipNumber === clipNumber);
  if (!hasAnyClipOverride(row)) return project;

  const resolvedSkillId =
    row?.skillId !== undefined
      ? typeof project.skillId === "object" &&
        project.skillId instanceof ObjectId &&
        typeof row.skillId === "string" &&
        ObjectId.isValid(row.skillId)
        ? new ObjectId(row.skillId)
        : row.skillId
      : project.skillId;

  const hasCastOverride = Array.isArray(row?.cast);
  const nextCharacterLock =
    hasCastOverride && project.phaseA
      ? row!.cast!.length > 0
        ? characterLockFromCast(row!.cast as NonNullable<Project["cast"]>)
        : ""
      : project.phaseA?.characterLock;

  return {
    ...project,
    ...(resolvedSkillId !== undefined ? { skillId: resolvedSkillId } : {}),
    ...(row?.skillSlug !== undefined ? { skillSlug: row.skillSlug } : {}),
    ...(row?.styleId !== undefined ? { styleId: row.styleId } : {}),
    ...(hasCastOverride ? { cast: row!.cast } : {}),
    ...(Array.isArray(row?.products) ? { products: row.products } : {}),
    ...(row?.language !== undefined ? { language: row.language } : {}),
    ...(row?.narrationEnabled !== undefined ? { narrationEnabled: row.narrationEnabled } : {}),
    ...(row?.voiceGender !== undefined ? { voiceGender: row.voiceGender } : {}),
    ...(row?.speechPace !== undefined ? { speechPace: row.speechPace } : {}),
    ...(row?.sceneTextEnabled !== undefined ? { sceneTextEnabled: row.sceneTextEnabled } : {}),
    ...(row?.sceneTextLanguage !== undefined ? { sceneTextLanguage: row.sceneTextLanguage } : {}),
    ...(row?.directorBackgroundId !== undefined
      ? { directorBackgroundId: row.directorBackgroundId }
      : {}),
    ...(row?.backgroundImageUrls !== undefined
      ? { backgroundImageUrls: row.backgroundImageUrls }
      : {}),
    ...(row?.talkingHeadBackgroundId !== undefined
      ? { talkingHeadBackgroundId: row.talkingHeadBackgroundId }
      : {}),
    ...(row?.talkingHeadPoseId !== undefined ? { talkingHeadPoseId: row.talkingHeadPoseId } : {}),
    ...(row?.logoUrl !== undefined ? { logoUrl: row.logoUrl } : {}),
    ...(project.phaseA && nextCharacterLock !== project.phaseA.characterLock
      ? {
          phaseA: {
            ...(project.phaseA as PhaseAProposal),
            characterLock: nextCharacterLock ?? "",
          },
        }
      : {}),
  };
}

// True only when two clips share the same effective director skillSlug and visual styleId.
export function clipsShareContinuity(
  project: ClipContextSource,
  prevClipNumber: number,
  nextClipNumber: number,
): boolean {
  const prev = resolveClipProject(project, prevClipNumber);
  const next = resolveClipProject(project, nextClipNumber);
  return (prev.skillSlug || "") === (next.skillSlug || "") && (prev.styleId || "") === (next.styleId || "");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/clip/clip-context.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/project.ts src/presentation/serialize.ts src/service/clip/clip-context.ts src/service/clip/clip-context.test.ts
git commit -m "feat(clip): add ClipDirectorOverrides and resolveClipProject helper"
```

---

### Task 2: Wire Per-Clip Context into Stage, Keyframes, and Generation Pipeline

**Files:**
- Modify: `src/service/director/steady-stills.ts`
- Modify: `src/service/clip-stage.ts`
- Modify: `src/service/production-plan.ts`
- Modify: `src/service/higgsfield/pipeline.ts`
- Test: `src/service/clip/clip-context.test.ts`

**Interfaces:**
- Consumes: `resolveClipProject`, `clipsShareContinuity` from `src/service/clip/clip-context.ts`
- Produces: Per-clip-aware `clipDrawsNoEndStill`, `clipEndIsNextStart`, `clipStateFor`, `clipFrameCost`, `clipVideoCost`, `sendFrame`, `regenerateFrames`, `enqueueClipFrameJobs`, `sendClipVideo`, and `applyJobStatus`.

- [ ] **Step 1: Add unit tests for per-clip stage & cost resolution in `src/service/clip/clip-context.test.ts`**

Append to `src/service/clip/clip-context.test.ts`:

```ts
import { clipStateFor, clipFrameCost } from "@/service/clip-stage";
import { clipEndIsNextStart, clipDrawsNoEndStill } from "@/service/director/steady-stills";

describe("per-clip stage and steady-stills resolution", () => {
  it("computes frameCost and clipDrawsNoEndStill per clip when a talking-head video appends a start-only explainer clip", () => {
    const row1 = makeRow(1);
    const row2 = attachClipOverrides(makeRow(2), {
      skillSlug: "cartoon-explainer-video-director",
      styleId: "doodle",
    });
    const project = makeProject([row1, row2]);

    // Clip 1 (talking-head) followed by Clip 2 (cartoon-explainer) does not share continuity,
    // so Clip 1 cannot use Clip 2's start frame as its end frame.
    assert.equal(clipEndIsNextStart(project, 1), false);
    // Clip 2 is cartoon-explainer (start-only), so it draws no end still.
    assert.equal(clipDrawsNoEndStill(project, 2), true);
    assert.equal(clipFrameCost(project, 2), 1);

    const state2 = clipStateFor(project, 2);
    assert.equal(state2.frameCost, 1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/service/clip/clip-context.test.ts`
Expected: FAIL (`clipEndIsNextStart(project, 1)` returns `true` and `clipDrawsNoEndStill(project, 2)` uses project-level `talking-head-director`).

- [ ] **Step 3: Update `steady-stills.ts`, `clip-stage.ts`, `production-plan.ts`, and `pipeline.ts`**

1. In `src/service/director/steady-stills.ts`:
   - In `clipEndIsNextStart(project, clipNumber)`: resolve `const clipProj = resolveClipProject(project, clipNumber)`. Check `clipsShareContinuity(project, clipNumber, clipNumber + 1)` before allowing `end-is-next-start` against `clipNumber + 1`.
   - In `clipDrawsNoEndStill(project, clipNumber)`: resolve `const clipProj = resolveClipProject(project, clipNumber)` and pass `clipProj` to `clipSkipsEndStill(clipProj)`.
2. In `src/service/clip-stage.ts`:
   - In `clipFrameCost(project, clipNumber)` and `clipStateFor(project, clipNumber)`: resolve `const clipProj = resolveClipProject(project, clipNumber)` and use `clipProj.skillSlug`, `clipProj.styleId`, and `clipProj` for `clipSkipsEndStill(clipProj)`, `talkingHeadFramesCost`, `videoCost`, and `resolveVoiceSwapId(clipProj)`.
3. In `src/service/production-plan.ts`:
   - Check `clipVideoCost(project, clipNumber)` and any per-clip frame/video planners to resolve `const clipProj = resolveClipProject(project, clipNumber)` so per-clip video pricing and start-only checks use the clip's own director and style.
4. In `src/service/higgsfield/pipeline.ts`:
   - In `sendFrame(project, clipNumber, position)`: set `project = resolveClipProject(project, clipNumber)` at the top of the function.
   - In `regenerateFrames(project, targets)` and `enqueueClipFrameJobs(project, clipNumbers)`: use `resolveClipProject(project, target.clipNumber)` when checking `isInheritedTalkingHeadStart`, `clipDrawsNoEndStill`, `isTalkingHeadSkill`, and `frameSubmitPlan`.
   - In `sendClipVideo(project, clipNumber, prompt)`: set `project = resolveClipProject(project, clipNumber)` at the top of the function.
   - In `applyJobStatus`: when `job.kind === "video"` or `job.kind === "frame"` and `project` is loaded, resolve `const clipProject = job.clipIndex >= 0 ? resolveClipProject(project, job.clipIndex + 1) : project` and use `clipProject` for style loading, voice swap, lip-sync, and grading.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/clip/clip-context.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/director/steady-stills.ts src/service/clip-stage.ts src/service/production-plan.ts src/service/higgsfield/pipeline.ts src/service/clip/clip-context.test.ts
git commit -m "feat(pipeline): resolve per-clip director and style overrides across stage and generation"
```

---

### Task 3: Upgrade `appendDirectorClipAction` & `writeQueuedClip` for Single-Clip and Full-Video Director Flows

**Files:**
- Modify: `src/service/project/actions.ts`
- Modify: `src/service/clip/clip-timeline-actions.ts`
- Modify: `src/service/director/append-clip.ts`
- Test: `src/service/clip/clip-order.test.ts`

**Interfaces:**
- Consumes: `ClipDirectorOverrides`, `ClipAppendMode`, `attachClipOverrides`, `clipsShareContinuity`, `runPhaseA`, `draftAppendedClips`, `buildCast`, `buildProducts`
- Produces:
  - Exported `buildCast` and `buildProducts` from `src/service/project/actions.ts`
  - Extended `appendDirectorClipAction(input: AppendDirectorClipInput)` in `src/service/clip/clip-timeline-actions.ts` supporting `mode?: "single_clip" | "full_video"` and full director brief fields.

- [ ] **Step 1: Write unit tests in `src/service/clip/clip-order.test.ts` for inserting multiple clips with per-clip overrides**

Check existing `src/service/clip/clip-order.test.ts` (or add a test case in it) verifying that `insertClips` appends multiple `StoryboardRow` items carrying `skillSlug`, `styleId`, and `cast` overrides to the end of an existing storyboard and updates `clipNumber` and `timeRange` accurately.

- [ ] **Step 2: Run the test**

Run: `npx tsx --test src/service/clip/clip-order.test.ts`
Expected: PASS (and verify new test case runs).

- [ ] **Step 3: Export `buildCast` and `buildProducts` and update `src/service/clip/clip-timeline-actions.ts` & `src/service/director/append-clip.ts`**

1. In `src/service/project/actions.ts`:
   - Export `buildCast` and `buildProducts` so `clip-timeline-actions.ts` can reuse them without duplicating character version/blueprint resolution.
2. In `src/service/director/append-clip.ts`:
   - Update `inheritOpening(row, previous, skillSlug, shareContinuity = true)` so it only copies `previous?.endScene` when `shareContinuity` is `true`.
3. In `src/service/clip/clip-timeline-actions.ts`:
   - Define `AppendDirectorClipInput`:
     ```ts
     export type AppendDirectorClipInput = {
       videoId: string;
       content: string;
       spokenScript?: string;
       insertAt?: number;
       mode?: "single_clip" | "full_video";
       skillSlug?: string;
       styleId?: string;
       characterIds?: string[];
       characterSelections?: CharacterSelectionMap;
       productIds?: string[];
       language?: VoLanguage;
       voiceGender?: VoiceGender;
       speechPace?: SpeechPace;
       sceneTextLanguage?: SceneTextChoice;
       durationPreset?: DurationPreset;
       directorBackgroundId?: string;
       backgroundImageUrls?: string[];
       talkingHeadPoseId?: string;
       logoUrl?: string;
       uploadedVoUrl?: string;
       uploadedVoDurationSeconds?: number;
     };
     ```
   - In `appendDirectorClipAction(input: AppendDirectorClipInput)`:
     - Resolve `mode = input.mode === "full_video" ? "full_video" : "single_clip"`.
     - When `skillSlug`, `styleId`, `characterIds`, etc. are passed, resolve `skill` via `findSelectableSkill(user.clerkUserId, input.skillSlug || project.skillSlug)`, validate `briefSkillError`, call `buildCast` and `buildProducts`, and store `overrides: ClipDirectorOverrides` on the queued `ClipAppend` item.
     - For `talkingHead` directors, allow `spokenScript` (or `content`) and `uploadedVoUrl`. For `mode === "full_video"`, force `insertAt = project.phaseA.clips.length + 1` and allow content up to `10000` chars (matching full video brief limits).
   - In `writeQueuedClip(videoId, token, jobId)`:
     - Resolve effective `skillId`, `skillSlug`, `styleId`, `cast`, `products`, `language`, `voiceGender`, `speechPace`, `sceneTextEnabled`, `sceneTextLanguage`, `directorBackgroundId`, `backgroundImageUrls`, `talkingHeadPoseId`, and `logoUrl` from `job.overrides` (falling back to `project`).
     - If `job.mode === "full_video"`:
       - Call `runPhaseA` with the effective skill, style, cast, products, language, voiceGender, speechPace, sceneTextEnabled, sceneTextLanguage, `aspectRatio: project.aspectRatio`, `durationPreset: job.durationPreset || "auto"`, `source: job.content`, `spokenScript: job.spokenScript`, `uploadedVoUrl: job.uploadedVoUrl`, `uploadedVoDurationSeconds: job.uploadedVoDurationSeconds`.
       - Apply outfit/surprise sanitizers if applicable (`isOutfitReelSkill`, `isOutfitChangeSkill`, `isSurpriseInterviewSkill`).
       - Slice `phaseA.clips` to `Math.max(1, APPEND_CLIP_MAX - fresh.phaseA.clips.length)` so it never exceeds `APPEND_CLIP_MAX`.
     - If `job.mode !== "full_video"` (`"single_clip"`):
       - Call `draftAppendedClips` with the effective skill, style, cast, language, speechPace, and `shareContinuity`. If `isTalkingHeadSkill(skill.slug)` returns multiple clips in `single_clip` mode, keep `drafted.slice(0, 1)` (or combine into 1 clip) so "Add clip" always produces 1 clip.
     - Map each drafted row through `attachClipOverrides(row, job.overrides)` before calling `insertClips(fresh, draftedWithOverrides, insertAt, { language, talkingHead })`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx tsx --test src/service/clip/clip-order.test.ts && npx tsc --noEmit`
Expected: PASS with zero type errors.

- [ ] **Step 5: Commit**

```bash
git add src/service/project/actions.ts src/service/director/append-clip.ts src/service/clip/clip-timeline-actions.ts src/service/clip/clip-order.test.ts
git commit -m "feat(clip-append): support full_video Phase A and per-clip director overrides in append queue"
```

---

### Task 4: Build `AppendDirectorDialog` & Wire OpenCut Assets Menu + Toolbar

**Files:**
- Modify: `src/opencut/embed/scro-video-actions.ts`
- Modify: `src/opencut/components/editor/panels/assets/views/assets-clip-menu.tsx`
- Modify: `src/util/i18n/messages/workspace/production.zh-Hant.ts`
- Modify: `src/util/i18n/messages/workspace/production.en.ts`
- Create: `src/presentation/components/app/projects/new/append-director-dialog.tsx`
- Modify: `src/presentation/components/app/projects/new/opencut-scro-toolbar.tsx`
- Modify: `src/presentation/components/app/projects/new/opencut-direct-desk.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`

**Interfaces:**
- Consumes: `appendDirectorClipAction`, `SkillPicker`, `StylePicker`, `CharacterPicker`, `QuickScriptCard`, `DurationPicker`, `TalkingHeadPoseField`, `DirectorBackgroundPicker`, `BriefSetupModeBar`
- Produces:
  - `ScroClipMenuAction` including `"add-video"`
  - `AppendDirectorDialog` component in `src/presentation/components/app/projects/new/append-director-dialog.tsx`

- [ ] **Step 1: Add i18n keys in `production.zh-Hant.ts` and `production.en.ts`**

Add to `filmstrip` in `src/util/i18n/messages/workspace/production.zh-Hant.ts`:
```ts
    addVideo: "新增影片（接在尾端）",
    addVideoTitle: "新增影片至尾端",
    addVideoBody: "選擇導演、視覺風格與角色，輸入內容後導演會規劃完整分鏡並自動附加在目前影片的最後面。",
    addVideoConfirm: "產生並附加至尾端",
    addClipDirectorBody: "選擇導演、視覺風格與角色，導演會在背景為你撰寫 1 段新分鏡並放在{place}。",
```

Add corresponding keys in `src/util/i18n/messages/workspace/production.en.ts`:
```ts
    addVideo: "Add new video (append to end)",
    addVideoTitle: "Add new video to end",
    addVideoBody: "Pick a director, visual style, and character. The director will plan a full storyboard and append all clips to the end of this video.",
    addVideoConfirm: "Create & append to end",
    addClipDirectorBody: "Pick a director, visual style, and character. The director will write 1 new clip in the background and place it {place}.",
```

- [ ] **Step 2: Extend `ScroClipMenuAction` and `AssetsClipMenu`**

In `src/opencut/embed/scro-video-actions.ts`:
```ts
export type ScroClipMenuAction = "remaining" | "scenes" | "clips" | "add" | "add-video";
```

In `src/opencut/components/editor/panels/assets/views/assets-clip-menu.tsx`, add the "Add new video" item right below "Add clip":
```tsx
				<DropdownMenuItem
					icon={<AddClipIcon className="h-4 w-4" />}
					disabled={!idle}
					onSelect={() => run("add")}
				>
					{t("production.filmstrip.addClip")}
				</DropdownMenuItem>
				<DropdownMenuItem
					icon={<AddClipIcon className="h-4 w-4" />}
					disabled={!idle}
					onSelect={() => run("add-video")}
				>
					{t("production.filmstrip.addVideo")}
				</DropdownMenuItem>
```

- [ ] **Step 3: Create `src/presentation/components/app/projects/new/append-director-dialog.tsx`**

Create `AppendDirectorDialog` with `'use client'` at the top. It provides:
- Header with title (`addTitle` for `"add-clip"`, `addVideoTitle` for `"add-video"`) and description.
- For `"add-clip"`: the "Place after clip" `<select>` (`afterOptions`).
- For `"add-video"`: a clear pill showing it appends after the last clip (`Clip N`) plus a `DurationPicker` (`auto`, `micro`, `short`, `punchy`, `full`).
- The 3-column Studio Cards row (`01` Director `SkillPicker` / `TalkingHeadPoseField` + `DirectorBackgroundPicker`, `02` `StylePicker`, `03` `CharacterPicker`).
- `04` `QuickScriptCard` for the script / content / voiceover language / uploaded VO.
- Validation (required cast count `requiredCastCount(ruleSlug)`, non-empty content or spokenScript/uploadedVo) and submit button calling `onConfirm(payload)`.

- [ ] **Step 4: Wire `AppendDirectorDialog` into `OpenCutScroToolbar`, `OpenCutDirectDesk`, and `NewProjectForm`**

1. Pass `skills`, `styles`, `characters`, and `products` from `NewProjectForm` → `OpenCutVideoDesk` (`OpenCutDirectDesk`) → `OpenCutScroToolbar`.
2. In `OpenCutScroToolbar`:
   - Replace `addOpen: boolean` with `appendMode: "add-clip" | "add-video" | null`.
   - When `data.action === "add"`, set `appendMode("add-clip")`.
   - When `data.action === "add-video"`, set `appendMode("add-video")`.
   - Render `AppendDirectorDialog` when `appendMode !== null`, and on confirm call `appendDirectorClipAction` with the full payload and `mode: appendMode === "add-video" ? "full_video" : "single_clip"`.

- [ ] **Step 5: Run typecheck, lint, and tests**

Run: `npx tsc --noEmit && npx eslint src/presentation/components/app/projects/new/append-director-dialog.tsx src/presentation/components/app/projects/new/opencut-scro-toolbar.tsx src/presentation/components/app/projects/new/opencut-direct-desk.tsx src/presentation/components/app/projects/new/new-project-form.tsx`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/opencut/embed/scro-video-actions.ts src/opencut/components/editor/panels/assets/views/assets-clip-menu.tsx src/util/i18n/messages/workspace/production.zh-Hant.ts src/util/i18n/messages/workspace/production.en.ts src/presentation/components/app/projects/new/append-director-dialog.tsx src/presentation/components/app/projects/new/opencut-scro-toolbar.tsx src/presentation/components/app/projects/new/opencut-direct-desk.tsx src/presentation/components/app/projects/new/new-project-form.tsx
git commit -m "feat(opencut): add AppendDirectorDialog for Add clip and Add new video in editor"
```
