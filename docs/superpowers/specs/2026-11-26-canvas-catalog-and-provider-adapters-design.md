# Subproject 2 Design Spec: Canvas Model Catalog & Multi-Provider Execution Adapters

**Date:** 2026-11-26  
**Scope:** `explainer-web` (`src/model/canvas-model.ts`, `src/service/canvas/catalog/*`, `src/service/canvas/providers/*`, `src/service/canvas/model-catalog.ts`, `src/service/canvas/executor.ts`)  
**Constraint:** Zero feature regressions, zero public API breaking changes, 100% backward-compatible imports across all 40 existing consumers.

---

## 1. Problem Statement & Goals

Even after extracting `job-ledger.ts` in Subproject 1, two large files in `src/service/canvas/` remain tightly coupled and multi-responsibility:

1. **Layer Inversion & Circular Dependencies**:
   - `src/model/canvas.ts` (Model layer) imports `CanvasModelProvider` from `@/service/canvas/model-catalog` (Service layer).
   - `src/service/canvas/model-catalog.ts` and `src/service/canvas/pricing.ts` have a circular dependency (`CANVAS_HEYGEN_MAX_VIDEO_SECONDS` vs. `CanvasModelSpec`).
   - 40 files across UI components, Canvas AI Agent tools, and domain services import `@/service/canvas/model-catalog`.
2. **Monolithic Model Catalog (`src/service/canvas/model-catalog.ts`, 1,208 LOC)**:
   - Mixes bilingual port builders, static model definitions for 6 distinct providers (Mentalok, OpenRouter, MiniMax, Google AI Studio, Scro Tools, FFmpeg), and a stateful 60-second TTL Mentalok live API cache.
3. **Monolithic Multi-Provider Executor (`src/service/canvas/executor.ts`, 1,517 LOC)**:
   - Mixes generic job lifecycle orchestration (project lookup, input resolution, billing pre-charge, refund safety, timeout checks) with 6 provider-specific credential checks, duration probing rules, submission payloads, and polling parsers.

### Goals
- Sink pure model specification types and shared constants into `src/model/canvas-model.ts` to eliminate `model -> service` reverse dependencies and `model-catalog <-> pricing` circular imports.
- Modularize `model-catalog.ts` into `src/service/canvas/catalog/*` (one file per provider catalog + port builders + live cache), keeping `src/service/canvas/model-catalog.ts` as a thin backward-compatible facade.
- Modularize provider execution and polling into `src/service/canvas/providers/*` behind a functional `CanvasProviderAdapter` contract (1 Provider = 1 File), slimming `src/service/canvas/executor.ts` into a pure pipeline orchestrator while preserving `CanvasExecutorDeps` and all exported signatures.

---

## 2. Target Module Architecture

```text
src/
├── model/
│   ├── canvas-model.ts                     # NEW: Zero-dependency spec types & CANVAS_HEYGEN_MAX_VIDEO_SECONDS
│   └── canvas.ts                           # UPDATED: Imports CanvasModelProvider from @/model/canvas-model
└── service/
    └── canvas/
        ├── catalog/
        │   ├── ports.ts                    # NEW: Bilingual port & output spec builders
        │   ├── mentalok-models.ts          # NEW: 16 Mentalok static specs
        │   ├── openrouter-minimax-models.ts# NEW: OpenRouter account specs + official MiniMax partition
        │   ├── google-models.ts            # NEW: Google AI Studio image & Omni video specs
        │   ├── scro-models.ts              # NEW: Scro director & tool specs
        │   ├── ffmpeg-models.ts            # NEW: 17 Vast Worker FFmpeg specs
        │   └── mentalok-live-cache.ts      # NEW: 60s TTL cache & live metadata merge
        ├── model-catalog.ts                # SLIMMED FACADE: Aggregates STATIC_CANVAS_MODELS, findCanvasModel, re-exports
        ├── pricing.ts                      # UPDATED: Imports CanvasModelSpec & constant from @/model/canvas-model
        ├── providers/
        │   ├── types.ts                    # NEW: CanvasProviderAdapter, CanvasDispatchContext, Credential/Validation results
        │   ├── shared-settle.ts            # NEW: Blob pathname builder, aspect ratio normalizers, video/blob settlement helpers
        │   ├── openrouter-provider.ts      # NEW: OpenRouter sync image + async video/HeyGen submit & poll
        │   ├── minimax-provider.ts         # NEW: Official MiniMax sync image + async video submit & poll
        │   ├── google-provider.ts          # NEW: Google AI Studio image + Omni video submit & poll
        │   ├── mentalok-provider.ts        # NEW: Mentalok payload builder, submit & poll
        │   ├── scro-provider.ts            # NEW: Scro validation, captions/TTS/life/poster sync & async domain submit & poll
        │   ├── ffmpeg-provider.ts          # NEW: Worker FFmpeg enqueue & worker_tasks failure poll
        │   └── index.ts                    # NEW: CANVAS_PROVIDER_ADAPTERS registry & getCanvasProviderAdapter()
        └── executor.ts                     # SLIMMED ORCHESTRATOR: Lifecycle, credit pre-charge, adapter dispatch/poll, timeouts
```

---

## 3. Component Contracts & Data Flow

### 3.1 Pure Model Spec Types (`src/model/canvas-model.ts`)
- Exports `CanvasPortType`, `CanvasModelCategory`, `CanvasModelProvider`, `CanvasBilingualLabel`, `CanvasPortSpec`, `CanvasModelOutputSpec`, `CanvasModelSpec`, and `CANVAS_HEYGEN_MAX_VIDEO_SECONDS = 120`.
- Defines `CanvasModelRuntimeStatus = "warm" | "cold" | "unavailable"` directly in Model (matching `MentalokRuntimeStatus`) so `src/model/canvas-model.ts` has zero runtime or `@/service/*` imports.
- `src/service/canvas/pricing.ts` re-exports `CANVAS_HEYGEN_MAX_VIDEO_SECONDS` and `src/service/canvas/model-catalog.ts` re-exports all types so existing callers remain untouched.

### 3.2 Modular Catalog (`src/service/canvas/catalog/*` & `model-catalog.ts`)
- Each provider file exports only its `readonly CanvasModelSpec[]` array (plus `NANO_BANANA_CANVAS_MODEL_ID` in `google-models.ts`).
- `mentalok-live-cache.ts` encapsulates `MENTALOK_CATALOG_CACHE_TTL_MS`, `clearMentalokCatalogCache()`, `mergeMentalokLiveData()`, and `getCanvasModelCatalog(models, options)`.
- `src/service/canvas/model-catalog.ts` composes `STATIC_CANVAS_MODELS` in the exact existing order (`mentalok`, `openrouter`, `minimax`, `google`, `scro`, `ffmpeg`), implements `findCanvasModel` (preserving `MINIMAX_CANVAS_LEGACY_IDS` resolution), delegates `getCanvasModelCatalog`, and re-exports `FFMPEG_STATIC_MODELS`, `SCRO_STATIC_MODELS`, `NANO_BANANA_CANVAS_MODEL_ID`, and all types.

### 3.3 Provider Adapter Contract (`src/service/canvas/providers/types.ts`)
Every `CanvasModelProvider` implements one stateless `CanvasProviderAdapter`:

```ts
export type CanvasProviderInputValidation =
  | { ok: true }
  | { ok: false; error: string; missingRequiredFields?: string[] };

export type CanvasDurationProbeContext = {
  spec: CanvasModelSpec;
  node: CanvasNode;
  inputs: ResolvedCanvasInputs;
  baseDurationSeconds: number | undefined;
  deps: CanvasExecutorDeps;
};

export type CanvasDispatchContext = {
  initialJob: CanvasJob;
  spec: CanvasModelSpec;
  node: CanvasNode;
  inputs: ResolvedCanvasInputs;
  presetId: string;
};

export type CanvasProviderAdapter = {
  provider: CanvasModelProvider;
  // Returns Chinese user-facing error when required API key is unconfigured, or null when ready.
  checkCredentials: (spec: CanvasModelSpec, deps: CanvasExecutorDeps) => string | null;
  // Optional provider-specific input validation before charging USD credit.
  validateInputs?: (
    spec: CanvasModelSpec,
    node: CanvasNode,
    inputs: ResolvedCanvasInputs,
  ) => CanvasProviderInputValidation;
  // Optional pre-billing duration adjustment (e.g., HeyGen audio probe, Google Omni 10s dual-frame cap, captions video probe).
  resolveDurationSeconds?: (
    ctx: CanvasDurationProbeContext,
  ) => Promise<number | undefined>;
  // Submits or executes a queued job and returns the settled/running CanvasJob via job-ledger.
  dispatch: (ctx: CanvasDispatchContext, deps: CanvasExecutorDeps) => Promise<CanvasJob>;
  // Polls an active running job and returns updated or unchanged CanvasJob.
  poll: (job: CanvasJob, deps: CanvasExecutorDeps) => Promise<CanvasJob>;
};
```

### 3.4 Slimmed Orchestrator (`src/service/canvas/executor.ts`)
1. **Pre-Validation**: Validates `canvasId`, loads `CanvasProject`, finds target `model` node and `CanvasModelSpec`, and blocks direct execution of `isExplainerPlannerNode` / `isScroDirectorNode`.
2. **Adapter Pre-Checks (Zero Charge on Failure)**:
   - Calls `adapter.checkCredentials(spec, resolved)` -> returns `PROVIDER_UNAVAILABLE` if non-null.
   - Runs `hydrateMissingModelOutputs` + `resolveNodeInputs` -> returns `INVALID_INPUTS` on missing ports/upstreams.
   - Calls `adapter.validateInputs?.(spec, node, inputs)` -> returns `INVALID_INPUTS` on failure.
3. **Duration & Authoritative Billing**:
   - Computes base duration from `durationPreset` / `node.data.durationSeconds`, then awaits `adapter.resolveDurationSeconds?.(...)`.
   - Computes `estimateCanvasModelCostUsd`, calls `consumeCreditUsd` (mapping balance errors to `INSUFFICIENT_CREDIT`), and records `markJobQueued`.
4. **Dispatch & Error Boundary**:
   - If `queueToWorker` is true, enqueues `canvas_node` worker task and returns immediately.
   - Otherwise calls `adapter.dispatch(ctx, resolved)` inside a single `try/catch`:
     - Success -> reads fresh `creditUsd` and returns `{ ok: true, job, creditUsd }`.
     - Thrown error -> calls `markJobFailed(initialJob, message, resolved)` (which triggers `refundCanvasJobOnce`) and returns `{ ok: false, code: "PROVIDER_ERROR", error, job, creditUsd }`.
5. **Polling**:
   - `pollSingleCanvasJob` short-circuits `completed`, ensures `failed` jobs without `refundedAt` call `refundCanvasJobOnce`, fails timed-out jobs via `isCanvasJobTimedOut`, and delegates active jobs to `getCanvasProviderAdapter(job.provider).poll(job, resolved)`.

---

## 4. Error Handling & Edge-Case Invariants

1. **Pre-Charge Credential Safety**: Including `scro:auto-captions` (`deps.hasElevenLabsKey?.() ?? isElevenLabsConfigured()`), all missing provider keys return `PROVIDER_UNAVAILABLE` before `consumeCreditUsd` is ever invoked.
2. **Duration Parity Between Pricing & Dispatch**: `resolvedDurationSeconds` computed during `submitCanvasNodeJob` is stored in `inputSnapshot.durationSeconds` and injected onto `effectiveNode.data.durationSeconds` for both immediate dispatch and `dispatchQueuedCanvasJobById`.
3. **Transient Poll Resilience**: Network timeouts during provider status polling or `persistMedia` Blob uploads log a warning and keep `job.status === "running"` so the next poll retries cleanly without refunding or double-charging.
4. **Single Refund Guarantee**: Terminal provider failures (`status === "failed"` or `"nsfw"`) settle through `markJobFailed` -> `refundCanvasJobOnce`.

---

## 5. Testing & Verification Plan

1. **`src/model/canvas-model.ts` & `src/service/canvas/catalog/catalog.test.ts`**:
   - Verify `STATIC_CANVAS_MODELS` order, counts, legacy MiniMax ID lookup, Mentalok 60s cache hit/expiry/fallback, and zero `@/service/*` imports inside `src/model/`.
2. **`src/service/canvas/providers/providers.test.ts`**:
   - Unit test `CANVAS_PROVIDER_ADAPTERS` coverage across all 6 providers, credential checks, duration resolution rules (HeyGen audio probe, CJK/Latin estimation, Google Omni 10s cap), and Mentalok keyframe vs. single-frame TI2V payload mapping.
3. **Existing Regression Suites**:
   - All 20 tests in `src/service/canvas/executor.test.ts`, `model-catalog.test.ts`, `pricing.test.ts`, `worker-runner.test.ts`, and full Canvas + Agent test suites (`npx tsx --test`, `npx tsc --noEmit`, `npx eslint`) must pass with zero modifications to existing test expectations.
