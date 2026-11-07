# Story Category Directors Upgrade: Multi-Character Speaker-Cut Short Film & Single-Clip One-Take Motion (`one-take-director`)

**Date:** 2026-11-07  
**Status:** Draft (Pending Approval)  
**Surface:** Story Director Picker (`STORY_SYSTEM_SKILL_SLUGS`), `story-short-director` isolated rules & catalog, `one-take-director` isolated rules & catalog, Phase A / Phase B planning, Vast ComfyUI MiniMax H3 `ref2va` multi-shot chain (`submitComfyStoryboardClipVideo`) & Cloud fallback.

---

## 1. Intent & Why

Currently, selecting the **Story** category in the Studio sidebar (`/app/stories` or `/app/videos/new?useCase=story`) offers only a single director (`story-short-director` — "Short film"). Furthermore:

1. **Short Film (`story-short-director`)** needs to explicitly direct **multi-character dialogue scenes cut like a real movie** — where storyboard cuts (`分鏡`) are driven by **who is speaking and reacting** (Shot / Reverse-shot, Over-the-Shoulder, Two-shot, reaction cutaways) rather than generic static wide shots or single-character monologues.
2. Users also need a dedicated **One-Take / Continuous Motion (`one-take-director`｜一鏡到底無旁白)** director inside the **Story** category for pure action/motion scenes (such as running down a mountain trail, skateboarding through a street, or a continuous tracking shot) with **zero VO (`(no dialogue)`)** and **1 single continuous clip up to 60 seconds (`1 min`)**, powered under the hood by **MiniMax H3 `ref2va` Extend chaining** (39-frame protected latent prefix loop in `extend.api.json`, or sequential `ref2va` cloud continuation stitched into one MP4).

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. **Expand Story Category (`STORY_SYSTEM_SKILL_SLUGS`)**:
   - Group both `"story-short-director"` (**Short film / 故事短片**) and `"one-take-director"` (**One-take motion / 一鏡到底**) under `STORY_SYSTEM_SKILL_SLUGS` in `src/service/video/use-case.ts` so both appear in the "Choose a video type" modal for Story projects and match `videoMatchesUseCase(slug, "story")`.
2. **Upgrade `story-short-director` (Multi-Character Speaker-Driven Movie Cuts)**:
   - Update `src/service/director/rules/story-short-director.ts` and `src/service/director/catalog/story-short-director.ts` (`1 Director = 1 File` isolation) so that:
     - Multi-character stories cut between clips **based on who is speaking (`NAME: "line"`) and who is reacting**, like a narrative film (alternating Over-the-Shoulder (OTS), Shot / Reverse-Shot medium close-ups on the active speaker, Two-Shots when characters interact physically, and silent reaction beats when appropriate).
     - Enforces 180-degree screen-direction continuity across speaker cuts (e.g., if Character A looks frame-right at Character B in Clip 1, Character B looks frame-left at Character A in Clip 2).
     - Supports multiple cast members seamlessly (while still allowing 1+ cast blueprints; `requiredCastCount: 2` in catalog so the Studio cast picker opens 2 character slots by default for multi-character dialogue, while still allowing generation if the user selects 1 or 2+ characters).
3. **Add `one-take-director` (Single-Clip Continuous Motion up to 60s, No VO)**:
   - Add `"one-take-director"` to `DIRECTOR_SLUGS` (`src/model/director.ts`), catalog (`src/service/director/catalog/one-take-director.ts`), isolated rule module (`src/service/director/rules/one-take-director.ts`), and i18n (`en`, `zh-Hant`, `zh-Hans`).
   - **Behavior & Storyboard Contract (Option A — 1 Single Clip up to 60s)**:
     - `clipCount` is strictly **1** (`clips` array has exactly 1 `StoryboardRow`: `Clip 1`).
     - `speechMode: "silent"`, `bansNarration: true`, `keyframeMode: "start-only"`, `requiredCastCount: 1`.
     - Zero voiceover and zero spoken dialogue: `narrator` is `"No narrator — pure continuous motion and ambient sound."` and `englishVo` is always `"(no dialogue)"`.
     - `durationSeconds` of `Clip 1` scales from **6 to 60 seconds** based on the user's chosen `DurationPreset` or explicit prompt request:
       - `micro`: `6–8s` (default `6s`)
       - `short`: `15–20s` (default `18s`)
       - `punchy`: `30–45s` (default `36s`)
       - `full`: `50–60s` (default `60s`)
       - `auto`: follows user prompt if specified (e.g., "1 min" → `60s`, "30s" → `30s`), otherwise `18s`.
     - `motionCamera` breaks the single long take into continuous ~6-second progression windows (e.g. `[0–6s] …; [6–12s] …; [12–18s] …`) with no camera cuts, no teleports, and continuous camera tracking (follow shot, gimbal tracking, lead shot, or panning).
     - Only **1 Start Frame** (`Clip 1 start`) is generated (`keyframeMode: "start-only"`).
4. **Render Single-Clip Up to 60s via MiniMax H3 `ref2va` Extend Chain**:
   - When rendering `Clip 1` of `one-take-director` (or any clip with `skillSlug === "one-take-director"`):
     - **Primary Path (Vast ComfyUI `extend.api.json` Multi-Shot Chain)**:
       - When `hasComfyEndpoint()` is true, `shouldUseComfyForClipVideo` returns `true` for `one-take-director`.
       - `submitComfyStoryboardClipVideo` (`src/service/comfy/submit-clip-video.ts`) splits `durationSeconds` into `N` chained shots (where each shot after Shot 1 adds `153` new frames = `6.375s` at 24fps on top of the 39-frame protected latent prefix, `length = 192`).
       - Parses the timed beats from `prompt` / `motionCamera` (or distributes the continuous motion prompt across `shot_01 .. shot_0N`), sets `graph["25"].inputs.scene_continuity = "Hard picture + smooth audio"` when `N > 1`, feeds `<Picture 1>` (start keyframe) into `ref_images.ref_image_0`, and lets `MiniMaxH3ChainLoopStart` → `MiniMaxH3ChainContext` (39-frame protected latent prefix) → `MiniMaxH3LoopTrim` → `MiniMaxH3ChainLoopEnd` → `MiniMaxH3ChainAssemble` render and stitch all `N` segments into **one continuous MP4** for `Clip 1`.
     - **Cloud Fallback Path (when `hasComfyEndpoint()` is false)**:
       - When `MINIMAX_API_KEY` is configured and `durationSeconds > 10`, runs an initial segment and sequentially extends via `submitMinimaxH3Ref2VaVideo` (`MiniMax-H3` `ref2va` using the tail frame + previous segment video as `reference_video`), concatenating the segments via FFmpeg into a single MP4; otherwise falls back to OpenRouter `minimax/hailuo-3` (realistic) / `alibaba/wan-3.0` (non-realistic).
5. **Credit Pricing & Schema Support for 60s Single Clip**:
   - Add `ONE_TAKE_MAX_VIDEO_SECONDS = 60` in `src/service/credit-costs.ts` and `oneTakeStoryboardRowSchema` (`durationSeconds: z.number().min(5).max(60)`) in `src/model/director.ts` so `Clip 1` of `one-take-director` validates up to `60s` and bills proportionally per second (`videoCost(seconds, styleId, false, ONE_TAKE_MAX_VIDEO_SECONDS)`).

### Non-Goals
- Do not alter `follow-shot-director` (keep existing multi-clip follow-shot behavior intact for backward compatibility).
- Do not share prompt constants between `story-short-director.ts` and `one-take-director.ts` (strictly enforce `1 Director = 1 File`).

### Anti-Goals
- Never add narrator voiceover or spoken dialogue to `one-take-director`.
- Never split `one-take-director` into multiple storyboard rows in Phase A; the storyboard UI must show a single `Clip 1` whose `durationSeconds` can be up to `60s`.

---

## 3. Approaches Considered

1. **Option 1 (Chosen): Dedicated `one-take-director` (Single Clip up to 60s with H3 `ref2va` Chain) + Upgraded `story-short-director` (Multi-Character Speaker-Cut Movie) in `STORY_SYSTEM_SKILL_SLUGS`**
   - Clean separation of concerns: `story-short-director` focuses on multi-character dialogue with movie-style speaker cuts across clips, while `one-take-director` focuses on a single silent continuous-motion clip (up to 60s) powered by H3 `ref2va` multi-shot latent chaining.
   - Preserves backward compatibility for existing `follow-shot-director` projects.
2. **Option 2 (Rejected): Repurpose `follow-shot-director` into a single-clip 60s director**
   - Breaks existing `follow-shot-director` multi-clip projects and unit tests.

---

## 4. Technical Design

### 4.1 Story Category Grouping (`src/service/video/use-case.ts` & `director-dock-config.ts`)
- Update `STORY_SYSTEM_SKILL_SLUGS`:
  ```ts
  export const STORY_SYSTEM_SKILL_SLUGS = [
    "story-short-director",
    "one-take-director",
  ] as const;
  ```
- Update `resolveModeSwitchSkillSlug` in `src/presentation/components/app/director-dock/director-dock-config.ts` so switching to `"story"` mode recognizes both `"story-short-director"` and `"one-take-director"` (defaulting to `"story-short-director"` when switching from another mode).

### 4.2 `story-short-director` Upgrade: Multi-Character Speaker-Driven Movie Cuts
- **`src/service/director/rules/story-short-director.ts`** (isolated rule file):
  - Update `phaseADirectorBlock`, `phaseASceneDetailBlock`, and `phaseAKeyframeDeltaBlock` to explicitly require:
    - **Speaker-Driven Movie Editing (`分鏡依說話者切換`)**: Each dialogue exchange cuts to a new clip framed around the active speaker or the dramatic interaction between characters (Shot / Reverse-Shot medium close-up, Over-the-Shoulder looking at the speaker, or Two-Shot when both characters interact physically).
    - **180-Degree Axis & Eyeline Continuity**: Maintain consistent screen positions and opposing eyelines across cuts (e.g., if Speaker A is on the left looking right at Speaker B in Clip 1, Speaker B is on the right looking left at Speaker A in Clip 2; characters never look into the camera lens).
    - **Multi-Character Cast Support**: When multiple characters are attached in `cast`, stage them together in the narrative and prefix every spoken line with the exact character name (`NAME: "line"`).
- **`src/service/director/catalog/story-short-director.ts`**:
  - Set `requiredCastCount: 2` in `behavior` so the Studio dock opens 2 character cast slots by default (note: `requiredCastCount` only controls default cast slot count in the UI; users can still run with 1 or more characters).
  - Update `description`, `profile`, and `systemPrompt` to reflect multi-character dialogue and movie-style speaker cuts.

### 4.3 `one-take-director`: Single-Clip Continuous Motion (Up to 60s, No VO)
- **Model & Schema (`src/model/director.ts`)**:
  - Add `"one-take-director"` to `DIRECTOR_SLUGS`.
  - Add `ONE_TAKE_MAX_SECONDS = 60` and `oneTakeStoryboardRowSchema`:
    ```ts
    export const oneTakeStoryboardRowSchema = storyboardRowSchema.extend({
      durationSeconds: z.number().min(5).max(60),
    });
    export const oneTakePhaseASchema = phaseASchema.extend({
      clipCount: z.literal(1),
      clips: z.array(oneTakeStoryboardRowSchema).min(1).max(1),
    });
    ```
- **Isolated Rule File (`src/service/director/rules/one-take-director.ts`)**:
  - `slug: "one-take-director"`, `allowsInventedProps: false`.
  - `phaseADirectorBlock`:
    - Strictly **1 single clip (`clipCount = 1`)** for the entire video—never split the storyboard into Clip 2+.
    - **NO VO / NO DIALOGUE**: `narrator` must be `"No narrator — pure continuous motion and ambient sound."` and `englishVo` must be `"(no dialogue)"`. Characters keep lips naturally closed.
    - **Single Continuous Long Take (6s–60s)**: `durationSeconds` is set to the full target duration (up to 60 seconds). `motionCamera` must be written as sequential ~6-second continuous time windows covering the full `durationSeconds` (e.g. for 30s: `0–6s …; 6–12s …; 12–18s …; 18–24s …; 24–30s …`) describing the uninterrupted physical locomotion (running downhill, striding, skating, dodging obstacles) and continuous camera tracking (follow shot, lead shot, gimbal tracking) with zero cuts.
    - Strict source fidelity (zero invented symbolic props).
- **Phase A Duration & Single-Clip Normalization (`src/service/director/clip-seconds.ts`, `src/service/director/run-phase-a.ts`, `src/service/director/append-clip.ts`)**:
  - Add helper `isOneTakeSkill(skillSlug)` (`skillSlug === "one-take-director"`) and `resolveOneTakeDurationSeconds(plannedSeconds, durationPreset, source)`:
    - Clamps to `5..60` seconds.
    - If the LLM outputs multiple clips despite the schema, `normalizeOneTakePhaseA` collapses them into a single `Clip 1` whose `durationSeconds` is the clamped total duration (`5..60s`), merging `motionCamera` beats into sequential time windows, and forcing `englishVo: "(no dialogue)"`.
  - Use `gemini-4-argon` (`storyboardModel("one-take-director")`) for `one-take-director` Phase A planning.

### 4.4 MiniMax H3 `ref2va` Multi-Shot Chaining for `one-take-director` (`src/service/comfy/submit-clip-video.ts`)
- In `shouldUseComfyForClipVideo(input)` (`src/service/comfy/submit-clip-video.ts`):
  - Enable ComfyUI `ref2va` when `hasComfyEndpoint()` is true and either `input.skillSlug === "one-take-director"` or `process.env.COMFY_CLIP_VIDEO_ENABLED === "true"` (for `minimax/hailuo-3` without external TTS audio).
- In `submitComfyStoryboardClipVideo(input)`:
  - Add `buildOneTakeChainShots({ prompt, durationSeconds, hasEndFrame })`:
    - When `durationSeconds <= 10`: produces 1 shot (`length = h3ValidFrameLength(durationSeconds)`), `scene_continuity = "Independent scenes"`.
    - When `durationSeconds > 10` (up to `60s`):
      - Sets `graph["25"].inputs.scene_continuity = "Hard picture + smooth audio"` so `MiniMaxH3ChainLoopStart` → `MiniMaxH3ChainContext` encodes the last 39 frames (`1.625s`) of each shot as a protected latent prefix (`denoise mask = 0`) for the next shot, and `MiniMaxH3LoopTrim` trims the 39-frame overlap before `MiniMaxH3ChainAssemble` stitches the final MP4.
      - Computes the number of shots `N = Math.max(2, Math.min(10, Math.ceil(durationSeconds / 6.375)))` (each chained shot with `length: 192` yields `153` new frames = `6.375s` at 24fps; e.g., 60s = 9 shots).
      - Splits any timed beats (`0–6s ...; 6–12s ...`) from the clip prompt across `shot_01 .. shot_0N` so each 6-second loop iteration receives its corresponding stage of the continuous motion alongside the `<Picture 1>` identity/scene reference lock.

### 4.5 Credits & Billing (`src/service/credit-costs.ts`, `src/service/clip-stage.ts`, `src/service/production-plan.ts`)
- Export `ONE_TAKE_MAX_VIDEO_SECONDS = 60` in `src/service/credit-costs.ts`.
- In `clipStateFor` (`src/service/clip-stage.ts`), `clipVideoCost` (`src/service/production-plan.ts`), and `generateClipVideo` (`src/service/higgsfield/pipeline.ts`), pass `maxSeconds = ONE_TAKE_MAX_VIDEO_SECONDS` when `skillSlug === "one-take-director"` so a 30s or 60s one-take clip bills accurately for its full duration.

---

## 5. File List

- `src/model/director.ts` — Add `"one-take-director"` to `DIRECTOR_SLUGS`, add `ONE_TAKE_MAX_SECONDS = 60`, `oneTakeStoryboardRowSchema`, and `oneTakePhaseASchema`.
- `src/service/video/use-case.ts` & `src/service/video/use-case.test.ts` — Add `"one-take-director"` to `STORY_SYSTEM_SKILL_SLUGS`.
- `src/presentation/components/app/director-dock/director-dock-config.ts` & `director-dock-config.test.ts` — Support `"one-take-director"` in `resolveModeSwitchSkillSlug("story", skills)`.
- `src/service/director/rules/story-short-director.ts` & `src/service/director/catalog/story-short-director.ts` — Upgrade Short Film director to multi-character speaker-driven movie cuts (`requiredCastCount: 2`, Shot/Reverse-Shot, OTS, 180-degree eyeline rules).
- `src/service/director/rules/one-take-director.ts` & `src/service/director/catalog/one-take-director.ts` — New isolated rule file and catalog definition for `one-take-director` (1 clip up to 60s, no VO, continuous motion).
- `src/service/director/rules/index.ts`, `src/service/director/catalog/index.ts`, `src/service/director/skill-rules.ts`, `src/service/director/model.ts` — Register `one-take-director` and route its Phase A model to `gemini-4-argon`.
- `src/service/director/clip-seconds.ts` & `src/service/director/run-phase-a.ts` — Support `maxSeconds: 60` and single-clip normalization (`normalizeOneTakePhaseA`) for `one-take-director`.
- `src/service/comfy/submit-clip-video.ts` & `src/service/comfy/submit-clip-video.test.ts` — Support multi-shot H3 `ref2va` latent-prefix loop chaining (`buildOneTakeChainShots`, `scene_continuity: "Hard picture + smooth audio"`) for `one-take-director` clips up to 60s.
- `src/service/credit-costs.ts`, `src/service/clip-stage.ts`, `src/service/production-plan.ts`, `src/service/higgsfield/pipeline.ts` — Support 60s max billing and video submission for `one-take-director`.
- `src/util/i18n/messages/director-locale.ts`, `src/util/i18n/messages/workspace/brief.en.ts`, `src/util/i18n/messages/workspace/brief.zh-Hant.ts` — Add English, Traditional Chinese, and Simplified Chinese labels and descriptions for `one-take-director` and updated `story-short-director` blurbs.
- `pipeline-models.md` — Document `one-take-director` and updated `story-short-director` pipeline rules.
