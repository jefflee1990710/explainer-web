# Scro Canvas Tools, FFmpeg Nodes & Navigation Consolidation Design

**Date:** 2026-11-20  
**Status:** Updated After Builder Check (Pending Final User Approval)  
**Scope:** Project-wide update consolidating creation/remix tools into `/app/canvas`, adding Vast.ai Worker FFmpeg & TTS nodes, upgrading the Canvas AI Assistant, removing standalone tool items from the left navigation rail, and retiring Open Editor (OpenCut) from the user flow.

---

## 1. Intent & Why

Scro currently splits creation and editing across standalone pages (`/app/talking-heads`, `/app/explainers`, `/app/scroswap`, `/app/teleport`, `/app/life`, `/app/posts`, `/app/stories`, `/app/simple`) plus the heavy OpenCut timeline workspace ("Open Editor" at `/app/projects/[id]/videos/[videoId]` and `/app/videos/[videoId]`), alongside the newer Interactive Node Canvas (`/app/canvas`).

This design consolidates Scro into a **Canvas-first studio**:
- Users create, remix, voice, and assemble media inside `/app/canvas` by wiring **Media**, **Prompt**, **Base OpenRouter Models**, **Scro Tool Nodes** (Talking Head, Explainer, Scro Swap, Teleport, Life Photo, Poster), **ElevenLabs TTS**, and **FFmpeg** nodes together.
- The Canvas AI Assistant (`src/service/canvas-agent/`) understands all new Scro tools, TTS, and FFmpeg nodes so users can build complete workflows via natural language chat.
- The left navigation rail drops all 6 standalone tool pages, and all legacy creation routes & Home shortcuts point directly into `/app/canvas`.
- The OpenCut timeline editor ("Open Editor") is retired from the user flow; `/app/videos` (and `/app/projects/[id]`) becomes purely a generation history, preview, and download gallery.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. **Approach 1 (Tool-Level Nodes + TTS + FFmpeg)**: Package Scro's production pipelines (`Talking Head`, `Explainer`, `Scro Swap`, `Teleport`, `Life Photo`, `Poster`) plus `ElevenLabs TTS` and `FFmpeg` utilities as executable Canvas nodes reusing existing backend services (`src/service/jutsu/`, `src/service/teleport/`, `src/service/director/`, `src/service/higgsfield/`, `src/service/voice/`, `src/service/character/life.ts`, `src/service/post/`, `src/service/reel/concat.ts`, `src/service/ffmpeg/`).
2. **Audio Output & Multi-Video Ports**: Expand Canvas typed ports so nodes can output `"audio"` (in addition to `"image" | "video"`) and accept multi-video arrays (`videos`, up to 8 inputs) for FFmpeg concatenation.
3. **Vast.ai Worker FFmpeg Execution**: Implement FFmpeg nodes (`Concat`, `Audio Mux`, `Trim & Speed`, `Transform / Crop`, `Extract Audio`) as async `canvas_ffmpeg` jobs in `workerTasks` (`cpu` lane on Vast.ai Worker, supporting GPU `h264_nvenc` / system `ffmpeg`), persisting outputs to Vercel Blob and polled via `pollCanvasJobs`.
4. **Canvas AI Assistant Upgrade**: Extend `src/service/canvas-agent/` (`tools.ts` + `prompt.ts`) so the chat dock below `/app/canvas` can add/wire `scro:*` and `ffmpeg:*` nodes, `audio` ports, `videos` multi-ports, and `toolParams`.
5. **Canvas Starter Templates & Deep Links**: Add one-click Canvas templates for Talking Head, Explainer, Scro Swap, Teleport, and Multi-Clip FFmpeg assembly, plus `/app/canvas?template=<id>` URL initialization.
6. **Left Menu & Open Editor Retirement**: Remove the 6 standalone tool links from `AppShell`, redirect all legacy creation routes (`/app/talking-heads`, `/app/explainers`, `/app/scroswap`, `/app/teleport`, `/app/life`, `/app/posts`, `/app/stories`, `/app/simple`, `/app/jutsu`, `/app/videos/new`, `/app/projects/[id]/videos/new`) to `/app/canvas`, update Home shortcuts & Hot Topics to launch `/app/canvas?template=...`, and replace all Open Editor links on `/app/videos`, `/app/projects/[id]`, and `/app` Home with an inline video preview + download modal.

### Non-Goals
- **No deletion of existing domain MongoDB collections or API/MCP backends**: `videos`, `jutsu_jobs`, `teleport_jobs`, `life_shots`, `posts`, `/api/v1/*`, `/api/mcp`, `/api/cron/*` remain intact so historical records in `/app/videos`, ongoing jobs, and API/MCP consumers continue working.
- **No deletion of `src/opencut/` files in this change**: Only user-facing navigation and links to OpenCut / Open Editor are removed/replaced.
- **No browser-side `@ffmpeg/ffmpeg` WASM execution**: All FFmpeg nodes run on the Vast.ai worker via `workerTasks`.

### Anti-Goals
- Do NOT split Scro Swap, Teleport, or Explainer into 8–12 fragile low-level micro-nodes that break SAM 3 RLE mapping, OpenJutsu workflows, or Gemini multi-clip storyboard logic.
- Do NOT double-charge USD Credit when a Canvas node invokes an underlying domain pipeline (`videos`, `jutsu_jobs`, `teleport_jobs`, `life_shots`, `posts`).
- Do NOT leave broken links or routes pointing to Open Editor or removed tool pages.

---

## 3. Canvas Data Model & Port Extensions

### 3.1 `src/model/canvas.ts` & `src/service/canvas/model-catalog.ts`
Extend the unified `CanvasNodeType = "model"` catalog and executor so `computeExecutionWaves()`, `validateEdgeConnection()`, `applyCompletedJobOutputs()`, auto-save, and `canvas_jobs` billing/refunds work uniformly:

- **`CanvasOutputKind` & `CanvasModelOutputSpec.type`**:
  - Expand from `"image" | "video"` to `"image" | "video" | "audio"`.
- **`CanvasModelProvider`**:
  - Expand from `"mentalok" | "openrouter"` to `"mentalok" | "openrouter" | "scro" | "ffmpeg"`.
- **`CanvasModelCategory`**:
  - Expand to `"image" | "video" | "audio" | "scro-tool" | "ffmpeg" | "editing" | "segmentation" | "upscale"`.
- **`CanvasNodeData.toolParams`** (`Record<string, unknown>`, validated per node ID on the server):
  - `characterId?: string`, `characterVersionId?: string`
  - `language?: "yue" | "en" | "zh"`
  - `skillSlug?: "cartoon-explainer-video-director" | "paper-cutout-explainer-video-director" | "papercraft-diorama-director"`
  - `durationPreset?: "15s" | "30s" | "45s" | "60s"`
  - `framing?: "collarbone-close" | "waist-up" | "handheld-selfie" | "full-body"`
  - `swapMode?: "character" | "object" | "relight" | "colorfix"`, `lightLookId?: string`, `objectTarget?: string`, `objectEditMode?: "change" | "add" | "remove"`
  - `poseId?: string`, `productId?: string`, `styleId?: string`
  - `ttsVoiceId?: string`, `ttsSpeed?: number`
  - `ffmpegTransition?: "cut" | "pad-200ms" | "fade"`
  - `ffmpegMixMode?: "replace" | "mix-ducking"`, `ffmpegAudioGainDb?: number`
  - `ffmpegStartSec?: number`, `ffmpegEndSec?: number`, `ffmpegSpeed?: number`, `ffmpegTrimSilence?: boolean`
  - `ffmpegCropMode?: "fit-pad" | "center-crop"`, `ffmpegColorGrade?: "none" | "h3-soft"`
- **New Port Helpers in `model-catalog.ts` & `graph.ts`**:
  - `videosPort(maxConnections = 8)`: `{ id: "videos", type: "video", required: true, multiple: true, maxConnections }` → resolves into `ResolvedCanvasInputs.videos: string[]` preserving edge order.
  - Keep existing `prompt`, `image`, `startImage`, `endImage`, `refImages`, `video`, `refAudio`.
- **Canvas Job Tracking (`CanvasJob` in `src/model/canvas.ts`)**:
  - Add optional `domainKind?: "video" | "jutsu" | "teleport" | "worker_ffmpeg"` so `pollCanvasJobs()` knows which collection/status source (`videos`, `jutsu_jobs`, `teleport_jobs`, `workerTasks`) to inspect when polling async `scro:*` and `ffmpeg:*` jobs.

### 3.2 Canvas Left Sidebar Organization (`src/app/app/canvas/canvas-sidebar.tsx`)
In the `Models & Tools` tab (Mentalok legacy specs remain hidden):
1. **Scro 工具 (Scro Tools)** (`provider === "scro"`):
   - `scro:talking-head` — **口播 Talking Head**
   - `scro:explainer` — **AI 解說 Explainer**
   - `scro:swap` — **角色換角 Scro Swap**
   - `scro:teleport` — **實景換場 Teleport**
   - `scro:life` — **生活照 Life Photo**
   - `scro:poster` — **海報貼文 Poster**
   - `scro:tts` — **AI 配音 ElevenLabs TTS** (outputs `audio`)
2. **剪輯處理 (FFmpeg)** (`provider === "ffmpeg"`):
   - `ffmpeg:concat` — **FFmpeg 合併串接 (Concat)** (`videos[1..8]` → `video`)
   - `ffmpeg:audio-mux` — **FFmpeg 音畫合成 (Audio Mux)** (`video` + `refAudio` → `video`)
   - `ffmpeg:trim-speed` — **FFmpeg 裁剪變速 (Trim & Speed)** (`video` → `video`)
   - `ffmpeg:transform` — **FFmpeg 比例／調色 (Transform)** (`video` → `video`)
   - `ffmpeg:extract-audio` — **FFmpeg 抽離音訊 (Extract Audio)** (`video` → `audio`)
3. **基礎模型 (Base Models)** (`provider === "openrouter"`):
   - Existing 10 OpenRouter image & video models.

---

## 4. Specification of Each New Canvas Node & Settled Calls

### 4.1 Scro Tool Nodes (`provider: "scro"`)

1. **Single-Billing Guarantee (`skipBilling` — Our Call & Confirmed Architecture)**:
   - `canvas_jobs` performs the **single authoritative `consumeCreditUsd`** upfront (and owns `refundCanvasJobOnce` on failure).
   - Underlying `videos`, `jutsu_jobs`, and `teleport_jobs` docs created from Canvas MUST set `skipBilling: true` (a new internal flag honored by `enqueueSceneImagesForNewVideo`, `planAndStoreVideoLocks`, `claimAndStartClipVideo`, `createJutsuJob`, and `createTeleportJob`) so domain pipelines never double-charge or double-refund.
   - **[Our Call — Upfront Estimate Billing]**: Because `scro:explainer` clip/frame count and `scro:talking-head` script duration are not exact before generation, `estimateCanvasModelCostUsd()` computes an authoritative upfront estimate (for `scro:explainer`: `estimatedClips × $0.15 + targetSeconds × $0.10/s`; for `scro:talking-head`: `refAudio` duration via probe or script character-rate estimate, clamped `5..120s × $0.18/s`), charges it once, and issues a full refund via `refundCanvasJobOnce` only if the entire job fails (no post-hoc delta surcharge that could fail on low balance).
2. **`/app/videos` Sync Rule (Confirmed)**:
   - `scro:talking-head` (both script-only and `refAudio`-wired), `scro:explainer`, `scro:swap`, and `scro:teleport` all create/update their corresponding `videos` / `jutsu_jobs` / `teleport_jobs` document, so **all 4 core video tools automatically appear in `/app/videos` for history & download**.
   - `ffmpeg:*` outputs and raw OpenRouter model outputs stay inside Canvas (`canvas_jobs` + `recentOutputs` asset library).

| Node ID | Inputs & `toolParams` | Output | Pricing | Execution Behavior |
|---|---|---|---|---|
| `scro:talking-head` | • `prompt` (script, required unless `refAudio` wired)<br>• `startImage` (optional)<br>• `refAudio` (optional)<br>• Params: `characterId`, `language`, `framing`, `aspectRatio`<br>• **[Our Call — Validation]**: Submit-time check requires `startImage` port OR `toolParams.characterId` (rejects with `INVALID_INPUTS` before charging).<br>• **[Our Call — Max Duration]**: Supports up to `120s` (matching `talking-head-director`). | `video` | `$0.18/s` (`5..120s`) | **Async (`domainKind: "video"`)**: Creates a `videos` doc (`director: "talking-head-director"`, `skipBilling: true`). When `refAudio` is wired (e.g. from `scro:tts` or uploaded audio), attaches it as `uploadedVoUrl` (skipping TTS) and uses `startImage` or `characterId` blueprint → `heygen/avatar-iv` → `trimClipSmoothSilence` → `gradeTalkingHeadSensorTextureBuffer` → `reelUrl`. When script-only, runs standard `talking-head-director` auto-production. |
| `scro:explainer` | • `prompt` (topic/copy, required)<br>• `refImages` (optional 0–4)<br>• Params: `skillSlug`, `characterId`, `language`, `aspectRatio`, `durationPreset` (`15s`/`30s`/`45s`/`60s`) | `video` | Upfront estimate (`clips × $0.15 + sec × $0.10/s`) | **Async (`domainKind: "video"`)**: Creates a `videos` doc (`skipBilling: true`). **[Our Call — Full Auto-Produce]**: Sets `autoProduceAllClips: true` so `enqueueSceneImagesForNewVideo` queues ALL clips (`1..N`) into `autoVideoClips` and automatically runs `concatMp4Urls` reel assembly upon completion of all clips. `pollCanvasJobs` finishes with `reelUrl`. |
| `scro:swap` | • `video` (required)<br>• `refImages` (optional 1–6)<br>• `prompt` (optional)<br>• Params: `swapMode` (`character`/`object`/`relight`/`colorfix`), `characterId`, `lightLookId`, `objectTarget`, `objectEditMode` (`change`/`add`/`remove`), `durationSeconds`<br>• **[Our Call — Object Mapping]**: In `object` mode, `prompt` maps to `objectChangeTo` alongside `objectTarget` & `objectEditMode`. | `video` | `$0.15 + $0.10/s` (`scroSwapCostUsd`) | **Async (`domainKind: "jutsu"`)**: Creates a `jutsu_jobs` doc (`skipBilling: true`) via internal helper in `src/service/jutsu/pipeline.ts` and kicks off/enqueues swap execution. `pollCanvasJobs` polls `pollJutsuJobStatus` until `outputUrl` or `failed`. |
| `scro:teleport` | • `video` (required)<br>• `image` (optional scene plate)<br>• `prompt` (optional scene/mood)<br>• Params: `aspectRatio`, `durationSeconds` | `video` | `$0.15 + $0.10/s` (`teleportCostUsd`) | **Async (`domainKind: "teleport"`)**: Creates a `teleport_jobs` doc (`skipBilling: true`) via internal helper in `src/service/teleport/pipeline.ts`. `pollCanvasJobs` polls `pollTeleportJobStatus`. |
| `scro:life` | • `prompt` (optional scene/remark)<br>• `refImages` (optional)<br>• Params: `characterId` (required), `poseId`, `aspectRatio`<br>• **[Our Call — Prompt Fallback]**: Allows `prompt` + `characterId` without requiring `poseId`, building a natural lifestyle prompt via character persona when `poseId` is omitted. | `image` | `$0.15` (`IMAGE_COST_USD`) | **Sync**: Generates 2K image via `Seedream 5.0 Pro` (`submitOpenRouterImage`) + `persistMedia` to Blob. |
| `scro:poster` | • `prompt` (required)<br>• `refImages` (optional)<br>• Params: `characterId`, `productId`, `styleId`, `aspectRatio` | `image` | `$0.15` (`IMAGE_COST_USD`) | **Sync**: Reuses `buildPostCreatePrompt` + `Seedream 5.0 Pro` + `persistMedia` to Blob. |
| `scro:tts` | • `prompt` (spoken text, required)<br>• Params: `characterId`, `voicePreset`, `language` (`yue`/`zh`/`en`), `ttsSpeed` (`0.8`–`1.5`) | `audio` | **[Our Call]**: `$0.02` flat per synthesis | **Sync**: Calls `synthesizeElevenLabsSpeech` (`eleven_v4`), applies FFmpeg `atempo` if `ttsSpeed !== 1.0`, uploads `.mp3` to Blob via `persistBuffer`. |

### 4.2 FFmpeg Nodes (`provider: "ffmpeg"`, Vast.ai Worker)

All FFmpeg nodes execute asynchronously on the **Vast.ai Worker** via `workerTasks` (`cpu` lane, `WORKER_DEFAULT_LEASE_MS`, leveraging system `ffmpeg` / `h264_nvenc` when `FFMPEG_VIDEO_ENCODER=nvenc`):
- **Cost**: `$0.00` USD Credit (`executor.ts` skips `consumeCreditUsd` when `costUsd <= 0`).
- **Dispatch & Polling**:
  - `submitCanvasNodeJob` creates the `canvas_jobs` record (`status: "queued"`, `domainKind: "worker_ffmpeg"`, `inputSnapshot` with all resolved URLs & FFmpeg params), enqueues a `workerTasks` doc with `kind: "canvas_ffmpeg"`, `lane: "cpu"`, `targetId: jobIdHex`, and stores `externalJobId: workerTaskId.toHexString()`.
  - `worker/` claims `"canvas_ffmpeg"` in `src/service/worker/task-executor.ts`, runs `executeCanvasFfmpegTask(canvasJob)`, uploads output to Vercel Blob (`canvas/${clerkUserId}/${jobIdHex}.{mp4|mp3}`), and returns `{ outcome: "completed" }` (or `"failed"`).
  - `pollCanvasJobs()` reads the `canvas_jobs` / `workerTasks` status and updates `canvas_projects.nodes` once completed!

| Node ID | Input Ports | Parameters (`toolParams`) | Output | Behavior |
|---|---|---|---|---|
| `ffmpeg:concat` | `videos` (`video`, `1..8`, required) | `ffmpegTransition`: `"cut"` \| `"pad-200ms"` \| `"fade"` | `video` | Downloads clips in parallel, normalizes streams if resolution/fps/audio presence differ, concatenates (with optional 200ms hold or `xfade`), uploads `.mp4`. |
| `ffmpeg:audio-mux` | `video` (required) + `refAudio` (required) | `ffmpegMixMode`: `"replace"` \| `"mix-ducking"`, `ffmpegAudioGainDb` (`-24`..`+6`) | `video` | `"replace"` swaps video audio track with `refAudio`; `"mix-ducking"` blends original audio with `refAudio` using FFmpeg `amix` + `sidechaincompress` ducking. |
| `ffmpeg:trim-speed` | `video` (required) | `ffmpegStartSec`, `ffmpegEndSec`, `ffmpegSpeed` (`0.5`–`2.0`), `ffmpegTrimSilence` (`boolean`) | `video` | Trims `[startSec, endSec]`, optionally runs `trimClipSmoothSilence`, applies `setpts` + `atempo` (handling videos with or without audio stream safely). |
| `ffmpeg:transform` | `video` (required) | `aspectRatio` (`9:16` / `16:9` / `1:1`), `ffmpegCropMode` (`"fit-pad"` \| `"center-crop"`), `ffmpegColorGrade` (`"none"` \| `"h3-soft"`) | `video` | Scales/crops or letterboxes to target resolution (`1080x1920`, `1920x1080`, `1080x1080`), optionally applies H3 Soft color grade. |
| `ffmpeg:extract-audio` | `video` (required) | (none) | `audio` | Extracts audio track (`-vn -acodec libmp3lame -b:a 192k`) into `.mp3`. Fails clearly if source video has no audio stream. |

---

## 5. Canvas AI Assistant Upgrade (`src/service/canvas-agent/`)

Upgrade the Canvas AI Assistant (chat dock below `/app/canvas`) so it can plan and wire all new nodes:
- **Catalog Exposure (`src/service/canvas-agent/tools.ts`)**:
  - Lift the `spec.provider === "openrouter"` filter so `scro:*` and `ffmpeg:*` specs are also discoverable and insertable by `add_model_node` / `update_model_node`.
  - Extend `add_model_node` and `update_model_node` Zod input schemas with optional `toolParams` (`Record<string, unknown>`) and support `videos` target handle in `connect_nodes` (preserving multi-edge ordering).
- **System Prompt & Context (`src/service/canvas-agent/prompt.ts`)**:
  - Document the Scro Tool nodes (`scro:talking-head`, `scro:explainer`, `scro:swap`, `scro:teleport`, `scro:life`, `scro:poster`, `scro:tts`), FFmpeg nodes (`ffmpeg:concat`, `ffmpeg:audio-mux`, `ffmpeg:trim-speed`, `ffmpeg:transform`, `ffmpeg:extract-audio`), `"audio"` output port type, and `"videos"` multi-input port.
  - Provide user's available Characters (`id`, `name`) in agent context so the AI Assistant can pre-fill `toolParams.characterId` when asked ("用我個角色 Alan 整一條口播片").

---

## 6. Canvas UI & Template Updates

1. **`ModelNodeCard` (`src/app/app/canvas/nodes/model-node-card.tsx`)**:
   - Render `<audio controls src={data.outputUrl} />` + download button when `outputKind === "audio"`.
   - Render compact tool parameter controls when `spec.provider === "scro"` or `"ffmpeg"` (Character picker hydrated from Canvas characters, Language pills, Explainer director selector, Swap mode + object target inputs, FFmpeg transition/mix/speed/aspect controls).
   - Display connected handle count (`2/8`) on multi-input ports (`videos`, `refImages`).
2. **Canvas Sidebar (`src/app/app/canvas/canvas-sidebar.tsx`)**:
   - Display `Scro Tools`, `FFmpeg`, and `Base Models` (`openrouter`) with updated category filter pills (`All`, `Scro Tools`, `FFmpeg`, `Image`, `Video`, `Audio`).
   - Support audio outputs in `recentOutputs` and pass character list (`id`, `name`, `previewUrl`) into `CanvasNodeActionsContext` for `ModelNodeCard` pickers.
3. **Canvas Templates (`src/service/canvas/templates.ts` + `/app/canvas?template=...`)**:
   - Provide starter templates:
     - `talking-head`: `Prompt` → `scro:tts` → `scro:talking-head`
     - `explainer`: `Prompt` → `scro:explainer`
     - `scro-swap`: `Media (video)` → `scro:swap`
     - `teleport`: `Media (video)` + `Prompt` → `scro:teleport`
     - `ffmpeg-reel`: `2× Media (video)` → `ffmpeg:concat` + `scro:tts` → `ffmpeg:audio-mux`
     - `text-image-video`: `Prompt` → `Seedream 5.0 Pro` → `Wan 3.0`
   - Support `/app/canvas?template=<id>`: when `template` query param is present and valid, create a fresh canvas initialized with that template (avoiding overwriting existing canvases).

---

## 7. Left Menu, Home, Legacy Routes & Open Editor Retirement

1. **Left Navigation Rail (`src/presentation/components/app-shell.tsx`)**:
   - Remove all 6 standalone tool entries: `/app/talking-heads`, `/app/explainers`, `/app/scroswap`, `/app/teleport`, `/app/life`, `/app/posts`.
   - Keep: `Home` (`/app`), `Canvas` (`/app/canvas`), `Characters`, `Room`, `Wardrobe`, `Products`, `Video` (`/app/videos`), `Tasks`, `API & MCP`.
2. **Home Dashboard (`src/presentation/components/app/home-view.tsx`)**:
   - Point `toolShortcuts` cards and **Hot Topics** CTAs (`talking-head`, `explainer`, `story`, etc.) to `/app/canvas?template=...`.
   - Replace `VideoGridCard` editor navigation on `Recent Videos` with an inline Video Preview & Download modal.
3. **`/app/videos` & `/app/projects/[id]` History/Download Galleries**:
   - Remove `directEditorHref` (`folderVideoPath(...)`) links from `VideoListRow` (`src/presentation/components/app/videos/video-list-row.tsx`) and `VideoGridCard` (`src/presentation/components/app/projects/[id]/video-grid-card.tsx`).
   - Clicking any completed video card/row opens an inline **Video Preview & Download Modal** (video playback, clip list download if multi-clip, Download MP4, Copy Link, Status/Error, Mark Posted, Archive, Delete).
4. **Legacy Routes Redirect**:
   - Redirect `/app/talking-heads` → `/app/canvas?template=talking-head`
   - Redirect `/app/explainers` → `/app/canvas?template=explainer`
   - Redirect `/app/scroswap` → `/app/canvas?template=scro-swap`
   - Redirect `/app/teleport` → `/app/canvas?template=teleport`
   - Redirect `/app/life`, `/app/posts`, `/app/stories`, `/app/simple`, `/app/jutsu`, `/app/videos/new`, `/app/projects/[id]/videos/new` → `/app/canvas`
   - Redirect `/app/videos/[videoId]` and `/app/projects/[id]/videos/[videoId]` → `/app/videos` (preventing entry into OpenCut / Open Editor).

---

## 8. What's Left to the Builder

- Exact Zod validation schemas for `toolParams` and `canvas_agent` tool inputs.
- Exact UI layout and Tailwind styling inside `ModelNodeCard` and the `/app/videos` preview modal.
- Updating `pipeline-models.md` and `AGENTS.md` to reflect the new Canvas tools, Vast.ai worker `canvas_ffmpeg` task, and retired Open Editor flow.
- Comprehensive unit tests (`node:test` + `tsx`) with mocked providers, mocked `workerTasks`, and mocked FFmpeg (`no live paid calls`).
