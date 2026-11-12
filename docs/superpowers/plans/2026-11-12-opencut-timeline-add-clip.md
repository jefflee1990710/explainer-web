# OpenCut Timeline Add Clip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prominent `+ Add Clip` button on the OpenCut timeline toolbar that opens a two-step dialog (mode selection: Simple, Explainer, Swap, Teleport -> mode creation form) to generate and insert a new clip at the active timeline Playhead position in the current project.

**Architecture:** OpenCut `TimelineToolbar` reads the playhead time and active clip element, dispatches a `scro-timeline-add-clip` event to the host shell (`OpenCutScroToolbar`), which opens the two-step dialog. Backend actions (`appendDirectorClipAction`, `appendSimpleClipAction`, and new Jutsu insertion actions) allocate a new slot using `insertClips` at `insertAt`, start the generation job, and update the OpenCut timeline tracks via ripple shift.

**Tech Stack:** Next.js 16 (Webpack), React 19, TypeScript, MongoDB (`videosCollection`), OpenCut Editor state & commands, Zod, Hugeicons, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-11-12-opencut-timeline-add-clip-design.md`

## Global Constraints

- Never make live paid provider calls during unit tests; use pure functions or mock `fetch`.
- All text responses to user must be in Traditional Chinese (繁體中文).
- UI buttons and dialogs must use `--studio-*` design tokens from `src/presentation/studio/tokens.css` and OpenCut design tokens.
- Typecheck `npx tsc --noEmit` must pass without errors.
- Unit tests run via Node built-in test runner with `npx tsx --test <path>`.

## Review Focus

1. **Empty / No clips on timeline**: If a project has 0 clips or is empty, clicking `+ Add Clip` should gracefully default `insertAt` to 1 without throwing errors.
2. **Playhead beyond video duration**: If the playhead is moved past the end of the last clip, `insertAt` must cleanly default to `clips.length + 1` (appending at end).
3. **Swap / Teleport clip preservation**: When selecting an existing clip in this dialog, the original clip must remain intact in `project.clips` while a new clip slot is created.
4. **Simple Video missing first frame**: If the user provides only prompt and character without a start image, the background job must fall back safely or seed the start frame with Seedream 5.0 Pro before video generation.
5. **Timeline ripple offset**: When a new clip is inserted mid-timeline, subsequent clips on the timeline track must shift rightward by the new clip's duration without corrupting clip IDs or edit locks.

---

### Task 1: Playhead-to-Slot Resolution & Event Communication

**Files:**
- Create: `src/opencut/timeline/playhead-slot.ts`
- Create: `src/opencut/timeline/playhead-slot.test.ts`
- Modify: `src/opencut/embed/scro-video-actions.ts`

**Interfaces:**
- Produces: `resolvePlayheadInsertSlot(input: { playheadSeconds: number; clipDurations: Array<{ clipNumber: number; durationSeconds: number }>; activeClipNumber?: number }): number`
- Produces: Event payload `{ type: "scro-timeline-add-clip"; playheadSeconds: number; activeClipNumber?: number }`

- [ ] **Step 1: Write failing unit test for `resolvePlayheadInsertSlot`**

```ts
// src/opencut/timeline/playhead-slot.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { resolvePlayheadInsertSlot } from "./playhead-slot";

test("resolvePlayheadInsertSlot returns 1 when clips are empty", () => {
  assert.equal(resolvePlayheadInsertSlot({ playheadSeconds: 3, clipDurations: [] }), 1);
});

test("resolvePlayheadInsertSlot maps playhead within Clip 1 (0-6s) to insertAt 2", () => {
  const clips = [
    { clipNumber: 1, durationSeconds: 6 },
    { clipNumber: 2, durationSeconds: 6 },
  ];
  assert.equal(resolvePlayheadInsertSlot({ playheadSeconds: 2.5, clipDurations: clips }), 2);
});

test("resolvePlayheadInsertSlot at 0s inserts at 1", () => {
  const clips = [{ clipNumber: 1, durationSeconds: 6 }];
  assert.equal(resolvePlayheadInsertSlot({ playheadSeconds: 0, clipDurations: clips }), 1);
});

test("resolvePlayheadInsertSlot honors activeClipNumber if provided", () => {
  const clips = [
    { clipNumber: 1, durationSeconds: 6 },
    { clipNumber: 2, durationSeconds: 6 },
  ];
  assert.equal(
    resolvePlayheadInsertSlot({ playheadSeconds: 1, clipDurations: clips, activeClipNumber: 2 }),
    3,
  );
});

test("resolvePlayheadInsertSlot past total duration inserts at clips.length + 1", () => {
  const clips = [{ clipNumber: 1, durationSeconds: 6 }];
  assert.equal(resolvePlayheadInsertSlot({ playheadSeconds: 15, clipDurations: clips }), 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/opencut/timeline/playhead-slot.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `resolvePlayheadInsertSlot` in `src/opencut/timeline/playhead-slot.ts` and add event type to `src/opencut/embed/scro-video-actions.ts`**

Calculate cumulative time windows and map to the target slot index.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/opencut/timeline/playhead-slot.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/opencut/timeline/playhead-slot.ts src/opencut/timeline/playhead-slot.test.ts src/opencut/embed/scro-video-actions.ts
git commit -m "feat(opencut): implement playhead-to-slot resolver and add-clip action types"
```

---

### Task 2: Backend `appendSimpleClipAction` for Simple Video

**Files:**
- Create: `src/service/clip/append-simple-clip.ts`
- Create: `src/service/clip/append-simple-clip.test.ts`
- Modify: `src/presentation/actions/clip-timeline.ts`

**Interfaces:**
- Consumes: `insertClips` from `@/service/clip/clip-order`
- Produces: `appendSimpleClipAction(input: AppendSimpleClipInput): Promise<{ ok: true; project: PublicVideo } | { ok: false; error: string }>`

- [ ] **Step 1: Write failing unit test for `buildSimpleClipInsertion`**

```ts
// src/service/clip/append-simple-clip.test.ts
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
  assert.match(row.startScene, /neon cyberpunk/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/clip/append-simple-clip.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `buildSimpleClipDraftRow` and `appendSimpleClipAction`**

In `src/service/clip/append-simple-clip.ts`:
- Validate user & permissions with `requireAppUser`.
- Use `insertClips` to insert the new row at `insertAt` and shift subsequent clips.
- Create initial frame and clip entry with status `queued`/`in_progress`.
- Kick off video generation via task runner or `after()`.
- Export `appendSimpleClipAction` in `src/presentation/actions/clip-timeline.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/clip/append-simple-clip.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/clip/append-simple-clip.ts src/service/clip/append-simple-clip.test.ts src/presentation/actions/clip-timeline.ts
git commit -m "feat(clip): implement appendSimpleClipAction for in-project simple video generation"
```

---

### Task 3: Backend Jutsu Insertion Actions (Swap & Teleport as New Clip)

**Files:**
- Create: `src/service/opencut/clip-jutsu-insert.ts`
- Create: `src/service/opencut/clip-jutsu-insert.test.ts`
- Modify: `src/presentation/actions/opencut-clip-jutsu.ts`

**Interfaces:**
- Produces: `applyClipScroSwapInsertAction(input: ApplyClipSwapInsertInput): Promise<ApplyClipEngineResult>`
- Produces: `applyClipTeleportInsertAction(input: ApplyClipTeleportInsertInput): Promise<ApplyClipEngineResult>`

- [ ] **Step 1: Write failing unit test for `buildJutsuClipInsertion`**

```ts
// src/service/opencut/clip-jutsu-insert.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildJutsuClipInsertion } from "./clip-jutsu-insert";

test("buildJutsuClipInsertion inserts a new StoryboardRow and clip row at insertAt without mutating source clip", () => {
  const project = {
    phaseA: {
      clips: [
        { clipNumber: 1, durationSeconds: 6, startScene: "Opening", timeRange: "0–6s" },
        { clipNumber: 2, durationSeconds: 6, startScene: "Closing", timeRange: "6–12s" },
      ],
      clipCount: 2,
      targetDuration: "12s",
      englishWordCount: 20,
    },
    clips: [
      { clipNumber: 1, durationSeconds: 6, status: "completed" as const },
      { clipNumber: 2, durationSeconds: 6, status: "completed" as const },
    ],
  };

  const res = buildJutsuClipInsertion({
    project,
    sourceClipNumber: 1,
    insertAt: 2,
    mode: "swap",
    nowIso: new Date().toISOString(),
  });

  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.project.phaseA.clips.length, 3);
  assert.equal(res.newClipNumber, 2);
  // Original Clip 1 remains at clipNumber 1
  assert.equal(res.project.clips[0].clipNumber, 1);
  // Source clip was not modified
  assert.equal(res.project.clips[0].status, "completed");
  // New Clip 2 is in_progress
  assert.equal(res.project.clips[1].status, "in_progress");
  // Former Clip 2 shifted to Clip 3
  assert.equal(res.project.clips[2].clipNumber, 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/opencut/clip-jutsu-insert.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `buildJutsuClipInsertion` and export actions**

Implement the pure insertion builder in `src/service/opencut/clip-jutsu-insert.ts`.
Wire `applyClipScroSwapInsertAction` and `applyClipTeleportInsertAction` in `src/presentation/actions/opencut-clip-jutsu.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/opencut/clip-jutsu-insert.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/opencut/clip-jutsu-insert.ts src/service/opencut/clip-jutsu-insert.test.ts src/presentation/actions/opencut-clip-jutsu.ts
git commit -m "feat(jutsu): implement insert-as-new-clip actions for Scro Swap and Teleport"
```

---

### Task 4: Step 1 Modal: `OpenCutAddClipSelectionDialog`

**Files:**
- Create: `src/presentation/components/app/projects/new/opencut-add-clip-selection-dialog.tsx`
- Create: `src/presentation/components/app/projects/new/opencut-add-clip-types.ts`

**Interfaces:**
- Produces: `OpenCutAddClipMode = "simple" | "explainer" | "swap" | "teleport"`
- Produces: `OpenCutAddClipSelectionDialog({ open, onClose, onSelectMode, defaultInsertAt, totalClips }: Props)`

- [ ] **Step 1: Write component definition and props in `opencut-add-clip-types.ts`**

Define `OpenCutAddClipMode`, mode configuration items (title, description, badge, creditCost, icon).

- [ ] **Step 2: Implement `OpenCutAddClipSelectionDialog`**

Render a modal using Studio styling (`bg-[var(--studio-panel)]`, border, rounded-xl) displaying 4 responsive cards:
- Simple Video (ref2va Comfy)
- Explainer (AI Director)
- Scro Swap (Character motion swap)
- Teleport (Scene background replace)
Show badge with estimated credits and current target insertion slot (e.g., `插入於第 N 段`).

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/app/projects/new/opencut-add-clip-selection-dialog.tsx src/presentation/components/app/projects/new/opencut-add-clip-types.ts
git commit -m "feat(opencut): create OpenCutAddClipSelectionDialog for step-1 mode picking"
```

---

### Task 5: Step 2 Modal: `OpenCutAddClipModal` (Host Shell)

**Files:**
- Create: `src/presentation/components/app/projects/new/opencut-add-clip-modal.tsx`
- Modify: `src/presentation/components/app/projects/new/opencut-scro-toolbar.tsx`

**Interfaces:**
- Combines Step 1 (`OpenCutAddClipSelectionDialog`) and Step 2:
  - When `simple`: renders Simple prompt, character picker, reference image inputs, slot selector. Calls `appendSimpleClipAction`.
  - When `explainer`: reuses `AppendDirectorDialog` (single clip mode). Calls `appendDirectorClipAction`.
  - When `swap`: renders source clip selector or video uploader + character reference. Calls `applyClipScroSwapInsertAction`.
  - When `teleport`: renders source clip selector or video uploader + scene prompt/image. Calls `applyClipTeleportInsertAction`.

- [ ] **Step 1: Implement `OpenCutAddClipModal`**

Implement multi-step state machine (`step: "selection" | "form"`, `mode: OpenCutAddClipMode | null`, `insertAt: number`).
Handles slot selection override and submission.

- [ ] **Step 2: Connect to `OpenCutScroToolbar`**

In `OpenCutScroToolbar`:
- Track `addClipOpen: boolean` and `playheadSlot: number`.
- Subscribe to `scroHost().subscribeScro` for message `{ type: "scro-timeline-add-clip", playheadSeconds, activeClipNumber }`.
- Calculate `insertAt = resolvePlayheadInsertSlot({ playheadSeconds, clipDurations, activeClipNumber })`.
- Open `OpenCutAddClipModal` with pre-filled `insertAt`.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/app/projects/new/opencut-add-clip-modal.tsx src/presentation/components/app/projects/new/opencut-scro-toolbar.tsx
git commit -m "feat(opencut): integrate OpenCutAddClipModal host controller and toolbar listener"
```

---

### Task 6: OpenCut `TimelineToolbar` Add Clip Button & Localization

**Files:**
- Modify: `src/opencut/timeline/components/timeline-toolbar.tsx`
- Modify: `src/opencut/i18n/locales/en.json` (or typescript dictionary)
- Modify: `src/opencut/i18n/locales/zh-tw.json` (or typescript dictionary)
- Modify: `src/util/i18n/messages/zh-hant.ts` and `en.ts`

**Interfaces:**
- Produces: `+ 新增片段` button in `ToolbarLeftSection` of `TimelineToolbar`.
- Action: Reads `editor.playback.getCurrentTime()` and active clip element, then calls `sendToScro({ type: "scro-timeline-add-clip", playheadSeconds, activeClipNumber }, window.location.origin)`.

- [ ] **Step 1: Add localization keys**

Add `addClip: "新增片段"` / `"Add Clip"` to timeline toolbar localization entries.

- [ ] **Step 2: Add `+ Add Clip` button in `TimelineToolbar`**

In `ToolbarLeftSection` of `src/opencut/timeline/components/timeline-toolbar.tsx`:
Add a primary action button before or beside the editing tools.
Click handler gets current playhead seconds and selected/hovered element's clip number, and sends message to Scro host.

- [ ] **Step 3: Verify TypeScript and lint**

Run: `npx tsc --noEmit` and `npx eslint src/opencut/timeline/components/timeline-toolbar.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/opencut/timeline/components/timeline-toolbar.tsx src/opencut/i18n/ src/util/i18n/
git commit -m "feat(opencut): add + Add Clip button on timeline toolbar with playhead dispatch"
```

---

### Task 7: Full System Verification & Regression Testing

**Files:**
- Test all related unit tests.
- Verify end-to-end type safety and build.

- [ ] **Step 1: Run all unit tests**

Run: `npx tsx --test src/opencut/timeline/playhead-slot.test.ts src/service/clip/append-simple-clip.test.ts src/service/opencut/clip-jutsu-insert.test.ts`
Expected: All PASS.

- [ ] **Step 2: Run complete typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run targeted lint**

Run: `npx eslint src/presentation/components/app/projects/new/opencut-add-clip-modal.tsx src/presentation/components/app/projects/new/opencut-scro-toolbar.tsx`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: complete OpenCut timeline add-clip verification"
```
