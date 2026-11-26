# Canvas Model Catalog & Multi-Provider Execution Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modularize `model-catalog.ts` (1,208 LOC) and `executor.ts` (1,517 LOC) into pure model types, provider-scoped catalog modules, and 6 standalone provider execution adapters with zero behavioral changes or broken imports.

**Architecture:** First, pure model specification types and `CANVAS_HEYGEN_MAX_VIDEO_SECONDS` move to `src/model/canvas-model.ts` to eliminate `model -> service` reverse dependencies and `model-catalog <-> pricing` cycles, while splitting static catalog definitions and the Mentalok 60s cache into `src/service/canvas/catalog/*`. Second, provider-specific credential checks, duration probing, submission payloads, and polling parsers move into 6 dedicated adapters under `src/service/canvas/providers/*`, leaving `executor.ts` as a concise lifecycle orchestrator.

**Tech Stack:** TypeScript 5, Next.js 16, MongoDB Node Driver, Node built-in test runner (`node:test` + `node:assert/strict` via `tsx`).

**Spec:** `docs/superpowers/specs/2026-11-26-canvas-catalog-and-provider-adapters-design.md`

## Global Constraints

- Zero feature regressions and 100% backward compatibility for all 40 existing importers of `@/service/canvas/model-catalog` and `@/service/canvas/executor`.
- `src/model/canvas-model.ts` must have zero imports from `@/service/*` or `@/dao`.
- Never make live paid provider calls during unit tests; use pure functions or mock `deps` / `fetch`.
- Keep `1 Provider = 1 File` under `src/service/canvas/providers/` (`openrouter`, `minimax`, `google`, `mentalok`, `scro`, `ffmpeg`).
- Run tests via `npx tsx --test <path>`, typecheck via `npx tsc --noEmit`, and lint via `npx eslint <paths>`.

---

### Task 1: Sink Pure Spec Types to `src/model/canvas-model.ts` and Split `src/service/canvas/catalog/*`

**Files:**
- Create: `src/model/canvas-model.ts`
- Create: `src/service/canvas/catalog/ports.ts`
- Create: `src/service/canvas/catalog/mentalok-models.ts`
- Create: `src/service/canvas/catalog/openrouter-minimax-models.ts`
- Create: `src/service/canvas/catalog/google-models.ts`
- Create: `src/service/canvas/catalog/scro-models.ts`
- Create: `src/service/canvas/catalog/ffmpeg-models.ts`
- Create: `src/service/canvas/catalog/mentalok-live-cache.ts`
- Modify: `src/model/canvas.ts`
- Modify: `src/service/canvas/pricing.ts`
- Modify: `src/service/canvas/model-catalog.ts`
- Test: `src/service/canvas/catalog/catalog.test.ts`

**Interfaces:**
- Consumes: `MentalokClientOptions`, `listMentalokModels` (`@/service/mentalok/client`), OpenRouter/Google/MiniMax/credit-cost pricing helpers.
- Produces: `CanvasModelSpec`, `CanvasPortSpec`, `CanvasModelProvider`, `CANVAS_HEYGEN_MAX_VIDEO_SECONDS` (`@/model/canvas-model`), modular provider model arrays (`@/service/canvas/catalog/*`), and 100% backward-compatible `@/service/canvas/model-catalog`.

- [ ] **Step 1: Write the failing test `src/service/canvas/catalog/catalog.test.ts`**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { CANVAS_HEYGEN_MAX_VIDEO_SECONDS } from "@/model/canvas-model";
import { FFMPEG_STATIC_MODELS } from "@/service/canvas/catalog/ffmpeg-models";
import { GOOGLE_STATIC_MODELS, NANO_BANANA_CANVAS_MODEL_ID } from "@/service/canvas/catalog/google-models";
import { MENTALOK_STATIC_MODELS } from "@/service/canvas/catalog/mentalok-models";
import { MINIMAX_STATIC_MODELS, OPENROUTER_STATIC_MODELS } from "@/service/canvas/catalog/openrouter-minimax-models";
import { SCRO_STATIC_MODELS } from "@/service/canvas/catalog/scro-models";
import { STATIC_CANVAS_MODELS, findCanvasModel } from "@/service/canvas/model-catalog";

describe("service/canvas/catalog modular split", () => {
  it("keeps src/model/canvas-model.ts and src/model/canvas.ts free of @/service/canvas/model-catalog imports", () => {
    const modelFile = readFileSync(join(process.cwd(), "src/model/canvas-model.ts"), "utf8");
    const canvasFile = readFileSync(join(process.cwd(), "src/model/canvas.ts"), "utf8");
    assert.doesNotMatch(modelFile, /@\/service\//);
    assert.doesNotMatch(canvasFile, /@\/service\/canvas\/model-catalog/);
    assert.equal(CANVAS_HEYGEN_MAX_VIDEO_SECONDS, 120);
  });

  it("composes STATIC_CANVAS_MODELS in exact provider order and resolves legacy MiniMax IDs", () => {
    const expectedTotal =
      MENTALOK_STATIC_MODELS.length +
      OPENROUTER_STATIC_MODELS.length +
      MINIMAX_STATIC_MODELS.length +
      GOOGLE_STATIC_MODELS.length +
      SCRO_STATIC_MODELS.length +
      FFMPEG_STATIC_MODELS.length;
    assert.equal(STATIC_CANVAS_MODELS.length, expectedTotal);
    assert.equal(MENTALOK_STATIC_MODELS.length, 16);
    assert.equal(FFMPEG_STATIC_MODELS.length, 17);
    assert.ok(NANO_BANANA_CANVAS_MODEL_ID.startsWith("google:"));
    assert.equal(findCanvasModel("openrouter:minimax/hailuo-3")?.provider, "minimax");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/catalog/catalog.test.ts`
Expected: FAIL with `Cannot find module '@/model/canvas-model'`

- [ ] **Step 3: Implement `src/model/canvas-model.ts`, `src/service/canvas/catalog/*`, and update `canvas.ts`, `pricing.ts`, and `model-catalog.ts`**

Create `src/model/canvas-model.ts` containing `CanvasPortType`, `CanvasModelCategory`, `CanvasModelProvider`, `CanvasBilingualLabel`, `CanvasPortSpec`, `CanvasModelOutputSpec`, `CanvasModelRuntimeStatus`, `CanvasModelSpec`, and `CANVAS_HEYGEN_MAX_VIDEO_SECONDS = 120`. Split port builders into `ports.ts`, the 6 provider arrays into their dedicated files under `src/service/canvas/catalog/`, and the 60s cache into `mentalok-live-cache.ts`. Update `src/model/canvas.ts` and `src/service/canvas/pricing.ts` to import from `@/model/canvas-model`, and turn `src/service/canvas/model-catalog.ts` into the facade.

- [ ] **Step 4: Run tests, typecheck, and lint to verify it passes**

Run: `npx tsx --test src/service/canvas/catalog/catalog.test.ts src/service/canvas/model-catalog.test.ts src/service/canvas/pricing.test.ts src/service/canvas/model-names.test.ts src/service/canvas/model-swap.test.ts && npx tsc --noEmit && npx eslint src/model/canvas-model.ts src/model/canvas.ts src/service/canvas/pricing.ts src/service/canvas/model-catalog.ts 'src/service/canvas/catalog/*.ts'`
Expected: PASS (0 errors, 0 warnings)

- [ ] **Step 5: Commit**

```bash
git add src/model/canvas-model.ts src/model/canvas.ts src/service/canvas/pricing.ts src/service/canvas/model-catalog.ts src/service/canvas/catalog/
git commit -m "refactor(canvas): split model catalog by provider and sink pure spec types"
```

---

### Task 2: Create Multi-Provider Execution Adapters (`src/service/canvas/providers/*`)

**Files:**
- Create: `src/service/canvas/providers/types.ts`
- Create: `src/service/canvas/providers/shared-settle.ts`
- Create: `src/service/canvas/providers/openrouter-provider.ts`
- Create: `src/service/canvas/providers/minimax-provider.ts`
- Create: `src/service/canvas/providers/google-provider.ts`
- Create: `src/service/canvas/providers/mentalok-provider.ts`
- Create: `src/service/canvas/providers/scro-provider.ts`
- Create: `src/service/canvas/providers/ffmpeg-provider.ts`
- Create: `src/service/canvas/providers/index.ts`
- Test: `src/service/canvas/providers/providers.test.ts`

**Interfaces:**
- Consumes: `CanvasModelSpec`, `CanvasModelProvider` (`@/model/canvas-model`), `markJobRunning`, `markJobCompleted`, `markJobFailed` (`@/service/canvas/job-ledger`), `CanvasExecutorDeps` (`@/service/canvas/providers/types`).
- Produces: `CanvasProviderAdapter`, `CanvasExecutorDeps`, `CANVAS_PROVIDER_ADAPTERS`, `getCanvasProviderAdapter`, `buildCanvasBlobPathname`, `buildMentalokJobPayload`.

- [ ] **Step 1: Write the failing test `src/service/canvas/providers/providers.test.ts`**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCanvasModel } from "@/service/canvas/model-catalog";
import {
  CANVAS_PROVIDER_ADAPTERS,
  getCanvasProviderAdapter,
} from "@/service/canvas/providers";
import { buildMentalokJobPayload } from "@/service/canvas/providers/mentalok-provider";
import { buildCanvasBlobPathname } from "@/service/canvas/providers/shared-settle";

describe("service/canvas/providers adapters", () => {
  it("registers an adapter for all 6 CanvasModelProviders", () => {
    for (const p of ["mentalok", "openrouter", "google", "minimax", "scro", "ffmpeg"] as const) {
      const adapter = getCanvasProviderAdapter(p);
      assert.equal(adapter.provider, p);
      assert.equal(CANVAS_PROVIDER_ADAPTERS[p], adapter);
    }
  });

  it("builds deterministic Blob pathnames across video, audio, webp, jpg, and png", () => {
    assert.equal(
      buildCanvasBlobPathname("u1", "j1", "video", "https://cdn.example/out.webm?sig=1"),
      "canvas/u1/j1.webm",
    );
    assert.equal(
      buildCanvasBlobPathname("u1", "j1", "audio", "https://cdn.example/vo"),
      "canvas/u1/j1.mp3",
    );
    assert.equal(
      buildCanvasBlobPathname("u1", "j1", "image", "data:image/jpeg;base64,AAA"),
      "canvas/u1/j1.jpg",
    );
  });

  it("maps Mentalok keyframes for minimax-h3-ref2va and imageUrl for single-frame wan-2-1", async () => {
    const h3 = findCanvasModel("mentalok:minimax-h3-ref2va")!;
    const wan = findCanvasModel("mentalok:wan-2-1")!;
    const node = { id: "n1", type: "model" as const, position: { x: 0, y: 0 }, data: {} };
    const inputs = {
      prompt: "walk",
      startImage: "https://img/start.png",
      endImage: "https://img/end.png",
      refImages: [],
      videos: [],
    };
    const h3Payload = await buildMentalokJobPayload(h3, node, inputs, "h3-ref2va-480p", async (u) => u);
    assert.deepEqual(h3Payload.keyframes, {
      startImage: "https://img/start.png",
      endImage: "https://img/end.png",
    });

    const wanPayload = await buildMentalokJobPayload(wan, node, inputs, "wan-480p", async (u) => u);
    assert.equal(wanPayload.keyframes, undefined);
    assert.equal(wanPayload.imageUrl, "https://img/start.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/providers/providers.test.ts`
Expected: FAIL with `Cannot find module '@/service/canvas/providers'`

- [ ] **Step 3: Implement `types.ts`, `shared-settle.ts`, the 6 provider adapter files, and `index.ts`**

Define `CanvasExecutorDeps` and `CanvasProviderAdapter` in `src/service/canvas/providers/types.ts` (including optional `hasElevenLabsKey?: () => boolean` for testability). Implement `shared-settle.ts` (`toErrorMessage`, `buildCanvasBlobPathname`, aspect ratio normalizers, `settleCompletedJob`, `settleSubmittedVideo`) and each of the 6 provider files (`openrouter-provider.ts`, `minimax-provider.ts`, `google-provider.ts`, `mentalok-provider.ts`, `scro-provider.ts`, `ffmpeg-provider.ts`) plus `index.ts`.

- [ ] **Step 4: Run tests, typecheck, and lint to verify it passes**

Run: `npx tsx --test src/service/canvas/providers/providers.test.ts && npx tsc --noEmit && npx eslint 'src/service/canvas/providers/*.ts'`
Expected: PASS (0 errors, 0 warnings)

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/providers/
git commit -m "refactor(canvas): add standalone provider execution and polling adapters"
```

---

### Task 3: Slim `src/service/canvas/executor.ts` into Pure Pipeline Orchestrator and Run Full Verification

**Files:**
- Modify: `src/service/canvas/executor.ts`
- Test: `src/service/canvas/executor.test.ts` (existing 20 regression tests)

**Interfaces:**
- Consumes: `getCanvasProviderAdapter`, `CanvasExecutorDeps`, `toErrorMessage` (`@/service/canvas/providers`), `markJobQueued`, `markJobFailed`, `refundCanvasJobOnce` (`@/service/canvas/job-ledger`).
- Produces: Unchanged public API of `@/service/canvas/executor` (`CanvasExecutorDeps`, `submitCanvasNodeJob`, `dispatchQueuedCanvasJobById`, `pollCanvasJobs`, `pollSingleCanvasJobById`, `refundCanvasJobOnce`, `isCanvasJobTimedOut`, `CANVAS_ASYNC_JOB_TIMEOUT_MS`, `CANVAS_IMAGE_JOB_TIMEOUT_MS`).

- [ ] **Step 1: Refactor `src/service/canvas/executor.ts` to delegate credential checks, input validation, duration resolution, dispatch, and polling to `getCanvasProviderAdapter(spec.provider)`**

Remove all inline provider branches, Mentalok payload building, and provider polling switch blocks from `executor.ts`, keeping only project/node loading, `hydrateMissingModelOutputs`, `resolveNodeInputs`, `estimateCanvasModelCostUsd` + `consumeCreditUsd`, `markJobQueued`, worker queueing, unified `try/catch -> markJobFailed`, and timeout checks before `adapter.poll`.

- [ ] **Step 2: Run the complete Canvas, Agent, Presentation, and Worker test suites plus typecheck and ESLint**

Run: `npx tsx --test 'src/service/canvas/**/*.test.ts' 'src/service/canvas-agent/**/*.test.ts' 'src/service/worker/**/*.test.ts' 'src/presentation/serialize/canvas.test.ts' 'src/app/app/canvas/**/*.test.ts' && npx tsc --noEmit && npx eslint src/model/canvas-model.ts src/model/canvas.ts src/service/canvas/pricing.ts src/service/canvas/model-catalog.ts 'src/service/canvas/catalog/*.ts' 'src/service/canvas/providers/*.ts' src/service/canvas/executor.ts`
Expected: PASS (all suites green, 0 TypeScript errors, 0 ESLint warnings)

- [ ] **Step 3: Commit**

```bash
git add src/service/canvas/executor.ts
git commit -m "refactor(canvas): slim executor into provider-agnostic pipeline orchestrator"
```
