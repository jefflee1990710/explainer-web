# Unified Videos List View & OpenCut Default Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all videos on `/app/videos` in a single unified List View with pagination, and make all video generations (including standalone Scro Swap and Teleport) open in the OpenCut editor by default.

**Architecture:** Standalone Scro Swap (`video`/`gif`) and Teleport jobs provision a single-clip `Project` in the `videos` collection (`skillSlug: "scro-swap-director"` or `"teleport-director"`) and store its ID in `targetVideoId` (`targetClipNumber: 1`). Frame preparation and video completion sync back to that `Project` via `settleTargetClipFromEngineJob` so OpenCut renders live progress and the final MP4. `/app/videos` merges Studio videos, Scro Swap jobs, and Teleport jobs (deduplicating standalone wrapper projects against their engine jobs) into one chronological list view with category/stage filtering and 12-item pagination.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, MongoDB, Node built-in test runner (`node:test` + `tsx`).

**Spec:** `docs/superpowers/specs/2026-11-05-unified-videos-list-opencut-design.md`

## Global Constraints

- Never make live paid provider calls during unit tests.
- Keep `targetVideoId` + `targetClipNumber` in-place clip replacement working unchanged when triggered from inside OpenCut (`src/service/opencut/clip-jutsu.ts`).
- Standalone static image swaps (`sourceMediaKind === "image"`) do not auto-redirect to the video editor on submit, and remain previewable/downloadable in the unified list.

## Review Focus

1. Deduplication on `/app/videos`: A standalone Scro Swap or Teleport job that created a backing `Project` in `videos` (`skillSlug: "scro-swap-director"` or `"teleport-director"`) must appear once in `/app/videos`, not twice (once as a Studio video and once as a Swap/Teleport job).
2. Legacy Scro Swap / Teleport jobs without `targetVideoId`: Clicking "Open in Editor" on an older completed or rendering job must lazily create and attach a backing `Project` in `videos` and return its `videoId`.
3. Frame & aspect ratio sync: When a standalone Scro Swap or Teleport job extracts the source video's actual aspect ratio and `preparedStartFrameUrl`, the backing `Project` must update its `aspectRatio` and `frames[0]` (`completed` with ` preparedStartFrameUrl`) so OpenCut shows the poster frame and right canvas aspect ratio.
4. Paging bounds when switching category or stage filters: Changing the active tab or stage filter must clamp/reset the current page to 1 so an empty out-of-range page is never shown.
5. Deleting a unified list item: Deleting a Scro Swap or Teleport row from `/app/videos` must delete the engine job (and its backing standalone `Project` if any) and update the list state cleanly.

---

### Task 1: Standalone Engine Video Provisioning & Sync (`src/service/opencut/standalone-engine-video.ts`)

**Files:**
- Create: `src/service/opencut/standalone-engine-video.ts`
- Create: `src/service/opencut/standalone-engine-video.test.ts`
- Modify: `src/service/opencut/clip-jutsu-settle.ts`
- Modify: `src/service/jutsu/pipeline.ts`
- Modify: `src/service/teleport/pipeline.ts`
- Modify: `src/presentation/actions/jutsu.ts`
- Modify: `src/presentation/actions/teleport.ts`

**Interfaces:**
- Produces in `src/service/opencut/standalone-engine-video.ts`:
  - `SCRO_SWAP_STANDALONE_SKILL_SLUG = "scro-swap-director"`
  - `TELEPORT_STANDALONE_SKILL_SLUG = "teleport-director"`
  - `isStandaloneEngineSkillSlug(skillSlug?: string | null): boolean`
  - `buildStandaloneEngineProjectDoc(input: { userId: ObjectId; clerkUserId: string; kind: "scroswap" | "teleport"; title: string; sourceVideoUrl: string; aspectRatio: AspectRatio; durationSeconds: number; posterUrl?: string; outputVideoUrl?: string; status?: "rendering" | "completed" | "failed"; error?: string; now?: Date }): Project`
  - `createStandaloneEngineProject(input: ...): Promise<ObjectId>`
  - `syncStandaloneEngineFrame(input: { targetVideoId?: ObjectId; targetClipNumber?: number; aspectRatio?: AspectRatio; durationSeconds?: number; posterUrl?: string }): Promise<void>`
  - `ensureJutsuJobOpenCutVideo(jobId: string): Promise<{ ok: true; videoId: string } | { ok: false; error: string }>`
  - `ensureTeleportJobOpenCutVideo(jobId: string): Promise<{ ok: true; videoId: string } | { ok: false; error: string }>`
- Produces in `src/presentation/actions/jutsu.ts`:
  - `openJutsuJobInEditorAction(jobId: string)`
- Produces in `src/presentation/actions/teleport.ts`:
  - `openTeleportJobInEditorAction(jobId: string)`

- [ ] **Step 1: Write the failing unit tests in `src/service/opencut/standalone-engine-video.test.ts`**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  buildStandaloneEngineProjectDoc,
  isStandaloneEngineSkillSlug,
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-video";
import { shouldOpenVideoDesk } from "@/service/project-status";
import { buildSeedClips } from "@/service/scro-video/timeline-seed";

test("buildStandaloneEngineProjectDoc creates a 1-clip Project that opens directly in OpenCut", () => {
  const userId = new ObjectId();
  const doc = buildStandaloneEngineProjectDoc({
    userId,
    clerkUserId: "user_1",
    kind: "scroswap",
    title: "Scro Swap · Alice",
    sourceVideoUrl: "https://blob.vercel-storage.com/src.mp4",
    aspectRatio: "9:16",
    durationSeconds: 6,
    posterUrl: "https://blob.vercel-storage.com/start.webp",
    status: "rendering",
  });

  assert.equal(doc.skillSlug, SCRO_SWAP_STANDALONE_SKILL_SLUG);
  assert.equal(isStandaloneEngineSkillSlug(doc.skillSlug), true);
  assert.equal(isStandaloneEngineSkillSlug(TELEPORT_STANDALONE_SKILL_SLUG), true);
  assert.equal(isStandaloneEngineSkillSlug("talking-head-director"), false);
  assert.equal(shouldOpenVideoDesk(doc, 1), true);

  const seeds = buildSeedClips(doc);
  assert.equal(seeds.length, 1);
  assert.equal(seeds[0]?.clipNumber, 1);
  assert.equal(seeds[0]?.stage, "video_generating");
  assert.equal(seeds[0]?.posterUrl, "https://blob.vercel-storage.com/start.webp");
});

test("buildStandaloneEngineProjectDoc marks completed job as ready with video_ready seed clip", () => {
  const doc = buildStandaloneEngineProjectDoc({
    userId: new ObjectId(),
    clerkUserId: "user_1",
    kind: "teleport",
    title: "Teleport · Neon Street",
    sourceVideoUrl: "https://blob.vercel-storage.com/src.mp4",
    aspectRatio: "16:9",
    durationSeconds: 8,
    posterUrl: "https://blob.vercel-storage.com/prepared.webp",
    outputVideoUrl: "https://blob.vercel-storage.com/out.mp4",
    status: "completed",
  });

  assert.equal(doc.status, "ready");
  const seeds = buildSeedClips(doc);
  assert.equal(seeds[0]?.stage, "video_ready");
  assert.equal(seeds[0]?.videoUrl, "https://blob.vercel-storage.com/out.mp4");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/service/opencut/standalone-engine-video.test.ts`
Expected: FAIL with module not found `@/service/opencut/standalone-engine-video`

- [ ] **Step 3: Implement `src/service/opencut/standalone-engine-video.ts` and wire into `jutsu/pipeline.ts`, `teleport/pipeline.ts`, and `clip-jutsu-settle.ts`**

In `src/service/opencut/standalone-engine-video.ts`:
- Build a valid single-clip `Project` document (`status: "production"` when rendering, `"ready"` when completed with `outputVideoUrl`, `phaseA` with 1 clip, `frames` with clip 1 start frame, `clips` with clip 1).
- In `startScroSwapJob` (when `!input.targetVideoId && sourceMediaKind !== "image"`) and `startTeleportJob` (when `!normalized.targetVideoId`), call `createStandaloneEngineProject` and set `targetVideoId` and `targetClipNumber: 1` on the inserted job document so `toPublicJutsuJob` / `toPublicTeleportJob` immediately includes `targetVideoId`.
- In `runScroSwapJobInBackground` and `runTeleportJobInBackground`, once `preparedStartFrameUrl` and `extracted.aspectRatio` are ready, call `syncStandaloneEngineFrame` so the OpenCut editor receives the prepared keyframe poster and aspect ratio while the video renders.
- In `deleteJutsuJob` and `deleteTeleportJob`, if the deleted job has a `targetVideoId` whose `Project.skillSlug` is a standalone engine slug, also delete that standalone `Project` document.
- Expose `openJutsuJobInEditorAction` and `openTeleportJobInEditorAction` so legacy jobs without `targetVideoId` lazily create and bind a standalone `Project` and return `{ ok: true, videoId }`.

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npx tsx --test src/service/opencut/standalone-engine-video.test.ts`
Expected: PASS

---

### Task 2: Default Redirect to OpenCut Editor on Video Generation (`JutsuStudio`, `TeleportStudio`, Dialogs & History Panels)

**Files:**
- Modify: `src/presentation/components/app/jutsu/jutsu-studio.tsx`
- Modify: `src/presentation/components/app/jutsu/scro-swap-create-dialog.tsx`
- Modify: `src/presentation/components/app/jutsu/scro-swap-history-panel.tsx`
- Modify: `src/presentation/components/app/teleport/teleport-studio.tsx`
- Modify: `src/presentation/components/app/teleport/teleport-create-dialog.tsx`
- Modify: `src/presentation/components/app/teleport/teleport-history-panel.tsx`

**Interfaces:**
- Consumes: `openJutsuJobInEditorAction` from `@/presentation/actions/jutsu`, `openTeleportJobInEditorAction` from `@/presentation/actions/teleport`, `folderVideoPath` from `@/service/folder-video-path`.

- [ ] **Step 1: Update `JutsuStudio` and `ScroSwapCreateDialog` to redirect to OpenCut on video/GIF submit**

When `startScroSwapJobAction` succeeds and `res.job.targetVideoId` is present (i.e. video or GIF mode), navigate immediately via `router.push(folderVideoPath(undefined, res.job.targetVideoId))`.

- [ ] **Step 2: Update `TeleportStudio` and `TeleportCreateDialog` to redirect to OpenCut on submit**

When `startTeleportJobAction` succeeds and `res.job.targetVideoId` is present, navigate immediately via `router.push(folderVideoPath(undefined, res.job.targetVideoId))`.

- [ ] **Step 3: Add "Open in OpenCut Editor" button to `ScroSwapHistoryPanel` and `TeleportHistoryPanel`**

For any video/GIF job in the history panels, add an action button that navigates to `/app/videos/${job.targetVideoId}` (or calls `openJutsuJobInEditorAction` / `openTeleportJobInEditorAction` for legacy jobs without `targetVideoId`).

---

### Task 3: Unified Video List Model, Filtering, Deduplication & Paging (`src/service/video/unified-video-list.ts`)

**Files:**
- Create: `src/service/video/unified-video-list.ts`
- Create: `src/service/video/unified-video-list.test.ts`

**Interfaces:**
- Produces in `src/service/video/unified-video-list.ts`:
  - `export type UnifiedVideoCategory = "all" | "studio" | "scroswap" | "teleport";`
  - `export type UnifiedVideoItem = { id: string; kind: "studio" | "scroswap" | "teleport"; title: string; subtitle?: string; createdAt: string; aspectRatio: string; durationLabel: string; languageOrModeLabel: string; previewUrls: string[]; outputVideoUrl?: string; outputImageUrl?: string; outputGifUrl?: string; sourceMediaKind?: "video" | "gif" | "image"; stage: VideoListFilter; isBusy: boolean; progressText?: string | null; error?: string; editorVideoId?: string; folderId?: string; studioVideo?: PublicVideoCard; swapJob?: PublicJutsuJob; teleportJob?: PublicTeleportJob; }`
  - `export function buildUnifiedVideoItems(input: { videos: PublicVideoCard[]; swapJobs: PublicJutsuJob[]; teleportJobs: PublicTeleportJob[]; postedOverrides?: Record<string, string>; archivedOverrides?: Record<string, string | null>; isEn?: boolean; t: TranslateFn }): UnifiedVideoItem[]`
  - `export function filterUnifiedVideoItems(items: UnifiedVideoItem[], category: UnifiedVideoCategory, stages: VideoListFilter[]): { filtered: UnifiedVideoItem[]; categoryCounts: Record<UnifiedVideoCategory, number>; stageCounts: Record<VideoListFilter, number> }`

- [ ] **Step 1: Write the failing unit tests in `src/service/video/unified-video-list.test.ts`**

Test:
1. Merging Studio videos, Scro Swap jobs, and Teleport jobs into a single list sorted by `createdAt` descending.
2. Deduplicating standalone wrapper projects (`skillSlug === "scro-swap-director"` or `"teleport-director"` or matching `swapJob.targetVideoId` when `targetClipNumber === 1` and the project only has 1 clip from standalone engine creation) so each standalone Swap/Teleport appears once under its `"scroswap"` / `"teleport"` kind while retaining `editorVideoId` and posted/archived flags from the backing `Project`.
3. Filtering by `UnifiedVideoCategory` and `VideoListFilter[]` stage pills and computing accurate counts.
4. Slicing pages with `pageSlice` and `pageCount` (`VIDEO_PAGE_SIZE = 12`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/service/video/unified-video-list.test.ts`
Expected: FAIL with module not found `@/service/video/unified-video-list`

- [ ] **Step 3: Implement `src/service/video/unified-video-list.ts`**

Implement `buildUnifiedVideoItems` and `filterUnifiedVideoItems` with full deduplication, stage mapping (`in_progress`, `pending_post`, `posted`, `archived`, `failed`), and localized metadata labels.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/service/video/unified-video-list.test.ts`
Expected: PASS

---

### Task 4: Unified List View UI with Paging on `/app/videos` (`src/presentation/components/app/videos/all-videos-view.tsx`)

**Files:**
- Create: `src/presentation/components/app/videos/video-list-row.tsx`
- Modify: `src/presentation/components/app/videos/all-videos-view.tsx`
- Modify: `src/app/app/videos/page.tsx`
- Modify: `src/util/i18n/messages/en.ts`
- Modify: `src/util/i18n/messages/zh-Hant.ts`
- Modify: `src/util/i18n/messages/zh-Hans.ts`

**Interfaces:**
- Consumes: `buildUnifiedVideoItems`, `filterUnifiedVideoItems`, `UnifiedVideoItem`, `UnifiedVideoCategory` from `@/service/video/unified-video-list`, `VideoListFilters` from `@/presentation/components/app/projects/[id]/video-list-filters`, `VideoTablePager` from `@/presentation/components/app/projects/[id]/video-table-pager`, `pageCount`, `pageSlice` from `@/util/video-page`.

- [ ] **Step 1: Create `src/presentation/components/app/videos/video-list-row.tsx`**

Render each `UnifiedVideoItem` as a clean, responsive horizontal list row containing:
- Left: 16:9 / 9:16-aware thumbnail preview (`PreviewStrip` or image preview) with live status indicator.
- Middle:
  - Category badge (`Explainer & Talking Head` / `Scro Swap` / `Teleport`) + Stage badge (`Generating` / `Ready to Post` / `Posted` / `Archived` / `Failed`).
  - Video title (clickable link/action that opens `/app/videos/[editorVideoId]` in OpenCut Editor).
  - Step progress text or error message.
  - Metadata line: `aspectRatio · duration · language/mode · createdAt`.
- Right: Action buttons:
  - Primary action: `Open in Editor` / `開啟剪輯器` (for all video/GIF items; calls `openJutsuJobInEditorAction` / `openTeleportJobInEditorAction` if `editorVideoId` is not yet provisioned, then navigates to `/app/videos/[videoId]`).
  - Direct MP4 / GIF / 2K Image download link when `outputVideoUrl` / `outputGifUrl` / `outputImageUrl` is available.
  - Studio workflow actions (`Generate All Videos`, `Mark Posted`, `Archive` / `Unarchive`) when backed by a `Project`, and `Delete` button for Scro Swap / Teleport jobs.

- [ ] **Step 2: Update `src/presentation/components/app/videos/all-videos-view.tsx` and `src/app/app/videos/page.tsx`**

- Replace the three separate sections (`VideoTable` grid + `ScroSwapHistoryPanel` + `TeleportHistoryPanel`) with the single unified list view:
  - Top bar: Title + Category filter tabs (`All Videos`, `Explainer & Talking Head`, `Scro Swap`, `Teleport`) with live counts.
  - Stage filter bar: `VideoListFilters` (`All`, `In Progress`, `Pending Post`, `Posted`, `Archived`, `Failed`).
  - Single vertical list container (`divide-y` / stacked list rows) rendering the current page's 12 `VideoListRow` items.
  - Bottom pagination bar: `VideoTablePager` (`page`, `pages`, `onPage`).
  - Automatic polling for any in-flight Scro Swap or Teleport jobs so their status updates live in the list.
- In `src/app/app/videos/page.tsx`, increase the query limits appropriately so all user videos and jobs paginate smoothly.
- Rename the left side drawer `nav.explainerVideo` label from `"Explainer Video"` to `"Explainer"` in `src/util/i18n/messages/en.ts`, `src/util/i18n/messages/zh-Hant.ts`, and `src/util/i18n/messages/zh-Hans.ts`.

- [ ] **Step 3: Run typecheck, lint, and unit tests**

Run:
- `npx tsc --noEmit`
- `npx eslint src/app/app/videos/ src/presentation/components/app/videos/ src/presentation/components/app/jutsu/ src/presentation/components/app/teleport/ src/service/opencut/ src/service/video/`
- `npx tsx --test src/service/opencut/standalone-engine-video.test.ts src/service/video/unified-video-list.test.ts`
Expected: 0 errors, all tests PASS.
