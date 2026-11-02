# Use-Case Direct Creation Page + History Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the creation workspace directly on `/app/explainers` and `/app/talking-heads` (without showing the list page first), and add a top-right History button that opens a modal dialog with the user's historical videos.

**Architecture:** `UseCaseVideoListPage` loads `loadStudioPickers(user)`, `loadFolderOptions(user.clerkUserId)`, and the matching `PublicVideoCard[]` in parallel, then renders `<VideoEditorWorkspace useCase={useCase} historyVideos={matching} ... />`. `VideoEditorDialog` renders a top-right History button with a count badge when `onOpenHistory` is passed, and `VideoEditorWorkspace` mounts `UseCaseHistoryDialog` containing `ProjectPicker` + `VideoTable`.

**Tech Stack:** Next.js App Router RSC, React Client Components, Tailwind CSS, Node test runner (`npx tsx --test`).

**Spec:** `docs/superpowers/specs/2026-11-02-use-case-creation-with-history-dialog-design.md`

## Global Constraints

- No backend / video generation pipeline changes.
- `/app/explainers` and `/app/talking-heads` must render the creation page directly even when the user already has videos.
- Top-right header bar shows a History button with count badge that opens the history modal.
- New UI component `use-case-history-dialog.tsx` lives in `src/presentation/components/app/projects/[id]/`.

---

### Task 1: Create `UseCaseHistoryDialog` component

**Files:**
- Create: `src/presentation/components/app/projects/[id]/use-case-history-dialog.tsx`

- [ ] **Step 1: Implement `UseCaseHistoryDialog`**
  - Accept `open`, `onClose`, `useCase`, `videos`, `folders`.
  - Render a portal modal with `ProjectPicker` folder filter and `<VideoTable videos={shown} />`.

- [ ] **Step 2: Typecheck and lint**
  - Run `npx tsc --noEmit --pretty false` and `npx eslint src/presentation/components/app/projects/\[id\]/use-case-history-dialog.tsx`

---

### Task 2: Add top-right History button to `VideoEditorDialog` and wire `VideoEditorWorkspace`

**Files:**
- Modify: `src/presentation/components/app/projects/[id]/video-editor-dialog.tsx`
- Modify: `src/presentation/components/app/projects/[id]/video-editor-workspace.tsx`

- [ ] **Step 1: Add `historyCount` and `onOpenHistory` props to `VideoEditorDialog`**
  - Render the History button in `top-right-bar` with a clock icon, localized label (`歷史紀錄` / `历史记录` / `History`), and count badge.
- [ ] **Step 2: Wire `historyVideos` and `UseCaseHistoryDialog` in `VideoEditorWorkspace`**
  - Accept `historyVideos?: PublicVideoCard[]` and open `UseCaseHistoryDialog` when clicked.

---

### Task 3: Render creation workspace directly on `/app/explainers`, `/app/talking-heads`, and `/app/videos/new`

**Files:**
- Modify: `src/presentation/components/app/use-case-video-list-page.tsx`
- Modify: `src/app/app/videos/new/page.tsx`
- Modify: `src/app/app/explainers/page.tsx`
- Modify: `src/app/app/talking-heads/page.tsx`

- [ ] **Step 1: Update `UseCaseVideoListPage` to load studio pickers + history cards and render `VideoEditorWorkspace`**
- [ ] **Step 2: Pass `historyVideos` in `/app/videos/new/page.tsx` as well**
- [ ] **Step 3: Typecheck, lint, and run `src/service/video/use-case.test.ts`**
