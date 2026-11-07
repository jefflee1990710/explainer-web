# Story Directors & Single-Clip One-Take Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Story category (`STORY_SYSTEM_SKILL_SLUGS`) to include an upgraded `story-short-director` (multi-character speaker-driven movie cuts) and a new `one-take-director` (single-clip silent continuous motion up to 60s rendered via MiniMax H3 `ref2va` multi-shot latent chaining).

**Architecture:** We register `"one-take-director"` in `DIRECTOR_SLUGS`, catalog, isolated rule module (`1 Director = 1 File`), i18n, and `STORY_SYSTEM_SKILL_SLUGS`, while upgrading `story-short-director` in its isolated rule file and catalog for speaker-driven movie editing (`requiredCastCount: 2`, Shot/Reverse-Shot, OTS, 180° eyelines). In Phase A and video rendering, `one-take-director` enforces a single clip (`clipCount = 1`, `englishVo = "(no dialogue)"`, `5..60s` duration) and routes `submitComfyStoryboardClipVideo` to build a multi-shot `MiniMaxH3ChainPlanModern` (`scene_continuity: "Hard picture + smooth audio"`) that chains 39-frame protected latent prefixes across 6.375s segments and assembles a single continuous MP4.

**Tech Stack:** TypeScript, Next.js 16, Zod, Node.js test runner (`node:test` + `node:assert/strict`).

**Spec:** `docs/superpowers/specs/2026-11-07-story-directors-and-one-take-design.md`

## Global Constraints

- `1 Director = 1 File` in `src/service/director/rules/<director-slug>.ts`: every director has its own standalone rule file with the `// ISOLATED DIRECTOR RULES: 1 Director = 1 File.` header and zero imports from any other director's rule file.
- `STORY_SYSTEM_SKILL_SLUGS` in `src/service/video/use-case.ts` must equal `["story-short-director", "one-take-director"]`.
- `one-take-director` must always produce `clipCount = 1`, `englishVo = "(no dialogue)"`, `narrator = "No narrator — pure continuous motion and ambient sound."`, and `durationSeconds` in `5..60`.
- `story-short-director` must direct speaker-driven movie cuts (`Shot / Reverse-Shot`, `Over-the-Shoulder`, `Two-Shot`, 180-degree axis eyeline continuity) and set `requiredCastCount: 2` in catalog behavior.
- Never make live paid provider or Vast ComfyUI HTTP calls in unit tests; use pure functions or mock `fetch`.

## Review Focus

1. **LLM returns >1 clip for `one-take-director` in Phase A**: `normalizeOneTakePhaseA` must collapse multiple rows into a single `Clip 1` with combined `motionCamera` beats, `englishVo: "(no dialogue)"`, and total duration clamped to `5..60s` (defaulting to preset target when `durationSeconds` is 5s).
2. **`withSpokenClipDurations` overwrites silent `one-take-director` duration back to 5s**: Because `englishVo` is `"(no dialogue)"` (`0` spoken words), `withSpokenClipDurations` would normally clamp silent clips to `CLIP_MIN_SECONDS` (`5s`) or `CLIP_MAX_SECONDS` (`12s`). Passing `maxSeconds: ONE_TAKE_MAX_SECONDS` (`60`) and `preservePlannedDuration: true` must preserve a 30s or 60s `one-take-director` clip duration.
3. **Credit billing caps `one-take-director` 60s clip at 15s (`MAX_VIDEO_SECONDS`)**: `clipStateFor`, `clipVideoCost`, and `generateClipVideo` must pass `ONE_TAKE_MAX_VIDEO_SECONDS` (`60`) for `one-take-director` so a 60s clip bills for 60s, not 15s.
4. **ComfyUI multi-shot chain (`submitComfyStoryboardClipVideo`) drops `scene_continuity` or single-shot compatibility**: For `durationSeconds <= 10` (or non-`one-take-director` single clips), `scene_continuity` stays `"Independent scenes"` with 1 shot; for `one-take-director` with `durationSeconds > 10`, `scene_continuity` switches to `"Hard picture + smooth audio"` and `plan_json.shots` contains `N = Math.ceil(durationSeconds / 6.375)` shots (`length: 192` each) with per-segment motion beats.
5. **Locale packs (`en`, `zh-Hant`, `zh-Hans`) missing `"one-take-director"` key**: `director-locale.ts`, `brief.en.ts`, and `brief.zh-Hant.ts` must all include `"one-take-director"` so `videoTypes`, `videoTypeBlurbs`, and `skillGuide.types` never return `undefined`.

---

### Task 1: Register `one-take-director` in Model, Catalog, Rules, Story Use-Case, and i18n, and Upgrade `story-short-director` Rules

**Files:**
- Modify: `src/model/director.ts`
- Create: `src/service/director/rules/one-take-director.ts`
- Create: `src/service/director/catalog/one-take-director.ts`
- Modify: `src/service/director/rules/story-short-director.ts`
- Modify: `src/service/director/catalog/story-short-director.ts`
- Modify: `src/service/director/rules/index.ts`
- Modify: `src/service/director/catalog/index.ts`
- Modify: `src/service/director/skill-rules.ts`
- Modify: `src/service/video/use-case.ts`
- Modify: `src/presentation/components/app/director-dock/director-dock-config.ts`
- Modify: `src/util/i18n/messages/workspace/brief.en.ts`
- Modify: `src/util/i18n/messages/workspace/brief.zh-Hant.ts`
- Modify: `src/util/i18n/messages/director-locale.ts`
- Test: `src/service/director/rules/rules.test.ts`, `src/service/director/catalog/catalog.test.ts`, `src/service/video/use-case.test.ts`, `src/presentation/components/app/director-dock/director-dock-config.test.ts`, `src/service/director/skill-rules.test.ts`

**Interfaces:**
- Produces:
  - `ONE_TAKE_SKILL_SLUG = "one-take-director"` and `isOneTakeSkill(skillSlug?: string): boolean` in `src/service/director/skill-rules.ts`
  - `ONE_TAKE_MAX_SECONDS = 60`, `oneTakeStoryboardRowSchema`, `oneTakePhaseASchema` in `src/model/director.ts`
  - `oneTakeDirectorRules: DirectorRuleModule` in `src/service/director/rules/one-take-director.ts`
  - `oneTakeDirector: IDirector` in `src/service/director/catalog/one-take-director.ts`
  - `STORY_SYSTEM_SKILL_SLUGS = ["story-short-director", "one-take-director"] as const` in `src/service/video/use-case.ts`

- [ ] **Step 1: Write the failing tests in `src/service/video/use-case.test.ts`, `src/service/director/catalog/catalog.test.ts`, `src/service/director/rules/rules.test.ts`, and `src/service/director/skill-rules.test.ts`**

Add assertions checking that:
- `STORY_SYSTEM_SKILL_SLUGS` equals `["story-short-director", "one-take-director"]` and `videoMatchesUseCase("one-take-director", "story")` is `true`.
- `DIRECTORS_BY_SLUG["one-take-director"]` exists with `speechMode: "silent"`, `bansNarration: true`, `keyframeMode: "start-only"`, `requiredCastCount: 1`, `hiddenInPicker: false`.
- `DIRECTORS_BY_SLUG["story-short-director"].behavior.requiredCastCount` is `2`, and `storyShortDirectorRules.phaseADirectorBlock({})` matches `/Shot\/Reverse-Shot|Over-the-Shoulder|speaker/i` and `/180-degree/i`.
- `oneTakeDirectorRules.phaseADirectorBlock({})` matches `/clipCount = 1|EXACTLY 1 CLIP/i`, `/\(no dialogue\)/`, and `/ZERO INVENTED PROPS/i`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/video/use-case.test.ts src/service/director/catalog/catalog.test.ts src/service/director/rules/rules.test.ts`
Expected: FAIL (`one-take-director` missing from `STORY_SYSTEM_SKILL_SLUGS` and `DIRECTORS_BY_SLUG`).

- [ ] **Step 3: Implement `one-take-director` and upgrade `story-short-director` across model, catalog, rules, use-case, dock config, and i18n**

- In `src/model/director.ts`: add `"one-take-director"` to `DIRECTOR_SLUGS`, export `ONE_TAKE_MAX_SECONDS = 60`, `oneTakeStoryboardRowSchema = storyboardRowSchema.extend({ durationSeconds: z.number().min(5).max(ONE_TAKE_MAX_SECONDS) })`, and `oneTakePhaseASchema = phaseASchema.extend({ clips: z.array(oneTakeStoryboardRowSchema).min(1) })`.
- Create `src/service/director/rules/one-take-director.ts` with `// ISOLATED DIRECTOR RULES: 1 Director = 1 File.` header, `allowsInventedProps: false`, enforcing `clipCount = 1`, `englishVo = "(no dialogue)"`, 6s-windowed continuous `motionCamera` up to 60s, and `ZERO INVENTED PROPS`.
- Create `src/service/director/catalog/one-take-director.ts` (`_id: "6ad100000000000000000001"`, `slug: "one-take-director"`, `title: "One-take motion"`, `sortOrder: 3`, `previewUrl: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/follow-shot-director-preview-9e94db7569.webp"`, `behavior: { keyframeMode: "start-only", chainsClipStarts: false, anchorsFramesToFirstClip: false, dualBeat: false, maxBackgroundSets: 1, speechMode: "silent", bansNarration: true, requiredCastCount: 1, selfShotCreatorCamera: false, forcesSceneText: false, allowsInWorldLabels: false, attachesTextStyleReference: false, requiresSpokenScript: false, allowsRoomBackgroundUpload: false, allowsOpeningPhotoUpload: false, allowsBrandLogoUpload: false, maxStyleCount: 1, hiddenInPicker: false }`).
- Update `src/service/director/rules/story-short-director.ts` and `src/service/director/catalog/story-short-director.ts` (`requiredCastCount: 2` in catalog; speaker-driven movie cuts, Shot/Reverse-Shot, Over-the-Shoulder, Two-Shot, and 180-degree eyeline axis continuity in `story-short-director.ts` and `storyShortDirectorBlock` in `skill-rules.ts`).
- Register `one-take-director` in `src/service/director/rules/index.ts`, `src/service/director/catalog/index.ts`, `src/service/video/use-case.ts`, `src/presentation/components/app/director-dock/director-dock-config.ts`, `src/util/i18n/messages/workspace/brief.en.ts`, `src/util/i18n/messages/workspace/brief.zh-Hant.ts`, and `src/util/i18n/messages/director-locale.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/video/use-case.test.ts src/service/director/catalog/catalog.test.ts src/service/director/rules/rules.test.ts src/service/director/skill-rules.test.ts src/presentation/components/app/director-dock/director-dock-config.test.ts`
Expected: PASS

---

### Task 2: Single-Clip 60s Duration Normalization & Phase A Routing for `one-take-director`

**Files:**
- Modify: `src/service/director/model.ts`
- Modify: `src/service/director/clip-seconds.ts`
- Modify: `src/service/director/run-phase-a.ts`
- Modify: `src/service/director/append-clip.ts`
- Modify: `src/service/credit-costs.ts`
- Modify: `src/service/clip-stage.ts`
- Modify: `src/service/production-plan.ts`
- Test: `src/service/director/clip-seconds.test.ts`, `src/service/clip-stage.test.ts`

**Interfaces:**
- Consumes: `ONE_TAKE_SKILL_SLUG`, `isOneTakeSkill` from `src/service/director/skill-rules.ts`; `ONE_TAKE_MAX_SECONDS`, `oneTakePhaseASchema` from `src/model/director.ts`
- Produces:
  - `ONE_TAKE_MAX_VIDEO_SECONDS = 60` in `src/service/credit-costs.ts`
  - `withSpokenClipDuration` / `withSpokenClipDurations` options `{ preservePlannedDuration?: boolean; maxSeconds?: number }` in `src/service/director/clip-seconds.ts`
  - `normalizeOneTakePhaseA(proposal: PhaseAProposal, options?: { durationPreset?: DurationPreset; source?: string }): PhaseAProposal` in `src/service/director/clip-seconds.ts`

- [ ] **Step 1: Write failing tests in `src/service/director/clip-seconds.test.ts` and `src/service/clip-stage.test.ts`**

Add tests verifying:
- `storyboardModel("one-take-director")` returns `"gemini-4-argon"`.
- `withSpokenClipDurations` with `{ preservePlannedDuration: true, maxSeconds: 60 }` preserves a 45s or 60s silent clip (`englishVo: "(no dialogue)"`) instead of clamping to 5s or 12s.
- `normalizeOneTakePhaseA` collapses a multi-clip proposal into 1 single clip (`clipCount: 1`, `clips.length === 1`), forces `englishVo: "(no dialogue)"` and `narrator: "No narrator — pure continuous motion and ambient sound."`, merges `motionCamera` beats into sequential time windows, and resolves duration from preset (`micro` -> 6s, `short` -> 18s, `punchy` -> 36s, `full` -> 60s) or user prompt (`"1 min"` / `"60s"` -> 60s) when the model wrote default 5s.
- `clipStateFor` and `clipVideoCost` price a 60s `one-take-director` realistic clip at `60 * 15 = 900` credits (not capped at 15s = 225 credits).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/director/clip-seconds.test.ts src/service/clip-stage.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `normalizeOneTakePhaseA`, `maxSeconds` support, and 60s credit pricing**

- In `src/service/director/model.ts`: route `"one-take-director"` in `storyboardModelForSkill` to `ARGON_MODEL`.
- In `src/service/director/clip-seconds.ts`: add `maxSeconds?: number` to `withSpokenClipDuration` / `withSpokenClipDurations` (defaulting to `CLIP_MAX_SECONDS = 12`, or `60` for `one-take-director`), and implement `normalizeOneTakePhaseA`.
- In `src/service/director/run-phase-a.ts`: use `oneTakePhaseASchema` when `isOneTakeSkill(input.skill.slug)`, apply `normalizeOneTakePhaseA(next, { durationPreset: input.durationPreset, source: input.source })`, and pass `preservePlannedDuration: true, maxSeconds: ONE_TAKE_MAX_SECONDS` to `withSpokenClipDurations`.
- In `src/service/credit-costs.ts`, `src/service/clip-stage.ts`, and `src/service/production-plan.ts`: export `ONE_TAKE_MAX_VIDEO_SECONDS = 60` and pass it as `maxSeconds` to `videoCost` when `skillSlug === "one-take-director"`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/director/clip-seconds.test.ts src/service/clip-stage.test.ts`
Expected: PASS

---

### Task 3: MiniMax H3 `ref2va` Multi-Shot Latent Chaining for `one-take-director` Clips Up to 60s

**Files:**
- Modify: `src/service/comfy/submit-clip-video.ts`
- Modify: `src/service/higgsfield/generate.ts`
- Modify: `src/service/higgsfield/pipeline.ts`
- Modify: `pipeline-models.md`
- Create: `src/service/comfy/submit-clip-video.test.ts`

**Interfaces:**
- Consumes: `ONE_TAKE_SKILL_SLUG`, `isOneTakeSkill` from `src/service/director/skill-rules.ts`; `ONE_TAKE_MAX_VIDEO_SECONDS` from `src/service/credit-costs.ts`
- Produces:
  - `buildOneTakeChainShots(input: { prompt: string; durationSeconds: number; hasEndFrame: boolean }): Array<{ id: string; prompt: string; length: number; steps: number; seed: string }>` in `src/service/comfy/submit-clip-video.ts`
  - Updated `shouldUseComfyForClipVideo(input: { model: string; audioUrl?: string; skillSlug?: string; durationSeconds?: number }): boolean` in `src/service/comfy/submit-clip-video.ts`
  - Updated `submitComfyStoryboardClipVideo` accepting `skillSlug?: string` and configuring `scene_continuity = "Hard picture + smooth audio"` + multi-shot `plan_json.shots` when `shots.length > 1`.

- [ ] **Step 1: Write failing unit tests in `src/service/comfy/submit-clip-video.test.ts`**

Test that:
- `shouldUseComfyForClipVideo` returns `true` when `COMFY_BASE_URL` and `COMFY_API_KEY` are set and `skillSlug === "one-take-director"` (even when `COMFY_CLIP_VIDEO_ENABLED` is not set).
- `buildOneTakeChainShots` returns 1 shot for `durationSeconds = 6`, 3 shots (`length: 192` each) for `durationSeconds = 18`, and 9 shots (`length: 192` each) for `durationSeconds = 60`, distributing timed beat clauses (`0–6s ...; 6–12s ...`) across the shots.
- `submitComfyStoryboardClipVideo` with `skillSlug: "one-take-director"` and `durationSeconds: 30` sets `graph["25"].inputs.scene_continuity` to `"Hard picture + smooth audio"` and populates 5 shots in `graph["26"].inputs.plan_json` using a mocked `fetch`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/comfy/submit-clip-video.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement multi-shot H3 `ref2va` chain in `src/service/comfy/submit-clip-video.ts` and wire `skillSlug` through `src/service/higgsfield/generate.ts` and `src/service/higgsfield/pipeline.ts`**

- Update `shouldUseComfyForClipVideo` and `submitComfyStoryboardClipVideo` in `src/service/comfy/submit-clip-video.ts` to support `skillSlug?: string` and `buildOneTakeChainShots`.
- Pass `skillSlug` into `shouldUseComfyForClipVideo` and `submitComfyStoryboardClipVideo` in `src/service/higgsfield/generate.ts`.
- In `src/service/higgsfield/pipeline.ts`, ensure `generateClipVideo` bills `one-take-director` using `ONE_TAKE_MAX_VIDEO_SECONDS` (`60`).
- Update `pipeline-models.md` to document `one-take-director` and updated `story-short-director`.

- [ ] **Step 4: Run tests, typecheck, and lint to verify everything passes**

Run: `npx tsx --test src/service/comfy/submit-clip-video.test.ts 'src/service/director/**/*.test.ts' src/service/video/use-case.test.ts && npx tsc --noEmit`
Expected: PASS with 0 errors.
