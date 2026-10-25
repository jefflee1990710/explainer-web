# End-to-End UX Analytics & Drop-off Diagnostics Design Spec

**Date:** 2026-10-25
**Topic:** Dual-Pipeline UX Tracking (Google Analytics 4 + MongoDB `ux_events`) & Admin Funnel Diagnostics (`/scroadmin/analytics`)

---

## 1. Goal & Problem Statement

Users are signing up or visiting Scro, but many drop off before completing their first character, Life photo, or video reel. Currently:
- Client-side `track()` (`src/presentation/components/analytics/track.ts`) only fires GA4 `gtag('event', ...)` in 6 auth/billing components.
- SPA route changes across App Router pages are not tracked consistently in MongoDB or GA4.
- Server-side domain milestones (creating folders/videos, generating storyboards, locking characters, rendering keyframes/clips, hitting credit or API errors) are not logged into a unified event stream.
- There is no admin visibility into **where** existing and new users get stuck.

This design introduces a unified, non-blocking UX event pipeline that sends events to both **GA4** and **MongoDB (`ux_events`)**, plus a **historical + real-time UX Funnel & Drop-off Dashboard** at `/scroadmin/analytics`.

---

## 2. Architecture & Data Model

### 2.1 MongoDB Collection: `ux_events`
- **Model (`src/model/ux-event.ts`)**:
  - `_id?: ObjectId`
  - `event: string` (snake_case event name, e.g., `page_view`, `video_storyboard_generated`, `ux_blocker_insufficient_credits`)
  - `category: "navigation" | "auth" | "onboarding" | "character" | "wardrobe" | "life" | "video" | "editor" | "billing" | "blocker"`
  - `source: "client" | "server"`
  - `clerkUserId?: string | null` (Firebase `uid` when authenticated)
  - `userEmail?: string | null`
  - `anonId?: string | null` (Client-persisted anonymous UUID `scro_anon_id` to stitch pre-signup and post-signup journeys)
  - `sessionId?: string | null` (Session-scoped ID `scro_session_id`)
  - `path?: string | null` (Current URL pathname)
  - `referrer?: string | null`
  - `locale?: string | null`
  - `params?: Record<string, unknown>` (Sanitized metadata: `projectId`, `videoId`, `characterId`, `step`, `error`, `requiredCredits`, `balance`, etc.)
  - `userAgent?: string | null`
  - `createdAt: Date`
- **DAO (`src/dao/ux-events.ts`)**:
  - Exports `uxEventsCollection()` typed with `db.collection<UxEventDoc>("ux_events")` and re-exported in `src/dao/index.ts`.
  - Indexes on `{ createdAt: -1 }`, `{ clerkUserId: 1, createdAt: -1 }`, and `{ event: 1, createdAt: -1 }`.

### 2.2 Dual-Track Client Pipeline
- **`src/presentation/components/analytics/track.ts`**:
  - Maintains `scro_anon_id` in `localStorage` and `scro_session_id` in `sessionStorage`.
  - Calls `window.gtag("event", event, params)` for Google Analytics 4.
  - Sends a non-blocking payload via `recordClientUxEventAction` (Server Action) so every client `track()` call is also persisted in `ux_events` with the current user session (if signed in) and `anonId`.
- **`src/presentation/components/analytics/google-analytics.tsx` & `ux-page-tracker.tsx`**:
  - Tracks SPA route transitions (`usePathname`, `useSearchParams`), firing both GA4 `page_view` and MongoDB `page_view` events, plus `session_engagement` (dwelling / exit path) so we know the exact last page a user visited before leaving.

### 2.3 Server-Side Event Logger (`src/service/analytics/ux-tracker.ts`)
- `logServerUxEvent({ event, category, clerkUserId, path, params })`:
  - Fire-and-forget (`void ...catch(() => {})`) helper that never blocks or fails user-facing Server Actions.
  - Automatically resolves `clerkUserId` from session context when omitted.
  - Used inside key Server Actions (`auth.ts`, `legal.ts`, `characters.ts`, `custom-wardrobe.ts`, `life.ts`, `projects.ts`, `storyboard-draft-chat.ts`, `clip-production.ts`, `reel.ts`, `opencut-edit.ts`, `billing.ts`) and error boundaries / credit guards.

---

## 3. Comprehensive UX Funnel & Blocker Instrumentation

1. **Acquisition & Auth**:
   - `page_view` (landing, pricing, academy, examples, studio pages)
   - `auth_attempt`, `login`, `sign_up`, `auth_error`, `legal_accepted`
2. **Onboarding & Workspace Entry**:
   - `studio_home_view`, `folder_created` (`createFolderAction`)
3. **Character & Wardrobe Funnel**:
   - `character_wizard_view`, `character_created`, `character_blueprint_generated`, `character_locked`, `character_voice_updated`
   - `wardrobe_item_created`, `wardrobe_combo_saved`
4. **Life Photo Funnel**:
   - `life_studio_view`, `life_shot_submitted`, `life_shot_failed`
5. **Video Production Funnel (6-Step Core Path)**:
   - Step 1: `video_created` (`createProjectAction`)
   - Step 2: `video_brief_saved` / `video_storyboard_requested` / `video_storyboard_generated`
   - Step 3: `video_references_locked` (character / background / prop locks)
   - Step 4: `video_keyframes_submitted` (start/end scene frames)
   - Step 5: `video_clip_submitted` (video clip generation)
   - Step 6: `video_reel_assembled` / `opencut_editor_opened` / `video_exported`
6. **UX Friction & Blockers**:
   - `ux_blocker_insufficient_credits` (triggered when credit check fails or modal opens, recording `required`, `balance`, `action`)
   - `ux_blocker_generation_failed` (triggered when image/video/storyboard generation fails, recording `reason`, `jobType`)
   - `ux_blocker_validation_error` (missing character lock, missing keyframes, etc.)

---

## 4. Historical + Live Diagnostics Engine (`src/service/analytics/ux-diagnostics.ts`)

Because users have already been using the app prior to event instrumentation, `getUxDiagnosticsSummary()` combines:
1. **Retrospective DB State Funnel** (analyzing existing `users`, `characters`, `projects`, `videos`, `life_shots`, `generation_jobs`, `subscriptions`):
   - Total registered users
   - Users who accepted legal terms
   - Users who created $\ge 1$ character vs. locked $\ge 1$ character
   - Users who created $\ge 1$ video project
   - Users who generated a storyboard ($\ge 1$ clip in `videos.clips`)
   - Users who generated keyframes (`startFrameUrl` / `endFrameUrl`)
   - Users who generated video clips (`videoUrl`) or Life shots
   - Exact per-user diagnosis of their **current stuck stage** (e.g., *"Signed up, 0 characters & 0 videos"*, *"Created video, stopped before storyboard"*, *"Storyboard ready, 0 keyframes rendered"*, *"Hit failed generation job"*, *"Out of credits"*).
2. **Real-Time `ux_events` Stream & Drop-off Analysis**:
   - Event counts by category and event name
   - Top drop-off pages (last `page_view` per session)
   - Top UX blockers (`ux_blocker_*` and failed `generation_jobs`)
   - Per-user chronological activity timeline

---

## 5. Admin UI (`/scroadmin/analytics`)

- Accessible from `ScroAdminShell` navigation (`/scroadmin/analytics`) and linked from `/scroadmin`.
- Displays:
  1. **KPI Cards**: Total Users, Active 7d, Activation Rate (completed at least 1 output), Top Stuck Stage, Failed Jobs / Credit Blocks.
  2. **End-to-End Conversion Funnel**: Visual step-by-step progress bars with conversion % and drop-off % at each stage.
  3. **Why Users Stop Using (Automated Diagnosis Breakdown)**: Ranked cards grouping users by their exact drop-off reason with actionable insights.
  4. **Per-User Journey & Stuck Inspector Table**: Lists real users, their credits, characters/videos/clips counts, diagnosed stuck point, last active time, and recent `ux_events` trail.

---

## 6. Testing Strategy

- Unit tests in `src/service/analytics/ux-diagnostics.test.ts` verifying funnel calculation, user stuck-stage classification, and event sanitization without live DB or network calls.
- TypeScript check (`npx tsc --noEmit`) and ESLint (`npx eslint src/`).
