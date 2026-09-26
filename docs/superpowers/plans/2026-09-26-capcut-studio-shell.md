# Light CapCut studio shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every logged-in page in one light CapCut-style shell, and put the video editor in a three-pane frame with a bottom filmstrip.

**Architecture:** `src/presentation/studio/` owns tokens and presentational chrome. `AppShell` renders that shell. The editor maps existing clip state into `StudioClipItem` and places preview, inspector, and the filmstrip in `StudioFrame`. Generation and billing stay untouched.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-09-26-capcut-studio-shell-design.md`

## Global Constraints

- Light tokens live on `.studio-app`: canvas `#f3f4f6`, panel `#ffffff`, line `#e5e7eb`, ink `#12141c`, teal `#14b8a6`.
- Marketing pages keep `:root` paper colors and the warm `.studio-canvas` gradient.
- Editor covers the app rail. Create (no video yet) uses `StudioPanel`, not `StudioFrame`.
- One video track. Playhead is a mark on the selected clip's left edge, not a scrubber.
- Left list and filmstrip share `selectedClip`.
- Selected clip stroke is 2px teal. Filmstrip title bar is teal with white text.
- Timecode is `HH:MM:SS:FF` with frames always `00`.
- Empty clip copy is 「尚未有片段」.
- List card interiors stay. Editor header and inspector actions use `StudioButton`.
- Rail is 200px with labels at `lg`, 72px icons below `lg`. Media 280px, inspector 300px, timeline 112px.

---

### Task 1: Timecode

**Files:**
- Create: `src/presentation/studio/format-timecode.ts`
- Test: `src/presentation/studio/format-timecode.test.ts`

**Interfaces:**
- Produces: `formatTimecode(durationSeconds: number): string`

- [ ] Write the failing test for 0, 6, 90, 3661, and a negative input
- [ ] Run `npx tsx --test src/presentation/studio/format-timecode.test.ts` and confirm fail
- [ ] Implement `formatTimecode`
- [ ] Re-run and confirm pass

### Task 2: Studio chrome

**Files:**
- Create: `src/presentation/studio/tokens.css`
- Create: `src/presentation/studio/clip-item.ts`
- Create: `src/presentation/studio/studio-button.tsx`
- Create: `src/presentation/studio/studio-panel.tsx`
- Create: `src/presentation/studio/studio-frame.tsx`
- Create: `src/presentation/studio/media-list.tsx`
- Create: `src/presentation/studio/filmstrip.tsx`
- Create: `src/presentation/studio/studio-shell.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/presentation/components/app-shell.tsx`

**Interfaces:**
- Produces: `StudioClipItem`, `StudioButton`, `StudioPanel`, `StudioFrame`, `MediaList`, `Filmstrip`, `StudioShell`

- [ ] Add tokens and presentational components
- [ ] Point `AppShell` at `StudioShell` with the five existing nav destinations

### Task 3: Editor desk

**Files:**
- Create: `src/presentation/components/project/video-desk.tsx`
- Modify: `src/presentation/components/project/clip-timeline.tsx`
- Modify: `src/presentation/components/project/clip-production.tsx`
- Modify: `src/presentation/components/project/clip-workspace.tsx`
- Modify: `src/presentation/components/project/clip-video-panel.tsx`
- Modify: `src/presentation/components/app/projects/[id]/video-editor-dialog.tsx`
- Modify: `src/presentation/components/app/projects/new/reel-export.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`

**Interfaces:**
- Consumes: `StudioClipItem`, `StudioFrame`, `MediaList`, `Filmstrip`, `formatTimecode`
- Produces: `clipStudioItems(project, states, pending)`, `VideoDesk`

- [ ] Map clips to `StudioClipItem` and render the desk for production and 成片
- [ ] Create dialog brief stays a panel
- [ ] Header buttons use `StudioButton`

### Task 4: Verify

- [ ] `npx tsx --test src/presentation/studio/format-timecode.test.ts`
- [ ] Browser: logged-in shell, editor selection, 成片, narrow rail
