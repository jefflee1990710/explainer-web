# Merge Production into Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Production tab; after Phase A, open Video (OpenCut) with ordered ScroVideo placeholders, auto-queue generation, live poster/video swap, Properties parity, and v1 bulk/queue/add/delete.

**Architecture:** Keep Mongo storyboard/frames/clips as source of truth. Add a pure `ScroVideo` view-model over `clipStateFor`. OpenCut timeline elements and media assets carry `scroClipNumber`. The host (`opencut-direct-desk`) seeds placeholders, triggers `generateRemainingAction` / existing plan, polls project updates, and pushes `scro-clip-updated` into the editor. Properties and bulk chrome call existing presentation actions.

**Tech Stack:** Next.js App Router, React 19, OpenCut in `src/opencut`, Mongo project model, existing clip production server actions, `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-14-merge-production-into-video-design.md`

## Global Constraints

- Reply to the user in Traditional Chinese; code, paths, identifiers stay English.
- New page-only UI components: separate files in the same directory; hooks ⇒ `"use client"`.
- Server calls via server actions, not new REST routes.
- Typed Mongo collections; short comments on non-obvious blocks.
- No live Higgsfield submits while developing or in tests (prompt/unit only).
- Verification: `npx tsx --test <files>`; scoped tsc/lint on touched paths. Do not require full-repo `tsc --noEmit` green (pre-existing errors exist).
- Commit after each task; leave unrelated dirty files unstaged.
- Duration on swap: keep storyboard/placeholder duration on the element; if file longer, trim to that duration; if shorter, keep element duration (shortfall visible in Properties later).

---

## File Structure

**Create**
- `src/service/scro-video/view-model.ts` — map project → `ScroVideoView[]`
- `src/service/scro-video/view-model.test.ts`
- `src/service/scro-video/timeline-seed.ts` — ordered seed rows for OpenCut (clipNumber, durationSec, posterUrl?, videoUrl?, stage)
- `src/service/scro-video/timeline-seed.test.ts`
- `src/opencut/embed/scro-video-types.ts` — message + metadata types shared host↔editor
- `src/opencut/embed/scro-video-sync.tsx` — listen for seed/update messages; insert/swap elements
- `src/opencut/embed/scro-video-assets.tsx` — Assets list section for ScroVideos
- `src/opencut/embed/scro-video-properties.tsx` — Properties panel for selected Scro clip
- `src/opencut/embed/scro-video-toolbar.tsx` — bulk / queue / add / delete entry points
- `src/opencut/embed/scro-video-queue.tsx` — in-flight queue UI (logic from production-queue)
- `src/presentation/components/app/projects/new/scro-video-host.tsx` — host-side poll, plan trigger, postMessage/bridge into desk

**Modify**
- `src/service/project-status.ts` — steps `input` → `video` (keep Mongo statuses; change step indices / unlock)
- `src/presentation/components/app/projects/[id]/editor-step-switch.tsx`
- `src/util/i18n/messages/**` + `project-status-i18n` labels (Production → gone; export step = Video)
- `src/presentation/components/app/projects/new/new-project-form.tsx` — show OpenCut when production-like + phaseA; stop gating on `ready`
- `src/presentation/components/app/projects/new/opencut-direct-desk.tsx` — wire host seed/updates/auto-plan
- `src/opencut/timeline/types.ts` — optional `scroClipNumber` on video/image elements
- `src/opencut/services/storage/types.ts` — optional `scroClipNumber`, `scroPosterUrl` on `MediaAssetData`
- `src/opencut/embed/scro-clip-import.tsx` — retire or thin-wrap; seed path replaces completed-only import
- `src/opencut/embed/scro-inline-editor.tsx` — mount sync + properties + assets + toolbar
- `src/opencut/components/editor/panels/assets/**` — ScroVideo section
- `src/opencut/components/editor/panels/properties/**` — Scro tab when selection has `scroClipNumber`
- `src/opencut/timeline/element-utils.ts` / `buildElementFromMedia` — pass through `scroClipNumber`

**Retire as primary UX (last task)**
- Stop rendering `ClipProduction` from `new-project-form.tsx`
- Leave components under `src/presentation/components/project/` until a follow-up delete PR if still referenced by dialogs reused from OpenCut

---

### Task 1: Unlock Video without global `ready`

**Files:**
- Modify: `src/service/project-status.ts`
- Modify: `src/presentation/components/app/projects/[id]/editor-step-switch.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`
- Modify: i18n step labels (`project.steps.*`, `project-status-i18n`)
- Test: `src/service/project-status.test.ts` (create or extend)

**Interfaces:**
- Produces: `PROJECT_STEP_IDS = ["input", "video"]` (or keep three ids but UI only shows video; prefer two user steps: map old `export` index to Video). Recommended mapping:
  - `PROJECT_STEP_IDS = ["input", "video"]`
  - `STATUS_META.phase_a|production|ready.step = 1` (Video)
  - `maxReachableStep(current, phaseAReady: boolean)` unlocks step 1 when Phase A has clips, not when `clipsReady`
- Consumes: `PublicVideo.phaseA?.clips`

- [ ] **Step 1: Write failing tests for unlock**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maxReachableStep } from "@/service/project-status";

describe("maxReachableStep", () => {
  it("unlocks video when phase A is ready even if clips are not done", () => {
    assert.equal(maxReachableStep(1, true), 1);
  });
  it("does not unlock video when phase A is not ready", () => {
    assert.equal(maxReachableStep(0, false), 0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx tsx --test src/service/project-status.test.ts`

- [ ] **Step 3: Implement step ids + unlock**

Update `project-status.ts`:
- `PROJECT_STEP_IDS = ["input", "video"] as const`
- Rename usages of `"production" | "export"` in the step switch to `"video"` only (single editor tab after brief), **or** keep two chrome tabs both pointing at video during migration—spec wants Production gone, so **one** editor tab: Video.
- `maxReachableStep(current, phaseAReady: boolean)` → `phaseAReady ? 1 : Math.min(current, 0)` (adjust to match final step count).
- `stepVisualState`: simplify for two steps.

Update `EditorStepSwitch` to only list Video (or Input is never here—already true). If only one tab remains, render a non-switch label "Video" or hide the switch entirely when there is no Production sibling.

Update `new-project-form.tsx`:
- Replace `reelDesk = viewing === 2 && project?.status === "ready"` with Video desk when `project?.phaseA && isProductionLike(project.status)` (and not `phase_a` busy).
- Stop requiring `viewing === 2`; after Phase A, default viewing to Video.
- Remove `ClipProduction` render branch (or gate behind a dead flag removed in Task 11).

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/service/project-status.ts src/service/project-status.test.ts \
  src/presentation/components/app/projects/[id]/editor-step-switch.tsx \
  src/presentation/components/app/projects/new/new-project-form.tsx \
  src/util/i18n src/util/project-status-i18n.ts
git commit -m "feat(video): open Video tab without waiting for all clips"
```

---

### Task 2: ScroVideo view-model (pure)

**Files:**
- Create: `src/service/scro-video/view-model.ts`
- Create: `src/service/scro-video/view-model.test.ts`

**Interfaces:**
- Consumes: `clipStateFor`, `clipSkipsEndStill`, `mediaSrc`, `ClipStageSource` + storyboard rows
- Produces:

```ts
export type ScroVideoUiStage =
  | "awaiting_frames"
  | "frames_generating"
  | "frames_ready"
  | "video_generating"
  | "video_ready"
  | "failed";

export type ScroVideoView = {
  clipNumber: number;
  durationSeconds: number;
  stage: ScroVideoUiStage;
  posterUrl?: string; // start still when available
  videoUrl?: string;
  englishVo?: string;
  startVo?: string;
  endVo?: string;
  explainerScene?: string;
  motionCamera?: string;
  error?: string;
};

export function scroVideosFor(project: ClipStageSource & {
  phaseA?: { clips: Array<{
    clipNumber: number;
    durationSeconds?: number;
    englishVo?: string;
    startVo?: string;
    endVo?: string;
    explainerScene?: string;
    motionCamera?: string;
    startScene?: string;
    endScene?: string;
  }> };
}): ScroVideoView[];
```

Map `ClipStage` → `ScroVideoUiStage`: `no_frames`→`awaiting_frames`; `frames_generating`→`frames_generating`; `frames_ready`→`frames_ready`; `video_generating`→`video_generating`; `video_ready`→`video_ready`; `frames_failed|video_failed`→`failed`.

- [ ] **Step 1: Write failing tests** (start-only vs dual-beat, generating, ready, failed)

```ts
it("uses start poster while video generates", () => {
  const views = scroVideosFor(projectWithStartStillAndVideoInFlight);
  assert.equal(views[0].stage, "video_generating");
  assert.ok(views[0].posterUrl);
  assert.equal(views[0].videoUrl, undefined);
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx tsx --test src/service/scro-video/view-model.test.ts`

- [ ] **Step 3: Implement `scroVideosFor`**

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/service/scro-video/
git commit -m "feat(scro-video): add pure view-model for Assets and timeline"
```

---

### Task 3: Timeline / media carry `scroClipNumber`

**Files:**
- Modify: `src/opencut/timeline/types.ts` — `scroClipNumber?: number` on `VideoElement` and `ImageElement`
- Modify: `src/opencut/services/storage/types.ts` — `scroClipNumber?: number` on `MediaAssetData`
- Modify: `src/opencut/timeline/element-utils.ts` — `buildElementFromMedia` accepts optional `scroClipNumber`
- Create: `src/opencut/embed/scro-video-types.ts`

**Interfaces:**
- Produces:

```ts
// scro-video-types.ts
export type ScroVideoSeedClip = {
  clipNumber: number;
  durationSeconds: number;
  stage: ScroVideoUiStage;
  posterUrl?: string;
  videoUrl?: string;
  name: string; // "Clip N"
};

export type ScroSeedMessage = {
  type: "scro-seed-videos";
  videoId: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  clips: ScroVideoSeedClip[];
};

export type ScroClipUpdatedMessage = {
  type: "scro-clip-updated";
  videoId: string;
  clip: ScroVideoSeedClip;
};
```

- [ ] **Step 1: Add fields + thread through `buildElementFromMedia`**

- [ ] **Step 2: Unit-smoke: build an image element with `scroClipNumber: 2` and assert field persists**

```ts
// small test next to element-utils or in embed test file
const el = buildElementFromMedia({
  mediaId: "m1",
  mediaType: "image",
  name: "Clip 2",
  duration: toElementDurationTicks({ seconds: 5 }),
  startTime: mediaTimeFromSeconds({ seconds: 0 }),
  scroClipNumber: 2,
});
assert.equal(el.scroClipNumber, 2);
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(opencut): persist scroClipNumber on media and timeline elements"
```

---

### Task 4: Seed placeholders into OpenCut (replace completed-only import)

**Files:**
- Create: `src/service/scro-video/timeline-seed.ts` + test
- Create: `src/opencut/embed/scro-video-sync.tsx`
- Modify: `src/opencut/embed/scro-inline-editor.tsx` — mount `<ScroVideoSync />`
- Modify: `src/presentation/components/app/projects/new/opencut-direct-desk.tsx` — send `scro-seed-videos` instead of only `scro-import-clips` when edit empty
- Modify: `src/opencut/embed/scro-clip-import.tsx` — stop appending completed mp4s that lack `scroClipNumber`; leave restore path alone

**Interfaces:**
- Consumes: `scroVideosFor`, `ScroSeedMessage`
- Produces: main-track elements for every storyboard clip when no saved edit

Seed algorithm (editor):
1. On `scro-seed-videos`, if main track already has any `scroClipNumber`, skip full seed (reconcile only).
2. Else for each clip in order: if `videoUrl` fetch as video asset; else if `posterUrl` fetch as image asset; else create a 1×1 (or shared placeholder image asset) marked loading via metadata.
3. Insert with `duration = durationSeconds`, `startTime` = running cursor, `scroClipNumber` set.
4. Remember mapping mediaId ↔ clipNumber in `scro-media-sources` helpers (extend existing).

- [ ] **Step 1: Test `buildSeedClips(project)` ordering and durations**

```ts
it("orders by clipNumber and uses storyboard duration", () => {
  const rows = buildSeedClips(sampleProject);
  assert.deepEqual(rows.map((r) => r.clipNumber), [1, 2, 3]);
  assert.equal(rows[0].durationSeconds, 5);
});
```

- [ ] **Step 2: Implement seed helper + sync listener**

- [ ] **Step 3: Host sends seed when OpenCut reports ready and no saved edit**

- [ ] **Step 4: Manual check notes in commit body; automated test for seed helper PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(scro-video): seed timeline placeholders from storyboard"
```

---

### Task 5: Live swap on `scro-clip-updated`

**Files:**
- Modify: `src/opencut/embed/scro-video-sync.tsx`
- Create: `src/presentation/components/app/projects/new/scro-video-host.tsx` (or fold into desk)
- Modify: `opencut-direct-desk.tsx` — on project poll diff, emit updates

**Interfaces:**
- Consumes: previous/next `ScroVideoView[]`
- Produces: in-place media replace for element with matching `scroClipNumber`

Swap rules:
1. Find main (and overlay) elements with `scroClipNumber === clip.clipNumber`.
2. If `videoUrl` newly available: fetch → `addMediaAsset` → `updateElements` patch `mediaId` + `type: "video"`; keep `startTime` and **element.duration** (storyboard duration).
3. Else if poster changed: swap to image media; keep duration.
4. Update asset thumbnail for Assets list.
5. On fetch failure: toast / console error; do not remove element.

- [ ] **Step 1: Pure helper test `diffScroVideos(prev, next)` → list of clips needing update**

- [ ] **Step 2: Implement sync handler + host diff emitter**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(scro-video): live-swap timeline media when clips finish"
```

---

### Task 6: Auto-start production plan on Video enter

**Files:**
- Modify: `opencut-direct-desk.tsx` / `scro-video-host.tsx`
- Uses: `generateRemainingAction` from `@/presentation/actions/clip-production` (same as Production toolbar)

**Interfaces:**
- When desk mounts with `phaseA` and `planRemaining(project).cost > 0` (or frames/videos non-empty), call `generateRemainingAction` once per session (ref guard), respecting credits errors (surface toast).

- [ ] **Step 1: Add `didAutoPlanRef` guard; call action after seed**

- [ ] **Step 2: Ensure poll already used by Production form still runs while Video desk visible** (`use-project-poll` or desk-local refresh)

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(scro-video): auto-queue remaining production from Video desk"
```

---

### Task 7: Assets — ScroVideo list

**Files:**
- Create: `src/opencut/embed/scro-video-assets.tsx`
- Modify: assets media view / `assets/index.tsx` to render Scro section when embed host provides clips (props or editor store)

**Interfaces:**
- Host keeps latest `ScroVideoView[]` in a small zustand/context on the desk **or** push into editor via message `scro-videos-state`.
- Prefer: `scro-videos-state` message → module-level store in `src/opencut/embed/scro-video-store.ts` with `useSyncExternalStore`.

Store API:

```ts
export type ScroVideoStoreState = { videoId: string; clips: ScroVideoView[] };
export function setScroVideos(state: ScroVideoStoreState): void;
export function getScroVideos(): ScroVideoStoreState | null;
export function subscribeScroVideos(fn: () => void): () => void;
```

UI: grid/list Clip N + stage badge + poster/loading; click selects timeline element if present else sets “asset selection” for Properties.

- [ ] **Step 1: Store + Assets section component**

- [ ] **Step 2: Wire into assets panel for Scro embed only**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(scro-video): show ScroVideo list in Assets panel"
```

---

### Task 8: Properties — Scro clip panel

**Files:**
- Create: `src/opencut/embed/scro-video-properties.tsx`
- Create: `src/opencut/embed/scro-video-primary-actions.tsx` (generate/regenerate buttons)
- Modify: OpenCut properties panel to render Scro panel when selection has `scroClipNumber`

**Interfaces:**
- Reads `ScroVideoView` for selected clipNumber from store
- Calls:
  - `generateClipFramesAction(videoId, clipNumber)`
  - `generateClipVideoAction(videoId, clipNumber)`
  - existing regenerate frame action used by `FrameEditDialog`
- Displays VO / scene / motion from view-model (read-only text blocks)

- [ ] **Step 1: Panel UI with stage-dependent primary button**

- [ ] **Step 2: Wire selection from timeline element `scroClipNumber`**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(scro-video): Properties panel for Scro clips"
```

---

### Task 9: Edit with AI + FrameEdit on OpenCut shell

**Files:**
- Create: `src/opencut/embed/scro-video-ai-entry.tsx` — buttons that open existing dialogs
- Reuse: `src/presentation/components/project/scene-chat-dialog.tsx`, `frame-edit-dialog.tsx`
- Modify: `opencut-direct-desk.tsx` or properties to portal dialogs with `project` + callbacks already used in Production

**Interfaces:**
- Pass the same props Production passes today (`project`, `clipNumber`, `position`, `onRegenerateFrame`, etc.).
- Dialogs stay in presentation layer; OpenCut only mounts them when user clicks.

- [ ] **Step 1: Mount SceneChat + FrameEdit from Properties thumbs/buttons**

- [ ] **Step 2: After successful AI/redraw, rely on poll → `scro-clip-updated` for thumbs**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(scro-video): Edit with AI and frame redraw in Video tab"
```

---

### Task 10: Bulk, queue, add clip, delete clip

**Files:**
- Create: `src/opencut/embed/scro-video-toolbar.tsx`
- Create: `src/opencut/embed/scro-video-queue.tsx`
- Reuse actions: `generateRemainingAction`, `generateSelectedClipsAction`, `generateAllSceneImagesAction`, `generateAllClipsAction`, add/delete from `presentation/actions/clip-timeline` / project clip actions
- Port selection patterns from `selection-bar.tsx` / `bulk-generate-dialog.tsx` (logic, new UI files under embed/)

**Interfaces:**
- Toolbar visible in Scro embed editor chrome (above Assets or in OpenCut top bar area used by Scro).
- Add clip: call existing add-clip action → host refreshes project → append seed for new clipNumber on main track end.
- Delete clip: confirm → delete action → remove elements with that `scroClipNumber` + drop from store.

- [ ] **Step 1: Queue + Generate remaining/selected**

- [ ] **Step 2: Add / delete clip with timeline reconcile**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(scro-video): bulk queue and clip add/delete in Video"
```

---

### Task 11: Remove Production entry points + copy polish

**Files:**
- Modify: `new-project-form.tsx` — delete `ClipProduction` import/branch
- Modify: i18n strings that tell users to finish Production first (`video.opencut.empty`, step labels)
- Modify: folder/video list CTAs if they deep-link to production step
- Optional follow-up (same PR if safe): stop exporting Production from studio nav

**Do not delete** `src/presentation/components/project/scene-chat-dialog.tsx` / `frame-edit-dialog.tsx` (still used).

- [ ] **Step 1: Grep for `ClipProduction`, `viewing === 1`, `isProductionLike` UI branches; remove dead paths**

- [ ] **Step 2: Update empty states / help copy**

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(video): remove Production tab entry points"
```

---

### Task 12: Milestone verification checklist

**Files:** none required; test + manual notes

- [ ] **Step 1: Automated**

```bash
npx tsx --test src/service/scro-video/view-model.test.ts \
  src/service/scro-video/timeline-seed.test.ts \
  src/service/project-status.test.ts
```

Expected: PASS

- [ ] **Step 2: Manual script (no Higgsfield required if using an existing video with fixtures)**

1. Open a video with Phase A clips and incomplete videos → lands on Video, placeholders ordered.
2. Confirm Assets lists ScroVideos with stages.
3. Select placeholder → Properties shows VO + generate actions.
4. With mocked/poll updates, poster then video swap keeps startTime.
5. Bulk generate / delete / add clip once against staging.

- [ ] **Step 3: Commit** docs note if any plan deviations in `docs/superpowers/plans/` only when needed

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Remove Production tab / create → Video | 1, 11 |
| ScroVideo statuses + start/end setting | 2 |
| Placeholders on timeline by 分鏡 order | 4 |
| Thumb start image / loading | 2, 4, 5, 7 |
| Live swap to video URL | 5 |
| Auto production plan | 6 |
| Properties: regenerate, VO, prompt | 8 |
| Edit with AI + frame redraw | 9 |
| Bulk / queue / add / delete v1 | 10 |
| Export unlock separate from Video enter | 1 (`clipsReady` no longer gates Video) |
| No live Higgsfield in tests | Global + Task 2/12 |

## Type consistency

- `ScroVideoUiStage` and `ScroVideoView` defined in Task 2; seed clips in Task 3/4 reuse the same stage union via `scro-video-types` re-export or import from view-model.
- Message types: `scro-seed-videos`, `scro-clip-updated`, `scro-videos-state`.
- Element field name: always `scroClipNumber` (number).

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-10-14-merge-production-into-video.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
