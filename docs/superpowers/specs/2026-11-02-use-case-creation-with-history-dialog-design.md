# Use-Case Direct Creation Page + Top-Right History Dialog

**Date:** 2026-11-02  
**Status:** Approved for planning  
**Surfaces:** `/app/explainers`, `/app/talking-heads`, `/app/videos/new?useCase=...`

## Goal

Show the video creation workspace (`VideoEditorWorkspace` / `NewProjectForm`) directly on `/app/explainers` and `/app/talking-heads` instead of rendering a video list page first. Add a **History** button in the top-right header bar that opens a modal dialog listing the user's historical videos for that use-case.

## Non-goals

- No changes to video generation pipelines, models, or credit costs.
- No changes to individual video editor routes (`/app/videos/[videoId]` or `/app/projects/[id]/videos/[videoId]`).

## UI & Routing Architecture

### 1. Direct Creation on `/app/explainers` and `/app/talking-heads`

- `UseCaseVideoListPage` (used by `/app/explainers/page.tsx` and `/app/talking-heads/page.tsx`) loads in parallel:
  - `loadStudioPickers(user)` (skills, styles, characters, products, textStyles, subscribed, hasAnyVideo)
  - `loadFolderOptions(user.clerkUserId)`
  - Optional requested folder (`project` or `projectId` query param) via `loadOwnedFolder`
  - User's `videos` matching `videoMatchesUseCase(video.skillSlug, useCase)` serialized via `toPublicVideoCard`
- Renders `<VideoEditorWorkspace useCase={useCase} historyVideos={matching} ... />` directly on `/app/explainers` and `/app/talking-heads` (and also passes `historyVideos` on `/app/videos/new` when `useCase` is set).

### 2. Top-Right History Button in `VideoEditorDialog`

- `VideoEditorDialog` accepts optional `historyCount?: number` and `onOpenHistory?: () => void`.
- When `onOpenHistory` is provided, render a button in `top-right-bar` (before `LanguageSwitcher`) with a clock/history icon, localized label (`歷史紀錄` / `历史记录` / `History`), and a count badge (`historyCount ?? 0`).

### 3. `UseCaseHistoryDialog` Modal

- New component `src/presentation/components/app/projects/[id]/use-case-history-dialog.tsx`.
- Portal modal over `#studio-dialog-root` / `document.body` (`z-[140]`), closable via backdrop click, `Escape` key, or top-right close button.
- Header shows:
  - Use-case history title (e.g., `解說短片歷史紀錄 · Explainer History` or `對鏡口播歷史紀錄 · Talking-Head History`)
  - `ProjectPicker` (`includeAll`) to filter the historical videos by folder without leaving the modal
  - Close button
- Scrollable body renders `<VideoTable videos={shown} />` so users can filter by status (All / In progress / Ready), search, open any video, rename, or delete.

## Testing

- Unit test verifying `videoMatchesUseCase` filtering for history cards remains intact.
- TypeScript (`npx tsc --noEmit`) and ESLint (`npx eslint ...`) clean on all touched files.
