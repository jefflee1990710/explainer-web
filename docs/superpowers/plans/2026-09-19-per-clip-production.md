# Per-Clip Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the storyboard is approved, let the user generate, review and regenerate each clip's two frames and its video independently, charged per action, with a clip-timeline UI.

**Architecture:** One `production` project status replaces the four linear middle statuses. Per-clip stage is a pure function of the existing `frames[]` / `clips[]` arrays plus ISO timestamps (`editedAt`, `submittedAt`). Phase B runs per clip when its video is requested. `syncProjectFromJobs` reconciles every clip from its newest job regardless of status. The UI is a horizontal clip timeline plus a single-clip workspace, shared by the `/new` form and the project page.

**Tech Stack:** Next.js 16 App Router (server actions, `after()`), React 19, framer-motion, MongoDB driver 7, Vercel AI SDK (`generateText` + `Output.object`), Higgsfield client, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-09-19-per-clip-production-design.md`

## Global Constraints

- Reply/commit messages to the user in Traditional Chinese; code identifiers, paths and UI copy follow the existing repo (UI copy is zh-Hant).
- Every new UI component goes in its own file under `src/components/project/` (shared by `/new` and `/projects/[id]`); components using hooks start with `"use client"`.
- Server calls are server actions (`"use server"`), never REST routes.
- Mongo collections are always typed (`videosCollection()` etc. already are).
- Add short comments explaining what each non-obvious block does.
- Charging order in every paid action: `assertCanSpendCredits(user, cost)` → `consumeCredits(user.clerkUserId, cost)` → DB write → submit / `after()`. If a synchronous submit throws after charging, `refundCredits` in the same action.
- Costs: clip frames 2, single frame redo 1, clip video 1, still 0, approve 0.
- Timestamps `editedAt` / `submittedAt` are ISO strings (`new Date().toISOString()`).
- Legacy statuses `frames_generating | frames_ready | approved | generating` stay in the `ProjectStatus` union until Task 11 so every intermediate commit type-checks; they are normalised to `production` on read from Task 1 onward.
- Verification commands: `npx tsc --noEmit`, `npm run lint`, `npx tsx --test <files>`.
- Commit after each task; do not include unrelated uncommitted files (there are pre-existing uncommitted `referenceTranslation` edits — commit those separately first or leave them unstaged).

---

## File Structure

**Create**
- `src/lib/clip-stage.ts` — per-clip stage/stale derivation, `isProjectBusy`, `isProjectReady`, `productionCounts`.
- `src/lib/clip-stage.test.ts`
- `src/lib/production-plan.ts` — costs + `planRemaining`.
- `src/lib/production-plan.test.ts`
- `src/lib/project-status.test.ts` — `normalizeProjectStatus`, `failedStepFor`.
- `src/lib/director/phase-b-clip-prompt.ts` — pure user-prompt builder for one clip.
- `src/lib/director/phase-b-clip-prompt.test.ts`
- `src/lib/higgsfield/reconcile.ts` — pure job→frames/clips reconciliation + next status.
- `src/lib/higgsfield/reconcile.test.ts`
- `src/lib/actions/clip-production.ts` — `generateClipFramesAction`, `generateClipVideoAction`, `generateRemainingAction`.
- `src/components/project/production-icons.tsx` — small SVG icons shared by the production components.
- `src/components/project/frame-tile.tsx` — one frame (extracted from `frames-timeline.tsx`) + empty state.
- `src/components/project/clip-timeline.tsx`
- `src/components/project/clip-video-panel.tsx`
- `src/components/project/clip-workspace.tsx`
- `src/components/project/fill-remaining-dialog.tsx`
- `src/components/project/clip-production.tsx` — container.

**Modify**
- `src/types/project.ts`, `src/lib/project-status.ts`, `src/lib/serialize.ts`, `src/lib/folder.test.ts`
- `src/lib/i18n/messages/types.ts` + all 11 locale files
- `src/lib/director/schemas.ts`, `src/lib/director/run-phase-b.ts`, `src/lib/director/jobs.ts`
- `src/lib/higgsfield/pipeline.ts`, `src/lib/higgsfield/frame-prompts.ts`
- `src/lib/actions/generation.ts`, `src/lib/actions/projects.ts`
- `src/app/app/projects/new/use-project-poll.ts`, `src/app/app/projects/new/new-project-form.tsx`, `src/app/app/projects/new/storyboard-preview.tsx`
- `src/components/project/project-stepper.tsx`

**Delete (Task 10)**
- `src/components/project/frames-timeline.tsx`, `src/app/app/projects/new/generation-panel.tsx`, `src/app/app/projects/[id]/frames-step.tsx`, `src/app/app/projects/[id]/generation-progress.tsx` (the last two are already unreferenced).

---

### Task 1: Status model foundations

**Files:**
- Modify: `src/types/project.ts`
- Modify: `src/lib/project-status.ts`
- Modify: `src/lib/serialize.ts`
- Modify: `src/lib/i18n/messages/types.ts`, `src/lib/i18n/messages/{en,zh-Hant,zh-Hans,ja,ko,es,fr,de,pt,ru,id}.ts`
- Test: `src/lib/project-status.test.ts`

**Interfaces:**
- Produces: `ProjectStatus` gains `"production"`; `normalizeProjectStatus(status): ProjectStatus`; `isProductionLike(status): boolean`; `StoryboardRow.editedAt?: string`; `ClipFrame.submittedAt?: string`; `ProjectClip.submittedAt?: string`; `Project.stillError?: string`; `PublicVideo.stillError?: string`; `PublicVideo.status` is always normalised.

- [ ] **Step 1: Write the failing test**

Create `src/lib/project-status.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { isProductionLike, normalizeProjectStatus } from "./project-status";

test("legacy middle statuses normalise to production", () => {
  assert.equal(normalizeProjectStatus("frames_generating"), "production");
  assert.equal(normalizeProjectStatus("frames_ready"), "production");
  assert.equal(normalizeProjectStatus("approved"), "production");
  assert.equal(normalizeProjectStatus("generating"), "production");
});

test("non-legacy statuses pass through", () => {
  assert.equal(normalizeProjectStatus("draft"), "draft");
  assert.equal(normalizeProjectStatus("awaiting_approval"), "awaiting_approval");
  assert.equal(normalizeProjectStatus("production"), "production");
  assert.equal(normalizeProjectStatus("ready"), "ready");
  assert.equal(normalizeProjectStatus("failed"), "failed");
});

test("isProductionLike covers production, ready and legacy middle statuses", () => {
  assert.equal(isProductionLike("production"), true);
  assert.equal(isProductionLike("ready"), true);
  assert.equal(isProductionLike("generating"), true);
  assert.equal(isProductionLike("awaiting_approval"), false);
  assert.equal(isProductionLike("failed"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/project-status.test.ts`
Expected: FAIL — `normalizeProjectStatus` is not exported.

- [ ] **Step 3: Update `src/types/project.ts`**

Replace the lifecycle comment and `ProjectStatus` union:

```ts
// Lifecycle: phase_a → awaiting_approval → production → ready.
// `production` = storyboard approved; every clip's frames and video are made
// independently. Frame/video failures live on the clip, so `failed` only ever
// means Phase A failed.
// `frames_generating | frames_ready | approved | generating` are legacy values
// from the pre per-clip pipeline: normalised to `production` on read and
// removed from this union once nothing writes them.
export type ProjectStatus =
  | "draft"
  | "phase_a"
  | "awaiting_approval"
  | "production"
  | "frames_generating"
  | "frames_ready"
  | "approved"
  | "generating"
  | "ready"
  | "failed";
```

Add to `ClipFrame` (after `revision`):

```ts
  // ISO time the current job was submitted; compared with the row's editedAt.
  submittedAt?: string;
```

Add to `StoryboardRow` (after `bgmSfx`):

```ts
  // ISO time the user last edited this row; newer than submittedAt ⇒ stale media.
  editedAt?: string;
```

Add to `ProjectClip` (after `error`):

```ts
  // ISO time the video was requested (Phase B + submit happen in a job).
  submittedAt?: string;
```

In `Project`: make `creditCost` optional (`creditCost?: number;`), and add after `characterStillUrl`:

```ts
  // Character still failed; the next frame request resubmits it.
  stillError?: string;
```

Update the legacy comment above `framesCreditCost`/`creditCost`:

```ts
  // Legacy batch charges (pre per-clip pipeline). No longer written.
```

- [ ] **Step 4: Update `src/lib/project-status.ts`**

Add `production` to `STATUS_META` and the two helpers:

```ts
export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  draft: { tone: "neutral", step: 0, busy: false },
  phase_a: { tone: "working", step: 1, busy: true },
  awaiting_approval: { tone: "action", step: 1, busy: false },
  // Static `busy` so folder rollups / dashboard filters work from statuses alone;
  // components with the full project use isProjectBusy() for the precise answer.
  production: { tone: "working", step: 2, busy: true },
  frames_generating: { tone: "working", step: 2, busy: true },
  frames_ready: { tone: "action", step: 2, busy: false },
  approved: { tone: "working", step: 3, busy: true },
  generating: { tone: "working", step: 3, busy: true },
  ready: { tone: "success", step: 3, busy: false },
  failed: { tone: "danger", step: 0, busy: false },
};

const LEGACY_PRODUCTION = new Set<ProjectStatus>([
  "frames_generating",
  "frames_ready",
  "approved",
  "generating",
]);

// Pre per-clip statuses read as `production`.
export function normalizeProjectStatus(status: ProjectStatus): ProjectStatus {
  return LEGACY_PRODUCTION.has(status) ? "production" : status;
}

// True once the storyboard is approved and clips may be produced/redone.
export function isProductionLike(status: ProjectStatus) {
  const normalized = normalizeProjectStatus(status);
  return normalized === "production" || normalized === "ready";
}
```

- [ ] **Step 5: Normalise in `src/lib/serialize.ts`**

Import `normalizeProjectStatus` from `@/lib/project-status`. In `PublicVideo` add `stillError?: string;` after `characterStillUrl`. In `toPublicVideo` change `status: video.status,` to `status: normalizeProjectStatus(video.status),` and add `stillError: video.stillError,`. Change `creditCost: video.creditCost,` to `creditCost: video.creditCost || 0,`. In `toPublicFolder` change `const statuses = videos.map((video) => video.status);` to `const statuses = videos.map((video) => normalizeProjectStatus(video.status));`.

- [ ] **Step 6: Add the `production` label to i18n**

In `src/lib/i18n/messages/types.ts` add `| "production"` to the `project.status` Record key union (after `"awaiting_approval"`). Add `production: "…"` to the `project.status` object in each locale:

| file | value |
|---|---|
| en.ts | `"In production"` |
| zh-Hant.ts | `"製作中"` |
| zh-Hans.ts | `"制作中"` |
| ja.ts | `"制作中"` |
| ko.ts | `"제작 중"` |
| es.ts | `"En producción"` |
| fr.ts | `"En production"` |
| de.ts | `"In Produktion"` |
| pt.ts | `"Em produção"` |
| ru.ts | `"В производстве"` |
| id.ts | `"Dalam produksi"` |

- [ ] **Step 7: Run tests and type-check**

Run: `npx tsx --test src/lib/project-status.test.ts src/lib/folder.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/types/project.ts src/lib/project-status.ts src/lib/project-status.test.ts src/lib/serialize.ts src/lib/i18n/messages/
git commit -m "feat(status): add production status, normalise legacy statuses, per-clip timestamps"
```

---

### Task 2: Per-clip stage derivation

**Files:**
- Create: `src/lib/clip-stage.ts`
- Test: `src/lib/clip-stage.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type ClipStage = "no_frames" | "frames_generating" | "frames_failed" | "frames_ready" | "video_generating" | "video_failed" | "video_ready";
  type ClipState = { clipNumber: number; stage: ClipStage; stale: { frames: boolean; video: boolean } };
  type ClipStageSource = { status: ProjectStatus; phaseA?: { clips: Array<{ clipNumber: number; editedAt?: string }> }; frames?: ClipFrame[]; clips: ProjectClip[] };
  clipStateFor(project: ClipStageSource, clipNumber: number): ClipState
  clipStatesFor(project: ClipStageSource): ClipState[]
  isProjectBusy(project: ClipStageSource): boolean
  isProjectReady(project: ClipStageSource): boolean
  productionCounts(project: ClipStageSource): { total: number; framesDone: number; videosDone: number }
  ```
  Both Mongo `Project` and `PublicVideo` satisfy `ClipStageSource`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/clip-stage.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame, ProjectClip } from "@/types/project";
import {
  clipStateFor,
  isProjectBusy,
  isProjectReady,
  productionCounts,
  type ClipStageSource,
} from "./clip-stage";

function frame(
  clipNumber: number,
  position: ClipFrame["position"],
  status: ClipFrame["status"],
  submittedAt?: string,
): ClipFrame {
  return { clipNumber, position, prompt: "p", status, submittedAt };
}

function clip(
  clipNumber: number,
  status: ProjectClip["status"],
  submittedAt?: string,
): ProjectClip {
  return { clipNumber, durationSeconds: 5, prompt: "v", status, submittedAt };
}

function project(
  overrides: Partial<ClipStageSource> = {},
): ClipStageSource {
  return {
    status: "production",
    phaseA: { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] },
    frames: [],
    clips: [],
    ...overrides,
  };
}

test("no frames at all → no_frames", () => {
  assert.equal(clipStateFor(project(), 1).stage, "no_frames");
});

test("one frame in flight → frames_generating", () => {
  const p = project({ frames: [frame(1, "start", "completed"), frame(1, "end", "in_progress")] });
  assert.equal(clipStateFor(p, 1).stage, "frames_generating");
});

test("one frame failed and none in flight → frames_failed", () => {
  const p = project({ frames: [frame(1, "start", "completed"), frame(1, "end", "failed")] });
  assert.equal(clipStateFor(p, 1).stage, "frames_failed");
});

test("both frames completed, no video → frames_ready", () => {
  const p = project({ frames: [frame(1, "start", "completed"), frame(1, "end", "completed")] });
  assert.equal(clipStateFor(p, 1).stage, "frames_ready");
});

test("only one frame completed (other missing) → no_frames", () => {
  const p = project({ frames: [frame(1, "start", "completed")] });
  assert.equal(clipStateFor(p, 1).stage, "no_frames");
});

test("video queued → video_generating, beats everything", () => {
  const p = project({
    frames: [frame(1, "start", "in_progress"), frame(1, "end", "completed")],
    clips: [clip(1, "queued")],
  });
  assert.equal(clipStateFor(p, 1).stage, "video_generating");
});

test("video completed → video_ready; failed → video_failed", () => {
  const frames = [frame(1, "start", "completed"), frame(1, "end", "completed")];
  assert.equal(clipStateFor(project({ frames, clips: [clip(1, "completed")] }), 1).stage, "video_ready");
  assert.equal(clipStateFor(project({ frames, clips: [clip(1, "failed")] }), 1).stage, "video_failed");
});

test("frames being redrawn outrank a finished video", () => {
  const p = project({
    frames: [frame(1, "start", "queued"), frame(1, "end", "completed")],
    clips: [clip(1, "completed")],
  });
  assert.equal(clipStateFor(p, 1).stage, "frames_generating");
});

test("stale.frames when the row was edited after a frame was submitted", () => {
  const p = project({
    phaseA: { clips: [{ clipNumber: 1, editedAt: "2026-01-02T00:00:00.000Z" }] },
    frames: [
      frame(1, "start", "completed", "2026-01-01T00:00:00.000Z"),
      frame(1, "end", "completed", "2026-01-03T00:00:00.000Z"),
    ],
  });
  assert.deepEqual(clipStateFor(p, 1).stale, { frames: true, video: false });
});

test("stale.video when the row was edited after the video was submitted", () => {
  const p = project({
    phaseA: { clips: [{ clipNumber: 1, editedAt: "2026-01-05T00:00:00.000Z" }] },
    frames: [
      frame(1, "start", "completed", "2026-01-06T00:00:00.000Z"),
      frame(1, "end", "completed", "2026-01-06T00:00:00.000Z"),
    ],
    clips: [clip(1, "completed", "2026-01-04T00:00:00.000Z")],
  });
  assert.deepEqual(clipStateFor(p, 1).stale, { frames: false, video: true });
});

test("stale.video when a frame was redrawn after the video was submitted", () => {
  const p = project({
    frames: [
      frame(1, "start", "completed", "2026-01-01T00:00:00.000Z"),
      frame(1, "end", "completed", "2026-01-09T00:00:00.000Z"),
    ],
    clips: [clip(1, "completed", "2026-01-05T00:00:00.000Z")],
  });
  assert.deepEqual(clipStateFor(p, 1).stale, { frames: false, video: true });
});

test("missing timestamps never flag stale (legacy data)", () => {
  const p = project({
    phaseA: { clips: [{ clipNumber: 1, editedAt: "2026-01-05T00:00:00.000Z" }] },
    frames: [frame(1, "start", "completed"), frame(1, "end", "completed")],
    clips: [clip(1, "completed")],
  });
  assert.deepEqual(clipStateFor(p, 1).stale, { frames: false, video: false });
});

test("isProjectBusy: phase_a, or any frame/clip in flight", () => {
  assert.equal(isProjectBusy(project({ status: "phase_a" })), true);
  assert.equal(isProjectBusy(project()), false);
  assert.equal(isProjectBusy(project({ frames: [frame(1, "start", "queued")] })), true);
  assert.equal(isProjectBusy(project({ clips: [clip(2, "in_progress")] })), true);
  assert.equal(isProjectBusy(project({ status: "ready", clips: [clip(1, "completed")] })), false);
});

test("isProjectReady only when every storyboard clip has a completed video", () => {
  assert.equal(isProjectReady(project({ clips: [clip(1, "completed")] })), false);
  assert.equal(
    isProjectReady(project({ clips: [clip(1, "completed"), clip(2, "completed")] })),
    true,
  );
  assert.equal(isProjectReady(project({ phaseA: { clips: [] } })), false);
});

test("productionCounts", () => {
  const p = project({
    frames: [
      frame(1, "start", "completed"),
      frame(1, "end", "completed"),
      frame(2, "start", "completed"),
    ],
    clips: [clip(1, "completed")],
  });
  assert.deepEqual(productionCounts(p), { total: 2, framesDone: 1, videosDone: 1 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/lib/clip-stage.test.ts`
Expected: FAIL — cannot find module `./clip-stage`.

- [ ] **Step 3: Implement `src/lib/clip-stage.ts`**

```ts
import type { ClipFrame, ProjectClip, ProjectStatus } from "@/types/project";

// Where one clip is in production. Derived, never stored.
export type ClipStage =
  | "no_frames"          // 待畫格
  | "frames_generating"  // 畫格中
  | "frames_failed"      // 有畫格失敗（credits 已退）
  | "frames_ready"       // 兩張畫格完成，可產片
  | "video_generating"   // 產片中
  | "video_failed"       // 影片失敗（credits 已退）
  | "video_ready";       // 影片完成

export type ClipState = {
  clipNumber: number;
  stage: ClipStage;
  // Media generated before the latest text edit / frame redo.
  stale: { frames: boolean; video: boolean };
};

// Minimal shape so both the Mongo `Project` and `PublicVideo` fit.
export type ClipStageSource = {
  status: ProjectStatus;
  phaseA?: { clips: Array<{ clipNumber: number; editedAt?: string }> };
  frames?: ClipFrame[];
  clips: ProjectClip[];
};

const IN_FLIGHT = new Set<string>(["queued", "in_progress"]);

// ISO strings compare lexicographically; missing values never count as later.
function isLater(a?: string, b?: string) {
  return Boolean(a && b && a > b);
}

export function clipStateFor(project: ClipStageSource, clipNumber: number): ClipState {
  const row = project.phaseA?.clips.find((item) => item.clipNumber === clipNumber);
  const start = project.frames?.find(
    (item) => item.clipNumber === clipNumber && item.position === "start",
  );
  const end = project.frames?.find(
    (item) => item.clipNumber === clipNumber && item.position === "end",
  );
  const clip = project.clips.find((item) => item.clipNumber === clipNumber);
  const frames = [start, end].filter((item): item is ClipFrame => Boolean(item));

  const stale = {
    frames: frames.some((frame) => isLater(row?.editedAt, frame.submittedAt)),
    video:
      Boolean(clip) &&
      (isLater(row?.editedAt, clip?.submittedAt) ||
        frames.some((frame) => isLater(frame.submittedAt, clip?.submittedAt))),
  };

  // Precedence: active video > active frames > failed frames > finished video
  // > failed video > frames ready > nothing. Frame activity outranks a finished
  // video because the user is redrawing; the panel still shows the old video.
  let stage: ClipStage;
  if (clip && IN_FLIGHT.has(clip.status)) stage = "video_generating";
  else if (frames.some((frame) => IN_FLIGHT.has(frame.status))) stage = "frames_generating";
  else if (frames.some((frame) => frame.status === "failed")) stage = "frames_failed";
  else if (clip?.status === "completed") stage = "video_ready";
  else if (clip?.status === "failed") stage = "video_failed";
  else if (start?.status === "completed" && end?.status === "completed") stage = "frames_ready";
  else stage = "no_frames";

  return { clipNumber, stage, stale };
}

export function clipStatesFor(project: ClipStageSource): ClipState[] {
  return (project.phaseA?.clips || []).map((row) => clipStateFor(project, row.clipNumber));
}

// Poll while the director writes, or while any frame/video job is in flight.
export function isProjectBusy(project: ClipStageSource) {
  if (project.status === "phase_a") return true;
  return (
    (project.frames || []).some((frame) => IN_FLIGHT.has(frame.status)) ||
    project.clips.some((clip) => IN_FLIGHT.has(clip.status))
  );
}

// Every storyboard clip has a completed video.
export function isProjectReady(project: ClipStageSource) {
  const rows = project.phaseA?.clips || [];
  return (
    rows.length > 0 &&
    rows.every(
      (row) =>
        project.clips.find((clip) => clip.clipNumber === row.clipNumber)?.status ===
        "completed",
    )
  );
}

// Header counters: clips with both frames done, clips with a video.
export function productionCounts(project: ClipStageSource) {
  const states = clipStatesFor(project);
  const framesDone = states.filter((state) =>
    ["frames_ready", "video_generating", "video_failed", "video_ready"].includes(state.stage),
  ).length;
  const videosDone = states.filter((state) => state.stage === "video_ready").length;
  return { total: states.length, framesDone, videosDone };
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/lib/clip-stage.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/clip-stage.ts src/lib/clip-stage.test.ts
git commit -m "feat(production): derive per-clip stage and staleness from frames/clips"
```

---

### Task 3: Fill-remaining plan and cost constants

**Files:**
- Create: `src/lib/production-plan.ts`
- Test: `src/lib/production-plan.test.ts`

**Interfaces:**
- Consumes: `clipStatesFor`, `ClipStageSource` from Task 2.
- Produces: `FRAMES_COST = 2`, `FRAME_COST = 1`, `VIDEO_COST = 1`, `type RemainingPlan = { frames: number[]; videos: number[]; cost: number }`, `planRemaining(project: ClipStageSource): RemainingPlan`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/production-plan.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClipFrame, ProjectClip } from "@/types/project";
import type { ClipStageSource } from "./clip-stage";
import { planRemaining } from "./production-plan";

function frame(
  clipNumber: number,
  position: ClipFrame["position"],
  status: ClipFrame["status"],
  submittedAt?: string,
): ClipFrame {
  return { clipNumber, position, prompt: "p", status, submittedAt };
}
function clip(clipNumber: number, status: ProjectClip["status"]): ProjectClip {
  return { clipNumber, durationSeconds: 5, prompt: "v", status };
}
const done = (n: number) => [frame(n, "start", "completed"), frame(n, "end", "completed")];

test("fills gaps only: frames for empty/failed, video for frames_ready/video_failed", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: { clips: [1, 2, 3, 4, 5, 6].map((clipNumber) => ({ clipNumber })) },
    frames: [
      ...done(1), // video done → skip
      ...done(2), // frames ready → video
      frame(3, "start", "completed"), frame(3, "end", "in_progress"), // generating → skip
      ...done(4), // video failed → video
      frame(5, "start", "failed"), frame(5, "end", "completed"), // frames failed → frames
      // 6: nothing → frames
    ],
    clips: [clip(1, "completed"), clip(4, "failed")],
  };
  assert.deepEqual(planRemaining(project), { frames: [5, 6], videos: [2, 4], cost: 2 * 2 + 2 * 1 });
});

test("skips video for clips whose frames are stale", () => {
  const project: ClipStageSource = {
    status: "production",
    phaseA: { clips: [{ clipNumber: 1, editedAt: "2026-02-01T00:00:00.000Z" }] },
    frames: [
      frame(1, "start", "completed", "2026-01-01T00:00:00.000Z"),
      frame(1, "end", "completed", "2026-01-01T00:00:00.000Z"),
    ],
    clips: [],
  };
  assert.deepEqual(planRemaining(project), { frames: [], videos: [], cost: 0 });
});

test("empty plan when everything is done", () => {
  const project: ClipStageSource = {
    status: "ready",
    phaseA: { clips: [{ clipNumber: 1 }] },
    frames: done(1),
    clips: [clip(1, "completed")],
  };
  assert.deepEqual(planRemaining(project), { frames: [], videos: [], cost: 0 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/production-plan.test.ts`
Expected: FAIL — cannot find module `./production-plan`.

- [ ] **Step 3: Implement `src/lib/production-plan.ts`**

```ts
import { clipStatesFor, type ClipStageSource } from "@/lib/clip-stage";

// Credits per action. Frames are 1 each (start + end), a clip video is 1.
export const FRAME_COST = 1;
export const FRAMES_COST = 2;
export const VIDEO_COST = 1;

export type RemainingPlan = {
  // Clips that get both frames submitted.
  frames: number[];
  // Clips that get a video submitted.
  videos: number[];
  cost: number;
};

// "補齊剩餘": fill gaps only. Never touches generating, finished, or stale clips.
export function planRemaining(project: ClipStageSource): RemainingPlan {
  const frames: number[] = [];
  const videos: number[] = [];
  for (const state of clipStatesFor(project)) {
    if (state.stage === "no_frames" || state.stage === "frames_failed") {
      frames.push(state.clipNumber);
    } else if (
      (state.stage === "frames_ready" || state.stage === "video_failed") &&
      !state.stale.frames
    ) {
      videos.push(state.clipNumber);
    }
  }
  return {
    frames,
    videos,
    cost: frames.length * FRAMES_COST + videos.length * VIDEO_COST,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/lib/production-plan.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/production-plan.ts src/lib/production-plan.test.ts
git commit -m "feat(production): plan and price the fill-remaining action"
```

---

### Task 4: Per-clip Phase B

**Files:**
- Create: `src/lib/director/phase-b-clip-prompt.ts`
- Test: `src/lib/director/phase-b-clip-prompt.test.ts`
- Modify: `src/lib/director/schemas.ts`
- Modify: `src/lib/director/run-phase-b.ts`

**Interfaces:**
- Produces: `phaseBClipSchema`; `clipPhaseBUserPrompt(input: { phaseA: PhaseAProposal; clipNumber: number; languageLabel: string; languageSublabel: string; characterLine: string }): string`; `runPhaseBForClip(input: { skill: Skill; style: Style; phaseA: PhaseAProposal; clipNumber: number; language?: VoLanguage; characterImageUrl?: string; cast?: CastMember[] }): Promise<PhaseBPrompt>`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/director/phase-b-clip-prompt.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { PhaseAProposal } from "@/types/project";
import { clipPhaseBUserPrompt } from "./phase-b-clip-prompt";

function proposal(loopMode: PhaseAProposal["loopMode"] = "linear"): PhaseAProposal {
  const row = (clipNumber: number, scene: string) => ({
    clipNumber,
    timeRange: `${(clipNumber - 1) * 5}-${clipNumber * 5}s`,
    durationSeconds: 5,
    narrativeJob: "job",
    explainerScene: scene,
    motionCamera: `camera ${clipNumber}`,
    englishVo: `vo ${clipNumber}`,
    bgmSfx: "none",
  });
  return {
    englishTitle: "T",
    localizedTitle: "標題",
    targetDuration: "15s",
    clipCount: 3,
    loopMode,
    coreMessage: "m",
    hookStrategy: "h",
    aspectRatio: "16:9",
    visualWorld: "w",
    narrator: "n",
    englishWordCount: 10,
    characterLock: "lock",
    palette: "p",
    bgmDirection: "b",
    narrativeArc: "a",
    clips: [row(1, "coin drops"), row(2, "jar fills"), row(3, "house appears")],
  };
}

const base = {
  languageLabel: "English",
  languageSublabel: "American",
  characterLine: "Character reference image: none",
};

test("middle clip quotes both neighbours and asks for that clip only", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 2 });
  assert.match(prompt, /clip 2 ONLY/);
  assert.match(prompt, /follows clip 1, which ends on: coin drops/);
  assert.match(prompt, /hands off to clip 3, which opens with: house appears/);
  assert.match(prompt, /Character reference image: none/);
});

test("first clip has no previous neighbour", () => {
  const prompt = clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 1 });
  assert.match(prompt, /first clip/);
  assert.doesNotMatch(prompt, /follows clip/);
  assert.match(prompt, /hands off to clip 2/);
});

test("last clip: linear ends clean, infinite loops back to clip 1", () => {
  assert.match(
    clipPhaseBUserPrompt({ ...base, phaseA: proposal("linear"), clipNumber: 3 }),
    /last clip; end on a clean resting state/,
  );
  assert.match(
    clipPhaseBUserPrompt({ ...base, phaseA: proposal("infinite"), clipNumber: 3 }),
    /matches clip 1's opening/,
  );
});

test("unknown clip throws", () => {
  assert.throws(() => clipPhaseBUserPrompt({ ...base, phaseA: proposal(), clipNumber: 9 }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/director/phase-b-clip-prompt.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/director/phase-b-clip-prompt.ts`**

```ts
import type { PhaseAProposal } from "@/types/project";

// User prompt asking the director for ONE clip's video prompt. The whole
// approved Phase A is included for context; the neighbouring rows are quoted
// explicitly so the motion hands off cleanly between independently generated clips.
export function clipPhaseBUserPrompt(input: {
  phaseA: PhaseAProposal;
  clipNumber: number;
  languageLabel: string;
  languageSublabel: string;
  characterLine: string;
}) {
  const rows = input.phaseA.clips;
  const index = rows.findIndex((row) => row.clipNumber === input.clipNumber);
  if (index < 0) throw new Error(`找不到 clip ${input.clipNumber}`);
  const row = rows[index];
  const prev = rows[index - 1];
  const next = rows[index + 1];

  const opening = prev
    ? `It follows clip ${prev.clipNumber}, which ends on: ${prev.explainerScene} (${prev.motionCamera}). Start from that resting state.`
    : "It is the first clip; open cold on the START frame.";
  const closing = next
    ? `It hands off to clip ${next.clipNumber}, which opens with: ${next.explainerScene}. End on a state that leads into it.`
    : input.phaseA.loopMode === "infinite"
      ? "It is the last clip and the video loops: end on a state that matches clip 1's opening."
      : "It is the last clip; end on a clean resting state.";

  return [
    `Approved Phase A JSON:\n${JSON.stringify(input.phaseA, null, 2)}`,
    `Voiceover language: ${input.languageLabel} (${input.languageSublabel})`,
    input.characterLine,
    `Write the Phase B video prompt for clip ${row.clipNumber} ONLY (${row.timeRange}, ${row.durationSeconds}s).`,
    opening,
    closing,
    "Return a single object { clipNumber, durationSeconds, prompt }.",
  ].join("\n\n");
}
```

- [ ] **Step 4: Add the schema**

In `src/lib/director/schemas.ts` append:

```ts
// One clip's video prompt (per-clip Phase B).
export const phaseBClipSchema = z.object({
  clipNumber: z.number().int().min(1),
  durationSeconds: z.number().min(3).max(8),
  prompt: z.string(),
});
```

- [ ] **Step 5: Add `runPhaseBForClip` to `src/lib/director/run-phase-b.ts`**

Extract the system prompt into a helper and add the per-clip runner. The file becomes:

```ts
import { generateText, Output } from "ai";
import { castLineForPhaseB } from "@/lib/characters/cast-prompt";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { skillPromptForPhaseB } from "@/lib/director/load-skill-prompt";
import { directorModel } from "@/lib/director/model";
import { clipPhaseBUserPrompt } from "@/lib/director/phase-b-clip-prompt";
import { phaseBClipSchema, phaseBSchema } from "@/lib/director/schemas";
import type { Style } from "@/lib/styles";
import type { CastMember } from "@/types/character";
import type {
  PhaseAProposal,
  PhaseBPackage,
  PhaseBPrompt,
  VoLanguage,
} from "@/types/project";
import type { Skill } from "@/types/skill";

type PhaseBInput = {
  skill: Skill;
  style: Style;
  phaseA: PhaseAProposal;
  language?: VoLanguage;
  characterImageUrl?: string;
  cast?: CastMember[];
};

// Shared director contract for video prompts (batch and per-clip).
function phaseBSystemPrompt(input: PhaseBInput, languageLabel: string, languageSublabel: string) {
  return `${skillPromptForPhaseB(input.skill, input.style)}

You are executing Phase B only after explicit approval of the current Phase A.
Return standalone Wan 3 video prompts that follow the skill prompt contract. Do not invent new facts.
Each clip is image-to-video: the approved START storyboard frame is supplied as the first frame and the END frame as a reference, so describe the motion from the start state to the end state rather than re-describing the static scene.
Spoken dialogue in every prompt must be quoted verbatim from the approved englishVo lines, which are in ${languageLabel} (${languageSublabel}). Tell the video model explicitly that the narrator speaks ${languageLabel}.`;
}

function characterLine(input: PhaseBInput) {
  return input.cast && input.cast.length > 0
    ? castLineForPhaseB(input.cast)
    : `Character reference image: ${input.characterImageUrl || "none"}`;
}

// Legacy batch runner: kept for reading old projects; the per-clip flow uses runPhaseBForClip.
export async function runPhaseB(input: PhaseBInput): Promise<PhaseBPackage> {
  const language = LANGUAGE_PRESETS[input.language || "en"];
  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: phaseBSchema }),
    system: phaseBSystemPrompt(input, language.label, language.sublabel),
    prompt: `Approved Phase A JSON:
${JSON.stringify(input.phaseA, null, 2)}

Voiceover language: ${language.label} (${language.sublabel})
${characterLine(input)}

Write the Phase B production package now.`,
  });

  if (!output) {
    throw new Error("產片 prompt 產生失敗");
  }
  return output;
}

// Per-clip Phase B: one video prompt, with the neighbouring clips as hand-off context.
export async function runPhaseBForClip(
  input: PhaseBInput & { clipNumber: number },
): Promise<PhaseBPrompt> {
  const language = LANGUAGE_PRESETS[input.language || "en"];
  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: phaseBClipSchema }),
    system: phaseBSystemPrompt(input, language.label, language.sublabel),
    prompt: clipPhaseBUserPrompt({
      phaseA: input.phaseA,
      clipNumber: input.clipNumber,
      languageLabel: language.label,
      languageSublabel: language.sublabel,
      characterLine: characterLine(input),
    }),
  });

  if (!output) {
    throw new Error("產片 prompt 產生失敗");
  }
  // The model may echo a wrong number; trust the caller.
  return { ...output, clipNumber: input.clipNumber };
}
```

- [ ] **Step 6: Run tests and type-check**

Run: `npx tsx --test src/lib/director/phase-b-clip-prompt.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/director/phase-b-clip-prompt.ts src/lib/director/phase-b-clip-prompt.test.ts src/lib/director/schemas.ts src/lib/director/run-phase-b.ts
git commit -m "feat(director): per-clip Phase B prompt with neighbour hand-off context"
```

---

### Task 5: Pure job reconciliation

**Files:**
- Create: `src/lib/higgsfield/reconcile.ts`
- Test: `src/lib/higgsfield/reconcile.test.ts`

**Interfaces:**
- Consumes: `normalizeProjectStatus` (Task 1), `isProjectReady`, `ClipStageSource` (Task 2).
- Produces: `toFrameStatus(status?: GenerationStatus): ClipFrame["status"]`, `toClipStatus(status?: GenerationStatus): ProjectClip["status"]`, `reconcileFrames(frames: ClipFrame[], jobs: GenerationJob[]): ClipFrame[]`, `reconcileClips(clips: ProjectClip[], jobs: GenerationJob[]): ProjectClip[]`, `nextProjectStatus(project: ClipStageSource): ProjectStatus`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/higgsfield/reconcile.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { GenerationJob } from "@/types/generation-job";
import type { ClipFrame, ProjectClip } from "@/types/project";
import { nextProjectStatus, reconcileClips, reconcileFrames } from "./reconcile";

function job(partial: Partial<GenerationJob> & Pick<GenerationJob, "kind" | "clipIndex" | "status">): GenerationJob {
  return {
    _id: new ObjectId(),
    projectId: new ObjectId(),
    model: "m",
    requestId: Math.random().toString(36).slice(2),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...partial,
  };
}

const frames: ClipFrame[] = [
  { clipNumber: 1, position: "start", prompt: "p", status: "queued" },
  { clipNumber: 1, position: "end", prompt: "p", status: "queued" },
  { clipNumber: 2, position: "start", prompt: "p", status: "completed", blobUrl: "kept" },
];

test("reconcileFrames takes status/urls from the matching job and keeps frames without one", () => {
  const next = reconcileFrames(frames, [
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "completed", blobUrl: "b1", outputUrl: "o1" }),
    job({ kind: "frame", clipIndex: 0, framePosition: "end", status: "nsfw", error: "nsfw" }),
    job({ kind: "video", clipIndex: 0, status: "completed", blobUrl: "not-a-frame" }),
  ]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "b1");
  assert.equal(next[1].status, "failed");
  assert.equal(next[1].error, "nsfw");
  assert.equal(next[2].blobUrl, "kept");
});

test("newest job wins when several exist for one slot", () => {
  const next = reconcileFrames([frames[0]], [
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "completed", blobUrl: "old", createdAt: new Date("2026-01-01T00:00:00Z") }),
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "in_progress", createdAt: new Date("2026-01-02T00:00:00Z") }),
  ]);
  assert.equal(next[0].status, "in_progress");
  assert.equal(next[0].blobUrl, undefined);
});

test("reconcileClips maps video jobs per clip and leaves others alone", () => {
  const clips: ProjectClip[] = [
    { clipNumber: 1, durationSeconds: 5, prompt: "v", status: "queued" },
    { clipNumber: 2, durationSeconds: 5, prompt: "v", status: "failed", error: "llm" },
  ];
  const next = reconcileClips(clips, [
    job({ kind: "video", clipIndex: 0, status: "completed", blobUrl: "vid" }),
  ]);
  assert.equal(next[0].status, "completed");
  assert.equal(next[0].blobUrl, "vid");
  assert.equal(next[1].status, "failed");
  assert.equal(next[1].error, "llm");
});

test("nextProjectStatus: production ↔ ready, other statuses untouched", () => {
  const rows = { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] };
  const done: ProjectClip = { clipNumber: 1, durationSeconds: 5, prompt: "v", status: "completed" };
  const done2: ProjectClip = { ...done, clipNumber: 2 };
  assert.equal(nextProjectStatus({ status: "production", phaseA: rows, clips: [done] }), "production");
  assert.equal(nextProjectStatus({ status: "production", phaseA: rows, clips: [done, done2] }), "ready");
  assert.equal(nextProjectStatus({ status: "ready", phaseA: rows, clips: [done, { ...done2, status: "queued" }] }), "production");
  assert.equal(nextProjectStatus({ status: "generating", phaseA: rows, clips: [] }), "production");
  assert.equal(nextProjectStatus({ status: "awaiting_approval", phaseA: rows, clips: [] }), "awaiting_approval");
  assert.equal(nextProjectStatus({ status: "phase_a", clips: [] }), "phase_a");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/higgsfield/reconcile.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/higgsfield/reconcile.ts`**

```ts
import { isProjectReady, type ClipStageSource } from "@/lib/clip-stage";
import { normalizeProjectStatus } from "@/lib/project-status";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";
import type { ClipFrame, ProjectClip, ProjectStatus } from "@/types/project";

export function toFrameStatus(status?: GenerationStatus): ClipFrame["status"] {
  if (status === "completed") return "completed";
  if (status === "failed" || status === "nsfw") return "failed";
  if (status === "in_progress") return "in_progress";
  return "queued";
}

export const toClipStatus: (status?: GenerationStatus) => ProjectClip["status"] =
  toFrameStatus;

// A redo leaves the previous job around until it is deleted; the newest one is current.
function newest(jobs: GenerationJob[]): GenerationJob | undefined {
  return jobs
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

// Copy status/urls from each frame's newest job; frames without a job keep their stored values.
export function reconcileFrames(frames: ClipFrame[], jobs: GenerationJob[]): ClipFrame[] {
  return frames.map((frame) => {
    const job = newest(
      jobs.filter(
        (item) =>
          item.kind === "frame" &&
          item.clipIndex === frame.clipNumber - 1 &&
          item.framePosition === frame.position,
      ),
    );
    if (!job) return frame;
    return {
      ...frame,
      status: toFrameStatus(job.status),
      outputUrl: job.outputUrl,
      blobUrl: job.blobUrl,
      error: job.error,
    };
  });
}

// Same for clip videos.
export function reconcileClips(clips: ProjectClip[], jobs: GenerationJob[]): ProjectClip[] {
  return clips.map((clip) => {
    const job = newest(
      jobs.filter((item) => item.kind === "video" && item.clipIndex === clip.clipNumber - 1),
    );
    if (!job) return clip;
    return {
      ...clip,
      status: toClipStatus(job.status),
      outputUrl: job.outputUrl,
      blobUrl: job.blobUrl,
      error: job.error,
    };
  });
}

// Only production-family projects flip between production and ready; every
// other status passes through (normalised, so legacy values never get re-written).
export function nextProjectStatus(project: ClipStageSource): ProjectStatus {
  const status = normalizeProjectStatus(project.status);
  if (status !== "production" && status !== "ready") return status;
  return isProjectReady(project) ? "ready" : "production";
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/lib/higgsfield/reconcile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/higgsfield/reconcile.ts src/lib/higgsfield/reconcile.test.ts
git commit -m "feat(pipeline): pure per-clip reconciliation of frames, clips and status"
```

---

### Task 6: Backend per-clip flow (pipeline, jobs, existing actions)

This task replaces the batch flow. It is one commit because `pipeline.ts`, `jobs.ts`, `generation.ts`, `projects.ts` and one import in `new-project-form.tsx` must change together to type-check.

**Files:**
- Modify: `src/lib/higgsfield/frame-prompts.ts`
- Modify: `src/lib/higgsfield/pipeline.ts`
- Modify: `src/lib/director/jobs.ts`
- Modify: `src/lib/actions/generation.ts`
- Modify: `src/lib/actions/projects.ts` (`retryProjectAction`)
- Modify: `src/app/app/projects/new/new-project-form.tsx` (remove `approveAndGenerateAction` only)

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces (pipeline): `submitStillIfNeeded(project: Project): Promise<void>`, `stillBlocker(project: Project): Promise<string | null>`, `regenerateFrames(project, targets)` (now stamps `submittedAt` and sets `production`), `submitClipVideoJob(project: Project, clipNumber: number, prompt: PhaseBPrompt): Promise<void>`, `syncProjectFromJobs(projectId)` (exported), `refreshProjectJobs`, `applyJobStatus` unchanged signatures.
- Produces (frame-prompts): `framesWithClip(project: Project, clipNumber: number): ClipFrame[]`.
- Produces (jobs): `runStillJob(projectId: ObjectId)`, `runClipVideoJob(projectId: ObjectId, clipNumber: number)`.
- Produces (generation actions): `approveStoryboardAction` (free), `regenerateFrameAction`, `updateClipStoryboardAction`, `refreshGenerationAction` (all accept production-like statuses). `approveAndGenerateAction` is deleted.

- [ ] **Step 1: Add `framesWithClip` to `src/lib/higgsfield/frame-prompts.ts`**

Append after `initialFrames`:

```ts
// Frames array with a fresh queued start + end entry for one clip (prompt
// rebuilt from the current storyboard, old sketch revision dropped). Other
// clips' entries are untouched.
export function framesWithClip(project: Project, clipNumber: number): ClipFrame[] {
  const others = (project.frames || []).filter((frame) => frame.clipNumber !== clipNumber);
  const submittedAt = new Date().toISOString();
  const own = (["start", "end"] as FramePosition[]).map((position) => ({
    clipNumber,
    position,
    prompt: buildFramePrompt(project, clipNumber, position),
    status: "queued" as const,
    submittedAt,
  }));
  return [...others, ...own].sort(
    (a, b) => a.clipNumber - b.clipNumber || (a.position === "start" ? -1 : 1),
  );
}
```

- [ ] **Step 2: Rewrite `src/lib/higgsfield/pipeline.ts`**

Replace the whole file with:

```ts
import { ObjectId } from "mongodb";
import { castReferenceUrls } from "@/lib/characters/cast-prompt";
import { syncCharacterJob } from "@/lib/characters/sync";
import {
  generationJobsCollection,
  skillsCollection,
  videosCollection,
} from "@/lib/collections";
import { refundCredits } from "@/lib/billing/credits";
import { flattenToCanvas } from "@/lib/higgsfield/flatten";
import { buildFramePrompt, videoStyle } from "@/lib/higgsfield/frame-prompts";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
  submitClipVideo,
  submitImage,
} from "@/lib/higgsfield/generate";
import { persistMedia } from "@/lib/higgsfield/persist";
import {
  nextProjectStatus,
  reconcileClips,
  reconcileFrames,
} from "@/lib/higgsfield/reconcile";
import { FRAME_COST, VIDEO_COST } from "@/lib/production-plan";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";
import type {
  ClipFrame,
  FramePosition,
  FrameRevision,
  PhaseBPrompt,
  Project,
} from "@/types/project";
import type { Skill } from "@/types/skill";

// ---------- prompts ----------

function stillPrompt(project: Project) {
  const style = videoStyle(project);
  const lock = project.phaseA?.characterLock || "default explainer everyman";
  return [
    `Character visual lock still for a ${style.name} explainer video.`,
    `Canvas: ${style.canvas}. Look: ${style.look}. Never: ${style.negatives}.`,
    `Front three-quarter standing pose, identical character: ${lock}.`,
    `Aspect ratio ${project.aspectRatio}.`,
  ].join(" ");
}

async function loadSkill(project: Project): Promise<Skill> {
  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill) throw new Error("找不到風格");
  return skill;
}

// ---------- character still (free) ----------

// Projects without a cast lock the character with a generated still. Submit it
// once; failed attempts are replaced. No-op when a cast or a still already exists.
export async function submitStillIfNeeded(project: Project) {
  if (project.cast && project.cast.length > 0) return;
  if (project.characterStillUrl) return;
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();

  await jobs.deleteMany({
    projectId: project._id,
    kind: "still",
    status: { $in: ["failed", "nsfw"] },
  });
  const existing = await jobs.findOne({ projectId: project._id, kind: "still" });
  if (existing) return;

  const skill = await loadSkill(project);
  const still = await submitImage({
    model: skill.higgsfieldDefaults.imageModel,
    prompt: stillPrompt(project),
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    referenceImageUrls: [project.characterImageUrl],
  });
  await jobs.insertOne({
    projectId: project._id,
    clipIndex: -1,
    kind: "still",
    model: skill.higgsfieldDefaults.imageModel,
    requestId: still.request_id,
    statusUrl: still.status_url,
    status: (still.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await projects.updateOne(
    { _id: project._id },
    { $unset: { stillError: "" }, $set: { updatedAt: new Date() } },
  );
}

// Frames need the character lock. Returns a user-facing reason to wait (and
// kicks the still off) or null when frames may be submitted now.
export async function stillBlocker(project: Project): Promise<string | null> {
  if (project.cast && project.cast.length > 0) return null;
  if (project.characterStillUrl) return null;
  await submitStillIfNeeded(project);
  return "角色定裝圖正在產生，請稍候再試";
}

// ---------- frames ----------

// Submit a single frame request and record the job. Redo references precede
// character locks so the prompt can identify them by attachment order.
async function submitOneFrame(
  project: Project,
  skill: Skill,
  clipNumber: number,
  position: FramePosition,
  options: { revision?: FrameRevision; styleRefUrl?: string } = {},
) {
  const jobs = await generationJobsCollection();
  const lockRefs =
    project.cast && project.cast.length > 0
      ? castReferenceUrls(project.cast)
      : [project.characterStillUrl, project.characterImageUrl];
  const submitted = await submitImage({
    model: skill.higgsfieldDefaults.imageModel,
    prompt: buildFramePrompt(project, clipNumber, position, options),
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    referenceImageUrls: [
      options.revision?.annotatedUrl,
      options.styleRefUrl,
      ...lockRefs,
    ].filter((url): url is string => Boolean(url)),
  });
  await jobs.insertOne({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "frame",
    framePosition: position,
    model: skill.higgsfieldDefaults.imageModel,
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: (submitted.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export type FrameTarget = {
  clipNumber: number;
  position: FramePosition;
  // Director's remark / annotated reference for this redo, if any.
  revision?: FrameRevision;
};

// Submit one or more frames (caller already charged 1 credit each). Each old
// job is replaced, the frame is stamped `submittedAt`, and the project sits in
// `production` until the jobs settle. `project` must carry the storyboard the
// prompts should be built from (re-fetch after editing a clip).
export async function regenerateFrames(project: Project, targets: FrameTarget[]) {
  if (targets.length === 0) return;
  const skill = await loadSkill(project);
  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  const submittedAt = new Date().toISOString();

  for (const target of targets) {
    await jobs.deleteMany({
      projectId: project._id,
      kind: "frame",
      clipIndex: target.clipNumber - 1,
      framePosition: target.position,
    });
    const sibling = project.frames?.find(
      (frame) =>
        frame.clipNumber === target.clipNumber &&
        frame.position !== target.position &&
        frame.status === "completed",
    );
    await submitOneFrame(project, skill, target.clipNumber, target.position, {
      revision: target.revision,
      styleRefUrl: sibling?.blobUrl || sibling?.outputUrl,
    });
    await projects.updateOne(
      { _id: project._id },
      {
        $set: {
          "frames.$[frame].status": "queued",
          "frames.$[frame].submittedAt": submittedAt,
          "frames.$[frame].error": undefined,
        },
      },
      {
        arrayFilters: [
          { "frame.clipNumber": target.clipNumber, "frame.position": target.position },
        ],
      },
    );
  }

  await projects.updateOne(
    { _id: project._id },
    { $set: { status: "production", updatedAt: new Date() } },
  );
  await syncProjectFromJobs(project._id);
}

// Single-frame convenience wrapper.
export async function regenerateFrame(
  project: Project,
  clipNumber: number,
  position: FramePosition,
  revision?: FrameRevision,
) {
  await regenerateFrames(project, [{ clipNumber, position, revision }]);
}

// ---------- video clips ----------

function frameUrl(
  frames: ClipFrame[] | undefined,
  clipNumber: number,
  position: FramePosition,
) {
  const frame = frames?.find(
    (item) => item.clipNumber === clipNumber && item.position === position,
  );
  return frame?.status === "completed"
    ? frame.blobUrl || frame.outputUrl
    : undefined;
}

// Submit one clip's video (caller charged 1 credit and wrote the prompt).
// Replaces any previous video job for that clip.
export async function submitClipVideoJob(
  project: Project,
  clipNumber: number,
  prompt: PhaseBPrompt,
) {
  const skill = await loadSkill(project);
  const jobs = await generationJobsCollection();
  await jobs.deleteMany({ projectId: project._id, kind: "video", clipIndex: clipNumber - 1 });

  const fallbackRef =
    project.cast?.[0]?.blueprintUrl || project.characterStillUrl || project.characterImageUrl;
  const start = frameUrl(project.frames, clipNumber, "start");
  const end = frameUrl(project.frames, clipNumber, "end");
  const submitted = await submitClipVideo({
    model: skill.higgsfieldDefaults.videoModel,
    prompt: prompt.prompt,
    aspectRatio: project.aspectRatio,
    durationSeconds: prompt.durationSeconds,
    startImageUrl: start || fallbackRef,
    referenceImageUrls: [end, start ? fallbackRef : undefined],
  });
  await jobs.insertOne({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "video",
    model: skill.higgsfieldDefaults.videoModel,
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: (submitted.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await syncProjectFromJobs(project._id);
}

// ---------- status sync ----------

export async function applyJobStatus(input: {
  requestId: string;
  status: string;
  outputUrl?: string;
}) {
  const jobs = await generationJobsCollection();
  const job = await jobs.findOne({ requestId: input.requestId });
  if (!job) return;

  const status = input.status as GenerationStatus;
  const nowFailed = status === "failed" || status === "nsfw";
  const wasFailed = job.status === "failed" || job.status === "nsfw";

  // Character sheets persist and refund in their own sync; no video to touch.
  if (job.kind === "character") {
    await syncCharacterJob(job, status, input.outputUrl);
    await jobs.updateOne(
      { _id: job._id },
      {
        $set: {
          status,
          outputUrl: input.outputUrl,
          error: nowFailed ? status : undefined,
          updatedAt: new Date(),
        },
      },
    );
    return;
  }

  if (!job.projectId) return;
  const projectId = job.projectId;
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });

  let blobUrl = job.blobUrl;
  if (input.outputUrl && (status === "completed" || status === "nsfw")) {
    const folder =
      job.kind === "still" ? "stills" : job.kind === "frame" ? "frames" : "clips";
    const transformOptions =
      project && (job.kind === "still" || job.kind === "frame")
        ? {
            transform: (buffer: Buffer) =>
              flattenToCanvas(buffer, videoStyle(project).canvasColor).catch(
                (error: unknown) => {
                  // Keep the original bytes rather than failing the job, but
                  // leave a trace so a broken flatten is not invisible.
                  console.error(
                    "[higgsfield] flatten failed; persisting original bytes",
                    { requestId: job.requestId, error },
                  );
                  return buffer;
                },
              ),
          }
        : undefined;
    blobUrl = await persistMedia(
      input.outputUrl,
      `explainer/${projectId.toHexString()}/${folder}/${job.requestId}`,
      transformOptions,
    );
  }

  await jobs.updateOne(
    { _id: job._id },
    {
      $set: {
        status,
        outputUrl: input.outputUrl,
        blobUrl,
        error: nowFailed ? status : undefined,
        updatedAt: new Date(),
      },
    },
  );

  // Each frame is 1 credit and each clip video is 1 credit; hand it back the
  // moment that job fails (once — `wasFailed` guards repeated webhooks).
  if (project && nowFailed && !wasFailed) {
    if (job.kind === "frame") await refundCredits(project.clerkUserId, FRAME_COST);
    if (job.kind === "video") await refundCredits(project.clerkUserId, VIDEO_COST);
  }

  await syncProjectFromJobs(projectId);
}

// Reconcile every clip from its newest jobs, regardless of project status.
export async function syncProjectFromJobs(projectId: ObjectId) {
  const projects = await videosCollection();
  const jobs = await generationJobsCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;

  const allJobs = await jobs.find({ projectId }).toArray();
  const still = allJobs
    .filter((job) => job.kind === "still")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const set: Partial<Pick<Project, "characterStillUrl" | "stillError">> = {};
  const stillUrl = still?.blobUrl || still?.outputUrl;
  if (still?.status === "completed" && stillUrl && !project.characterStillUrl) {
    set.characterStillUrl = stillUrl;
  } else if (
    still &&
    (still.status === "failed" || still.status === "nsfw") &&
    !project.characterStillUrl
  ) {
    set.stillError = "角色定裝圖產生失敗，下次產生畫格時會自動重試";
  }

  const frames = reconcileFrames(project.frames || [], allJobs);
  const clips = reconcileClips(project.clips, allJobs);
  const next = { ...project, ...set, frames, clips };

  await projects.updateOne(
    { _id: projectId },
    {
      $set: {
        ...set,
        frames,
        clips,
        status: nextProjectStatus(next),
        updatedAt: new Date(),
      },
    },
  );
}

export async function refreshProjectJobs(projectId: ObjectId) {
  const jobs = await generationJobsCollection();
  const pending = await jobs
    .find({
      projectId,
      status: { $in: ["queued", "in_progress"] },
    })
    .toArray();

  // Fetch statuses in parallel, then apply sequentially so the project
  // sync never races itself.
  const results = await Promise.all(
    pending.map(async (job) => {
      if (!job.statusUrl) return null;
      try {
        return { job, status: await fetchHiggsfieldStatus(job.statusUrl) };
      } catch (error) {
        await jobs.updateOne(
          { _id: job._id },
          {
            $set: {
              error: error instanceof Error ? error.message : "status failed",
              updatedAt: new Date(),
            },
          },
        );
        return null;
      }
    }),
  );

  for (const result of results) {
    if (!result) continue;
    await applyJobStatus({
      requestId: result.job.requestId,
      status: result.status.status,
      outputUrl: mediaUrlFromResponse(result.status),
    });
  }

  await syncProjectFromJobs(projectId);
}

export type { GenerationJob };
```

Note: `"frames.$[frame].error": undefined` — the Mongo driver is configured with default `ignoreUndefined: false`, which stores `null`. That is fine for `error?: string` display (`clip.error || ""`), but if `tsc` complains about `undefined` in `$set`, use `$unset: { "frames.$[frame].error": "" }` in a separate `updateOne` instead.

- [ ] **Step 3: Rewrite `src/lib/director/jobs.ts`**

Replace the imports and the two removed jobs. Final file:

```ts
import type { ObjectId } from "mongodb";
import { refundCredits } from "@/lib/billing/credits";
import { skillsCollection, videosCollection } from "@/lib/collections";
import { keepProposalRegenerateClips } from "@/lib/director/phase-a-edit";
import { runPhaseA } from "@/lib/director/run-phase-a";
import { runPhaseBForClip } from "@/lib/director/run-phase-b";
import { videoStyle } from "@/lib/higgsfield/frame-prompts";
import { submitClipVideoJob, submitStillIfNeeded } from "@/lib/higgsfield/pipeline";
import { VIDEO_COST } from "@/lib/production-plan";

// Background jobs scheduled with next/server `after()` so the UI can poll
// instead of blocking on the LLM / video provider round-trips.

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// Phase A: write the storyboard proposal for a freshly created or revised project.
export async function runPhaseAJob(
  projectId: ObjectId,
  revisionNote?: string,
  options?: { clipsOnly?: boolean },
) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;

  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill) {
    await projects.updateOne(
      { _id: projectId },
      { $set: { status: "failed", error: "找不到風格", updatedAt: new Date() } },
    );
    return;
  }

  try {
    const phaseA = await runPhaseA({
      skill,
      style: videoStyle(project),
      source: project.source,
      aspectRatio: project.aspectRatio,
      durationPreset: project.durationPreset,
      language: project.language,
      characterImageUrl: project.characterImageUrl,
      cast: project.cast,
      currentDraft: project.phaseA,
      revisionNote,
      clipsOnly: options?.clipsOnly,
    });
    const nextPhaseA =
      options?.clipsOnly && project.phaseA
        ? keepProposalRegenerateClips(project.phaseA, phaseA)
        : phaseA;

    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          phaseA: nextPhaseA,
          status: "awaiting_approval",
          error: undefined,
          updatedAt: new Date(),
        },
      },
    );
  } catch (error) {
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          status: "failed",
          error: errorMessage(error, "解說提案失敗"),
          updatedAt: new Date(),
        },
      },
    );
  }
}

// Character still after approval (free). Failure is recorded on the project
// and retried by the next frame request, never fatal.
export async function runStillJob(projectId: ObjectId) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;
  try {
    await submitStillIfNeeded(project);
  } catch (error) {
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          stillError: errorMessage(error, "角色定裝圖送出失敗"),
          updatedAt: new Date(),
        },
      },
    );
  }
}

// One clip's video: write its Phase B prompt, then submit. The caller charged
// VIDEO_COST and marked the clip `queued`; any failure here refunds and marks it failed.
export async function runClipVideoJob(projectId: ObjectId, clipNumber: number) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project?.phaseA) return;

  try {
    const skills = await skillsCollection();
    const skill = await skills.findOne({ _id: project.skillId });
    if (!skill) throw new Error("找不到風格");

    const prompt = await runPhaseBForClip({
      skill,
      style: videoStyle(project),
      phaseA: project.phaseA,
      clipNumber,
      language: project.language,
      characterImageUrl: project.characterImageUrl,
      cast: project.cast,
    });
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          "clips.$[clip].prompt": prompt.prompt,
          "clips.$[clip].durationSeconds": prompt.durationSeconds,
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
    );

    const fresh = await projects.findOne({ _id: projectId });
    if (!fresh) return;
    await submitClipVideoJob(fresh, clipNumber, prompt);
  } catch (error) {
    await refundCredits(project.clerkUserId, VIDEO_COST);
    await projects.updateOne(
      { _id: projectId },
      {
        $set: {
          "clips.$[clip].status": "failed",
          "clips.$[clip].error": errorMessage(error, "產片失敗"),
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
    );
  }
}
```

- [ ] **Step 4: Update `src/lib/actions/generation.ts`**

Replace imports:

```ts
import { runStillJob } from "@/lib/director/jobs";
import { persistFrameAnnotation } from "@/lib/higgsfield/frame-annotation";
import { buildFramePrompt, framesWithClip } from "@/lib/higgsfield/frame-prompts";
import {
  refreshProjectJobs,
  regenerateFrame,
  regenerateFrames,
  stillBlocker,
} from "@/lib/higgsfield/pipeline";
import { isProductionLike } from "@/lib/project-status";
import { FRAMES_COST } from "@/lib/production-plan";
```

(drop `initialFrames`, `runFrameGenerationJob`, `runPhaseBAndGenerateJob`; keep the `ClipFrame` type import — it is still used below.)

Replace `approveStoryboardAction` body between the status check and the `updated` fetch with:

```ts
    // Approval is free: it opens per-clip production. Frames and videos are
    // charged when each clip is generated.
    await projects.updateOne(
      { _id: project._id },
      {
        $set: { status: "production", error: undefined, updatedAt: new Date() },
        $unset: { stillError: "" },
      },
    );
    // Projects without a cast lock the character with a still; start it now so
    // it is usually ready before the first frame request.
    after(() => runStillJob(project._id));
```

Update the comment above it to `// Storyboard approved → enter per-clip production (free).`

In `regenerateFrameAction`: replace

```ts
    if (project.status !== "frames_ready") {
      return { ok: false, error: "請等分鏡圖全部完成後再重新產生" };
    }
```
with
```ts
    if (!isProductionLike(project.status)) {
      return { ok: false, error: "請先核准分鏡" };
    }
```
and remove `$inc: { framesCreditCost: 1 },` from its `updateOne`.

In `updateClipStoryboardAction`: replace the status check with the same `isProductionLike` check (message `"請先核准分鏡"`), change `const cost = regenerate ? 2 : 0;` to `const cost = regenerate ? FRAMES_COST : 0;`, and replace the block from `// Apply the edit in memory first` through the `if (regenerate) { await regenerateFrames(...) }` with:

```ts
    // Apply the edit in memory first so frame prompts are rebuilt from the new text.
    const editedAt = new Date().toISOString();
    const clips = project.phaseA.clips.map((clip, index) =>
      index === clipIndex ? { ...clip, ...clean, editedAt } : clip,
    );
    const nextProject = { ...project, phaseA: { ...project.phaseA, clips } };

    // Frames need the character lock before they can be redrawn.
    if (regenerate) {
      const blocker = await stillBlocker(project);
      if (blocker) return { ok: false, error: blocker };
    }

    // With `regenerate`, this clip gets fresh queued entries (old sketches
    // described the old scene). Otherwise only refresh prompts for this clip
    // and the previous clip's end frame, which hands off to it.
    const frames: ClipFrame[] = regenerate
      ? framesWithClip(nextProject, clipNumber)
      : (project.frames || []).map((frame) => {
          const own = frame.clipNumber === clipNumber;
          const handoff = frame.clipNumber === clipNumber - 1 && frame.position === "end";
          if (!own && !handoff) return frame;
          return {
            ...frame,
            prompt: buildFramePrompt(nextProject, frame.clipNumber, frame.position, {
              revision: frame.revision,
            }),
          };
        });

    if (regenerate) await consumeCredits(user.clerkUserId, cost);
    await projects.updateOne(
      { _id: project._id },
      { $set: { "phaseA.clips": clips, frames, updatedAt: new Date() } },
    );

    if (regenerate) {
      try {
        await regenerateFrames({ ...nextProject, frames }, [
          { clipNumber, position: "start" },
          { clipNumber, position: "end" },
        ]);
      } catch (error) {
        // Nothing went out: give the credits back.
        await refundCredits(user.clerkUserId, cost);
        throw error;
      }
    }
```

Add `refundCredits` to the `@/lib/billing/credits` import. Keep the `ClipFrame` type import (it is used here).

Delete `approveAndGenerateAction` entirely (and its comment).

In `refreshGenerationAction` replace

```ts
    if (
      project.status === "generating" ||
      project.status === "frames_generating"
    ) {
      await refreshProjectJobs(id);
    }
```
with
```ts
    // Only pending jobs are polled, so this is cheap when nothing is running.
    if (isProductionLike(project.status)) {
      await refreshProjectJobs(id);
    }
```

- [ ] **Step 5: Simplify `retryProjectAction` in `src/lib/actions/projects.ts`**

Replace the block from `const jobs = await generationJobsCollection();` through the end of the `else { ... }` branch (the three-way `step` logic) with:

```ts
    const jobs = await generationJobsCollection();

    if (!video.phaseA) {
      // Storyboard never landed: rerun Phase A in the background.
      await videos.updateOne(
        { _id: video._id },
        { $set: { status: "phase_a", error: undefined, updatedAt: new Date() } },
      );
      after(() => runPhaseAJob(video._id));
    } else {
      // Legacy frame/video-stage failures: drop failed still jobs and reopen
      // per-clip production with whatever frames/clips already exist.
      await jobs.deleteMany({
        projectId: video._id,
        kind: "still",
        status: { $in: ["failed", "nsfw"] },
      });
      await videos.updateOne(
        { _id: video._id },
        {
          $set: { status: "production", error: undefined, updatedAt: new Date() },
          $unset: { stillError: "", framesSubmittedAt: "" },
        },
      );
    }
```

Remove the now-unused `failedStepFor` import from this file if nothing else uses it (check with `rg failedStepFor src/lib/actions/projects.ts`). Also remove `creditCost: nextPhaseA.clipCount` / `creditCost: applied.phaseA.clipCount` writes (`rg -n creditCost src/lib/actions/projects.ts`) — keep `creditCost: 0` on create only if the type still requires it (it is optional now, so remove it too).

- [ ] **Step 6: Minimal fix in `src/app/app/projects/new/new-project-form.tsx`**

Remove `approveAndGenerateAction` from the import list. Delete the `onApproveFrames` function. Change the `FramesTimeline` prop `onApprove={onApproveFrames}` to `onApprove={() => undefined} // batch approval removed; replaced by ClipProduction in Task 10`.

- [ ] **Step 7: Type-check, lint, run all tests**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/lib/**/*.test.ts src/lib/*.test.ts`
Expected: PASS. If `tsc` rejects `undefined` inside `$set` for `"frames.$[frame].error"`, switch that field to a separate `$unset` as noted in Step 2.

- [ ] **Step 8: Commit**

```bash
git add src/lib/higgsfield/frame-prompts.ts src/lib/higgsfield/pipeline.ts src/lib/director/jobs.ts src/lib/actions/generation.ts src/lib/actions/projects.ts src/app/app/projects/new/new-project-form.tsx
git commit -m "feat(pipeline): per-clip frames/video submission, free approval, per-job refunds"
```

---

### Task 7: Per-clip server actions

**Files:**
- Create: `src/lib/actions/clip-production.ts`

**Interfaces:**
- Consumes: `stillBlocker`, `regenerateFrames`, `framesWithClip` (Task 6), `runClipVideoJob` (Task 6), `planRemaining`, `FRAMES_COST`, `VIDEO_COST` (Task 3), `isProductionLike` (Task 1).
- Produces:
  ```ts
  type ProjectResult = { ok: true; project: PublicVideo } | { ok: false; error: string };
  type RemainingResult = { ok: true; project: PublicVideo; skipped: number[] } | { ok: false; error: string };
  generateClipFramesAction(projectId: string, clipNumber: number): Promise<ProjectResult>
  generateClipVideoAction(projectId: string, clipNumber: number): Promise<ProjectResult>
  generateRemainingAction(projectId: string): Promise<RemainingResult>
  ```

- [ ] **Step 1: Create the file**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/lib/billing/credits";
import { videosCollection } from "@/lib/collections";
import { runClipVideoJob } from "@/lib/director/jobs";
import { framesWithClip } from "@/lib/higgsfield/frame-prompts";
import { regenerateFrames, stillBlocker } from "@/lib/higgsfield/pipeline";
import { isProductionLike } from "@/lib/project-status";
import { FRAMES_COST, VIDEO_COST, planRemaining } from "@/lib/production-plan";
import { toPublicVideo, type PublicVideo } from "@/lib/serialize";
import type { Project } from "@/types/project";

type ProjectResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

type RemainingResult =
  | { ok: true; project: PublicVideo; skipped: number[] }
  | { ok: false; error: string };

function revalidateProject(projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/billing");
}

// Owner check + "storyboard approved" gate shared by every per-clip action.
async function loadProduction(
  projectId: string,
  clerkUserId: string,
): Promise<
  | { ok: true; project: Project & { phaseA: NonNullable<Project["phaseA"]> } }
  | { ok: false; error: string }
> {
  if (!ObjectId.isValid(projectId)) return { ok: false, error: "專案不存在" };
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: new ObjectId(projectId), clerkUserId });
  if (!project?.phaseA) return { ok: false, error: "專案不存在" };
  if (!isProductionLike(project.status)) {
    return { ok: false, error: "請先核准分鏡" };
  }
  return { ok: true, project: project as Project & { phaseA: NonNullable<Project["phaseA"]> } };
}

// Draw (or redraw) both frames of one clip. Cost: FRAMES_COST.
export async function generateClipFramesAction(
  projectId: string,
  clipNumber: number,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;
    const { project } = loaded;
    const projects = await videosCollection();

    const row = project.phaseA.clips.find((clip) => clip.clipNumber === clipNumber);
    if (!row) return { ok: false, error: "找不到這段分鏡" };

    // Frames need the character lock; this also kicks the still off if missing.
    const blocker = await stillBlocker(project);
    if (blocker) return { ok: false, error: blocker };

    await assertCanSpendCredits(user, FRAMES_COST);
    await consumeCredits(user.clerkUserId, FRAMES_COST);
    try {
      const frames = framesWithClip(project, clipNumber);
      await projects.updateOne(
        { _id: project._id },
        { $set: { frames, status: "production", updatedAt: new Date() } },
      );
      await regenerateFrames({ ...project, frames }, [
        { clipNumber, position: "start" },
        { clipNumber, position: "end" },
      ]);
    } catch (error) {
      // Submit failed before the jobs existed: give the credits back.
      await refundCredits(user.clerkUserId, FRAMES_COST);
      throw error;
    }

    const updated = await projects.findOne({ _id: project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生畫格失敗",
    };
  }
}

// Produce (or reproduce) one clip's video. Cost: VIDEO_COST. Phase B + submit
// run in a background job; the clip is marked `queued` here so the UI flips at once.
export async function generateClipVideoAction(
  projectId: string,
  clipNumber: number,
): Promise<ProjectResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;
    const { project } = loaded;
    const projects = await videosCollection();

    const row = project.phaseA.clips.find((clip) => clip.clipNumber === clipNumber);
    if (!row) return { ok: false, error: "找不到這段分鏡" };
    const framesDone = (["start", "end"] as const).every(
      (position) =>
        project.frames?.find(
          (frame) => frame.clipNumber === clipNumber && frame.position === position,
        )?.status === "completed",
    );
    if (!framesDone) return { ok: false, error: "這段的畫格還沒完成" };

    await assertCanSpendCredits(user, VIDEO_COST);

    // Atomic claim so a double click can never charge twice: either flip an
    // existing clip that is not in flight, or insert the clip if it has no entry.
    const submittedAt = new Date().toISOString();
    const existing = project.clips.find((clip) => clip.clipNumber === clipNumber);
    const claimed = existing
      ? await projects.findOneAndUpdate(
          {
            _id: project._id,
            clips: {
              $elemMatch: {
                clipNumber,
                status: { $nin: ["queued", "in_progress"] },
              },
            },
          },
          {
            $set: {
              "clips.$.status": "queued",
              "clips.$.submittedAt": submittedAt,
              status: "production",
              updatedAt: new Date(),
            },
            $unset: { "clips.$.error": "" },
          },
        )
      : await projects.findOneAndUpdate(
          { _id: project._id, "clips.clipNumber": { $ne: clipNumber } },
          {
            $push: {
              clips: {
                clipNumber,
                durationSeconds: row.durationSeconds,
                prompt: "",
                status: "queued",
                submittedAt,
              },
            },
            $set: { status: "production", updatedAt: new Date() },
          },
        );
    if (!claimed) return { ok: false, error: "這段正在生成中" };

    try {
      await consumeCredits(user.clerkUserId, VIDEO_COST);
    } catch (error) {
      // Charge failed after the claim: release it.
      await projects.updateOne(
        { _id: project._id },
        {
          $set: {
            "clips.$[clip].status": "failed",
            "clips.$[clip].error": error instanceof Error ? error.message : "扣款失敗",
          },
        },
        { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
      );
      throw error;
    }

    after(() => runClipVideoJob(project._id, clipNumber));

    const updated = await projects.findOne({ _id: project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產片失敗",
    };
  }
}

// "補齊剩餘": frames for clips without them, videos for clips whose frames are
// ready. Each clip is charged and submitted on its own; failures are reported
// as `skipped` and never block the others.
export async function generateRemainingAction(
  projectId: string,
): Promise<RemainingResult> {
  try {
    const user = await requireAppUser();
    const loaded = await loadProduction(projectId, user.clerkUserId);
    if (!loaded.ok) return loaded;

    const plan = planRemaining(loaded.project);
    if (plan.cost === 0) return { ok: false, error: "沒有需要補齊的段落" };
    await assertCanSpendCredits(user, plan.cost);

    const skipped: number[] = [];
    let firstError = "";
    for (const clipNumber of plan.frames) {
      const result = await generateClipFramesAction(projectId, clipNumber);
      if (!result.ok) {
        skipped.push(clipNumber);
        firstError ||= result.error;
      }
    }
    for (const clipNumber of plan.videos) {
      const result = await generateClipVideoAction(projectId, clipNumber);
      if (!result.ok) {
        skipped.push(clipNumber);
        firstError ||= result.error;
      }
    }
    if (skipped.length === plan.frames.length + plan.videos.length) {
      return { ok: false, error: firstError || "補齊失敗" };
    }

    const projects = await videosCollection();
    const updated = await projects.findOne({ _id: loaded.project._id });
    revalidateProject(projectId);
    return { ok: true, project: toPublicVideo(updated!), skipped };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "補齊失敗",
    };
  }
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. If `tsc` rejects the `$push` typed against `ProjectClip` (e.g. `prompt` required), it is present (`prompt: ""`); if it rejects `"clips.$.status"` string paths, cast the update document with `as Parameters<typeof projects.updateOne>[1]`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/clip-production.ts
git commit -m "feat(actions): per-clip frames, video and fill-remaining server actions"
```

---

### Task 8: Polling driven by `isProjectBusy`

**Files:**
- Modify: `src/app/app/projects/new/use-project-poll.ts`

**Interfaces:**
- Produces: `useProjectPoll(project: PublicVideo | null, onUpdate, onError?)` unchanged signature; `isInFlight` removed (no callers — verify with `rg isInFlight src`).

- [ ] **Step 1: Rewrite the hook**

```ts
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshGenerationAction } from "@/lib/actions/generation";
import { getProjectAction } from "@/lib/actions/projects";
import { isProjectBusy } from "@/lib/clip-stage";
import type { PublicVideo } from "@/lib/serialize";

const INTERVAL_MS = 3000;

// Poll the selected video while the director writes or any frame/video job is
// in flight; first tick is immediate. Provider statuses are refreshed too,
// except during Phase A (no provider jobs yet).
export function useProjectPoll(
  project: PublicVideo | null,
  onUpdate: (project: PublicVideo) => void,
  onError?: (message: string) => void,
) {
  const router = useRouter();
  const id = project?.id;
  const status = project?.status;
  const busy = project ? isProjectBusy(project) : false;

  useEffect(() => {
    if (!id || !busy) return;
    const needsJobRefresh = status !== "phase_a";
    let cancelled = false;

    async function tick() {
      if (needsJobRefresh) {
        const refreshed = await refreshGenerationAction(id!);
        if (cancelled) return;
        if (!refreshed.ok) {
          onError?.(refreshed.error);
          return;
        }
      }

      const result = await getProjectAction(id!);
      if (cancelled) return;
      if (result.ok) {
        onUpdate(result.project);
        // Settled: refresh the server render so lists/badges catch up.
        if (!isProjectBusy(result.project)) router.refresh();
      } else {
        onError?.(result.error);
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, status, busy, onUpdate, onError, router]);
}
```

- [ ] **Step 2: Type-check**

Run: `rg -n isInFlight src; npx tsc --noEmit`
Expected: no `isInFlight` callers; no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/app/projects/new/use-project-poll.ts
git commit -m "feat(poll): poll while any clip job is in flight"
```

---

### Task 9: Production UI — icons, frame tile, clip timeline

**Files:**
- Create: `src/components/project/production-icons.tsx`
- Create: `src/components/project/frame-tile.tsx`
- Create: `src/components/project/clip-timeline.tsx`

**Interfaces:**
- Produces:
  ```ts
  // production-icons.tsx
  PencilIcon({ className? }), RefreshIcon({ className? }), EditIcon({ className? }), ArrowIcon({ className? }), WarnIcon({ className? })
  // frame-tile.tsx
  FrameTile({ frame?: ClipFrame; position: FramePosition; aspectRatio: AspectRatio; canRegenerate: boolean; pending: boolean; stale?: boolean; onRegenerate: () => void; onOpen: () => void })
  // clip-timeline.tsx
  STAGE_LABEL: Record<ClipStage, string>
  ClipTimeline({ project: PublicVideo; states: ClipState[]; selected: number; onSelect: (clipNumber: number) => void })
  ```

- [ ] **Step 1: Create `production-icons.tsx`**

```tsx
// Small inline SVG icons shared by the production components.
export function PencilIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m4 20 4-1 10-10-3-3L5 16l-1 4Zm11-14 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EditIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4l10-10-4-4L4 16v4Zm10-14 4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowIcon({ className = "h-5 w-5 text-accent-ink/40" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WarnIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 2 21h20L12 3Zm0 7v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Create `frame-tile.tsx`** (extracted from `frames-timeline.tsx`, plus empty state and stale dimming)

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PencilIcon, RefreshIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { AspectRatio, ClipFrame, FramePosition } from "@/types/project";

const ease = [0.22, 1, 0.36, 1] as const;

export const ASPECT_CLASS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
};

export const FRAME_LABEL: Record<FramePosition, string> = {
  start: "起始",
  end: "結尾",
};

// One start/end frame: skeleton while generating, image when done (click to
// annotate + redo), failed state, or an empty "待畫格" placeholder when the
// clip has no frame entry yet.
export function FrameTile({
  frame,
  position,
  aspectRatio,
  canRegenerate,
  pending,
  stale = false,
  onRegenerate,
  onOpen,
}: {
  frame?: ClipFrame;
  position: FramePosition;
  aspectRatio: AspectRatio;
  canRegenerate: boolean;
  pending: boolean;
  // Drawn before the latest text edit; shown dimmed.
  stale?: boolean;
  onRegenerate: () => void;
  onOpen: () => void;
}) {
  const src = frame?.blobUrl || frame?.outputUrl;
  const completed = frame?.status === "completed" && src;
  const failed = frame?.status === "failed";
  const label = FRAME_LABEL[position];

  return (
    <figure className="min-w-0">
      <div
        className={`relative overflow-hidden rounded-xl border border-accent-ink/10 bg-paper ${ASPECT_CLASS[aspectRatio]}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {completed ? (
            <motion.button
              key={src}
              type="button"
              onClick={onOpen}
              aria-label={`放大並標註${label}畫格`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: stale ? 0.6 : 1, scale: 1 }}
              transition={{ duration: 0.4, ease }}
              className="group absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${label}畫格`}
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-accent-ink/70 to-transparent px-2 pb-2 pt-6 font-display text-[11px] font-bold text-paper opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <PencilIcon className="h-3.5 w-3.5" />
                點擊標註・重畫
              </span>
            </motion.button>
          ) : failed ? (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-xs font-semibold text-accent"
            >
              產圖失敗
            </motion.div>
          ) : !frame ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center border-2 border-dashed border-accent-ink/15 text-xs font-semibold text-muted"
            >
              待畫格
            </motion.div>
          ) : (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 overflow-hidden bg-accent-ink/5"
              aria-label="產圖中"
            >
              <motion.div
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="absolute inset-0 grid place-items-center text-accent-ink/40">
                {pending ? <Spinner className="h-5 w-5" /> : <PencilIcon />}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-accent-ink/85 px-2 py-0.5 font-display text-[10px] font-bold text-paper">
          {label}
        </span>
        {stale && completed ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
            舊版
          </span>
        ) : null}
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">
          {!frame
            ? "尚未產生"
            : completed
              ? "完成"
              : failed
                ? "失敗"
                : frame.status === "in_progress"
                  ? "生成中"
                  : "排隊中"}
        </span>
        {canRegenerate && (completed || failed) ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-full border border-accent-ink/15 bg-paper px-2.5 text-[11px] font-semibold transition hover:border-accent-ink/40"
          >
            <RefreshIcon />
            重畫 · 1
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 3: Create `clip-timeline.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { WarnIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { ClipStage, ClipState } from "@/lib/clip-stage";
import type { PublicVideo } from "@/lib/serialize";

export const STAGE_LABEL: Record<ClipStage, string> = {
  no_frames: "待畫格",
  frames_generating: "畫格中",
  frames_failed: "畫格失敗",
  frames_ready: "畫格完成",
  video_generating: "產片中",
  video_failed: "影片失敗",
  video_ready: "影片完成",
};

// Chip colour per stage (text colour is never the only cue: label + icon too).
const STAGE_CLASS: Record<ClipStage, string> = {
  no_frames: "border-dashed border-accent-ink/25 bg-paper text-muted",
  frames_generating: "border-[#d8b400]/60 bg-[#fff7cc] text-accent-ink",
  frames_failed: "border-accent/50 bg-accent/10 text-accent",
  frames_ready: "border-accent-ink/20 bg-paper text-accent-ink",
  video_generating: "border-[#d8b400]/60 bg-[#fff7cc] text-accent-ink",
  video_failed: "border-accent/50 bg-accent/10 text-accent",
  video_ready: "border-teal/50 bg-teal/15 text-[#0f766e]",
};

const BUSY: ReadonlySet<ClipStage> = new Set(["frames_generating", "video_generating"]);

// Horizontal rail of clip chips; the selected one drives the workspace below.
export function ClipTimeline({
  project,
  states,
  selected,
  onSelect,
}: {
  project: PublicVideo;
  states: ClipState[];
  selected: number;
  onSelect: (clipNumber: number) => void;
}) {
  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-1">
      <ol role="tablist" aria-label="Clip 時間軸" className="flex min-w-max gap-2">
        {states.map((state, index) => {
          const row = project.phaseA?.clips.find((item) => item.clipNumber === state.clipNumber);
          const thumb = project.frames.find(
            (frame) =>
              frame.clipNumber === state.clipNumber &&
              frame.position === "start" &&
              frame.status === "completed",
          );
          const src = thumb?.blobUrl || thumb?.outputUrl;
          const isSelected = state.clipNumber === selected;
          const stale = state.stale.frames || state.stale.video;
          return (
            <motion.li
              key={state.clipNumber}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelect(state.clipNumber)}
                className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl border px-3 py-1.5 text-left transition ${STAGE_CLASS[state.stage]} ${
                  isSelected ? "outline outline-2 outline-offset-2 outline-accent-ink" : "hover:-translate-y-0.5"
                }`}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-6 w-10 rounded object-cover" />
                ) : (
                  <span className="h-6 w-10 rounded border border-dashed border-current/40" aria-hidden />
                )}
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-xs font-bold">
                    #{state.clipNumber}
                    <span className="ml-1 font-normal text-[10px] text-current/70">{row?.timeRange}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                    {BUSY.has(state.stage) ? <Spinner className="h-3 w-3" /> : null}
                    {STAGE_LABEL[state.stage]}
                    {stale ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                        <WarnIcon />
                        需重做
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/project/production-icons.tsx src/components/project/frame-tile.tsx src/components/project/clip-timeline.tsx
git commit -m "feat(ui): frame tile with empty state and clip timeline rail"
```

---

### Task 10: Production UI — video panel, workspace, fill dialog, container; wire into the form

**Files:**
- Create: `src/components/project/clip-video-panel.tsx`
- Create: `src/components/project/clip-workspace.tsx`
- Create: `src/components/project/fill-remaining-dialog.tsx`
- Create: `src/components/project/clip-production.tsx`
- Modify: `src/app/app/projects/new/new-project-form.tsx`
- Modify: `src/app/app/projects/new/storyboard-preview.tsx` (approval copy)
- Delete: `src/components/project/frames-timeline.tsx`, `src/app/app/projects/new/generation-panel.tsx`, `src/app/app/projects/[id]/frames-step.tsx`, `src/app/app/projects/[id]/generation-progress.tsx`

**Interfaces:**
- Consumes: Tasks 2, 3, 7, 9; `ClipEditDialog`, `FrameEditDialog`, `ClipPlayer` (existing).
- Produces:
  ```ts
  ClipVideoPanel({ clip?: ProjectClip; state: ClipState; aspectRatio: AspectRatio; credits: number; canAct: boolean; pending: boolean; onGenerate: () => void })
  ClipWorkspace({ project: PublicVideo; state: ClipState; credits: number; canAct: boolean; pending: string; onPrev?: () => void; onNext?: () => void; onGenerateFrames: () => void; onRegenerateFrame: (position: FramePosition) => void; onOpenFrame: (position: FramePosition) => void; onEditText: () => void; onGenerateVideo: () => void })
  FillRemainingDialog({ plan: RemainingPlan; states: ClipState[]; credits: number; pending: boolean; onCancel: () => void; onConfirm: () => void })
  ClipProduction({ project: PublicVideo; credits: number; subscribed: boolean; pending: string; error: string; onGenerateFrames: (clipNumber: number) => void; onRegenerateFrame: (clipNumber: number, position: FramePosition, revision?: FrameRevisionInput) => void; onUpdateClip: (clipNumber: number, input: ClipStoryboardInput, regenerate: boolean) => Promise<boolean>; onGenerateVideo: (clipNumber: number) => void; onFillRemaining: () => Promise<boolean> })
  ```
  Pending keys used by the form: `frames:{n}`, `frame:{n}:{position}`, `video:{n}`, `clip:{n}`, `clip:{n}:regen`, `remaining`.

- [ ] **Step 1: Create `clip-video-panel.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { ASPECT_CLASS } from "@/components/project/frame-tile";
import { RefreshIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { ClipState } from "@/lib/clip-stage";
import { VIDEO_COST } from "@/lib/production-plan";
import type { AspectRatio, ProjectClip } from "@/types/project";

// Video column of the workspace: empty / generating / ready / failed, with one
// paid button whose label always shows the cost.
export function ClipVideoPanel({
  clip,
  state,
  aspectRatio,
  credits,
  canAct,
  pending,
  onGenerate,
}: {
  clip?: ProjectClip;
  state: ClipState;
  aspectRatio: AspectRatio;
  credits: number;
  // Subscribed and nothing else pending.
  canAct: boolean;
  pending: boolean;
  onGenerate: () => void;
}) {
  const src = clip?.blobUrl || clip?.outputUrl;
  const generating = state.stage === "video_generating";
  const hasVideo = clip?.status === "completed" && src;
  const failed = clip?.status === "failed";
  const framesReady = ["frames_ready", "video_ready", "video_failed"].includes(state.stage);

  // Why the button is disabled, if it is.
  const reason = !framesReady
    ? "畫格完成後才能產片"
    : state.stale.frames
      ? "畫格是舊版，請先重畫畫格"
      : credits < VIDEO_COST
        ? "credits 不足"
        : null;
  const disabled = !canAct || generating || pending || reason !== null;
  const label = hasVideo ? "重產影片" : failed ? "重試" : "產這段影片";

  return (
    <div>
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        影片 ·{" "}
        {generating
          ? "產片中"
          : hasVideo
            ? state.stale.video
              ? "舊版"
              : "完成"
            : failed
              ? "失敗"
              : "尚未產片"}
      </p>
      <div
        className={`relative mt-2 overflow-hidden rounded-xl border border-accent-ink/10 bg-paper ${ASPECT_CLASS[aspectRatio]}`}
      >
        {hasVideo ? (
          <motion.video
            key={src}
            initial={{ opacity: 0 }}
            animate={{ opacity: state.stale.video ? 0.6 : 1 }}
            src={src}
            controls
            className="absolute inset-0 h-full w-full bg-black"
          />
        ) : generating ? (
          <div className="absolute inset-0 grid place-items-center bg-accent-ink/5" aria-label="產片中">
            <motion.div
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <Spinner className="h-5 w-5 text-accent-ink/50" />
          </div>
        ) : failed ? (
          <div className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-xs font-semibold text-accent">
            產片失敗{clip?.error ? `：${clip.error}` : ""}
            <br />
            <span className="font-normal text-muted">credits 已退回</span>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center border-2 border-dashed border-accent-ink/15 p-3 text-center text-xs font-semibold text-muted">
            ▶ 畫格 OK 後即可產片
          </div>
        )}
        {hasVideo && state.stale.video ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
            舊版
          </span>
        ) : null}
      </div>
      <motion.button
        type="button"
        onClick={onGenerate}
        disabled={disabled}
        whileTap={{ scale: 0.98 }}
        className={`mt-3 inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          hasVideo
            ? "border border-accent-ink/15 bg-paper hover:border-accent-ink/40"
            : "bg-accent text-white shadow-[3px_3px_0_0_#12141c] hover:-translate-y-0.5 disabled:hover:translate-y-0"
        }`}
      >
        {pending ? <Spinner className="h-4 w-4" /> : hasVideo ? <RefreshIcon /> : null}
        {label} · {VIDEO_COST}
      </motion.button>
      {reason && !generating ? (
        <p className="mt-1 text-[11px] text-muted">{reason}</p>
      ) : (
        <p className="mt-1 text-[11px] text-muted">會依上面的畫格與文字撰寫 prompt 後送出。</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `clip-workspace.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { ClipVideoPanel } from "@/components/project/clip-video-panel";
import { FrameTile } from "@/components/project/frame-tile";
import { ArrowIcon, EditIcon, RefreshIcon, WarnIcon } from "@/components/project/production-icons";
import { Spinner } from "@/components/spinner";
import type { ClipState } from "@/lib/clip-stage";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { FRAMES_COST } from "@/lib/production-plan";
import type { PublicVideo } from "@/lib/serialize";
import type { FramePosition } from "@/types/project";

const ease = [0.22, 1, 0.36, 1] as const;

// The selected clip: storyboard text | start+end frames | video. Every paid
// button carries its cost; stale media shows a banner instead of a lock.
export function ClipWorkspace({
  project,
  state,
  credits,
  canAct,
  pending,
  onPrev,
  onNext,
  onGenerateFrames,
  onRegenerateFrame,
  onOpenFrame,
  onEditText,
  onGenerateVideo,
}: {
  project: PublicVideo;
  state: ClipState;
  credits: number;
  canAct: boolean;
  // Pending key of the running action ("" when idle).
  pending: string;
  onPrev?: () => void;
  onNext?: () => void;
  onGenerateFrames: () => void;
  onRegenerateFrame: (position: FramePosition) => void;
  onOpenFrame: (position: FramePosition) => void;
  onEditText: () => void;
  onGenerateVideo: () => void;
}) {
  const n = state.clipNumber;
  const row = project.phaseA?.clips.find((item) => item.clipNumber === n);
  if (!row) return null;
  const start = project.frames.find((f) => f.clipNumber === n && f.position === "start");
  const end = project.frames.find((f) => f.clipNumber === n && f.position === "end");
  const clip = project.clips.find((c) => c.clipNumber === n);
  const language = LANGUAGE_PRESETS[project.language];

  const framesBusy = state.stage === "frames_generating" || state.stage === "video_generating";
  const framesPending = pending === `frames:${n}` || pending === `clip:${n}:regen`;
  const hasFrames = Boolean(start || end);
  const nextHasFrames = project.frames.some((f) => f.clipNumber === n + 1);
  const framesDisabled = !canAct || framesBusy || pending !== "" || credits < FRAMES_COST;

  return (
    <motion.section
      key={n}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-5 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-accent-ink px-2.5 py-1 font-display text-xs font-bold text-lime">
            Clip #{n}
          </span>
          <span className="text-xs tabular-nums text-muted">
            {row.timeRange} · {row.durationSeconds} 秒
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            className="inline-flex min-h-[36px] cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-3 text-xs font-semibold transition hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹ 上一段
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            className="inline-flex min-h-[36px] cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-3 text-xs font-semibold transition hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一段 ›
          </button>
        </div>
      </header>

      {/* Stale banner: text changed after the media was made. */}
      {state.stale.frames || state.stale.video ? (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm"
        >
          <span className="inline-flex items-center gap-2">
            <WarnIcon className="h-4 w-4 text-accent" />
            {state.stale.frames
              ? "分鏡文字在畫格之後修改過。下面的畫格與影片是舊版，仍可查看；要套用新文字請重畫。"
              : "畫格在影片之後重畫過。影片是舊版，仍可播放；要套用新畫格請重產影片。"}
          </span>
          {state.stale.frames ? (
            <button
              type="button"
              onClick={onGenerateFrames}
              disabled={framesDisabled}
              className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-3 text-xs font-semibold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {framesPending ? <Spinner className="h-3.5 w-3.5" /> : <RefreshIcon />}
              重畫兩張 · {FRAMES_COST}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_1.3fr_1fr]">
        {/* Storyboard text */}
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            分鏡文字
          </p>
          <div className="mt-2 space-y-3 rounded-2xl border border-accent-ink/10 bg-paper p-4 text-sm">
            <div>
              <p className="text-[10px] text-muted">畫面</p>
              <p className="leading-6">{row.explainerScene}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted">運鏡</p>
              <p className="leading-6">{row.motionCamera}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted">旁白（{language.label}）</p>
              <p className="font-medium leading-6">{row.englishVo}</p>
            </div>
            <button
              type="button"
              onClick={onEditText}
              disabled={pending !== ""}
              className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/15 bg-paper px-3 text-xs font-semibold transition hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === `clip:${n}` ? <Spinner className="h-3.5 w-3.5" /> : <EditIcon />}
              編輯文字
            </button>
          </div>
        </div>

        {/* Frames */}
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            畫格 ·{" "}
            {state.stage === "no_frames"
              ? "尚未產生"
              : state.stage === "frames_generating"
                ? "生成中"
                : state.stage === "frames_failed"
                  ? "有一張失敗"
                  : "已完成"}
          </p>
          <div className="mt-2 grid grid-cols-[1fr_20px_1fr] items-center gap-2">
            <FrameTile
              frame={start}
              position="start"
              aspectRatio={project.aspectRatio}
              canRegenerate={canAct && !framesBusy && pending === ""}
              pending={pending === `frame:${n}:start`}
              stale={state.stale.frames}
              onRegenerate={() => onRegenerateFrame("start")}
              onOpen={() => onOpenFrame("start")}
            />
            <ArrowIcon />
            <FrameTile
              frame={end}
              position="end"
              aspectRatio={project.aspectRatio}
              canRegenerate={canAct && !framesBusy && pending === ""}
              pending={pending === `frame:${n}:end`}
              stale={state.stale.frames}
              onRegenerate={() => onRegenerateFrame("end")}
              onOpen={() => onOpenFrame("end")}
            />
          </div>
          <motion.button
            type="button"
            onClick={onGenerateFrames}
            disabled={framesDisabled}
            whileTap={{ scale: 0.98 }}
            className={`mt-3 inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              hasFrames
                ? "border border-accent-ink/15 bg-paper hover:border-accent-ink/40"
                : "bg-accent text-white shadow-[3px_3px_0_0_#12141c] hover:-translate-y-0.5 disabled:hover:translate-y-0"
            }`}
          >
            {framesPending ? <Spinner className="h-4 w-4" /> : hasFrames ? <RefreshIcon /> : null}
            {hasFrames ? "兩張重畫" : "畫這段畫格"} · {FRAMES_COST}
          </motion.button>
          <p className="mt-1 text-[11px] text-muted">
            {credits < FRAMES_COST
              ? "credits 不足"
              : nextHasFrames
                ? `結尾畫格與 #${n + 1} 的起始銜接；重畫後建議看一下 #${n + 1}。`
                : "點擊完成的畫格可放大、手繪標註後重畫（1 credit）。"}
          </p>
        </div>

        {/* Video */}
        <ClipVideoPanel
          clip={clip}
          state={state}
          aspectRatio={project.aspectRatio}
          credits={credits}
          canAct={canAct && pending === ""}
          pending={pending === `video:${n}`}
          onGenerate={onGenerateVideo}
        />
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 3: Create `fill-remaining-dialog.tsx`**

```tsx
"use client";

import { useEffect, useId } from "react";
import { Spinner } from "@/components/spinner";
import type { ClipState } from "@/lib/clip-stage";
import { FRAMES_COST, VIDEO_COST, type RemainingPlan } from "@/lib/production-plan";

// Confirm "補齊剩餘": itemised cost before charging several clips at once.
export function FillRemainingDialog({
  plan,
  states,
  credits,
  pending,
  onCancel,
  onConfirm,
}: {
  plan: RemainingPlan;
  states: ClipState[];
  credits: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  // Split frames into fresh vs. retry so the user sees why a clip is listed.
  const retryFrames = plan.frames.filter(
    (n) => states.find((s) => s.clipNumber === n)?.stage === "frames_failed",
  );
  const freshFrames = plan.frames.filter((n) => !retryFrames.includes(n));
  const list = (numbers: number[]) => numbers.map((n) => `#${n}`).join("、");
  const short = credits < plan.cost;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={pending ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          補齊剩餘段落
        </h2>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {freshFrames.length ? (
              <tr className="border-b border-dashed border-accent-ink/10">
                <td className="py-1.5">{list(freshFrames)} 產生畫格</td>
                <td className="py-1.5 text-right tabular-nums">
                  {freshFrames.length} 段 × {FRAMES_COST} = {freshFrames.length * FRAMES_COST}
                </td>
              </tr>
            ) : null}
            {retryFrames.length ? (
              <tr className="border-b border-dashed border-accent-ink/10">
                <td className="py-1.5">{list(retryFrames)} 重試畫格（上次失敗已退款）</td>
                <td className="py-1.5 text-right tabular-nums">
                  {retryFrames.length} 段 × {FRAMES_COST} = {retryFrames.length * FRAMES_COST}
                </td>
              </tr>
            ) : null}
            {plan.videos.length ? (
              <tr className="border-b border-dashed border-accent-ink/10">
                <td className="py-1.5">{list(plan.videos)} 產生影片</td>
                <td className="py-1.5 text-right tabular-nums">
                  {plan.videos.length} 段 × {VIDEO_COST} = {plan.videos.length * VIDEO_COST}
                </td>
              </tr>
            ) : null}
            <tr>
              <td className="py-1.5 font-semibold">合計</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">
                {plan.cost} credits <span className="font-normal text-muted">（剩餘 {credits}）</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs leading-5 text-muted">
          不會動到已有畫格或影片，也不會處理標了「需重做」的段落。畫格完成後，那些段落的影片要再按一次。
        </p>
        {short ? <p className="mt-2 text-xs text-accent">credits 不足，請先升級方案。</p> : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || short}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? "送出中…" : `確認送出 · ${plan.cost}`}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `clip-production.tsx`** (container)

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipEditDialog,
  type ClipEditPending,
} from "@/components/project/clip-edit-dialog";
import { ClipTimeline } from "@/components/project/clip-timeline";
import { ClipWorkspace } from "@/components/project/clip-workspace";
import { FillRemainingDialog } from "@/components/project/fill-remaining-dialog";
import { FrameEditDialog } from "@/components/project/frame-edit-dialog";
import { Spinner } from "@/components/spinner";
import { clipStatesFor, isProjectBusy, productionCounts } from "@/lib/clip-stage";
import { planRemaining } from "@/lib/production-plan";
import type { PublicVideo } from "@/lib/serialize";
import type {
  ClipStoryboardInput,
  FramePosition,
  FrameRevisionInput,
} from "@/types/project";
import { ClipPlayer } from "@/app/app/projects/[id]/clip-player";

const ease = [0.22, 1, 0.36, 1] as const;

// Per-clip production: timeline of clips on top, one clip's workspace below,
// fill-remaining footer. Shared by the /new form and the project page.
export function ClipProduction({
  project,
  credits,
  subscribed,
  pending,
  error,
  onGenerateFrames,
  onRegenerateFrame,
  onUpdateClip,
  onGenerateVideo,
  onFillRemaining,
}: {
  project: PublicVideo;
  credits: number;
  subscribed: boolean;
  pending: string;
  error: string;
  onGenerateFrames: (clipNumber: number) => void;
  onRegenerateFrame: (
    clipNumber: number,
    position: FramePosition,
    revision?: FrameRevisionInput,
  ) => void;
  onUpdateClip: (
    clipNumber: number,
    input: ClipStoryboardInput,
    regenerate: boolean,
  ) => Promise<boolean>;
  onGenerateVideo: (clipNumber: number) => void;
  onFillRemaining: () => Promise<boolean>;
}) {
  const phaseA = project.phaseA;
  const states = clipStatesFor(project);
  const counts = productionCounts(project);
  const plan = planRemaining(project);
  const ready = project.status === "ready";
  const busy = isProjectBusy(project);
  const canAct = subscribed;

  // Default to the first clip that still needs work; #1 when everything is done.
  const [selected, setSelected] = useState<number>(
    () => states.find((s) => s.stage !== "video_ready")?.clipNumber ?? states[0]?.clipNumber ?? 1,
  );
  const [editingFrame, setEditingFrame] = useState<FramePosition | null>(null);
  const [editingText, setEditingText] = useState(false);
  const [confirmFill, setConfirmFill] = useState(false);

  const index = states.findIndex((s) => s.clipNumber === selected);
  const state = states[index] ?? states[0];
  const prev = index > 0 ? states[index - 1].clipNumber : undefined;
  const next = index >= 0 && index < states.length - 1 ? states[index + 1].clipNumber : undefined;

  // ← / → switch clips when no dialog is open and focus is not in a field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (editingFrame || editingText || confirmFill) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowLeft" && prev) setSelected(prev);
      if (event.key === "ArrowRight" && next) setSelected(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, editingFrame, editingText, confirmFill]);

  if (!phaseA || !state) return null;

  const row = phaseA.clips.find((r) => r.clipNumber === state.clipNumber);
  const frame = editingFrame
    ? project.frames.find(
        (f) => f.clipNumber === state.clipNumber && f.position === editingFrame,
      )
    : undefined;
  const clipEditPending: ClipEditPending =
    pending === `clip:${state.clipNumber}`
      ? "save"
      : pending === `clip:${state.clipNumber}:regen`
        ? "regenerate"
        : "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease }}
      className="space-y-5"
    >
      <header className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
              Phase B · 製作
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold">
              {ready ? "影片完成" : "逐段製作：畫格 → 影片"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              點時間軸切換段落。每段各自扣款、各自重做，隨時可以回頭。
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-display font-bold tabular-nums">
              畫格 {counts.framesDone}/{counts.total} · 影片 {counts.videosDone}/{counts.total}
            </p>
            <p className="text-muted">剩餘 credits：{credits}</p>
            {busy ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                <Spinner className="h-3 w-3" /> 生成中，完成會自動更新
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5">
          <ClipTimeline
            project={project}
            states={states}
            selected={state.clipNumber}
            onSelect={setSelected}
          />
        </div>
      </header>

      <ClipWorkspace
        project={project}
        state={state}
        credits={credits}
        canAct={canAct}
        pending={pending}
        onPrev={prev ? () => setSelected(prev) : undefined}
        onNext={next ? () => setSelected(next) : undefined}
        onGenerateFrames={() => onGenerateFrames(state.clipNumber)}
        onRegenerateFrame={(position) => onRegenerateFrame(state.clipNumber, position)}
        onOpenFrame={setEditingFrame}
        onEditText={() => setEditingText(true)}
        onGenerateVideo={() => onGenerateVideo(state.clipNumber)}
      />

      {/* Footer: fill the gaps, or celebrate. */}
      <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {ready ? (
            <div>
              <p className="font-display text-sm font-bold">✓ {counts.total} 段影片全部完成</p>
              <p className="mt-1 text-sm text-muted">
                下方可連續預覽；任何一段仍可回頭重做，重做時專案會回到「製作中」。
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="font-display text-sm font-bold">
                  還有 {states.filter((s) => s.stage !== "video_ready").length} 段沒完成
                </p>
                <p className="mt-1 text-sm text-muted">
                  {plan.cost > 0
                    ? `${plan.frames.length} 段要畫格（${plan.frames.length * 2}）+ ${plan.videos.length} 段要影片（${plan.videos.length}）＝ ${plan.cost} credits；生成中與需重做的段落不會重送。`
                    : "目前沒有可一次補齊的段落（生成中或需重做的段落要在工作區處理）。"}
                </p>
                {!subscribed ? (
                  <p className="mt-1 text-xs text-accent">尚未訂閱，按下後將前往訂閱頁。</p>
                ) : null}
              </div>
              <motion.button
                type="button"
                onClick={() => setConfirmFill(true)}
                disabled={pending !== "" || plan.cost === 0}
                whileTap={{ scale: 0.98 }}
                className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending === "remaining" ? <Spinner /> : null}
                補齊剩餘 · {plan.cost}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}

      {ready ? <ClipPlayer project={project} /> : null}

      {/* Frame annotate + redo */}
      {editingFrame && frame && row ? (
        <FrameEditDialog
          key={`${state.clipNumber}:${editingFrame}`}
          frame={frame}
          clip={row}
          aspectRatio={project.aspectRatio}
          credits={credits}
          canRegenerate={canAct && pending === ""}
          onClose={() => setEditingFrame(null)}
          onRegenerate={(revision) => {
            onRegenerateFrame(state.clipNumber, editingFrame, revision);
            setEditingFrame(null);
          }}
        />
      ) : null}

      {/* Storyboard text editor: save free, or save + redraw both frames */}
      {editingText && row ? (
        <ClipEditDialog
          key={row.clipNumber}
          clip={row}
          language={project.language}
          credits={credits}
          canRegenerate={canAct && pending === ""}
          pending={clipEditPending}
          error={error}
          onClose={() => setEditingText(false)}
          onSave={(input, regenerate) => onUpdateClip(row.clipNumber, input, regenerate)}
        />
      ) : null}

      {confirmFill ? (
        <FillRemainingDialog
          plan={plan}
          states={states}
          credits={credits}
          pending={pending === "remaining"}
          onCancel={() => setConfirmFill(false)}
          onConfirm={() => {
            void onFillRemaining().then(() => setConfirmFill(false));
          }}
        />
      ) : null}
    </motion.section>
  );
}
```

Note: `ClipEditDialog`'s `onSave` already resolves `true` on success and the dialog closes itself in the existing implementation — check `clip-edit-dialog.tsx` around `onSave` and keep that behaviour.

- [ ] **Step 5: Wire into `new-project-form.tsx`**

Imports — remove `FramesTimeline` and `GenerationPanel`; add:

```ts
import { ClipProduction } from "@/components/project/clip-production";
import {
  generateClipFramesAction,
  generateClipVideoAction,
  generateRemainingAction,
} from "@/lib/actions/clip-production";
```

Add handlers after `onUpdateClip`:

```ts
  // Per-clip production: both frames (2), one video (1), or fill every gap.
  function onGenerateFrames(clipNumber: number) {
    if (!project) return;
    void runPaid(`frames:${clipNumber}`, () =>
      generateClipFramesAction(project.id, clipNumber),
    );
  }

  function onGenerateVideo(clipNumber: number) {
    if (!project) return;
    void runPaid(`video:${clipNumber}`, () => generateClipVideoAction(project.id, clipNumber));
  }

  async function onFillRemaining() {
    if (!project) return false;
    const ok = await runPaid("remaining", async () => {
      const result = await generateRemainingAction(project.id);
      if (result.ok && result.skipped.length > 0) {
        setError(`有 ${result.skipped.length} 段沒送出（#${result.skipped.join("、#")}），請到該段工作區重試。`);
      }
      return result;
    });
    return ok;
  }
```

Replace the three status branches

```tsx
          ) : project?.status === "frames_generating" ||
            project?.status === "frames_ready" ? (
            <FramesTimeline ... />
          ) : project?.status === "approved" ? (
            <DirectorProgress key="phase-b" mode="production" />
          ) : project?.status === "generating" || project?.status === "ready" ? (
            <GenerationPanel key="generation" project={project} />
```
with
```tsx
          ) : project?.status === "production" || project?.status === "ready" ? (
            <ClipProduction
              key="production"
              project={project}
              credits={credits}
              subscribed={subscribed}
              pending={pending}
              error={error}
              onGenerateFrames={onGenerateFrames}
              onRegenerateFrame={onRegenerateFrame}
              onUpdateClip={onUpdateClip}
              onGenerateVideo={onGenerateVideo}
              onFillRemaining={onFillRemaining}
            />
```

Update the `pending` comment to `// "" | "revise" | "approve" | "save" | "retry" | "remaining" | frames:{n} | frame:{n}:{pos} | video:{n} | clip:{n}[:regen]`. Update the stepper comment `{/* Step indicator: 題材 → 分鏡 → 分鏡圖 → 影片 */}` to `{/* Step indicator: 題材 → 分鏡 → 製作 */}`.

In `FailedCard`, replace the `label` computation with:

```ts
  const label = project.phaseA ? "回到製作，逐段重做" : "重新產生分鏡";
```
and remove the `step` variable and the `failedStepFor` import if it becomes unused in this file (it is still used for `failedAtStep` on the stepper — keep it).

- [ ] **Step 6: Approval copy in `storyboard-preview.tsx`**

Approval is free now. Replace `const framesCost = phaseA.clipCount * 2;` and `const canGenerate = subscribed && credits >= framesCost;` with nothing (delete both), and replace the approval card content:

```tsx
        <div className="rounded-[1.5rem] border border-accent-ink/10 bg-lime/60 p-5">
          <p className="font-display text-sm font-bold">核准分鏡，進入逐段製作</p>
          <p className="mt-2 text-sm">
            核准不扣 credits。之後每段各自產生：畫格 2 credits、影片 1 credit
            <span className="text-muted">（剩餘 {credits}）</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            可以先做第 1 段看效果，滿意再做下一段；隨時可回頭重做任何一段。
          </p>
          {!subscribed ? (
            <p className="mt-2 text-xs text-accent">尚未訂閱；製作階段的產生按鈕需要訂閱。</p>
          ) : null}
          {/* keep the existing <motion.button> exactly as it is (onClick → persistIfDirty → onApprove,
              disabled={busy}, same classes); only change its label line to: */}
            {pending === "approve" ? "送出中…" : "核准分鏡，開始製作"}
        </div>
```

Check `rg -n "canGenerate|framesCost" src/app/app/projects/new/storyboard-preview.tsx` returns nothing afterwards.

- [ ] **Step 7: Delete the replaced components**

```bash
git rm src/components/project/frames-timeline.tsx src/app/app/projects/new/generation-panel.tsx "src/app/app/projects/[id]/frames-step.tsx" "src/app/app/projects/[id]/generation-progress.tsx"
```

Then `rg -n "frames-timeline|generation-panel|FramesStep|GenerationProgress" src` must return nothing.

- [ ] **Step 8: Type-check, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/lib/*.test.ts src/lib/**/*.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A src/components/project src/app/app/projects/new/new-project-form.tsx src/app/app/projects/new/storyboard-preview.tsx
git commit -m "feat(ui): per-clip production workspace replaces frames timeline and generation panel"
```

---

### Task 11: Stepper to 3 steps, remove legacy statuses, cleanup

**Files:**
- Modify: `src/types/project.ts`
- Modify: `src/lib/project-status.ts`
- Modify: `src/lib/project-status.test.ts`, `src/lib/folder.test.ts`
- Modify: `src/lib/i18n/messages/types.ts` + 11 locale files
- Modify: `src/lib/serialize.ts`
- Modify: `src/components/project/project-stepper.tsx`
- Modify: `src/app/app/projects/new/new-project-form.tsx` (stepper props)

**Interfaces:**
- Produces: `ProjectStatus` = 6 values; `LegacyProjectStatus` type for the Mongo `Project.status`; `PROJECT_STEP_IDS = ["input", "scene", "production"]`; `failedStepFor(project) → 1 | 2`; `ProjectStepper({ status, failedAtStep?, compact?, busy?, detail? })`.

- [ ] **Step 1: Update tests first**

In `src/lib/project-status.test.ts` change the legacy test to use the raw-status signature and add `failedStepFor`:

```ts
import { failedStepFor, isProductionLike, normalizeProjectStatus } from "./project-status";

// (keep existing tests; they still compile because the parameter type widens to
// ProjectStatus | LegacyProjectStatus)

test("failedStepFor: storyboard missing → 1, present → 2", () => {
  assert.equal(failedStepFor({}), 1);
  assert.equal(failedStepFor({ phaseA: { clips: [] } as never }), 2);
});
```

In `src/lib/folder.test.ts` replace `"generating"` with `"production"` in the rollup test:

```ts
  assert.equal(folderRollupStatus(["ready", "production"]), "production");
```

Run: `npx tsx --test src/lib/project-status.test.ts src/lib/folder.test.ts`
Expected: `failedStepFor({ phaseA })` currently returns 2 or 3 depending on frames → the new assertion may already pass for `{}`; the `production` rollup passes. Proceed regardless — the point is the assertions reflect the target.

- [ ] **Step 2: `src/types/project.ts`**

```ts
// Lifecycle: phase_a → awaiting_approval → production → ready.
// `production` = storyboard approved; every clip's frames and video are made
// independently. Frame/video failures live on the clip, so `failed` only ever
// means Phase A failed.
export type ProjectStatus =
  | "draft"
  | "phase_a"
  | "awaiting_approval"
  | "production"
  | "ready"
  | "failed";

// Written by the pre per-clip pipeline; still present in Mongo. Normalised to
// `production` by normalizeProjectStatus() on every read.
export type LegacyProjectStatus =
  | "frames_generating"
  | "frames_ready"
  | "approved"
  | "generating";
```

In `Project`: `status: ProjectStatus | LegacyProjectStatus;`

- [ ] **Step 3: `src/lib/project-status.ts`**

```ts
import type {
  ClipFrame,
  LegacyProjectStatus,
  PhaseAProposal,
  ProjectStatus,
} from "@/types/project";

// ... StatusTone / StatusMeta unchanged ...

export const PROJECT_STEP_IDS = ["input", "scene", "production"] as const;
export const PROJECT_STEPS = PROJECT_STEP_IDS.map((id) => ({ id }));

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  draft: { tone: "neutral", step: 0, busy: false },
  phase_a: { tone: "working", step: 1, busy: true },
  awaiting_approval: { tone: "action", step: 1, busy: false },
  // Static `busy` so folder rollups / dashboard filters work from statuses alone;
  // components with the full project use isProjectBusy() for the precise answer.
  production: { tone: "working", step: 2, busy: true },
  ready: { tone: "success", step: 2, busy: false },
  failed: { tone: "danger", step: 0, busy: false },
};

const LEGACY_PRODUCTION = new Set<string>([
  "frames_generating",
  "frames_ready",
  "approved",
  "generating",
]);

// Pre per-clip statuses read as `production`.
export function normalizeProjectStatus(
  status: ProjectStatus | LegacyProjectStatus,
): ProjectStatus {
  return LEGACY_PRODUCTION.has(status) ? "production" : (status as ProjectStatus);
}

export function isProductionLike(status: ProjectStatus | LegacyProjectStatus) {
  const normalized = normalizeProjectStatus(status);
  return normalized === "production" || normalized === "ready";
}

// A failed project either never got a storyboard (step 1) or failed later (step 2).
export function failedStepFor(project: { phaseA?: PhaseAProposal; frames?: ClipFrame[] }) {
  return project.phaseA ? 2 : 1;
}
```

Keep `StatusFilter`, `STATUS_FILTER_IDS`, `matchesFilter` unchanged.

- [ ] **Step 4: i18n**

`src/lib/i18n/messages/types.ts`: `project.steps` becomes `{ input: string; scene: string; production: string }`; `project.status` Record keys become `"draft" | "phase_a" | "awaiting_approval" | "production" | "ready" | "failed"`.

In each of the 11 locale files: delete the `frames_generating`, `frames_ready`, `approved`, `generating` status lines; replace `steps.frames` + `steps.video` with one `production` key:

| file | `steps.production` |
|---|---|
| en.ts | `"Production"` |
| zh-Hant.ts | `"製作"` |
| zh-Hans.ts | `"制作"` |
| ja.ts | `"制作"` |
| ko.ts | `"제작"` |
| es.ts | `"Producción"` |
| fr.ts | `"Production"` |
| de.ts | `"Produktion"` |
| pt.ts | `"Produção"` |
| ru.ts | `"Производство"` |
| id.ts | `"Produksi"` |

- [ ] **Step 5: `src/lib/serialize.ts`**

`PublicVideo.status: ProjectStatus` (import the type from `@/types/project`); remove `framesCreditCost` and `creditCost` from `PublicVideo` and from `toPublicVideo` (verified unused: `rg -n "\.framesCreditCost|\.creditCost" src --glob '!src/lib/serialize.ts' --glob '!src/types/*'` must return nothing; if `projects.ts` still writes `creditCost` on create, delete that line).

- [ ] **Step 6: `src/components/project/project-stepper.tsx`**

Add two optional props so the third step can show live detail and a precise busy pulse:

```ts
export function ProjectStepper({
  status,
  failedAtStep,
  compact = false,
  busy,
  detail,
}: {
  status: ProjectStatus;
  failedAtStep?: number;
  compact?: boolean;
  // Overrides STATUS_META.busy when the caller knows (isProjectBusy).
  busy?: boolean;
  // Small text under the current step, e.g. "影片 2/6".
  detail?: string;
}) {
  const { t } = useI18n();
  const current = currentStepFor(status, failedAtStep);
  const done = status === "ready";
  const failed = status === "failed";
  const isBusy = busy ?? STATUS_META[status].busy;
```

Replace `busy` with `isBusy` in the pulse condition. In the non-compact label block, render `detail` under the current step:

```tsx
                <span className="font-display text-[10px] uppercase tracking-wider text-muted">
                  {state === "current" && detail ? detail : step.id}
                </span>
```

- [ ] **Step 7: Pass the new props from `new-project-form.tsx`**

```tsx
          <ProjectStepper
            status={project?.status ?? "draft"}
            failedAtStep={project?.status === "failed" ? failedStepFor(project) : undefined}
            busy={project ? isProjectBusy(project) : false}
            detail={
              project && (project.status === "production" || project.status === "ready")
                ? `影片 ${productionCounts(project).videosDone}/${productionCounts(project).total}`
                : undefined
            }
          />
```

Import `isProjectBusy, productionCounts` from `@/lib/clip-stage`.

- [ ] **Step 8: Fix every remaining reference**

Run `npx tsc --noEmit` and fix each error. Expected sites: `src/lib/actions/generation.ts` / `clip-production.ts` (none — they use `isProductionLike`), `src/lib/higgsfield/reconcile.ts` (`ClipStageSource.status` is `ProjectStatus`; `Project.status` now includes legacy — widen `ClipStageSource.status` to `ProjectStatus | LegacyProjectStatus` in `clip-stage.ts` and compare with `normalizeProjectStatus`), `src/lib/folder.ts` (already receives normalised statuses), `status-badge.tsx` (receives `PublicVideo.status`, fine). Also `rg -n "frames_generating|frames_ready|\"approved\"|\"generating\"" src` — the only remaining hits must be `LegacyProjectStatus` in `types/project.ts` and `LEGACY_PRODUCTION` in `project-status.ts`.

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/lib/*.test.ts src/lib/**/*.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A src
git commit -m "refactor(status): 3-step stepper, drop legacy statuses from the public union"
```

---

### Task 12: Manual browser verification

**Files:** none (verification only). Use the running dev server (`npm run dev`) and the IDE browser.

- [ ] **Step 1: New project → approve**
  Create a video (no cast, so the still path is exercised). After Phase A, the approval card reads "核准不扣 credits"; click 核准. Expected: stepper shows step 3 "製作" with "影片 0/N"; timeline shows N chips all "待畫格"; footer shows 補齊剩餘 with cost `N × 2`.

- [ ] **Step 2: Still gating**
  Immediately click "畫這段畫格 · 2" on #1. Expected (if the still is not done yet): error "角色定裝圖正在產生，請稍候再試", credits unchanged. Wait ~30 s, retry: chip #1 → 畫格中, credits −2.

- [ ] **Step 3: Frames → video for #1**
  When both tiles show images, "產這段影片 · 1" becomes enabled. Click. Expected: chip #1 → 產片中, credits −1; later → 影片完成 and the `<video>` plays in the third column.

- [ ] **Step 4: Redo paths**
  Click the end tile of #1 → annotate → 重畫 (1). Expected: tile skeleton, chip 畫格中 while the video stays visible; when done, chip shows "需重做" (stale.video) and the video panel says 舊版 with "重產影片 · 1" enabled.

- [ ] **Step 5: Text edit → stale frames**
  On #1, 編輯文字 → change 畫面 → 儲存 (free). Expected: banner "分鏡文字在畫格之後修改過…", tiles marked 舊版, "重產影片" disabled with reason "畫格是舊版，請先重畫畫格". Click 重畫兩張 · 2 → banner clears when frames finish.

- [ ] **Step 6: Fill remaining**
  Click 補齊剩餘. Expected: dialog lists the other clips under 產生畫格 with the right total; confirm; all listed chips → 畫格中; credits drop by the total. When frames finish, footer cost becomes `(N−1) × 1` for videos; click again → videos generate.

- [ ] **Step 7: Ready and back**
  When every clip has a video: status badge 已完成, stepper step 3 checked, footer "全部完成", ClipPlayer visible. Redo one video → project returns to 製作中 and the badge/stepper follow; when it finishes → 已完成 again.

- [ ] **Step 8: Legacy project**
  Open an older video that was in `frames_ready` / `ready` before this change. Expected: it renders in the production view with existing frames/videos and no ⚠ badges; per-clip actions work.

- [ ] **Step 9: Dashboard**
  `/app` list: the folder badge reads 製作中 while any video is in production; the "進行中" filter includes it.

- [ ] **Step 10: Record**
  Note any deviation as a follow-up issue; if everything passes, the feature is done.
