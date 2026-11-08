# Vast.ai Unified Worker & Task Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified `workerTasks` MongoDB queue, FFmpeg `h264_nvenc` GPU acceleration with automatic CPU fallback, Web Worker API endpoints (`/api/worker/*`), and a self-contained `worker/` program + Vast.ai ComfyUI setup package so all background tasks execute on scalable Vast.ai GPU worker instances.

**Architecture:** Web actions enqueue tasks into `workerTasks` (`lane: "gpu" | "cpu"`). Each Vast.ai instance runs `worker/src/index.ts`, which maintains a 1-slot GPU lane (for local ComfyUI `127.0.0.1:8188` workflows: Scro Swap, Teleport, Extend, Storyboard H3 video) and an N-slot CPU/API lane (for Gemini, OpenRouter Seedream, HeyGen, ElevenLabs, and NVENC/libx264 FFmpeg media jobs), updating progress and writing outputs to Vercel Blob and MongoDB.

**Tech Stack:** Next.js 16 (App Router), TypeScript, MongoDB (`mongodb`), Zod, FFmpeg (`h264_nvenc` / `libx264`), ComfyUI (`127.0.0.1:8188`), Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-08-vast-worker-unified-queue-design.md`

## Global Constraints

- Never break existing domain collections (`generationJobs`, `jutsuJobs`, `teleportJobs`, `extendJobs`, `videos`) or frontend status polling.
- FFmpeg GPU encoder (`h264_nvenc`) must verify capability via a real 1-frame test encode at startup and fall back cleanly to `libx264` when NVENC hardware session creation is unavailable.
- Unit tests must not make live paid provider calls or require a live MongoDB / GPU connection.

## Review Focus

- Duplicate task enqueueing for the same `dedupeKey` while a task is already `pending` or `in_progress` should update/reuse the existing task rather than creating duplicate jobs.
- Expired worker leases (`status: "in_progress"` with `lockedUntil < now`) must be reclaimable by another worker up to `maxAttempts`.
- Tasks that still await an asynchronous provider poll (`comfy://prompt/*` or OpenRouter video generation) must re-park with `nextAttemptAt` instead of prematurely marking `completed`.
- Worker HTTP API routes (`/api/worker/*`) must reject requests without a valid bearer token (`WORKER_API_KEY` or `COMFY_API_KEY`).
- FFmpeg encoder arguments must remain valid across all callers (`reel/concat`, `video-edit/render`, `jutsu/color-grade`, `voice/voice-swap-args`, `voice/smooth-silence`, `style/realistic-grade`).

---

### Task 1: FFmpeg GPU (`h264_nvenc`) Auto-Detection & Encoder Helper

**Files:**
- Create: `src/service/ffmpeg/video-encoder.ts`
- Create: `src/service/ffmpeg/video-encoder.test.ts`
- Modify: `src/service/reel/concat.ts`
- Modify: `src/service/reel/join-pad.ts`
- Modify: `src/service/video-edit/render.ts`
- Modify: `src/service/jutsu/color-grade.ts`
- Modify: `src/service/voice/voice-swap-args.ts`
- Modify: `src/service/voice/smooth-silence.ts`
- Modify: `src/service/style/realistic-grade.ts`

- [ ] **Step 1: Write unit tests in `src/service/ffmpeg/video-encoder.test.ts`** testing `buildVideoCodecArgs`, `resolveFfmpegBinary`, and `probeNvencSupport` (with injected runner).
- [ ] **Step 2: Implement `src/service/ffmpeg/video-encoder.ts`** with `probeNvencSupport`, `getVideoEncoderConfig`, `buildVideoCodecArgs`, and `resolveFfmpegBinary`, and wire into `concat.ts` and media services while preserving existing default behavior in unit tests.
- [ ] **Step 3: Run tests** (`npx tsx --test src/service/ffmpeg/video-encoder.test.ts 'src/service/reel/*.test.ts' 'src/service/video-edit/*.test.ts' 'src/service/voice/*.test.ts'`).

---

### Task 2: `workerTasks` Model, DAO, Atomic Claim, Heartbeat & Dispatcher

**Files:**
- Create: `src/model/worker-task.ts`
- Create: `src/dao/worker-tasks.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/worker/task-queue.ts`
- Create: `src/service/worker/task-executor.ts`
- Create: `src/service/worker/task-queue.test.ts`

- [ ] **Step 1: Write unit tests in `src/service/worker/task-queue.test.ts`** covering lane routing (`inferWorkerTaskLane`), claim filters, lease renewal, retry backoff, and re-parking for multi-step polling tasks.
- [ ] **Step 2: Implement `src/model/worker-task.ts`, `src/dao/worker-tasks.ts`, `src/service/worker/task-queue.ts`, and `src/service/worker/task-executor.ts`**.
- [ ] **Step 3: Wire background task producers** (`src/service/generation/task-store.ts`, `src/service/jutsu/pipeline.ts`, `src/service/teleport/pipeline.ts`, `src/service/extend/pipeline.ts`, `src/service/reel/enqueue.ts`, `src/service/video-edit/edit-actions.ts`, `src/service/project/actions.ts`, `src/service/clip/clip-timeline-actions.ts`, `src/service/character/life.ts`, `src/service/director/jobs.ts`) so every background job enqueues a `WorkerTask` (and skips Vercel `after()` when `WORKER_QUEUE_ENABLED=true`).
- [ ] **Step 4: Run tests** (`npx tsx --test src/service/worker/task-queue.test.ts`).

---

### Task 3: Worker HTTP API Endpoints (`/api/worker/*`)

**Files:**
- Create: `src/service/worker/worker-auth.ts`
- Create: `src/service/worker/worker-auth.test.ts`
- Create: `src/presentation/api/worker/tasks/claim/route.ts`
- Create: `src/presentation/api/worker/tasks/[id]/progress/route.ts`
- Create: `src/presentation/api/worker/tasks/[id]/complete/route.ts`
- Create: `src/presentation/api/worker/health/route.ts`
- Create: `src/app/api/worker/tasks/claim/route.ts`
- Create: `src/app/api/worker/tasks/[id]/progress/route.ts`
- Create: `src/app/api/worker/tasks/[id]/complete/route.ts`
- Create: `src/app/api/worker/health/route.ts`

- [ ] **Step 1: Write unit tests in `src/service/worker/worker-auth.test.ts`** verifying Bearer token authentication and claim/progress/complete payload validation.
- [ ] **Step 2: Implement Worker API routes** in `src/presentation/api/worker/**` and thin Next.js route re-exports in `src/app/api/worker/**`.
- [ ] **Step 3: Run tests** (`npx tsx --test src/service/worker/worker-auth.test.ts`).

---

### Task 4: Self-Contained `worker/` Program, ComfyUI Model Setup & Deployment

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/README.md`
- Create: `worker/config/models.json`
- Create: `worker/workflows/simple.api.json`
- Create: `worker/workflows/object.api.json`
- Create: `worker/workflows/extend.api.json`
- Create: `worker/setup/vast-worker-setup.sh`
- Create: `worker/setup/start-worker.sh`
- Create: `worker/setup/vast-openjutsu-proxy.py`
- Create: `worker/scripts/deploy-vast.sh`
- Create: `worker/src/index.ts`
- Create: `worker/src/runner.ts`
- Create: `worker/src/api-client.ts`
- Create: `worker/src/comfy-local.ts`
- Create: `worker/src/runner.test.ts`

- [ ] **Step 1: Write unit tests in `worker/src/runner.test.ts`** testing two-lane worker loop scheduling (1 GPU slot + N CPU slots, heartbeat interval, graceful shutdown, and local ComfyUI URL injection).
- [ ] **Step 2: Create `worker/` TypeScript files, model config (`worker/config/models.json`), workflows, and Vast setup/deploy scripts**.
- [ ] **Step 3: Run typecheck, unit tests, and `npm run build`**.
- [ ] **Step 4: Deploy to Vercel (`vercel --prod`) and Vast.ai instance (`59041320`), and verify end-to-end worker health**.
