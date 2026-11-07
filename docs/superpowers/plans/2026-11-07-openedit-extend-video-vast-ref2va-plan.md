# OpenEdit Extend Video (Vast `ref2va`), Optional Comfy Clip Video Switch, and Edit with AI Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable OpenEdit users to extend a completed storyboard clip into a new `Clip N+1` via Vast ComfyUI MiniMax H3 `ref2va` (encoding the last 39 frames as a protected latent prefix, passing the last 6s video + Character/Scene/Props reference images, and trimming the 39-frame overlap), add an opt-in `COMFY_CLIP_VIDEO_ENABLED` switch for standard storyboard clips, and fix the "EDIT WITH AI" (`ScroSceneEditInput`) no-response bug.

**Architecture:** We add an `extend.api.json` ComfyUI workflow and `buildExtendGraph` in `src/service/comfy/openjutsu-graph.ts` that wires `MiniMaxH3ChainExternalVideo` (`prepend_original: false`) + `MiniMaxH3ChainContext` (`Soft AV`, `overlap_frames: 39`) + `MiniMaxH3ReferenceToVideo` (`ref_video_0` = last 6s clip, `ref_image_0..2` = Character/Scene/Props) + `MiniMaxH3LoopTrim` (`trim_frames: 39`). When triggered from OpenEdit, `applyClipExtend` inserts `Clip N+1` via `insertClips` immediately and runs an `extend_jobs` background pipeline that settles `Clip N+1` on completion. Simultaneously, we add `COMFY_CLIP_VIDEO_ENABLED` support in `submitClipVideo` / `fetchHiggsfieldStatus` and fix `ScroSceneEditInput` + `scro-video-sync.tsx` so AI text edits preserve the timeline video element and display the AI summary.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, MongoDB (`extend_jobs`, `videos`), ComfyUI (`ComfyUI-MiniMaxH3-Context-Loop`, `MiniMax-H3 ref2va`), Node built-in test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-11-07-openedit-extend-video-vast-ref2va-design.md`

## Global Constraints

- Never make live paid provider calls or live Vast ComfyUI calls during unit tests; use pure functions or mock `fetch` (`{ fetch: fakeFetch }`).
- In H3 `ref2va` extension prompts, `<Picture 1..3>` must be marked as appearance/environment/prop anchors (`fully_preserved` without pulling the moving subject back to the static pose), while the 39-frame protected latent prefix and `<Video 1>` govern live pose, momentum, and camera trajectory.
- Default storyboard clip generation remains on OpenRouter cloud unless `COMFY_CLIP_VIDEO_ENABLED=true` and `hasComfyEndpoint()` are both active.
- Keep `pipeline-models.md` and `AGENTS.md` updated with any pipeline and model changes.

## Review Focus

- Short source clips (e.g., 2.5s–5s clips): `skip_first_frames` for the last 6 seconds must clamp to `>= 0` (`Math.max(0, Math.round((clipDurationSeconds - 6) * 24))`) so shorter clips still load all frames (`>= 39` frames) without negative skip errors.
- Missing optional reference images (e.g., no scene ref or no prop ref, or no character ref): `buildExtendGraph` must dynamically remove unused `LoadImage` nodes and compact `ref_images.ref_image_0..K` indices sequentially without gaps.
- `scoreVideo` in `src/service/comfy/openjutsu-client.ts`: must rank `h3_oneclick_extend` at priority `3` alongside `h3_oneclick_swap` and `h3_oneclick_edit` so `findOutputVideo` picks the assembled extension MP4.
- `diffScroSeedClips` in `src/service/scro-video/timeline-seed.ts`: must detect changes to `motionCamera`, `startVo`, and `endVo` so AI edits to camera motion update the OpenEdit inspector immediately.
- `ensureMedia` / `upgradeStandIns` in `src/opencut/embed/scro-video-sync.tsx`: a clip with `stage === "video_ready"` and a valid `videoUrl` must keep `useVideo = true` even when `staleVideo` is `true` after a text edit, preventing `deleteElements` from wiping the selected timeline video element and unmounting `ScroSceneEditInput`.

---

### Task 1: Fix OpenEdit "EDIT WITH AI" (`ScroSceneEditInput`) & Timeline Sync

**Files:**
- Modify: `src/service/scro-video/timeline-seed.ts`
- Modify: `src/service/scro-video/timeline-seed.test.ts`
- Modify: `src/opencut/embed/scro-video-sync.tsx`
- Modify: `src/service/clip/scene-chat-actions.ts`
- Modify: `src/service/opencut/messages.ts`
- Modify: `src/service/opencut/messages.test.ts`
- Modify: `src/presentation/components/app/projects/new/opencut-direct-desk.tsx`
- Modify: `src/opencut/embed/scro-scene-edit-input.tsx`

**Interfaces:**
- Produces:
  - `ScroSceneEditResultMessage` in `src/service/opencut/messages.ts` with optional `summary?: string`
  - `sendClipSceneChatAction` returning `{ ok: true; project: PublicVideo; summary: string } | { ok: false; error: string }`
  - `diffScroSeedClips` checking `motionCamera`, `startVo`, `endVo`
  - `shouldUseClipVideoMedia(clip: Pick<ScroVideoSeedClip, "videoUrl" | "stage" | "staleVideo">): boolean` exported from `src/opencut/embed/scro-media-load.ts` (or `src/service/scro-video/timeline-seed.ts`)

- [ ] **Step 1: Write failing tests in `src/service/scro-video/timeline-seed.test.ts`**

Add tests verifying:
1. `diffScroSeedClips` detects when `motionCamera`, `startVo`, or `endVo` changes on a clip.
2. `shouldUseClipVideoMedia(clip)` returns `true` when `clip.videoUrl` is present and `clip.stage === "video_ready"` even if `clip.staleVideo === true` (so AI text edits do not downgrade a finished timeline video to a static image and unmount the inspector).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/scro-video/timeline-seed.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `diffScroSeedClips`, `shouldUseClipVideoMedia`, and `ScroSceneEditInput` summary feedback**

1. In `src/service/scro-video/timeline-seed.ts`, export `shouldUseClipVideoMedia(clip: Pick<ScroVideoSeedClip, "videoUrl" | "stage" | "staleVideo">): boolean` returning `Boolean(clip.videoUrl && (clip.stage === "video_ready" || !clip.staleVideo))` and add `before.motionCamera !== clip.motionCamera || before.startVo !== clip.startVo || before.endVo !== clip.endVo` to `diffScroSeedClips`.
2. In `src/opencut/embed/scro-video-sync.tsx` and `src/opencut/embed/scro-media-load.ts` (`findReusableClipAsset`), use `shouldUseClipVideoMedia(clip)` so finished videos stay mounted as `"video"` after text edits.
3. In `src/service/clip/scene-chat-actions.ts`, return `summary: assistantMsg.content` on `{ ok: true, project: toPublicVideo(updated), summary: assistantMsg.content }`.
4. In `src/service/opencut/messages.ts`, add `summary?: string` to `ScroSceneEditResultMessage`.
5. In `src/presentation/components/app/projects/new/opencut-direct-desk.tsx`, pass `summary: result.ok ? result.summary : undefined` in `scro-scene-edit-result` and add `.catch((err) => channel.postToEditor({ type: "scro-scene-edit-result", videoId: project.id, clipNumber, requestId, ok: false, error: err instanceof Error ? err.message : undefined }))`.
6. In `src/opencut/embed/scro-scene-edit-input.tsx`, display `data.ok ? (data.summary || oc.inspector.updated) : (data.error || oc.inspector.updateFailed)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/scro-video/timeline-seed.test.ts src/service/opencut/messages.test.ts`
Expected: PASS

---

### Task 2: Vast ComfyUI `ref2va` Extend Graph (`extend.api.json`, `buildExtendGraph`, and `submitOpenJutsuExtend`) + Optional Storyboard Clip Video Switch (`COMFY_CLIP_VIDEO_ENABLED`)

**Files:**
- Create: `src/service/comfy/workflows/extend.api.json`
- Modify: `src/service/comfy/openjutsu-graph.ts`
- Modify: `src/service/comfy/openjutsu-graph.test.ts`
- Modify: `src/service/comfy/openjutsu-client.ts`
- Create: `src/service/comfy/submit-clip-video.ts`
- Modify: `src/service/higgsfield/generate.ts`
- Modify: `src/service/higgsfield/persist.ts`

**Interfaces:**
- Produces:
  - `ExtendGraphInput` and `buildExtendGraph(input: ExtendGraphInput): ApiGraph` in `src/service/comfy/openjutsu-graph.ts`
  - `buildH3ExtendPrompt(input: { extensionPrompt: string; hasCharacterImage: boolean; hasSceneImage: boolean; hasPropImage: boolean; refVideoSeconds: number }): string` in `src/service/comfy/openjutsu-graph.ts`
  - `resolveH3ExtendDimensions(aspectRatio: AspectRatio): { width: number; height: number }` in `src/service/comfy/openjutsu-graph.ts`
  - `submitOpenJutsuExtend(input: { video: Buffer; clipDurationSeconds: number; extensionPrompt: string; characterImage?: Buffer | null; sceneImage?: Buffer | null; propImage?: Buffer | null; aspectRatio: AspectRatio; seed: number; runId: string }, fetchFn?: typeof fetch): Promise<ComfySubmitResult>` in `src/service/comfy/openjutsu-client.ts`
  - `shouldUseComfyForClipVideo(input: { model: string; audioUrl?: string }): boolean` and `submitComfyStoryboardClipVideo(...)` in `src/service/comfy/submit-clip-video.ts`

- [ ] **Step 1: Write failing tests in `src/service/comfy/openjutsu-graph.test.ts`**

Add tests for:
1. `buildH3ExtendPrompt`: includes `<Video 1>`, sequentially numbered `<Picture 1..3>` for whichever of character/scene/prop are present, `[video continuation + reference generation]`, and `retention_analysis` instructing H3 not to pull the moving subject back to the static reference pose.
2. `buildExtendGraph`:
   - Sets `VHS_LoadVideo.inputs.skip_first_frames = Math.max(0, Math.round((clipDurationSeconds - 6) * 24))` and `frame_load_cap = 144` (clamping to `0` when `clipDurationSeconds <= 6`).
   - Configures `MiniMaxH3ChainExternalVideo` with `prepend_original: false` and `MiniMaxH3ChainPlanModern` with `length: 192` (`39` context frames + `153` new frames), `width`/`height` matching `aspectRatio` (`736x1312` for `9:16`, `1312x736` for `16:9`, `736x736` for `1:1`).
   - Dynamically wires 0 to 3 reference images into `MiniMaxH3ReferenceToVideo` (`ref_images.ref_image_0..2`) without gaps and deletes unused `LoadImage` nodes.
   - Sets `MiniMaxH3ChainAssemble.inputs.output_subfolder = "h3_oneclick_extend"` and uniquifies `run_name` and `filename` with `runId`.
3. `findOutputVideo`: ranks `h3_oneclick_extend` at priority `3`.
4. `shouldUseComfyForClipVideo`: returns `false` by default and `true` only when `COMFY_CLIP_VIDEO_ENABLED === "true"`, `hasComfyEndpoint()` is `true`, `model === OPENROUTER_HAILUO_3_VIDEO_MODEL`, and `!audioUrl`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/comfy/openjutsu-graph.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `extend.api.json`, `buildExtendGraph`, `submitOpenJutsuExtend`, and `submit-clip-video.ts`**

1. Create `src/service/comfy/workflows/extend.api.json` with the single-scene H3 `ref2va` extension graph (`VHS_LoadVideo` + `H3SoundtrackOrSilence` + `MiniMaxH3GenerationProfile` + `MiniMaxH3ChainPlanModern` + `MiniMaxH3ChainExternalVideo` (`prepend_original: false`) + `MiniMaxH3ChainLoopStart` + `MiniMaxH3ChainCurrent` + `MiniMaxH3ReferenceToVideo` + `MiniMaxH3ChainContext` + `SamplerCustomAdvanced` + `VAEDecode` + `VAEDecodeAudio` + `MiniMaxH3LoopTrim` + `MiniMaxH3ChainSegmentSave` + `MiniMaxH3ChainReview` + `MiniMaxH3ChainLoopEnd` + `MiniMaxH3ChainAssemble`).
2. Implement `resolveH3ExtendDimensions`, `buildH3ExtendPrompt`, and `buildExtendGraph` in `src/service/comfy/openjutsu-graph.ts`.
3. Implement `submitOpenJutsuExtend` and update `scoreVideo` (`/(^|\/)h3_oneclick_(swap|edit|extend)$/`) in `src/service/comfy/openjutsu-client.ts`.
4. Create `src/service/comfy/submit-clip-video.ts` and wire `shouldUseComfyForClipVideo`, `isComfyPromptStatusUrl`, and `comfyViewAuthHeaders` into `src/service/higgsfield/generate.ts` and `src/service/higgsfield/persist.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/comfy/openjutsu-graph.test.ts`
Expected: PASS

---

### Task 3: Extend Job Model, DAO, Pipeline (`src/service/extend/pipeline.ts`), and OpenEdit `applyClipExtend` (`Clip N+1`)

**Files:**
- Create: `src/model/extend-job.ts`
- Create: `src/dao/extend-jobs.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/extend/pipeline.ts`
- Modify: `src/service/credit-costs.ts`
- Modify: `src/service/opencut/clip-jutsu.ts`
- Modify: `src/service/opencut/clip-jutsu.test.ts`
- Modify: `src/presentation/actions/opencut-clip-jutsu.ts`
- Modify: `src/service/generation/actions.ts`
- Modify: `src/presentation/api/cron/refresh-jobs/route.ts`
- Modify: `src/service/generation/task-list.ts`

**Interfaces:**
- Produces:
  - `ExtendJob` & `PublicExtendJob` in `src/model/extend-job.ts`
  - `extendJobsCollection()` in `src/dao/extend-jobs.ts`
  - `resolveClipExtendReferences(project: Pick<Project, "phaseA" | "cast" | "characterStillUrl" | "characterImageUrl" | "backgroundPlates" | "backgroundImageUrls" | "referenceImages" | "products" | "objectSheetUrl">, clipNumber: number): { characterImageUrls: string[]; sceneImageUrl?: string; propImageUrls: string[] }` in `src/service/opencut/clip-jutsu.ts`
  - `applyClipExtend(input: { videoId: string; clipNumber: number; prompt: string; characterImageUrls?: string[]; sceneImageUrl?: string; propImageUrls?: string[] }): Promise<ApplyClipEngineResult & { newClipNumber?: number }>` in `src/service/opencut/clip-jutsu.ts`
  - `applyClipExtendAction` in `src/presentation/actions/opencut-clip-jutsu.ts`
  - `startExtendJob`, `runExtendJobInBackground`, `advanceExtendJobs` in `src/service/extend/pipeline.ts`

- [ ] **Step 1: Write failing tests in `src/service/opencut/clip-jutsu.test.ts`**

Add tests for:
1. `resolveClipExtendReferences`: extracts character refs from `row.cast` / `project.cast` / `characterStillUrl`, scene ref from `backgroundPlates` (`row.backgroundSetId`) / `backgroundImageUrls` / `referenceImages`, and prop refs from `row.products` / `project.products` / `objectSheetUrl`.
2. `buildExtendedClipInsertion`: inserts `Clip N+1` right after `Clip N` via `insertClips`, shifts later clips `N+2...`, seeds `Clip N+1`'s `start` frame with `Clip N`'s poster URL, and marks `Clip N+1` in `project.clips` as `status: "in_progress"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/opencut/clip-jutsu.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `extend-job.ts`, `extend/pipeline.ts`, `resolveClipExtendReferences`, and `applyClipExtend`**

1. Create `src/model/extend-job.ts`, `src/dao/extend-jobs.ts`, and export `extendJobsCollection` from `src/dao/index.ts`.
2. Create `src/service/extend/pipeline.ts`:
   - `startExtendJob`: validates inputs, charges `teleportCost({ durationSeconds: 6 })` (90 credits, refunded on failure), inserts `ExtendJob`, and triggers `runExtendJobInBackground` via `after()`.
   - `runExtendJobInBackground`: downloads `sourceVideoUrl`, composites multi-image character/prop sheets via `composeJutsuCharacterReferenceSheet` when needed, submits to Vast ComfyUI via `submitOpenJutsuExtend` when `hasComfyEndpoint()` is true (or falls back to cloud `submitMinimaxH3Ref2VaVideo` / `submitOpenRouterClipVideo`), polls and finalizes via `settleTargetClipFromEngineJob`.
   - `advanceExtendJobs`: advances in-flight `extend_jobs` from `refreshGenerationAction` and `/api/cron/refresh-jobs`.
3. Implement `resolveClipExtendReferences`, `buildExtendedClipInsertion`, and `applyClipExtend` in `src/service/opencut/clip-jutsu.ts`, and expose `applyClipExtendAction` in `src/presentation/actions/opencut-clip-jutsu.ts`.
4. Wire `advanceExtendJobs` into `src/service/generation/actions.ts` and `src/presentation/api/cron/refresh-jobs/route.ts`, and `extendTask` into `src/service/generation/task-list.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/opencut/clip-jutsu.test.ts`
Expected: PASS

---

### Task 4: OpenEdit Inspector UI & `OpenCutClipExtendDialog` + Documentation Sync

**Files:**
- Modify: `src/opencut/i18n/use-opencut-i18n.ts`
- Modify: `src/opencut/embed/scro-video-actions.ts`
- Modify: `src/service/opencut/messages.ts`
- Modify: `src/opencut/embed/scro-video-jutsu-actions.tsx`
- Modify: `src/opencut/embed/scro-video-properties.tsx`
- Create: `src/presentation/components/app/projects/new/opencut-clip-extend-dialog.tsx`
- Modify: `src/presentation/components/app/projects/new/opencut-scro-ai-shell.tsx`
- Modify: `src/presentation/components/app/projects/new/opencut-direct-desk.tsx`
- Modify: `pipeline-models.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `applyClipExtendAction`, `resolveClipExtendReferences`
- Produces:
  - `"extend-video"` kind on `ScroOpenAiMessage` and `requestScroOpenAi`
  - `OpenCutClipExtendDialog` component in `src/presentation/components/app/projects/new/opencut-clip-extend-dialog.tsx`

- [ ] **Step 1: Add `"extend-video"` to `ScroOpenAiMessage`, `requestScroOpenAi`, `use-opencut-i18n.ts`, and `ScroVideoJutsuActions`**

Update `ScroVideoJutsuActions` (and standalone engine inspector buttons in `ScroVideoProperties`) to include the **Extend Video（延展片段）** button when `canApplyClipJutsu(clip)` is true.

- [ ] **Step 2: Create `OpenCutClipExtendDialog` and wire into `OpenCutScroAiShell` & `OpenCutDirectDesk`**

In `src/presentation/components/app/projects/new/opencut-clip-extend-dialog.tsx`:
- Display `Clip N` video preview and badge (`Last 39 frames Latent Prefix + Last 6s Video Ref → New Clip ${clipNumber + 1}`).
- Pre-populate Character Refs, Scene Ref, and Props/Product Refs from `project` & `clipNumber` with toggle/remove and `BrandUploadButton` to add/replace images.
- Require continuation `prompt` textarea and submit via `applyClipExtendAction`.
- Wire `clipExtendClip` state into `useOpenCutScroAiState`, `OpenCutScroAiShell`, and `OpenCutDirectDesk`.

- [ ] **Step 3: Update `pipeline-models.md` and `AGENTS.md` and run full verification**

Run: `npx tsc --noEmit && npx eslint src/service/comfy/ src/service/extend/ src/service/opencut/ src/opencut/embed/ src/presentation/components/app/projects/new/ && npx tsx --test 'src/service/**/*.test.ts'`
Expected: PASS with zero errors.
