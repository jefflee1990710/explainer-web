# UX Analytics & Drop-off Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build dual-pipeline UX event tracking (Google Analytics 4 + MongoDB `ux_events`), instrument all core user journeys and blockers, and ship an admin funnel & drop-off diagnostic dashboard at `/scroadmin/analytics`.

**Architecture:** Client events (`track()` and automatic SPA `page_view` tracking) fire both `window.gtag()` and a non-blocking Server Action that persists into MongoDB `ux_events`. Key Server Actions across auth, onboarding, character creation, wardrobe, Life shots, storyboard, keyframes, video generation, reel export, and billing log server-side milestones and error/credit blockers. `/scroadmin/analytics` combines retrospective MongoDB state diagnostics (`users`, `characters`, `videos`, `life_shots`, `generation_jobs`) with real-time `ux_events` funnel and blocker metrics.

**Tech Stack:** Next.js 16 App Router, TypeScript, MongoDB (`@/dao`), Google Analytics 4 (`gtag.js`), Node test runner (`tsx --test`).

**Spec:** `docs/superpowers/specs/2026-10-25-ux-analytics-tracking-design.md`

## Global Constraints

- When using `db.collection('collectionName')` in MongoDB, always define the type like `db.collection<CollectionName>('collectionName')`.
- Always use Server Actions instead of RESTful API when a server call is needed from client components.
- Never allow analytics logging to throw or block user-facing actions.
- Keep UI components in separate focused files; client components using hooks must start with `'use client'`.

---

### Task 1: UX Event Model, DAO, and Pure Diagnostics Classifier (TDD)

**Files:**
- Create: `src/model/ux-event.ts`
- Create: `src/dao/ux-events.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/analytics/ux-classifier.ts`
- Test: `src/service/analytics/ux-classifier.test.ts`

**Interfaces:**
- Produces:
  - `UxEvent`, `UxEventCategory`, `inferUxEventCategory`, `sanitizeUxParams` in `src/model/ux-event.ts`
  - `uxEventsCollection()` in `src/dao/ux-events.ts`
  - `classifyUserStuckStage()`, `buildRetrospectiveFunnel()` in `src/service/analytics/ux-classifier.ts`

- [ ] **Step 1: Write the failing test in `src/service/analytics/ux-classifier.test.ts`**
- [ ] **Step 2: Run test to verify it fails (`npx tsx --test src/service/analytics/ux-classifier.test.ts`)**
- [ ] **Step 3: Implement `src/model/ux-event.ts`, `src/dao/ux-events.ts`, `src/dao/index.ts`, and `src/service/analytics/ux-classifier.ts`**
- [ ] **Step 4: Run test to verify it passes (`npx tsx --test src/service/analytics/ux-classifier.test.ts`)**

---

### Task 2: Server & Client UX Event Pipeline (GA4 + MongoDB)

**Files:**
- Create: `src/service/analytics/ux-tracker.ts`
- Create: `src/presentation/actions/analytics.ts`
- Modify: `src/presentation/components/analytics/track.ts`
- Modify: `src/presentation/components/analytics/google-analytics.tsx`

**Interfaces:**
- Consumes: `uxEventsCollection`, `inferUxEventCategory`, `sanitizeUxParams`
- Produces:
  - `logServerUxEvent()` in `src/service/analytics/ux-tracker.ts`
  - `recordClientUxEventAction()` in `src/presentation/actions/analytics.ts`
  - Dual-pipeline `track()` and automatic SPA route `page_view` tracking in `src/presentation/components/analytics/`

- [ ] **Step 1: Create `src/service/analytics/ux-tracker.ts` with non-blocking `logServerUxEvent`**
- [ ] **Step 2: Create `src/presentation/actions/analytics.ts` with `"use server"` `recordClientUxEventAction`**
- [ ] **Step 3: Upgrade `src/presentation/components/analytics/track.ts` and `google-analytics.tsx` to send events + SPA `page_view` to both GA4 and MongoDB**
- [ ] **Step 4: Verify TypeScript compilation (`npx tsc --noEmit`)**

---

### Task 3: Instrument Core UX Paths & Blockers Across Server Actions and Client Flows

**Files:**
- Modify: `src/presentation/actions/legal.ts`
- Modify: `src/presentation/actions/characters.ts`
- Modify: `src/presentation/actions/custom-wardrobe.ts`
- Modify: `src/presentation/actions/life.ts`
- Modify: `src/presentation/actions/projects.ts`
- Modify: `src/presentation/actions/storyboard-draft-chat.ts`
- Modify: `src/presentation/actions/generation.ts`
- Modify: `src/presentation/actions/clip-production.ts`
- Modify: `src/presentation/actions/reel.ts`
- Modify: `src/presentation/actions/opencut-edit.ts`
- Modify: `src/presentation/components/app/billing/insufficient-credits-dialog.tsx`

- [ ] **Step 1: Add `logServerUxEvent` to onboarding, character, wardrobe, and Life actions**
- [ ] **Step 2: Add `logServerUxEvent` to video creation, storyboard chat, frame/clip generation, reel assembly, and OpenCut editor actions (including credit/error blockers)**
- [ ] **Step 3: Enhance client blocker tracking in `insufficient-credits-dialog.tsx`**
- [ ] **Step 4: Verify TypeScript compilation and existing unit tests**

---

### Task 4: Admin UX Diagnostics Service & `/scroadmin/analytics` Dashboard UI

**Files:**
- Create: `src/service/analytics/ux-diagnostics.ts`
- Create: `src/app/scroadmin/analytics/page.tsx`
- Create: `src/app/scroadmin/analytics/ux-analytics-dashboard.tsx`
- Modify: `src/app/scroadmin/scroadmin-shell.tsx`
- Modify: `src/app/scroadmin/page.tsx`

- [ ] **Step 1: Implement `getUxDiagnosticsReport()` in `src/service/analytics/ux-diagnostics.ts`**
- [ ] **Step 2: Create `/scroadmin/analytics/ux-analytics-dashboard.tsx` and `/scroadmin/analytics/page.tsx`**
- [ ] **Step 3: Add Analytics navigation link in `scroadmin-shell.tsx` and shortcut card in `src/app/scroadmin/page.tsx`**
- [ ] **Step 4: Run `npx tsc --noEmit`, `npx eslint`, and unit tests**
