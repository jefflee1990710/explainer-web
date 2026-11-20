# Scro Canvas Tools, FFmpeg Nodes & Navigation Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate Scro's creation/remix workflows into `/app/canvas` as Scro Tool Nodes, ElevenLabs TTS, and Vast.ai Worker FFmpeg nodes; upgrade the Canvas AI Assistant; remove all 6 standalone tools from the left menu; redirect legacy creation routes to `/app/canvas`; and retire Open Editor (OpenCut) in favor of preview/download in `/app/videos`.

**Architecture:** Extend Canvas's unified `model` catalog (`src/service/canvas/model-catalog.ts`) and `executor.ts` with `provider: "scro" | "ffmpeg"` and `output.type: "audio"` plus multi-video `videos` ports. `scro:*` nodes delegate to existing domain pipelines (`videos`, `jutsu_jobs`, `teleport_jobs`) with `skipBilling: true` so `canvas_jobs` owns single atomic USD Credit billing/refunds, while `ffmpeg:*` nodes enqueue `canvas_ffmpeg` tasks on the Vast.ai `workerTasks` `cpu` lane and poll to completion.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, React 19, `@xyflow/react`, MongoDB, Vercel Blob, Google AI Studio (`ai` SDK), OpenRouter, ElevenLabs, Vast.ai Worker + FFmpeg (`libx264` / `h264_nvenc`), Node built-in `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-20-scro-canvas-tools-design.md`

## Global Constraints

- **Testing Rule**: Never make live paid provider calls or hit live MongoDB/FFmpeg binaries without mocks/fakes in unit tests; inject `{ fetch: fakeFetch }` or mock runners (`npx tsx --test 'src/**/*.test.ts'`).
- **Lint & Typecheck**: `npx tsc --noEmit` and `npx eslint src/` must pass cleanly (never run bare `npm run lint` if `.worktrees/` exists).
- **Single-Billing**: `canvas_jobs` performs the sole `consumeCreditUsd` (skipped when `costUsd <= 0`) and atomic `refundCanvasJobOnce` on failure; underlying `videos`/`jutsu_jobs`/`teleport_jobs` created by Canvas must set `skipBilling: true`.
- **No Raw Data URLs in MongoDB**: All generated/processed media outputs must persist to Vercel Blob before marking `completed`.
- **Sync Contract**: Update `pipeline-models.md` whenever Canvas models, worker tasks, or pipeline routing change.
- **No Open Editor**: User-facing flows must never link into OpenCut (`VideoEditorWorkspace` / `folderVideoPath` edit routes); `/app/videos` and `/app/projects/[id]` preview and download only.

## Review Focus

1. **Double-charging or leaked charge when a Canvas-triggered `videos`/`jutsu_jobs`/`teleport_jobs` pipeline fails mid-flight** → covered by `skipBilling: true` and `pollCanvasJobs` failure refund tests in Tasks 2 & 4.
2. **Heterogeneous clips in `ffmpeg:concat` (mismatched resolution/FPS or missing audio stream on one clip)** → covered by stream-normalization filtergraph builder & unit test in Task 3.
3. **Submitting `scro:talking-head` with neither `startImage` nor `characterId`, or `scro:tts` with empty prompt** → covered by pre-charge `INVALID_INPUTS` validation tests in Tasks 1, 2 & 4.
4. **Vast.ai `canvas_ffmpeg` worker task failure or missing audio stream in `ffmpeg:extract-audio`** → covered by Task 3 & Task 4 error/polling tests.
5. **Canvas AI Assistant wiring `audio` output to `video` input or passing unknown `toolParams` / non-existent `characterId`** → covered by Task 6 validation tests.

---

### Task 1: Canvas Model Schema, Catalog (`scro:*` & `ffmpeg:*`), Ports & Pricing

**Files:**
- Modify: `src/model/canvas.ts`
- Modify: `src/service/canvas/model-catalog.ts`
- Modify: `src/service/canvas/graph.ts`
- Modify: `src/service/canvas/pricing.ts`
- Modify: `src/service/canvas/projects.ts`
- Test: `src/service/canvas/graph.test.ts`
- Test: `src/service/canvas/model-catalog.test.ts`
- Test: `src/service/canvas/pricing.test.ts`

**Interfaces:**
- Produces in `src/model/canvas.ts`:
  - `CanvasOutputKind = "image" | "video" | "audio"`
  - `CanvasJobDomainKind = "video" | "jutsu" | "teleport" | "worker_ffmpeg"`
  - `CanvasNodeData.toolParams?: Record<string, unknown>`
  - `CanvasJob.domainKind?: CanvasJobDomainKind`
- Produces in `src/service/canvas/model-catalog.ts`:
  - `CanvasModelProvider = "mentalok" | "openrouter" | "scro" | "ffmpeg"`
  - `CanvasModelCategory = "image" | "video" | "audio" | "scro-tool" | "ffmpeg" | "editing" | "segmentation" | "upscale"`
  - `SCRO_STATIC_MODELS` (`scro:talking-head`, `scro:explainer`, `scro:swap`, `scro:teleport`, `scro:life`, `scro:poster`, `scro:tts`)
  - `FFMPEG_STATIC_MODELS` (`ffmpeg:concat`, `ffmpeg:audio-mux`, `ffmpeg:trim-speed`, `ffmpeg:transform`, `ffmpeg:extract-audio`)
- Produces in `src/service/canvas/graph.ts`:
  - `ResolvedCanvasInputs.videos: string[]` (ordered by edge list, up to `maxConnections`)
- Produces in `src/service/canvas/projects.ts`:
  - `CanvasLibraryCharacterOption = { id: string; name: string; previewUrl?: string }`
  - `CanvasLibraryAssetsResult.characterOptions: CanvasLibraryCharacterOption[]`

- [ ] **Step 1: Write failing tests for new catalog specs, `videos` multi-port, `audio` output, and pricing**

Add assertions to `src/service/canvas/model-catalog.test.ts`, `src/service/canvas/graph.test.ts`, and `src/service/canvas/pricing.test.ts`:
- `findCanvasModel("scro:talking-head")` has `provider: "scro"`, `output.type: "video"`, `maxDurationSeconds: 120`.
- `findCanvasModel("scro:tts")` has `output.type: "audio"`.
- `findCanvasModel("ffmpeg:concat")` has `videos` input (`multiple: true`, `maxConnections: 8`, `required: true`).
- `findCanvasModel("ffmpeg:extract-audio")` has `output.type: "audio"`.
- `validateEdgeConnection` allows `scro:tts` (`audio`) → `ffmpeg:audio-mux` (`refAudio`) and rejects `scro:tts` (`audio`) → `ffmpeg:concat` (`videos`), and preserves edge order in `resolveNodeInputs` for `videos: [url1, url2]`.
- `estimateCanvasModelCostUsd`: `ffmpeg:*` returns `0`, `scro:tts` returns `0.02`, `scro:talking-head` at `90s` returns `16.2`, `scro:swap` (`6s`) returns `0.75`, `scro:teleport` (`6s`) returns `0.75`, `scro:life`/`scro:poster` return `0.15`, `scro:explainer` (`30s`) returns deterministic upfront estimate (`durationSeconds * 0.1 + clips * 0.15`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/canvas/model-catalog.test.ts src/service/canvas/graph.test.ts src/service/canvas/pricing.test.ts`
Expected: FAIL (missing `scro:*` / `ffmpeg:*` specs, missing `videos` port resolution, wrong pricing).

- [ ] **Step 3: Update `src/model/canvas.ts`, `src/service/canvas/model-catalog.ts`, `src/service/canvas/graph.ts`, `src/service/canvas/pricing.ts`, and `src/service/canvas/projects.ts`**

- In `src/model/canvas.ts`: expand `CanvasOutputKind` & `canvasOutputKindSchema` to include `"audio"`, `canvasModelProviderSchema` to include `"scro"` & `"ffmpeg"`, add `toolParams` (`z.record(z.string(), z.unknown()).optional()`) on `CanvasNodeData`, and add `domainKind?: CanvasJobDomainKind` on `CanvasJob`.
- In `src/service/canvas/model-catalog.ts`: add `audioOutput()`, `videosPort(maxConnections)`, `SCRO_STATIC_MODELS` (7 specs), and `FFMPEG_STATIC_MODELS` (5 specs), and include them in `STATIC_CANVAS_MODELS`. Ensure `scro:talking-head` has `prompt` optional (required only when `refAudio` is missing, enforced at runtime), optional `startImage`, optional `refAudio`; `scro:explainer` requires `prompt` + optional `refImages(4)`; `scro:swap` requires `video` + optional `refImages(6)` + optional `prompt`; `scro:teleport` requires `video` + optional `image` + optional `prompt`; `scro:life` has optional `prompt` + optional `refImages(2)`; `scro:poster` requires `prompt` + optional `refImages(4)`; `scro:tts` requires `prompt`.
- In `src/service/canvas/graph.ts`: add `videos: string[]` to `ResolvedCanvasInputs`, resolve multi-edge `videos` handle preserving order, and check `port.id === "videos" && inputs.videos.length > 0` for required validation.
- In `src/service/canvas/pricing.ts`: implement deterministic pricing for `scro` and `ffmpeg` providers (`ffmpeg` = `0`, `scro:tts` = `0.02`, `scro:life`/`scro:poster` = `IMAGE_COST_USD`, `scro:talking-head` = `talkingHeadVideoCostUsd(duration)` up to `120s`, `scro:swap` = `scroSwapCostUsd`, `scro:teleport` = `teleportCostUsd`, `scro:explainer` = upfront estimate based on `durationPreset` / `durationSeconds`).
- In `src/service/canvas/projects.ts`: populate `characterOptions` (using user's characters with `id`, `name`, `previewUrl`) and include `"audio"` items in `recentOutputs` (`mediaKind: "image" | "video" | "audio"`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/canvas/model-catalog.test.ts src/service/canvas/graph.test.ts src/service/canvas/pricing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/canvas.ts src/service/canvas/model-catalog.ts src/service/canvas/graph.ts src/service/canvas/pricing.ts src/service/canvas/projects.ts src/service/canvas/model-catalog.test.ts src/service/canvas/graph.test.ts src/service/canvas/pricing.test.ts
git commit -m "feat(canvas): add Scro tool & FFmpeg specs, audio output, and multi-video ports"
```

---

### Task 2: Domain `skipBilling`, Full Auto-Produce & Scro Canvas Dispatch Helpers

**Files:**
- Modify: `src/model/project.ts`
- Modify: `src/model/jutsu-job.ts`
- Modify: `src/model/teleport-job.ts`
- Modify: `src/service/clip/enqueue-scene-images.ts`
- Modify: `src/service/clip/auto-video.ts`
- Modify: `src/service/higgsfield/video-locks-pipeline.ts`
- Modify: `src/service/higgsfield/pipeline.ts` (if reel auto-concat on last clip completion checks `autoProduceAllClips`)
- Modify: `src/service/jutsu/pipeline.ts`
- Modify: `src/service/teleport/pipeline.ts`
- Create: `src/service/canvas/scro-dispatch.ts`
- Create: `src/service/canvas/scro-dispatch.test.ts`

**Interfaces:**
- Consumes: `CanvasNode`, `ResolvedCanvasInputs` (Task 1)
- Produces in `src/service/canvas/scro-dispatch.ts`:
  - `validateScroToolInputs(modelId: string, node: CanvasNode, inputs: ResolvedCanvasInputs): { ok: true } | { ok: false; missingRequiredFields: string[]; reason: string }`
  - `executeScroSyncNode(params: { clerkUserId: string; jobIdHex: string; modelId: string; node: CanvasNode; inputs: ResolvedCanvasInputs }, deps?): Promise<{ outputUrl: string; outputKind: "image" | "audio"; externalJobId?: string }>`
  - `submitScroAsyncNode(params: { clerkUserId: string; canvasIdHex: string; jobIdHex: string; modelId: string; node: CanvasNode; inputs: ResolvedCanvasInputs }, deps?): Promise<{ domainKind: "video" | "jutsu" | "teleport"; externalJobId: string }>`
  - `pollScroAsyncJob(params: { clerkUserId: string; domainKind: "video" | "jutsu" | "teleport"; externalJobId: string }, deps?): Promise<{ status: "running" } | { status: "completed"; outputUrl: string } | { status: "failed"; error: string }>`

- [ ] **Step 1: Inspect `src/service/higgsfield/video-locks-pipeline.ts`, `src/service/jutsu/pipeline.ts`, `src/service/teleport/pipeline.ts` billing call sites**

Read exact lines in those files where `consumeCreditUsd` / `refundCreditUsd` and `reel` auto-concat happen so `skipBilling` and `autoProduceAllClips` have zero gaps.

- [ ] **Step 2: Write failing tests in `src/service/canvas/scro-dispatch.test.ts`**

Test with mocked deps / mocked `fetch`:
1. `validateScroToolInputs`:
   - `scro:talking-head` without `startImage` AND without `toolParams.characterId` → `{ ok: false, missingRequiredFields: ["startImage"] }`.
   - `scro:talking-head` without `prompt` AND without `refAudio` → `{ ok: false, missingRequiredFields: ["prompt"] }`.
   - `scro:talking-head` with `refAudio` + `toolParams.characterId` (no `prompt`) → `{ ok: true }`.
   - `scro:life` without `toolParams.characterId` → `{ ok: false }`; with `characterId` + `prompt` (no `poseId`) → `{ ok: true }`.
2. `executeScroSyncNode`:
   - `scro:tts` synthesizes speech, applies FFmpeg `atempo` only when `ttsSpeed !== 1`, uploads `.mp3` to Blob, returns `outputKind: "audio"`.
   - `scro:life` & `scro:poster` submit `Seedream 5.0 Pro`, persist to Blob, return `outputKind: "image"`.
3. `skipBilling` & `autoProduceAllClips`:
   - When `project.skipBilling === true`, `enqueueSceneImagesForNewVideo` skips `consumeCreditUsd`, queues frames, and when `project.autoProduceAllClips === true`, adds ALL clips `1..N` to `autoVideoClips`.
   - `pollScroAsyncJob` maps `videos` (`reelStatus === "completed"` → `reelUrl`), `jutsu_jobs`, and `teleport_jobs` into unified `{ status, outputUrl | error }`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/scro-dispatch.test.ts`
Expected: FAIL (`scro-dispatch` module not found).

- [ ] **Step 4: Implement `skipBilling`, `autoProduceAllClips`, and `src/service/canvas/scro-dispatch.ts`**

- Add `skipBilling?: boolean` and `autoProduceAllClips?: boolean` to `Project` (`src/model/project.ts`), `skipBilling?: boolean` to `JutsuJob` (`src/model/jutsu-job.ts`) and `TeleportJob` (`src/model/teleport-job.ts`).
- Honor `skipBilling` in `enqueueSceneImagesForNewVideo`, `planAndStoreVideoLocks` / `enqueueVideoLockJobs`, `claimAndStartClipVideo`, `jutsu/pipeline.ts` (`createJutsuJobForCanvas` + refund skip when `job.skipBilling`), and `teleport/pipeline.ts` (`createTeleportJobForCanvas` + refund skip when `job.skipBilling`).
- Honor `autoProduceAllClips` in `enqueueSceneImagesForNewVideo` (add all `plan.frames` to `autoVideoClips`) and trigger reel concat automatically once all clips in an `autoProduceAllClips` project complete.
- Implement `src/service/canvas/scro-dispatch.ts` cleanly with dependency injection for unit testing.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx tsx --test src/service/canvas/scro-dispatch.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/model/project.ts src/model/jutsu-job.ts src/model/teleport-job.ts src/service/clip/enqueue-scene-images.ts src/service/clip/auto-video.ts src/service/higgsfield/video-locks-pipeline.ts src/service/higgsfield/pipeline.ts src/service/jutsu/pipeline.ts src/service/teleport/pipeline.ts src/service/canvas/scro-dispatch.ts src/service/canvas/scro-dispatch.test.ts
git commit -m "feat(canvas): add Scro tool dispatchers with skipBilling and full auto-produce"
```

---

### Task 3: Vast.ai Worker `canvas_ffmpeg` Task & FFmpeg Operations

**Files:**
- Modify: `src/model/worker-task.ts`
- Create: `src/service/canvas/ffmpeg-ops.ts`
- Modify: `src/service/worker/task-executor.ts`
- Create: `src/service/canvas/ffmpeg-ops.test.ts`

**Interfaces:**
- Consumes: `CanvasJob`, `resolveFfmpegBinary`, `buildVideoCodecArgs`, `trimClipSmoothSilence`, `applyJutsuColorGradeBuffer`, `persistBuffer`
- Produces in `src/model/worker-task.ts`:
  - Add `"canvas_ffmpeg"` to `WORKER_TASK_KINDS`.
- Produces in `src/service/canvas/ffmpeg-ops.ts`:
  - `buildCanvasFfmpegArgs(modelId: string, snapshot: Record<string, unknown>, localInputs: { videoFiles: string[]; audioFile?: string; hasAudioByVideo: boolean[] }, outputFile: string): string[]`
  - `executeCanvasFfmpegJob(jobId: ObjectId, deps?): Promise<{ outcome: "completed"; outputUrl: string } | { outcome: "failed"; error: string }>`

- [ ] **Step 1: Write failing tests in `src/service/canvas/ffmpeg-ops.test.ts`**

Test pure arg builders & mocked runner:
1. `buildCanvasFfmpegArgs("ffmpeg:concat", ...)` normalizes mixed resolutions / silent clips (generates `anullsrc` when one clip has `hasAudio: false`) and supports `cut`, `pad-200ms`, and `fade`.
2. `buildCanvasFfmpegArgs("ffmpeg:audio-mux", ...)` builds `replace` vs `mix-ducking` (`sidechaincompress` / `amix`) filter_complex args.
3. `buildCanvasFfmpegArgs("ffmpeg:trim-speed", ...)` builds trim `[startSec, endSec]` + `setpts` + `atempo` (skipping audio filter when `hasAudio: false`).
4. `buildCanvasFfmpegArgs("ffmpeg:transform", ...)` scales/crops or fit-pads to `9:16` (`1080x1920`), `16:9` (`1920x1080`), or `1:1` (`1080x1080`).
5. `executeCanvasFfmpegJob` rejects `ffmpeg:extract-audio` cleanly with a descriptive error when input video has no audio stream (`hasAudio: false`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/ffmpeg-ops.test.ts`
Expected: FAIL (`ffmpeg-ops` module not found).

- [ ] **Step 3: Implement `src/model/worker-task.ts`, `src/service/canvas/ffmpeg-ops.ts`, and wire `"canvas_ffmpeg"` into `src/service/worker/task-executor.ts`**

- Add `"canvas_ffmpeg"` to `WORKER_TASK_KINDS` (`src/model/worker-task.ts`).
- Implement `src/service/canvas/ffmpeg-ops.ts` using `runFfmpeg` / `ffmpegStderr` + `buildVideoCodecArgs` (`libx264` rewritten to `h264_nvenc` on GPU worker automatically), `applyJutsuColorGradeBuffer` when `ffmpegColorGrade === "h3-soft"`, `trimClipSmoothSilence` when `ffmpegTrimSilence === true`, and `persistBuffer` to upload `canvas/${clerkUserId}/${jobIdHex}.{mp4|mp3}` before updating `canvas_jobs` & `canvas_projects`.
- Wire `case "canvas_ffmpeg"` into `executeWorkerTask` (`src/service/worker/task-executor.ts`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/canvas/ffmpeg-ops.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/worker-task.ts src/service/canvas/ffmpeg-ops.ts src/service/worker/task-executor.ts src/service/canvas/ffmpeg-ops.test.ts
git commit -m "feat(worker): add canvas_ffmpeg Vast.ai worker task and FFmpeg arg builders"
```

---

### Task 4: Canvas Executor Integration (`scro:*`, `ffmpeg:*`, Zero-Cost Utility & Async Polling)

**Files:**
- Modify: `src/service/canvas/executor.ts`
- Modify: `src/service/canvas/executor.test.ts`

**Interfaces:**
- Consumes: `validateScroToolInputs`, `executeScroSyncNode`, `submitScroAsyncNode`, `pollScroAsyncJob` (Task 2), `enqueueWorkerTask` (`kind: "canvas_ffmpeg"`), `findWorkerTaskById`
- Produces: Extended `CanvasExecutorDeps` & `submitCanvasNodeJob` / `pollCanvasJobs` handling `provider: "scro"` and `provider: "ffmpeg"`.

- [ ] **Step 1: Write failing tests in `src/service/canvas/executor.test.ts`**

Add test cases:
1. `ffmpeg:concat` (`costUsd === 0`) does NOT call `consumeCreditUsd`, inserts `canvas_jobs` with `domainKind: "worker_ffmpeg"`, enqueues `workerTasks` (`kind: "canvas_ffmpeg"`, `lane: "cpu"`), and `pollCanvasJobs` updates node to `completed` with `outputUrl` once worker task completes (or `failed` without double-refunding on error).
2. `scro:tts` charges `$0.02`, completes synchronously with `outputKind: "audio"`, and sets `node.data.outputKind = "audio"`.
3. `scro:talking-head` without `startImage` or `characterId` returns `INVALID_INPUTS` before `consumeCreditUsd`.
4. `scro:explainer` / `scro:swap` / `scro:teleport` charge once via `canvas_jobs`, poll `pollScroAsyncJob`, persist/save `outputUrl`, and call `refundCanvasJobOnce` on underlying failure.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/executor.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `scro` & `ffmpeg` branches in `src/service/canvas/executor.ts`**

- Skip `consumeCreditUsd` when `costUsd <= 0` (set `spendEventKey: undefined`).
- Run `validateScroToolInputs` for `spec.provider === "scro"` before charging.
- Add Branch 4 (`spec.provider === "ffmpeg"`): enqueue `canvas_ffmpeg` worker task (`lane: "cpu"`), set `domainKind: "worker_ffmpeg"`, `status: "running"`.
- Add Branch 5 (`spec.provider === "scro"`): sync path for `scro:tts`, `scro:life`, `scro:poster`; async path for `scro:talking-head`, `scro:explainer`, `scro:swap`, `scro:teleport`.
- Update `pollCanvasJobs()` to poll `worker_ffmpeg` (checking `canvas_jobs` / `workerTasks`) and `domainKind: "video" | "jutsu" | "teleport"` via `pollScroAsyncJob`, settling or refunding atomically.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/canvas/executor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/executor.ts src/service/canvas/executor.test.ts
git commit -m "feat(canvas): integrate Scro tools and Vast worker FFmpeg into canvas executor"
```

---

### Task 5: Canvas Starter Templates & `?template=` Deep Linking

**Files:**
- Modify: `src/service/canvas/templates.ts`
- Modify: `src/service/canvas/templates.test.ts`
- Modify: `src/app/app/canvas/page.tsx`

**Interfaces:**
- Produces in `src/service/canvas/templates.ts`:
  - `CanvasStarterTemplateId = "talking-head" | "explainer" | "scro-swap" | "teleport" | "ffmpeg-reel" | "text-image-video"`
  - `isCanvasStarterTemplateId(raw?: string): raw is CanvasStarterTemplateId`

- [ ] **Step 1: Write failing tests in `src/service/canvas/templates.test.ts`**

Assert all 6 templates instantiate valid graphs where every `modelId` exists in `STATIC_CANVAS_MODELS`, every edge passes `validateEdgeConnection()`, and `computeExecutionWaves()` succeeds without cycles.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/templates.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement templates in `src/service/canvas/templates.ts` & `?template=` handling in `src/app/app/canvas/page.tsx`**

When `/app/canvas?template=<validId>` is loaded (and no `id` param), create a new Canvas project titled with the template name and initialized with `instantiateCanvasTemplate(templateId)` (then redirect or render that newly created project cleanly so refresh doesn't duplicate endlessly — e.g. `redirect('/app/canvas?id=' + created._id.toHexString())`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/canvas/templates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/templates.ts src/service/canvas/templates.test.ts src/app/app/canvas/page.tsx
git commit -m "feat(canvas): add Scro tool & FFmpeg starter templates with deep linking"
```

---

### Task 6: Canvas AI Assistant Upgrade (`src/service/canvas-agent/`)

**Files:**
- Modify: `src/service/canvas-agent/tools.ts`
- Modify: `src/service/canvas-agent/prompt.ts`
- Modify: `src/service/canvas-agent/agent.ts` (and callers passing character list if needed)
- Modify: `src/service/canvas-agent/tools.test.ts`

**Interfaces:**
- Produces:
  - `agentModels` includes `openrouter`, `scro`, and `ffmpeg` specs (`available !== false`).
  - `add_model_node` and `update_node` accept `toolParams?: Record<string, unknown>`.
  - `CanvasAgentWorkingGraph` accepts optional `characters?: CanvasLibraryCharacterOption[]` and `list_characters` tool (or `list_assets` returns `characters` list) so the AI assistant can bind `toolParams.characterId`.

- [ ] **Step 1: Read `src/service/canvas-agent/agent.ts` and `src/service/canvas-agent/tools.test.ts` to align exact signatures**

Read both files before editing.

- [ ] **Step 2: Write failing tests in `src/service/canvas-agent/tools.test.ts`**

Add tests:
1. `list_models` includes `scro:talking-head`, `scro:tts`, `scro:explainer`, `scro:swap`, `scro:teleport`, `ffmpeg:concat`, `ffmpeg:audio-mux`.
2. `add_model_node` accepts `toolParams` (`{ characterId: "char-1", language: "yue" }`) and `connect` wires `scro:tts` (`audio`) → `ffmpeg:audio-mux` (`refAudio`) and multiple videos → `ffmpeg:concat` (`videos`) without overwriting earlier `videos` edges.
3. Attempting to wire `scro:tts` (`audio`) to `ffmpeg:concat` (`videos`) returns `{ error }`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas-agent/tools.test.ts`
Expected: FAIL

- [ ] **Step 4: Update `src/service/canvas-agent/tools.ts`, `src/service/canvas-agent/prompt.ts`, and `src/service/canvas-agent/agent.ts`**

- Expose `scro` and `ffmpeg` models in `agentModels(g)`.
- Add `toolParams` support on `add_model_node` / `update_node` and `characters` discovery in `list_assets` / prompt context.
- Update `buildCanvasAgentSystemPrompt` with clear rules for Scro Tools, TTS, FFmpeg (`videos` multi-port, `audio` port), and default character binding.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx tsx --test src/service/canvas-agent/tools.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/service/canvas-agent/tools.ts src/service/canvas-agent/prompt.ts src/service/canvas-agent/agent.ts src/service/canvas-agent/tools.test.ts
git commit -m "feat(canvas-agent): support Scro tools, TTS, FFmpeg nodes, and audio/videos ports"
```

---

### Task 7: Canvas UI (`ModelNodeCard` Tool Controls, Audio Output & Sidebar Groups)

**Files:**
- Modify: `src/app/app/canvas/nodes/port-colors.ts`
- Modify: `src/app/app/canvas/nodes/model-node-card.tsx`
- Modify: `src/app/app/canvas/canvas-sidebar.tsx`
- Modify: `src/app/app/canvas/canvas-workspace.tsx`
- Modify: `src/app/app/canvas/canvas-lightbox.tsx`

- [ ] **Step 1: Read `src/app/app/canvas/nodes/port-colors.ts`, `src/app/app/canvas/canvas-lightbox.tsx`, and remaining lines of `model-node-card.tsx`**

Verify existing prop shapes and `CanvasNodeActionsContext` fields.

- [ ] **Step 2: Update `port-colors.ts`, `canvas-workspace.tsx`, `canvas-sidebar.tsx`, `canvas-lightbox.tsx`, and `model-node-card.tsx`**

- Add `"scro-tool"`, `"ffmpeg"`, `"audio"` to `CATEGORY_LABELS` in `port-colors.ts` and pass `characterOptions` via `CanvasNodeActionsContext`.
- In `canvas-sidebar.tsx`: display `scro`, `ffmpeg`, and `openrouter` models grouped/filterable (`All`, `Scro Tools`, `FFmpeg`, `Image`, `Video`, `Audio`), and support audio items in `AssetSection`.
- In `model-node-card.tsx`:
  - Render `<audio controls src={data.outputUrl} />` + download button when `outputKind === "audio"`.
  - Render compact tool-specific `toolParams` editors for `scro:*` (character dropdown, language selector, director slug, swap mode + object inputs) and `ffmpeg:*` (transition, mix mode, gain/speed sliders, crop mode, color grade).
  - Show connection count (`2/8`) on multi-input ports (`videos`, `refImages`).
  - Handle `scro:talking-head` `canRun` rule (`(isPromptWired || prompt) || isRefAudioWired`, AND `(isStartImageWired || toolParams?.characterId)`).
- In `canvas-lightbox.tsx`: support `kind: "audio"` playback cleanly.

- [ ] **Step 3: Run typecheck & ESLint**

Run: `npx tsc --noEmit && npx eslint src/app/app/canvas/`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/canvas/nodes/port-colors.ts src/app/app/canvas/nodes/model-node-card.tsx src/app/app/canvas/canvas-sidebar.tsx src/app/app/canvas/canvas-workspace.tsx src/app/app/canvas/canvas-lightbox.tsx
git commit -m "feat(canvas-ui): add Scro tool controls, FFmpeg controls, and audio playback"
```

---

### Task 8: Left Menu Cleanup, Legacy Redirects, Open Editor Retirement & Docs Sync

**Files:**
- Modify: `src/presentation/components/app-shell.tsx`
- Modify: `src/presentation/components/app/home-view.tsx`
- Create: `src/presentation/components/app/videos/video-preview-modal.tsx`
- Modify: `src/presentation/components/app/videos/video-list-row.tsx`
- Modify: `src/presentation/components/app/projects/[id]/video-grid-card.tsx`
- Modify: `src/app/app/talking-heads/page.tsx`
- Modify: `src/app/app/explainers/page.tsx`
- Modify: `src/app/app/scroswap/page.tsx`
- Modify: `src/app/app/teleport/page.tsx`
- Modify: `src/app/app/life/page.tsx`
- Modify: `src/app/app/posts/page.tsx`
- Modify: `src/app/app/stories/page.tsx`
- Modify: `src/app/app/simple/page.tsx`
- Modify: `src/app/app/jutsu/page.tsx`
- Modify: `src/app/app/videos/new/page.tsx`
- Modify: `src/app/app/projects/[id]/videos/new/page.tsx`
- Modify: `src/app/app/videos/[videoId]/page.tsx`
- Modify: `src/app/app/projects/[id]/videos/[videoId]/page.tsx`
- Modify: `pipeline-models.md`
- Modify: `AGENTS.md` (if needed to reflect Vast.ai `canvas_ffmpeg` / Canvas tools)

- [ ] **Step 1: Update `src/presentation/components/app-shell.tsx`**

Remove the 6 standalone tool items (`/app/talking-heads`, `/app/explainers`, `/app/scroswap`, `/app/teleport`, `/app/life`, `/app/posts`) from `items`. Keep Home, Canvas, Characters, Room, Wardrobe, Products, Video, Tasks, API & MCP.

- [ ] **Step 2: Create `video-preview-modal.tsx` & replace Open Editor links in `video-list-row.tsx`, `video-grid-card.tsx`, and `home-view.tsx`**

- Clicking any completed or in-progress video in `/app/videos`, `/app/projects/[id]`, or `/app` Home opens `VideoPreviewModal` (inline `<video controls>` player, clip preview strip/downloads when multi-clip, Download MP4 button, status/error details) instead of navigating to `/app/videos/[videoId]` or `/app/projects/[id]/videos/[videoId]`.
- Update `HomeView` `toolShortcuts` and Hot Topics CTAs to navigate to `/app/canvas?template=...`.

- [ ] **Step 3: Redirect all legacy standalone & Open Editor routes**

- `/app/talking-heads` → `redirect("/app/canvas?template=talking-head")`
- `/app/explainers` → `redirect("/app/canvas?template=explainer")`
- `/app/scroswap` → `redirect("/app/canvas?template=scro-swap")`
- `/app/teleport` → `redirect("/app/canvas?template=teleport")`
- `/app/life`, `/app/posts`, `/app/stories`, `/app/simple`, `/app/jutsu`, `/app/videos/new`, `/app/projects/[id]/videos/new` → `redirect("/app/canvas")`
- `/app/videos/[videoId]`, `/app/projects/[id]/videos/[videoId]` → `redirect("/app/videos")`

- [ ] **Step 4: Sync `pipeline-models.md` & `AGENTS.md` and run full verification suite**

Run:
- `npx tsc --noEmit`
- `npx eslint src/`
- `npx tsx --test 'src/**/*.test.ts'`

Expected: All typechecks, lint checks, and unit tests pass with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/app-shell.tsx src/presentation/components/app/home-view.tsx src/presentation/components/app/videos/ src/presentation/components/app/projects/[id]/video-grid-card.tsx src/app/app/ pipeline-models.md AGENTS.md
git commit -m "feat(nav): consolidate creation into Canvas, clean left menu, and retire Open Editor"
```

---

## Self-Review Check (Completed)
- **Spec Coverage**: Every requirement from `docs/superpowers/specs/2026-11-20-scro-canvas-tools-design.md` (Sections 3–7: catalog/ports, 7 Scro tools + 5 FFmpeg nodes, `skipBilling` + single-billing, `canvas_ffmpeg` Vast.ai worker, Canvas AI assistant, UI & templates, 6 menu removals, legacy redirects, Open Editor retirement, `/app/videos` preview+download) maps directly to Tasks 1–8.
- **Type Consistency**: `CanvasOutputKind`, `ResolvedCanvasInputs.videos`, `domainKind`, `toolParams`, `skipBilling`, `autoProduceAllClips`, and `"canvas_ffmpeg"` match identically across Tasks 1–8.
- **Review Focus Coverage**: All 5 failure modes have explicit unit tests assigned in Tasks 1–6.
