# Hardcode Directors and Styles (`IDirector` & `IStyle`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all 15 built-in Directors and 35 built-in Styles out of MongoDB into standalone per-item TypeScript files implementing `IDirector` and `IStyle`, wire all behavior flags to those interfaces, and remove custom Director/Style features and pages.

**Architecture:** Define `IDirector` (in `src/model/director.ts`) and `IStyle` (in `src/model/style.ts`), export one hardcoded `.ts` module per Director under `src/service/director/catalog/<slug>.ts` (15 files) and one per Style under `src/service/style/catalog/<id>.ts` (35 files) with central registries (`index.ts`), update all lookup/behavior helpers to read from these in-memory catalogs with automatic fallback for legacy IDs, and remove the `/app/directors/**` and `/app/styles/**` routes, sidebar links, and custom chat/fork/preview code.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Zod, Node built-in test runner (`npx tsx --test`).

**Spec:** `docs/superpowers/specs/2026-10-22-hardcode-directors-and-styles-design.md`

## Global Constraints

- Do not call any live paid image/video API (Higgsfield / OpenRouter) during development or tests.
- Every Director has its own `.ts` file under `src/service/director/catalog/<slug>.ts` implementing `IDirector`.
- Every Style has its own `.ts` file under `src/service/style/catalog/<id>.ts` implementing `IStyle`.
- Legacy videos/characters referencing unknown or deleted custom director/style IDs automatically fall back to built-in defaults (`cartoon-explainer-video-director` / `DEFAULT_STYLE_ID`).
- Remove `/app/directors` and `/app/styles` pages and sidebar links.

---

### Task 1: Define `IStyle` Interface and Export All 35 Hardcoded Style Files

**Files:**
- Create: `src/model/style.ts`
- Create: `src/service/style/catalog/<style-id>.ts` (35 files, one per `StyleId` in `STYLE_IDS`)
- Create: `src/service/style/catalog/index.ts`
- Create: `src/service/style/catalog/catalog.test.ts`
- Modify: `src/service/style/types.ts`
- Modify: `src/service/style/load-style.ts`
- Modify: `src/service/style/renderable-style.ts`
- Modify: `src/service/style/list.ts`
- Modify: `src/service/style/list-selectable.ts`
- Modify: `src/service/style/ensure-catalog-styles.ts`

**Interfaces:**
- Produces: `IStyle`, `IStyleBehavior`, `STYLES`, `STYLES_BY_ID`, `getStyleById(id)`, `resolveStyle(id)`

- [ ] **Step 1: Write `src/model/style.ts` and generate the 35 style `.ts` files + `src/service/style/catalog/index.ts` from current MongoDB data & canonical rules**
- [ ] **Step 2: Write `src/service/style/catalog/catalog.test.ts` verifying all 35 `STYLE_IDS` exist, satisfy `IStyle`, and have accurate `behavior` flags (`realistic`, `usesDrawingSurface`, `monochromeChalk`)**
- [ ] **Step 3: Update `load-style.ts`, `renderable-style.ts`, `list.ts`, `list-selectable.ts`, and `ensure-catalog-styles.ts` to read synchronously/in-memory from `STYLES_BY_ID` (keeping `replaceStyleOverlay` for test overrides and falling back unknown IDs via `resolveStyleId`)**
- [ ] **Step 4: Run `npx tsx --test src/service/style/catalog/catalog.test.ts 'src/service/style/*.test.ts'` and verify pass**

---

### Task 2: Define `IDirector` Interface and Export All 15 Hardcoded Director Files

**Files:**
- Create: `src/model/director.ts`
- Create: `src/service/director/catalog/<slug>.ts` (15 files, one per built-in director slug)
- Create: `src/service/director/catalog/index.ts`
- Create: `src/service/director/catalog/catalog.test.ts`
- Modify: `src/model/skill.ts`
- Modify: `src/service/director/load-skill.ts`
- Modify: `src/service/director/selectable-skills.ts`
- Modify: `src/service/director/behavior-slug.ts`

**Interfaces:**
- Produces: `IDirector`, `IDirectorBehavior`, `DIRECTORS`, `DIRECTORS_BY_SLUG`, `DIRECTORS_BY_ID`, `getDirectorBySlug(slug)`, `getDirectorById(id)`, `resolveDirector(slugOrId)`

- [ ] **Step 1: Write `src/model/director.ts` and generate the 15 director `.ts` files + `src/service/director/catalog/index.ts` with complete `systemPrompt`, `references`, `inputSchema`, `higgsfieldDefaults`, `profile`, `performance`, `previewUrl`, and `behavior` flags**
- [ ] **Step 2: Write `src/service/director/catalog/catalog.test.ts` verifying all 15 directors and their `IDirectorBehavior` properties (`keyframeMode`, `chainsClipStarts`, `anchorsFramesToFirstClip`, `dualBeat`, `maxBackgroundSets`, `speechMode`, `bansNarration`, `requiredCastCount`, `talkingHeadShot`, `selfShotCreatorCamera`, `forcesSceneText`, `allowsInWorldLabels`, `attachesTextStyleReference`, `bookendRole`, etc.)**
- [ ] **Step 3: Update `load-skill.ts`, `selectable-skills.ts`, and `behavior-slug.ts` to read from the in-memory `DIRECTORS` catalog with fallback to `cartoon-explainer-video-director`**
- [ ] **Step 4: Run `npx tsx --test src/service/director/catalog/catalog.test.ts` and verify pass**

---

### Task 3: Wire Pipeline & Behavior Helpers to `IDirector.behavior` and `IStyle.behavior`

**Files:**
- Modify: `src/service/director/steady-stills.ts`
- Modify: `src/service/director/clip-continuity.ts`
- Modify: `src/service/director/talking-head.ts`
- Modify: `src/service/director/talking-performance.ts`
- Modify: `src/service/director/dual-beat.ts`
- Modify: `src/service/director/video-locks.ts`
- Modify: `src/service/director/skill-rules.ts`
- Modify: `src/service/style/realistic-light.ts`
- Modify: `src/service/character/blueprint-prompt.ts`

- [ ] **Step 1: Update director/style behavior helpers (`clipSkipsEndStill`, `clipEndIsNextStart`, `chainsClipStarts`, `isTalkingHeadSkill`, `talkingShotForSkill`, `isSelfShotCreatorSkill`, `isDualBeatSkill`, `maxSetsForSkill`, `skillBansNarration`, `skillUsesOnScreenLipSync`, `requiredCastCount`, `skillForcesSceneText`, `skillAllowsInWorldLabels`, `isBookendSkill`, `isRealisticStyle`) to read from `IDirector.behavior` and `IStyle.behavior`**
- [ ] **Step 2: Run `npx tsx --test 'src/service/director/*.test.ts' 'src/service/style/*.test.ts' 'src/service/higgsfield/*.test.ts'` and verify pass**

---

### Task 4: Remove Custom Director & Style Pages, Sidebar Links, Actions, and Unused Queue Paths

**Files:**
- Delete: `src/app/app/directors/page.tsx`, `src/app/app/directors/[id]/page.tsx`
- Delete: `src/app/app/styles/page.tsx`, `src/app/app/styles/[id]/page.tsx`, `src/app/app/styles/load-style-for-user.ts`
- Delete: `src/presentation/actions/directors.ts`, `src/presentation/actions/styles.ts`
- Delete: `src/presentation/components/app/directors/**`, `src/presentation/components/app/styles/**`
- Modify: Sidebar / navigation components, `StylePicker`, `SkillPicker`, `add-character-style-dialog.tsx`, `serialize.ts`, and generation queue (`task-senders.ts`, `job-registry.ts`)

- [ ] **Step 1: Remove `/app/directors` and `/app/styles` routes, custom UI folders, and custom server actions**
- [ ] **Step 2: Remove `Director` and `Style` navigation links from the app navigation bar/sidebar**
- [ ] **Step 3: Clean up references in `StylePicker`, `SkillPicker`, `serialize.ts`, `mcp`, and `task-senders.ts`**
- [ ] **Step 4: Run `npx tsc --noEmit`, `npx eslint src/`, and unit tests to verify a clean build**
