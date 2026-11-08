# Vast.ai Unified Worker & Task Queue Design

Date: 2026-11-08

## 1. Intent & Goals

Move all background task execution out of Vercel (`after()` callbacks and long-running Vercel cron executions) into a scalable **Vast.ai GPU Worker** program located in `worker/`.

### Goals
1. **Single Unified Queue (`workerTasks` MongoDB Collection)**:
   - Every background task across `explainer-web` (generation jobs, Scro Swap, Teleport, Extend Video, Storyboard Phase A / Still / Clip generation, Reel FFmpeg assembly, OpenCut final video export, Character Life photo generation, Director preview generation) is enqueued into `workerTasks`.
   - Each task specifies `lane: "gpu" | "cpu"`, `kind`, `targetId`, `payload`, progress tracking (`progress`, `stage`), and atomic lease/heartbeat fields (`status`, `workerId`, `lockedUntil`, `heartbeatAt`, `attempts`).
2. **Two-Lane Concurrent Execution on Each Worker**:
   - **GPU Lane (`concurrency = 1` per GPU)**: Executes local ComfyUI (`127.0.0.1:8188`) heavy video diffusion workflows (`jutsu_swap`, `teleport`, `extend`, and ComfyUI-routed `generation_job` video clips) sequentially so VRAM never OOMs.
   - **CPU / Cloud-API Lane (`concurrency = N`, default 6)**: Concurrently executes cloud AI API calls (Gemini storyboard, OpenRouter Seedream 5.0 Pro images, HeyGen Avatar IV, ElevenLabs TTS) and FFmpeg media tasks (`reel_concat`, `final_render`, voice muxing, color grading).
3. **Self-Contained `worker/` Directory (`Option A`)**:
   - Located in `worker/` inside this repository, sharing `@/service/*`, `@/dao/*`, and `@/model/*` directly via TypeScript (`tsx`).
   - Houses all Vast.ai provisioning and ComfyUI setup scripts, model manifests (`MiniMax-H3`, `Qwen3-VL`, `SAM 3.1`, `ultralytics`, `sams`), custom nodes, workflow JSON references, and daemon supervisor scripts (`worker/setup/vast-worker-setup.sh`, `worker/setup/start-worker.sh`, `worker/deploy-vast.sh`).
   - Exposes Worker HTTP APIs on `explainer-web` (`/api/worker/tasks/claim`, `/api/worker/tasks/[id]/progress`, `/api/worker/tasks/[id]/complete`) authenticated via `WORKER_API_KEY` (or `COMFY_API_KEY` fallback) so workers can also interact via HTTP API in addition to direct MongoDB/Vercel Blob access.
4. **FFmpeg GPU Hardware Acceleration (`h264_nvenc`) with Safe Fallback**:
   - Provide a centralized video encoder utility (`src/service/ffmpeg/video-encoder.ts`) that probes whether the runtime FFmpeg binary + GPU driver supports a real `h264_nvenc` encode session.
   - When `h264_nvenc` is available, FFmpeg uses `-c:v h264_nvenc -preset p4 -cq 20 -pix_fmt yuv420p` (and system `ffmpeg` when `ffmpeg-static` lacks NVENC).
   - When `h264_nvenc` is unavailable (macOS dev, unit tests, or container hosts that restrict NVENC device sessions), it seamlessly falls back to `-c:v libx264 -preset veryfast -pix_fmt yuv420p`.
5. **Horizontal Scalability**:
   - Adding more capacity requires only spinning up additional Vast.ai instances with `worker/setup/vast-worker-setup.sh` and `.env.worker`. Multiple workers atomically claim from `workerTasks` without colliding.

### Non-Goals
- Breaking existing frontend polling endpoints or existing MongoDB domain collections (`generationJobs`, `jutsuJobs`, `teleportJobs`, `extendJobs`, `videos`). Domain documents continue to be updated identically so the UI works without changes.

---

## 2. Approaches Considered

1. **Approach 1 (Selected): Unified `workerTasks` Collection + Shared `src/` TypeScript Service Layer in `worker/`**
   - Web actions insert a `workerTasks` record (`lane: "gpu" | "cpu"`).
   - Vast.ai workers run `worker/src/index.ts`, atomically claim tasks from `workerTasks` (or via `/api/worker/*`), execute the existing `@/service/*` pipelines against local ComfyUI (`http://127.0.0.1:8188`), upload results to Vercel Blob, and update MongoDB.
   - If no external worker has claimed a `cpu` task within a configurable grace window (or when `WORKER_ONLY_MODE` is not forced in local dev), `/api/cron/*` can optionally act as a safety net or leave all work to Vast workers.
2. **Approach 2: Separate Polling Across 5 Legacy Collections**
   - Rejected due to inconsistent state machines and lack of unified lease/heartbeat/progress fields across `videos`, `generationJobs`, `jutsuJobs`, `teleportJobs`, and `extendJobs`.
3. **Approach 3: Pure HTTP Worker Without Direct DB/Service Sharing**
   - Rejected because `@/service/*` already implements complex MongoDB state synchronization, credit refunds, and dependency resolution.

---

## 3. Architecture & Data Model

### 3.1 `workerTasks` Collection (`src/model/worker-task.ts`, `src/dao/worker-tasks.ts`)

```ts
export type WorkerTaskLane = "gpu" | "cpu";

export type WorkerTaskKind =
  | "generation_submit"      // Submit/run a GenerationJob (image or video)
  | "generation_refresh"     // Poll/settle an in-flight GenerationJob
  | "jutsu_swap"             // Run/advance a JutsuJob (Scro Swap)
  | "teleport"               // Run/advance a TeleportJob
  | "extend"                 // Run/advance an ExtendJob
  | "storyboard_phase_a"     // Gemini Phase A storyboard generation for a Video
  | "storyboard_still"       // Still generation for a Video
  | "clip_generate"          // Single clip generation for a Video
  | "reel_concat"            // FFmpeg reel concatenation for a Video
  | "final_render"           // OpenCut / VideoEdit FFmpeg final render
  | "life_shot"              // Character life photo generation
  | "director_job";          // Custom director preview / generation job

export type WorkerTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";
```

Fields on `WorkerTask`:
- `_id: ObjectId`
- `kind: WorkerTaskKind`
- `lane: WorkerTaskLane`
- `status: WorkerTaskStatus`
- `targetId: string` (the hex ID of the underlying `GenerationJob`, `JutsuJob`, `TeleportJob`, `ExtendJob`, `Project`, `LifeShot`, or `Skill`)
- `dedupeKey?: string` (prevents duplicate pending tasks for the same target operation)
- `payload?: Record<string, unknown>` (e.g. `clipNumber`, `fingerprint`, `prompt`, etc.)
- `progress?: number` (`0..100`)
- `stage?: string`
- `workerId?: string`
- `attempts: number`
- `maxAttempts: number`
- `nextAttemptAt: Date`
- `lockedUntil?: Date`
- `heartbeatAt?: Date`
- `startedAt?: Date`
- `completedAt?: Date`
- `outputUrl?: string`
- `error?: string`
- `createdAt: Date`
- `updatedAt: Date`

### 3.2 `worker/` Folder Layout

```text
worker/
├── README.md
├── package.json
├── tsconfig.json
├── config/
│   └── models.json               # Declarative list of ComfyUI custom nodes & HuggingFace models
├── workflows/                    # Symlink / mirror of ComfyUI API workflow templates
│   ├── simple.api.json
│   ├── object.api.json
│   └── extend.api.json
├── setup/
│   ├── vast-worker-setup.sh      # Full Vast.ai bootstrap: CUDA fix, ComfyUI, models, Node 22, FFmpeg, Worker daemon
│   ├── start-worker.sh           # Supervisor script for ComfyUI (127.0.0.1:8188) + proxy + TS Worker loop
│   └── vast-openjutsu-proxy.py   # Authenticated reverse proxy on 8189
├── scripts/
│   └── deploy-vast.sh            # Syncs repo + env to running Vast.ai instance(s) and restarts worker
└── src/
    ├── index.ts                  # Entrypoint: loads env, probes NVENC + ComfyUI, starts GPU + CPU lanes + heartbeat
    ├── api-client.ts             # HTTP client for /api/worker/* (claim, progress, complete)
    ├── comfy-local.ts            # Local ComfyUI health check & prompt execution helper
    └── runner.ts                 # Dispatches claimed WorkerTask to the unified task executor
```

### 3.3 Web API Endpoints for Worker (`/api/worker/*`)
- `POST /api/worker/tasks/claim` — Atomically claims the next due `WorkerTask` for `lane: "gpu" | "cpu"` and `workerId`.
- `POST /api/worker/tasks/[id]/progress` — Extends `lockedUntil` lease and updates `progress` / `stage`.
- `POST /api/worker/tasks/[id]/complete` — Marks a task `completed` or `failed` (with retry backoff if transient).
- `GET /api/worker/health` — Returns queue depth by lane and active worker heartbeats.
