# OpenCut Editor: Add Clip & Add New Video via Director Flow — Design Spec

**Date:** 2026-11-02  
**Status:** Approved for Planning

---

## 1. Overview & Goals

Currently, inside the OpenCut video editor (`OpenCutDirectDesk`), the Assets panel menu (`AssetsClipMenu`) offers an **Add clip** action that opens a plain textarea dialog (`AddClipDialog`) and drafts a single clip locked to the existing project's director (`skillSlug`), visual style (`styleId`), cast, and voice settings.

This feature upgrades **Add clip** and introduces **Add new video** in the OpenCut Assets panel:
1. **Add new video (`add-video`)**: Opens the full create-video dialog inside the OpenCut editor so the user can pick any director, visual style, cast, script/content, voice, and duration preset, runs the full Director Phase A planning flow, and appends all resulting clips to the **end** of the existing video and OpenCut timeline.
2. **Add clip (`add`)**: Opens the same create-video dialog so the user can pick a director, visual style, cast, voice, target insertion slot (`afterClipNumber`), and content, runs the Director single-clip flow, and inserts **one** clip at the chosen slot (defaulting to the end).
3. **Per-Clip Director Overrides**: Newly added clips store their chosen director, style, cast, and voice settings directly on each `StoryboardRow`. Frame generation (`sendFrame`), video generation (`sendClipVideo`), and cost/stage calculations resolve per-clip overrides first and fall back to the parent `Project` fields when absent.
4. **Non-Blocking Execution**: Submitting the dialog immediately closes the modal and returns to the OpenCut editor while the background `clipAppends` queue runs the director and auto-enqueues scene frame generation.

---

## 2. User Experience & UI Architecture

### 2.1 Entry Point (`AssetsClipMenu`)
- **File:** `src/opencut/components/editor/panels/assets/views/assets-clip-menu.tsx`
- **Channel Action Type (`src/opencut/embed/scro-video-actions.ts`):**
  - Extend `ScroClipMenuAction` to `"remaining" | "scenes" | "clips" | "add" | "add-video"`.
- **Menu Items (below separator in `AssetsClipMenu`):**
  1. **Add clip (`action: "add"`)** — Adds a single clip via director flow at a chosen position (default: after last clip).
  2. **Add new video (`action: "add-video"`)** — Runs full director flow to create a multi-clip video sequence and appends all generated clips after the last clip.

### 2.2 Unified Dialog (`AppendDirectorDialog`)
- **File:** `src/presentation/components/app/projects/new/append-director-dialog.tsx`
- **Props:**
  - `mode: "add-clip" | "add-video"`
  - `project: PublicVideo`
  - `skills: PublicSkill[]`
  - `styles: PublicStyle[]`
  - `characters: PublicCharacter[]`
  - `products: PublicProduct[]`
  - `credits: number`
  - `subscribed: boolean`
  - `defaultAfterClipNumber?: number | null`
  - `pending: boolean`
  - `error: string`
  - `onCancel: () => void`
  - `onSubmit: (payload: AppendDirectorSubmitPayload) => void`
- **Initial State:**
  - Pre-populates `skillSlug`, `styleId`, `characterIds`, `language`, `voiceGender`, `speechPace`, `sceneTextLanguage`, `directorBackgroundId`, and `talkingHeadPoseId` from `project` so the user can either keep the current setup or switch any of them.
  - Content (`source` / `spokenScript`) starts empty.
  - Aspect ratio (`aspectRatio`) is locked to `project.aspectRatio` so all clips on the OpenCut timeline share the same canvas dimensions.
- **Mode Differences:**
  - `mode === "add-clip"`:
    - Displays the **Insert after clip** selector (`afterOptions`, defaulting to `selectedClipNumber ?? clips.at(-1)?.clipNumber`).
    - Hides `DurationPicker` (always generates 1 clip).
  - `mode === "add-video"`:
    - Displays a badge/notice indicating the new video clips will be appended after the final clip (`Clip N`).
    - Includes `DurationPicker` (`auto`, `micro`, `short`, `punchy`, `full`) in Details mode (or summary bar in Quick mode).
- **Plumbing Catalog Props:**
  - `NewProjectForm` already receives `skills`, `styles`, `characters`, and `products`. Pass them down through `OpenCutVideoDesk` (`OpenCutDirectDesk`) to `OpenCutScroToolbar`, which renders `AppendDirectorDialog` when `appendMode` (`"add-clip" | "add-video" | null`) is active.

---

## 3. Data Model & Per-Clip Context Resolution

### 3.1 `ClipDirectorOverrides` (`src/model/project.ts`)
Define the per-clip override fields shared between `ClipAppend` and `StoryboardRow`:

```ts
export type ClipDirectorOverrides = {
  skillId?: ObjectId;
  skillSlug?: string;
  styleId?: string;
  cast?: CastMember[];
  products?: ProductShot[];
  language?: VoLanguage;
  narrationEnabled?: boolean;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextChoice;
  directorBackgroundId?: string;
  backgroundImageUrls?: string[];
  talkingHeadBackgroundId?: string;
  talkingHeadPoseId?: string;
  logoUrl?: string;
};
```

- **`StoryboardRow`**: Extend with `ClipDirectorOverrides` (serialized in `PublicVideo` with `skillId?: string`).
- **`ClipAppend`**: Extend with:
  - `mode?: "single_clip" | "full_video"` (defaults to `"single_clip"`).
  - `durationPreset?: DurationPreset` (used when `mode === "full_video"`).
  - `spokenScript?: string` (used when a talking-head director is selected).
  - `uploadedVoUrl?: string` and `uploadedVoDurationSeconds?: number`.
  - `overrides?: ClipDirectorOverrides`.

### 3.2 Per-Clip Context Helper (`src/service/clip/clip-context.ts`)
Create a pure helper module `src/service/clip/clip-context.ts`:

1. **`resolveClipProject<T extends Project | PublicVideo>(project: T, clipNumber: number): T`**
   - Looks up `row = project.phaseA?.clips.find((c) => c.clipNumber === clipNumber)`.
   - If `row` has any `ClipDirectorOverrides` fields (`skillId`, `skillSlug`, `styleId`, `cast`, `products`, `language`, `narrationEnabled`, `voiceGender`, `speechPace`, `sceneTextEnabled`, `sceneTextLanguage`, `directorBackgroundId`, `backgroundImageUrls`, `talkingHeadBackgroundId`, `talkingHeadPoseId`, `logoUrl`), returns a shallow-merged copy of `project` with those top-level properties replaced by the clip's overrides and `characterLock` recomputed from `row.cast` when `row.cast` overrides `project.cast`.
   - If `row` has no overrides, returns `project` unchanged.
2. **`clipsShareContinuity(project: Project, prevClipNumber: number, nextClipNumber: number): boolean`**
   - Returns `true` only when `prevClipNumber` and `nextClipNumber` have the same effective `skillSlug` and `styleId`.
   - Used to prevent cross-director or cross-style clips from inheriting each other's end still (`chainsClipStarts`, `clipEndIsNextStart`, `withInheritedTalkingHeadStarts`).

### 3.3 Pipeline Integration (`src/service/higgsfield/pipeline.ts` & `clip-stage.ts`)
- In `sendFrame(project, clipNumber, position)`:
  - Resolve `const clipProject = resolveClipProject(project, clipNumber)` at the start of the function and use `clipProject` for `loadSkill`, `loadRenderableStyle`, `resolveSceneText`, `withWrittenCanvas`, `frameSubmitPlan`, and `withSceneCharacterLocks`.
- In `regenerateFrames` and `enqueueClipFrameJobs`:
  - Resolve `resolveClipProject(project, clipNumber)` per target clip when building prompts and checking `clipDrawsNoEndStill` / `isTalkingHeadSkill`.
- In `sendClipVideo(project, clipNumber, prompt)`:
  - Resolve `const clipProject = resolveClipProject(project, clipNumber)` at the start of the function and use `clipProject` for skill resolution, lip-sync / audio-first talking-head checks, ElevenLabs TTS voice selection, and video model selection.
- In `applyJobStatus` (post-video voice swap & grading):
  - Resolve `const clipProject = project && job.kind === "video" ? resolveClipProject(project, job.clipIndex + 1) : project` so post-processing uses the clip's own style, skill, language, and cast voice.
- In `clipStateFor`, `clipFrameCost`, and `clipVideoCost`:
  - Resolve `resolveClipProject(project, clipNumber)` so frame/video credit costs and steady-still flags match the clip's own director and style.

---

## 4. Backend Queue & Director Execution

### 4.1 Enqueue Action (`appendDirectorClipAction` in `src/service/clip/clip-timeline-actions.ts`)
- Extend `appendDirectorClipAction` input to accept optional brief configuration:
  - `mode?: "single_clip" | "full_video"`
  - `skillSlug?: string`
  - `styleId?: string`
  - `characterIds?: string[]`
  - `characterSelections?: CharacterSelectionMap`
  - `productIds?: string[]`
  - `language?: VoLanguage`
  - `voiceGender?: VoiceGender`
  - `speechPace?: SpeechPace`
  - `sceneTextLanguage?: SceneTextChoice`
  - `durationPreset?: DurationPreset`
  - `spokenScript?: string`
  - `uploadedVoUrl?: string`
  - `uploadedVoDurationSeconds?: number`
  - `directorBackgroundId?: string`
  - `backgroundImageUrls?: string[]`
  - `talkingHeadPoseId?: string`
  - `logoUrl?: string`
- **Validation:**
  - Verify active subscription (`isSubscriptionActive`).
  - Verify `project.phaseA.clips.length + pending < APPEND_CLIP_MAX`.
  - If `mode === "full_video"`, force `insertAt = project.phaseA.clips.length + 1`.
  - Resolve the selected skill via `findSelectableSkill(user.clerkUserId, input.skillSlug || project.skillSlug)`.
  - Validate cast requirements (`briefSkillError`) and build `CastMember[]` (`buildCast`) and `ProductShot[]` (`buildProducts`) when `characterIds` / `productIds` are provided.
  - Push the `ClipAppend` job onto `project.clipAppends` and trigger `after(() => runClipAppendQueue(project._id))`.

### 4.2 Queue Worker (`writeQueuedClip` in `src/service/clip/clip-timeline-actions.ts`)
- Resolve effective `skill`, `style`, and brief fields from `job.overrides` (falling back to `project`).
- **Case 1: `job.mode === "full_video"` (Add new video)**:
  - Run `runPhaseA` with the job's skill, style, `source: job.content`, `spokenScript: job.spokenScript`, `aspectRatio: project.aspectRatio`, `durationPreset: job.durationPreset ?? "auto"`, `language`, `voiceGender`, `speechPace`, `sceneTextEnabled`, `sceneTextLanguage`, `cast`, `products`, `logoUrl`, `backgroundImageUrls`, `directorBackgroundId`, `talkingHeadPoseId`, `uploadedVoUrl`, and `uploadedVoDurationSeconds`.
  - Apply director-specific sanitizers (`sanitizeOutfitPhaseA`, `sanitizeOutfitChangePhaseA`, `sanitizeSurprisePhaseA`) when applicable.
  - Cap the drafted clips to the remaining slot budget (`Math.max(1, APPEND_CLIP_MAX - fresh.phaseA.clips.length)`).
- **Case 2: `job.mode === "single_clip"` (Add clip)**:
  - Run `draftAppendedClips` with the job's skill, style, cast, language, and content.
  - If the chosen director is a talking-head director and `planTalkingHeadClips` returns multiple segments, or if single-clip mode is requested, keep 1 clip (or the planned clip for that spoken line).
  - Only inherit the previous clip's opening scene (`inheritOpening`) when `clipsShareContinuity` is true between the previous clip and the new clip.
- **Attach Overrides & Insert:**
  - Attach `job.overrides` onto each drafted `StoryboardRow`.
  - Call `insertClips(fresh, draftedWithOverrides, insertAt, { language, talkingHead })`.
  - Enqueue scene frames (`queueNewClipFrames`) and subtitle plates (`queueNewClipPlates` if applicable) for all newly inserted clip numbers.

### 4.3 OpenCut Timeline Synchronization (`ScroVideoSync`)
- No destructive changes required in `ScroVideoSync`:
  - When `insertClips` appends clips at the end (`insertAt = clips.length + 1`), `reconcileClips` in `src/opencut/embed/scro-video-sync.tsx` already detects `isAppendOnly === true` (`wantedList.slice(0, presentList.length).join(",") === presentKey`), computes `mainTrackEndSeconds`, and places each new clip sequentially at the end of the main track while preserving all existing edits.

---

## 5. Error Handling & Edge Cases

- **Maximum Clip Cap (`APPEND_CLIP_MAX = 20`)**:
  - Checked before enqueueing and again inside `writeQueuedClip`. For `full_video`, if `runPhaseA` generates more clips than remaining capacity up to `APPEND_CLIP_MAX`, slice the drafted clips to fit `APPEND_CLIP_MAX - fresh.phaseA.clips.length` so the append succeeds rather than failing after LLM generation.
- **Cross-Director Chaining Safety**:
  - If a project starts as `talking-head-director` (Clip 1) and appends a `cartoon-explainer-video-director` video (Clips 2–5), Clip 2 must not inherit Clip 1's talking-head frame or lock to Clip 1's start frame. `resolveClipProject` + `clipsShareContinuity` ensure each clip only chains when its neighbor shares the same `skillSlug` and `styleId`.
- **Credit & Failure Recovery**:
  - If the user has insufficient credits when `queueNewClipFrames` runs in the background, the new storyboard clips are still saved and appear on the OpenCut timeline as storyboard placeholders; the user can click to generate frames after topping up.
  - If the LLM director call fails, `failClipAppend` records the error on `clipAppends` and surfaces it in `ScroVideoQueue` / `TaskListDialog` without mutating existing clips.

---

## 6. Testing Plan

1. **`src/service/clip/clip-context.test.ts`**:
   - Verify `resolveClipProject` returns project defaults when a clip has no overrides.
   - Verify `resolveClipProject` overrides `skillSlug`, `styleId`, `cast`, `language`, `voiceGender`, `speechPace`, and `characterLock` when present on `StoryboardRow`.
   - Verify `clipsShareContinuity` returns `false` when adjacent clips differ in `skillSlug` or `styleId`, and `true` when they match.
2. **`src/service/clip/clip-order.test.ts`**:
   - Verify `insertClips` preserves per-clip overrides (`skillSlug`, `styleId`, `cast`, etc.) when appending single or multiple clips to the end of an existing storyboard.
3. **Typecheck & Lint**:
   - Run `npx tsc --noEmit` and `npx eslint` on all touched files.
