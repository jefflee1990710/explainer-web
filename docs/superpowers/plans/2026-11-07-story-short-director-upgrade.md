# Story Short Director Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `story-short-director` to ban third-person narration (only on-screen character dialogue when needed or `(no dialogue)`), preserve director/user-planned clip durations (5–12s), use `gemini-4-argon` for storyboard planning, and use `bytedance/seedance-2.0` with Voice-First VO synthesis and realistic fallback to `minimax/hailuo-3`.

**Architecture:** Modify `story-short-director` catalog and isolated rules (`1 Director = 1 File`) to use `speechMode: "lip-sync"` and `bansNarration: true` without `audioFirstLipSync`. Update `withSpokenClipDuration(s)` to accept `{ preservePlannedDuration?: boolean }` so `story-short-director` keeps its planned 5–12s duration unless spoken dialogue requires longer. Route `storyboardModel(skillSlug)` to `gemini-4-argon` and `clipVideoModel(style, skillSlug)` to `bytedance/seedance-2.0` for `story-short-director`, with Voice-First duration expansion in `pipeline.ts` and realistic privacy-filter fallback to `minimax/hailuo-3` in `openrouter/generate.ts`.

**Tech Stack:** TypeScript, Next.js, Node.js test runner (`node:test`), Vercel AI SDK (`@ai-sdk/google`), OpenRouter Video API, ElevenLabs TTS.

**Spec:** `docs/superpowers/specs/2026-11-07-story-short-director-upgrade-design.md`

## Global Constraints

- Director Prompt Isolation (`1 Director = 1 File` in `src/service/director/rules/<director-slug>.ts`): modify ONLY `story-short-director.ts` in `src/service/director/rules/`.
- Update `pipeline-models.md` whenever any LLM, video model, or director pipeline changes.
- Never make live paid provider calls during unit tests; use pure functions or mock `fetch`.

## Review Focus

- Silent `story-short-director` clips (`(no dialogue)`) with a director-planned 10s duration must remain `10s` after `withSpokenClipDurations` instead of collapsing to `5s`.
- Voiced `story-short-director` clips whose spoken dialogue takes 9s when the director planned 5s must expand to `9s`.
- Silent `story-short-director` clips in `lockDialogueSpeech` must not prepend `On-screen characters MUST speak the dialogue aloud` when `spokenLine` is `(no dialogue)`.
- `submitOpenRouterClipVideo` with `bytedance/seedance-2.0` and `fallbackModel: "minimax/hailuo-3"` must retry with `minimax/hailuo-3` at `2K` resolution when ByteDance returns `InputImageSensitiveContentDetected.PrivacyInformation`.
- `story-short-director` must not trigger `audioFirstTalkingHead` (`heygen/avatar-iv`), keeping full-body action and camera movement on `bytedance/seedance-2.0`.

---

### Task 1: Preserve Planned Clip Duration & Storyboard Model Routing for `story-short-director`

**Files:**
- Modify: `src/service/director/clip-seconds.ts`
- Modify: `src/service/director/clip-seconds.test.ts`
- Modify: `src/service/director/model.ts`
- Modify: `src/service/director/run-phase-a.ts`
- Modify: `src/service/director/append-clip.ts`
- Modify: `src/service/director/storyboard-draft-chat.ts`

**Interfaces:**
- Produces:
  - `withSpokenClipDuration<T extends TimedClip>(clip: T, pace?: SpeechPace, options?: { preservePlannedDuration?: boolean }): T` in `src/service/director/clip-seconds.ts`
  - `withSpokenClipDurations<T extends TimedClip>(clips: T[], pace?: SpeechPace, options?: { preservePlannedDuration?: boolean }): T[]` in `src/service/director/clip-seconds.ts`
  - `storyboardModelForSkill(skillSlug?: string): string` and `storyboardModel(skillSlug?: string)` in `src/service/director/model.ts`

- [ ] **Step 1: Write failing tests in `src/service/director/clip-seconds.test.ts`**

Add a test verifying that `{ preservePlannedDuration: true }` keeps a 10s silent `(no dialogue)` clip at `10s`, clamps a 15s clip to `12s`, clamps a 2s clip to `5s`, and expands a 5s planned clip to `10s` when its 24-word spoken line requires 10s. Also assert `storyboardModelForSkill("story-short-director") === "gemini-4-argon"` and `storyboardModelForSkill("cartoon-explainer-video-director") === "gemini-3.8-flash"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/director/clip-seconds.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `preservePlannedDuration` in `src/service/director/clip-seconds.ts` and `storyboardModel(skillSlug?)` in `src/service/director/model.ts`, and wire `skillSlug` into `run-phase-a.ts`, `append-clip.ts`, and `storyboard-draft-chat.ts`**

In `src/service/director/clip-seconds.ts`, when `options?.preservePlannedDuration` is true, compute `planned = Math.min(CLIP_MAX_SECONDS, Math.max(CLIP_MIN_SECONDS, Math.round(clip.durationSeconds || CLIP_MIN_SECONDS)))` and use `Math.max(planned, spoken)`.
In `src/service/director/model.ts`, export `storyboardModelForSkill(skillSlug?: string): string` returning `"gemini-4-argon"` when `skillSlug === "story-short-director"` and `STORYBOARD_MODEL` otherwise, and update `storyboardModel(skillSlug?: string)` to use it.
In `run-phase-a.ts` and `append-clip.ts`, pass `input.skill.slug` to `storyboardModel(...)` and pass `{ preservePlannedDuration: input.skill.slug === "story-short-director" }` to `withSpokenClipDurations` / `withSpokenClipDuration`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/director/clip-seconds.test.ts`
Expected: PASS

---

### Task 2: Update `story-short-director` Catalog, Isolated Rules, and Speech Lock for No-Narrator Character-Only Dialogue / Silent Action

**Files:**
- Modify: `src/service/director/catalog/story-short-director.ts`
- Modify: `src/service/director/rules/story-short-director.ts`
- Modify: `src/service/director/skill-rules.ts`
- Modify: `src/service/director/spoken-line.ts`
- Modify: `src/service/director/skill-rules.test.ts`
- Modify: `src/service/director/spoken-line.test.ts`

**Interfaces:**
- Produces:
  - `storyShortDirector.behavior.speechMode === "lip-sync"` and `storyShortDirector.behavior.bansNarration === true`
  - Updated `storyShortDirectorRules` in `src/service/director/rules/story-short-director.ts` and `storyShortDirectorBlock()` in `src/service/director/skill-rules.ts`
  - Updated `lockDialogueSpeech` in `src/service/director/spoken-line.ts`: when `skillBansNarration(skillSlug)` is true and `spokenLine` is empty or `isSilentSpokenLine(spokenLine)` (`(no dialogue)`), append only `storyShortCameraLock(skillSlug)` (and keep lips closed / no dialogue), never `DIALOGUE_SPEAK_LOCK` or `speakingMouthLock`. When `spokenLine` has dialogue, append `DIALOGUE_SPEAK_LOCK`, `speakingMouthLock`, and `storyShortCameraLock(skillSlug)`.

- [ ] **Step 1: Update and add failing tests in `src/service/director/skill-rules.test.ts` and `src/service/director/spoken-line.test.ts`**

In `skill-rules.test.ts`:
- Assert `skillUsesOnScreenLipSync("story-short-director") === true`
- Assert `skillBansNarration("story-short-director") === true`
- Assert `storyShortDirectorBlock()` matches `/NO narrator/i` and `/\(no dialogue\)/`

In `spoken-line.test.ts`:
- Assert `spokenLineCopy("story-short-director").section === "對白"`
- Assert `lockDialogueSpeech("Walk toward the box.", "story-short-director", 'Scro: "He found the secret."')` includes `DIALOGUE_SPEAK_LOCK`, `speakingMouthLock`, and `storyShortCameraLock("story-short-director")`
- Assert `lockDialogueSpeech("Scro sprints downhill.", "story-short-director", "(no dialogue)")` includes `storyShortCameraLock("story-short-director")` and does NOT include `DIALOGUE_SPEAK_LOCK` or `lip-syncs every syllable`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/director/skill-rules.test.ts src/service/director/spoken-line.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement changes in `story-short-director.ts` (catalog & rules), `skill-rules.ts`, and `spoken-line.ts`**

Update `src/service/director/catalog/story-short-director.ts` (`speechMode: "lip-sync"`, `bansNarration: true`).
Update `src/service/director/rules/story-short-director.ts` and `storyShortDirectorBlock()` in `src/service/director/skill-rules.ts` so `story-short-director` bans third-person narration, allows `(no dialogue)` for pure action beats or `NAME: "line"` on-screen character dialogue when the story calls for speech, and instructs the director to set `durationSeconds` (5–12s) based on the story beat / action / user request rather than forcing 5s.
Update `lockDialogueSpeech` in `src/service/director/spoken-line.ts` so silent clips (`!spokenLine?.trim() || isSilentSpokenLine(spokenLine)`) on `skillBansNarration` skills do not attach `DIALOGUE_SPEAK_LOCK` or `speakingMouthLock`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/director/skill-rules.test.ts src/service/director/spoken-line.test.ts`
Expected: PASS

---

### Task 3: Route `story-short-director` Video Generation to `bytedance/seedance-2.0` with Voice-First Duration Expansion & Realistic Fallback

**Files:**
- Modify: `src/service/higgsfield/clip-keyframes.ts`
- Modify: `src/service/higgsfield/clip-keyframes.test.ts`
- Modify: `src/service/openrouter/generate.ts`
- Modify: `src/service/openrouter/generate.test.ts`
- Modify: `src/service/higgsfield/generate.ts`
- Modify: `src/service/higgsfield/pipeline.ts`
- Modify: `pipeline-models.md`

**Interfaces:**
- Produces:
  - `clipVideoModel(styleOrId?: string | { id?: string; baseStyleId?: string } | null, skillSlug?: string): string` in `src/service/higgsfield/clip-keyframes.ts` returning `OPENROUTER_SEEDANCE_2_VIDEO_MODEL` (`"bytedance/seedance-2.0"`) when `skillSlug === "story-short-director"`
  - `submitOpenRouterClipVideo` in `src/service/openrouter/generate.ts` accepting `fallbackModel?: string` (or `realistic?: boolean`) so when `bytedance/seedance*` fails with `isSeedanceRealPersonRejection`, realistic clips fall back to `OPENROUTER_HAILUO_3_VIDEO_MODEL` (`"minimax/hailuo-3"`, `2K`) while non-realistic clips fall back to `OPENROUTER_WAN_3_VIDEO_MODEL` (`"alibaba/wan-3.0"`, `480p`).
  - `expandVideoToVo` in `src/service/higgsfield/pipeline.ts` enabled for `story-short-director` (`project.skillSlug === "story-short-director"`) so pre-synthesized ElevenLabs VO automatically extends clip `durationSeconds` if the spoken line is longer than the planned duration.

- [ ] **Step 1: Write failing tests in `src/service/higgsfield/clip-keyframes.test.ts` and `src/service/openrouter/generate.test.ts`**

In `clip-keyframes.test.ts`:
- Assert `clipVideoModel("realistic", "story-short-director") === "bytedance/seedance-2.0"`
- Assert `clipVideoModel("doodle", "story-short-director") === "bytedance/seedance-2.0"`
- Assert `clipVideoModel("realistic", "follow-shot-director") === "minimax/hailuo-3"`

In `openrouter/generate.test.ts`:
- Add test verifying that `submitOpenRouterClipVideo` with `model: "bytedance/seedance-2.0"` and `fallbackModel: "minimax/hailuo-3"` falls back to `"minimax/hailuo-3"` at `"2K"` resolution when ByteDance returns `InputImageSensitiveContentDetected.PrivacyInformation`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/higgsfield/clip-keyframes.test.ts src/service/openrouter/generate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `clipVideoModel`, `submitOpenRouterClipVideo` fallback, `pipeline.ts` wiring, and update `pipeline-models.md`**

1. In `src/service/higgsfield/clip-keyframes.ts`, import `OPENROUTER_SEEDANCE_2_VIDEO_MODEL` from `@/service/openrouter/generate` and return `OPENROUTER_SEEDANCE_2_VIDEO_MODEL` from `clipVideoModel(styleOrId, skillSlug)` when `skillSlug === "story-short-director"`.
2. In `src/service/openrouter/generate.ts`, add `fallbackModel?: string` to `submitOpenRouterClipVideo` input; use `input.fallbackModel || OPENROUTER_WAN_3_VIDEO_MODEL` on `isSeedanceRealPersonRejection`.
3. In `src/service/higgsfield/generate.ts`, pass `skillSlug?: string` and `fallbackModel: isRealisticStyle(input.style ?? input.styleId) ? OPENROUTER_HAILUO_3_VIDEO_MODEL : OPENROUTER_WAN_3_VIDEO_MODEL` to `submitOpenRouterClipVideo`.
4. In `src/service/higgsfield/pipeline.ts`, include `project.skillSlug === "story-short-director"` in `expandVideoToVo`, and pass `project.skillSlug` to `clipVideoModel(style ?? clipStyleId, project.skillSlug)`.
5. Update `pipeline-models.md` to document `story-short-director` using `gemini-4-argon` for storyboard planning, Voice-First character dialogue (no narrator) or silent action, and `bytedance/seedance-2.0` (with automatic fallback to `minimax/hailuo-3` 2K / `alibaba/wan-3.0`).

- [ ] **Step 4: Run tests and typecheck to verify everything passes**

Run: `npx tsx --test src/service/higgsfield/clip-keyframes.test.ts src/service/openrouter/generate.test.ts 'src/service/director/**/*.test.ts' && npx tsc --noEmit`
Expected: PASS with 0 errors.
