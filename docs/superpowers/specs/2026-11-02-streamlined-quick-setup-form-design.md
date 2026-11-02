# Streamlined Quick Setup Creation Form UX (Option A)

**Date:** 2026-11-02  
**Status:** Approved for planning  
**Surface:** `/app/explainers`, `/app/talking-heads`, `/app/videos/new` (`NewProjectForm`, `QuickScriptCard`, `SkillPicker`, `BriefSetupModeBar`)

## Goal

Make the Quick Setup video creation form easier and faster to use by:
1. Embedding the primary **Start** CTA directly inside the `04 Instruction / Script` card footer (eliminating the large empty canvas gap between the input and the bottom-right Start button).
2. Showing a 2-option side-by-side segmented toggle in `SkillPicker` when `skills.length === 2` (on `/app/explainers`: Paper-cutout vs Whiteboard cartoon), and auto-syncing the matching default visual style (`paper-cutout` or `whiteboard`) so users never start with a mismatched "Paper-cutout director + Realistic style" combination.
3. Merging the `ProjectPicker` (`No project` dropdown) into `BriefSetupModeBar` as a single compact top bar, and compacting the background surface selector in Quick Setup so cards 01, 02, and 03 align cleanly.

## Non-goals

- No changes to Full Details 4-step wizard capabilities.
- No changes to backend storyboard/video generation logic.

## UI & Behavior Changes

### 1. Compact Top Bar (`BriefSetupModeBar`)
- Accepts optional `projectPicker?: React.ReactNode`.
- Renders the folder dropdown inline on the left alongside the concise mode summary, with the `?` tour button and `⚡ Quick Setup / ⚙️ Full Details` segmented switch on the right.

### 2. 2-Option Segmented `SkillPicker` + Auto-Synced Visual Style
- When `skills.length === 2` and `!sideBySideGuide`, `SkillPicker` renders both skills side-by-side as clickable cards/pills (with thumbnail + title) instead of hiding the second option behind `<` `>` arrows.
- When `useCase === "explainer"` (or when switching between `paper-cutout-explainer-video-director` and `cartoon-explainer-video-director`), `NewProjectForm` defaults/syncs `styleId` to `"paper-cutout"` for `paper-cutout-explainer-video-director` and `"whiteboard"` (or fallback matching cartoon style) for `cartoon-explainer-video-director`.

### 3. Inline Primary CTA inside `QuickScriptCard`
- `QuickScriptCard` accepts an optional `actionSlot?: React.ReactNode` (and error/validation message).
- In Quick Setup mode, the **Start** button (and any validation hint/error) renders directly in the bottom-right footer of `QuickScriptCard` next to the sample script pills, and the form no longer stretches with `justify-between` to push the button to the bottom of the viewport.
