# Interactive Node Canvas Editor (`/app/canvas`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an easy-to-use interactive node-based image and video workflow editor at `/app/canvas` (directly below Home in Studio navigation), backed by 16 Mentalok AI Studio models and 10 curated OpenRouter models, persisted as multi-project canvases in MongoDB, and billed natively in USD Credit Remaining (`creditUsd`).

**Architecture:** Frontend uses `@xyflow/react` v12 styled with Scro Studio dark tokens (`src/presentation/studio/tokens.css`, `#c6f24b` accent) and strictly 3 high-level node types (`Media`, `Prompt`, `Model`). Backend uses dedicated typed MongoDB collections (`canvas_projects`, `canvas_jobs`), Next.js Server Actions (`src/presentation/actions/canvas.ts`), a pure topological graph module (`src/service/canvas/graph.ts`), a Mentalok AI Studio REST client (`src/service/mentalok/client.ts`), existing OpenRouter image/video helpers, Vercel Blob persistence (`persistMedia`), and atomic USD billing (`consumeCreditUsd` / `refundCreditUsd`).

**Tech Stack:** Next.js 16 (App Router, Server Actions, Webpack), React 19, TypeScript 5, `@xyflow/react` v12, Tailwind CSS v4, MongoDB 7, Zod 4, Vercel Blob, `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-19-node-canvas-editor-design.md`

## Global Constraints

- Never call live paid provider APIs (Mentalok, OpenRouter, Higgsfield, fal) during unit tests or verification; inject `{ fetch }` mocks or in-memory dependencies.
- Always define typed MongoDB collections (`db.collection<T>("name")`) and export them from `src/dao/index.ts`.
- Prefer Next.js Server Actions (`"use server"`) over ad-hoc REST endpoints for app mutations/queries.
- Keep UI components modular and small: every new UI component in its own file under `src/app/app/canvas/`, with `"use client"` at the top whenever hooks are used.
- All USD calculations must use `src/service/billing/usd.ts` (`roundUsd4`, `mulUsd`, `addUsd`, `formatUsd`). Mentalok pricing = `max($0.0050, roundUsd4(basePriceUsd * CANVAS_MENTALOK_MARKUP))` where default markup is `1.5`.
- Every completed remote output (Mentalok or OpenRouter) must be persisted to Vercel Blob (`persistMedia`) before marking a node `completed` so saved canvases never break after Mentalok's 24h signed URL expiry.
- Update `pipeline-models.md` and `AGENTS.md` in sync whenever new provider models/pipelines are added.

---

### Task 1: Mentalok AI Studio Client, Unified 26-Model Catalog, & Dynamic USD Pricing

**Files:**
- Create: `src/service/mentalok/client.ts`
- Create: `src/service/mentalok/client.test.ts`
- Create: `src/service/canvas/model-catalog.ts`
- Create: `src/service/canvas/model-catalog.test.ts`
- Create: `src/service/canvas/pricing.ts`
- Create: `src/service/canvas/pricing.test.ts`

**Interfaces:**
- Consumes: `src/service/billing/usd.ts` (`mulUsd`, `roundUsd4`, `formatUsd`), `src/service/credit-costs.ts` (`IMAGE_COST_USD`, `videoCostUsd`, `talkingHeadVideoCostUsd`), `src/service/openrouter/generate.ts` (model constants).
- Produces:
  - `src/service/mentalok/client.ts`: `hasMentalokApiKey()`, `listMentalokModels(opts?)`, `uploadMentalokMedia(input, opts?)`, `createMentalokJob(payload, opts?)`, `getMentalokJob(jobId, opts?)`, `MentalokJobRecord`, `MentalokModelSummary`.
  - `src/service/canvas/model-catalog.ts`: `CanvasPortType`, `CanvasPortSpec`, `CanvasModelCategory`, `CanvasModelSpec`, `STATIC_CANVAS_MODELS`, `getCanvasModelCatalog(opts?)`, `findCanvasModel(id, catalog?)`, `clearMentalokCatalogCache()`.
  - `src/service/canvas/pricing.ts`: `CANVAS_MIN_CHARGE_USD`, `canvasMentalokMarkup()`, `estimateCanvasModelCostUsd(spec, params?)`.

- [ ] **Step 1: Write failing tests for Mentalok client (`src/service/mentalok/client.test.ts`)**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMentalokJob,
  getMentalokJob,
  listMentalokModels,
  uploadMentalokMedia,
} from "@/service/mentalok/client";

describe("mentalok client", () => {
  it("lists enabled models with Bearer auth and parses live pricing", async () => {
    let seenAuth = "";
    const fakeFetch: typeof fetch = async (url, init) => {
      seenAuth = String((init?.headers as Record<string, string>)?.Authorization || "");
      assert.equal(String(url), "https://aistudio.mentalok.io/api/v1/models");
      return new Response(
        JSON.stringify({
          models: [
            {
              id: "flux-2-klein-4b",
              name: "FLUX.2 [klein] 4B",
              category: "IMAGE",
              priceUsd: 0.0012,
              status: "warm",
              presets: ["flux2-klein-square", "flux2-klein-portrait"],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const models = await listMentalokModels({
      apiKey: "mtk_live_test",
      fetch: fakeFetch,
    });
    assert.equal(seenAuth, "Bearer mtk_live_test");
    assert.equal(models.length, 1);
    assert.equal(models[0]?.id, "flux-2-klein-4b");
    assert.equal(models[0]?.priceUsd, 0.0012);
    assert.equal(models[0]?.status, "warm");
  });

  it("rejects uploads larger than 15 MB before calling fetch", async () => {
    let called = false;
    const huge = Buffer.alloc(15 * 1024 * 1024 + 1);
    await assert.rejects(
      () =>
        uploadMentalokMedia(
          { buffer: huge, contentType: "image/png" },
          {
            apiKey: "mtk_live_test",
            fetch: async () => {
              called = true;
              return new Response("{}");
            },
          },
        ),
      /15 MB/,
    );
    assert.equal(called, false);
  });

  it("creates and polls a Mentalok generation job", async () => {
    const fakeFetch: typeof fetch = async (url, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        assert.equal(body.modelId, "qwen-image-edit-2511");
        assert.equal(body.presetId, "qwen-edit-4step");
        assert.equal(body.imageUrl, "https://blob.example/in.png");
        return new Response(
          JSON.stringify({ job: { id: "job_123", status: "queued", priceUsd: 0.012 } }),
          { status: 201 },
        );
      }
      assert.equal(String(url), "https://aistudio.mentalok.io/api/v1/jobs/job_123");
      return new Response(
        JSON.stringify({
          job: {
            id: "job_123",
            status: "completed",
            outputUrl: "https://cdn.mentalok.io/out.png",
          },
        }),
        { status: 200 },
      );
    };

    const created = await createMentalokJob(
      {
        modelId: "qwen-image-edit-2511",
        presetId: "qwen-edit-4step",
        imageUrl: "https://blob.example/in.png",
        prompt: "Add round sunglasses",
      },
      { apiKey: "mtk_live_test", fetch: fakeFetch },
    );
    assert.equal(created.id, "job_123");
    assert.equal(created.status, "queued");

    const polled = await getMentalokJob("job_123", {
      apiKey: "mtk_live_test",
      fetch: fakeFetch,
    });
    assert.equal(polled.status, "completed");
    assert.equal(polled.outputUrl, "https://cdn.mentalok.io/out.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/mentalok/client.test.ts`
Expected: FAIL with module not found `@/service/mentalok/client`.

- [ ] **Step 3: Implement `src/service/mentalok/client.ts`**

Implement `MENTALOK_DEFAULT_BASE_URL = "https://aistudio.mentalok.io"`, `MENTALOK_MAX_UPLOAD_BYTES = 15 * 1024 * 1024`, `hasMentalokApiKey()`, `listMentalokModels()`, `uploadMentalokMedia()` (JSON `{ contentType, dataBase64 }` payload matching the Mentalok API doc), `createMentalokJob()`, and `getMentalokJob()`. Handle both `{ models: [...] }` and bare array responses for `/api/v1/models`, and `{ job: {...} }` or bare job responses for `/api/v1/jobs`. Extract clean error strings on non-2xx responses.

- [ ] **Step 4: Write failing tests for model catalog (`src/service/canvas/model-catalog.test.ts`) and pricing (`src/service/canvas/pricing.test.ts`)**

Test that:
- `STATIC_CANVAS_MODELS` contains exactly 16 Mentalok models + 10 OpenRouter models = 26 unique IDs, all with valid ports and presets.
- `getCanvasModelCatalog` merges live `priceUsd`, `presets`, and `status` from Mentalok when `apiKey` is present and falls back cleanly when fetch fails or key is missing.
- `estimateCanvasModelCostUsd` applies `max(0.005, roundUsd4(basePriceUsd * markup))` for Mentalok (e.g. `0.0012 * 1.5 -> 0.005`, `0.08 * 1.5 -> 0.12`, `0.21 * 1.5 -> 0.315`), `$0.15` for OpenRouter image, `$0.10/s` (5–15s) for OpenRouter video, and `$0.18/s` (5–60s) for `heygen/avatar-iv`.

- [ ] **Step 5: Implement `src/service/canvas/model-catalog.ts` and `src/service/canvas/pricing.ts`**

Include all 16 Mentalok models and all 10 OpenRouter models exactly as specified in Section 3.2 of the design spec, with bilingual labels (`zh-Hant` / `en`) on ports and 60-second TTL cache for live Mentalok model metadata.

- [ ] **Step 6: Run tests and commit**

Run: `npx tsx --test src/service/mentalok/client.test.ts src/service/canvas/model-catalog.test.ts src/service/canvas/pricing.test.ts`
Expected: PASS (0 failures).

```bash
git add src/service/mentalok/ src/service/canvas/model-catalog.ts src/service/canvas/model-catalog.test.ts src/service/canvas/pricing.ts src/service/canvas/pricing.test.ts
git commit -m "feat(canvas): add Mentalok AI Studio client, 26-model catalog, and USD pricing"
```

---

### Task 2: MongoDB Schemas, Typed DAOs & Pure Graph Validation / Topological Engine

**Files:**
- Create: `src/model/canvas.ts`
- Create: `src/dao/canvas.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/canvas/graph.ts`
- Create: `src/service/canvas/graph.test.ts`

**Interfaces:**
- Consumes: `src/service/canvas/model-catalog.ts` (`CanvasModelSpec`, `CanvasPortType`, `findCanvasModel`).
- Produces:
  - `src/model/canvas.ts`: `CanvasNodeType`, `CanvasNodeData`, `CanvasNode`, `CanvasEdge`, `CanvasViewport`, `CanvasProject`, `CanvasJob`, `CanvasJobStatus`, Zod schemas (`canvasNodeSchema`, `canvasEdgeSchema`, `canvasViewportSchema`).
  - `src/dao/canvas.ts`: `canvasProjectsCollection()`, `canvasJobsCollection()`.
  - `src/service/canvas/graph.ts`: `getNodeOutputPortType(node, catalog)`, `validateEdgeConnection(nodes, edges, candidate, catalog)`, `resolveNodeInputs(nodeId, nodes, edges, catalog)`, `computeExecutionWaves(nodes, edges, targetModelNodeIds?)`, `ResolvedCanvasInputs`.

- [ ] **Step 1: Write `src/model/canvas.ts` and `src/dao/canvas.ts` and export from `src/dao/index.ts`**

Define typed `db.collection<CanvasProject>("canvas_projects")` and `db.collection<CanvasJob>("canvas_jobs")` with idempotent index setup (`{ clerkUserId: 1, updatedAt: -1 }` and `{ canvasId: 1, createdAt: -1 }`).

- [ ] **Step 2: Write failing tests for graph validation & wave execution (`src/service/canvas/graph.test.ts`)**

Test:
- Valid `media(image) -> model(startImage)` accepted.
- Invalid `media(video) -> model(startImage)` rejected with clear reason.
- Self-loop rejected.
- Cycle (`Model A -> Model B -> Model A`) rejected.
- Multi-input `refImages` respects model `maxConnections` (e.g. 3 for `qwen-image-edit-2511`, 4 for `minimax-h3-image`).
- `resolveNodeInputs` prefers connected `Prompt` node text over inline `node.data.prompt`, gathers `startImage`/`endImage`/`refImages`/`image`/`video`/`refAudio` from both `media` nodes and completed upstream `model` nodes, and reports `missingUpstreamNodeIds` when an upstream model hasn't produced `outputUrl` yet.
- `computeExecutionWaves` produces parallel waves: e.g. two independent image models in Wave 0, a downstream video model depending on both in Wave 1, and an upscaler in Wave 2.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/graph.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 4: Implement `src/service/canvas/graph.ts`**

Pure, deterministic helper functions with clear comments.

- [ ] **Step 5: Run tests and commit**

Run: `npx tsx --test src/service/canvas/graph.test.ts`
Expected: PASS.

```bash
git add src/model/canvas.ts src/dao/canvas.ts src/dao/index.ts src/service/canvas/graph.ts src/service/canvas/graph.test.ts
git commit -m "feat(canvas): add canvas MongoDB schemas, typed DAOs, and graph validation engine"
```

---

### Task 3: Canvas Execution Engine, OpenRouter Video Adapter, Project Service & Server Actions

**Files:**
- Modify: `src/service/openrouter/generate.ts` (add `submitOpenRouterCanvasVideo` supporting optional `startImageUrl`, `endImageUrl`, `referenceImageUrls`, `audioUrl`)
- Create: `src/service/canvas/executor.ts`
- Create: `src/service/canvas/executor.test.ts`
- Create: `src/service/canvas/projects.ts`
- Create: `src/presentation/actions/canvas.ts`

**Interfaces:**
- Consumes: `src/service/mentalok/client.ts`, `src/service/canvas/model-catalog.ts`, `src/service/canvas/pricing.ts`, `src/service/canvas/graph.ts`, `src/service/openrouter/generate.ts`, `src/service/billing/credits.ts` (`consumeCreditUsd`, `refundCreditUsd`), `src/service/billing/credit-balance.ts` (`resolveUserUsdBalance`), `src/service/higgsfield/persist.ts` (`persistMedia`, `persistBuffer`), `src/dao/canvas.ts`, `src/dao/characters.ts`, `src/dao/products.ts`.
- Produces:
  - `src/service/canvas/executor.ts`: `submitCanvasNodeJob(input, deps?)`, `pollCanvasJobs(input, deps?)`, `refundCanvasJobOnce(jobId, clerkUserId, deps?)`.
  - `src/service/canvas/projects.ts`: `listCanvasProjects(clerkUserId)`, `getOrCreateDefaultCanvasProject(clerkUserId, canvasId?)`, `createCanvasProject(clerkUserId, input?)`, `saveCanvasProject(clerkUserId, canvasId, patch)`, `deleteCanvasProject(clerkUserId, canvasId)`, `listCanvasLibraryAssets(clerkUserId)`.
  - `src/presentation/actions/canvas.ts`: `"use server"` actions: `createCanvasProjectAction`, `renameCanvasProjectAction`, `deleteCanvasProjectAction`, `saveCanvasProjectAction`, `uploadCanvasMediaAction`, `runCanvasNodeAction`, `pollCanvasJobsAction`, `refreshCanvasModelsAction`.

- [ ] **Step 1: Add `submitOpenRouterCanvasVideo` to `src/service/openrouter/generate.ts`**

Supports pure text-to-video (when no `startImageUrl` is connected), first/last frame video (`frame_images`), reference image video (`input_references`), and HeyGen Avatar IV audio-driven video (`openRouterHeyGenAudioVideoBody`). Does not change any existing function signatures used by Storyboard / Talking Head.

- [ ] **Step 2: Write failing unit tests for `src/service/canvas/executor.test.ts`**

Using injected mock deps (no real DB or external HTTP calls):
1. Returns `INSUFFICIENT_CREDIT` without calling provider when `consumeCreditUsd` throws insufficient balance.
2. OpenRouter image model submits synchronously, persists result to Blob via `persistMedia`, updates node `outputUrl`, and keeps `chargedUsd`.
3. Mentalok video model submits asynchronously (`status: "running"`), then `pollCanvasJobs` sees `completed`, copies expiring Mentalok URL to permanent Blob via `persistMedia`, and updates node `outputUrl`.
4. Provider submission error triggers `refundCanvasJobOnce` exactly once and marks job `failed`.
5. Provider polling `failed` triggers `refundCanvasJobOnce` exactly once; polling the same failed job again does NOT refund twice.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/executor.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `src/service/canvas/executor.ts`, `src/service/canvas/projects.ts`, and `src/presentation/actions/canvas.ts`**

- Enforce 15 MB limit and strict MIME allowlist in `uploadCanvasMediaAction`.
- Map Mentalok inputs cleanly:
  - `image` → `imageUrl`
  - `video` → `videoUrl`
  - `refAudio` → `refAudioUrl`
  - `refImages` → `refImages` array
  - `startImage` / `endImage` → `keyframes` (or `imageUrl` fallback for single-frame TI2V models like `wan-2-2` / `wan-2-1` / `ltx-video`).
- Return fresh `creditUsd` from `runCanvasNodeAction` and `pollCanvasJobsAction` so the client updates the Studio wallet snapshot live.

- [ ] **Step 5: Run tests and commit**

Run: `npx tsx --test src/service/canvas/executor.test.ts src/service/openrouter/generate.test.ts`
Expected: PASS.

```bash
git add src/service/openrouter/generate.ts src/service/canvas/executor.ts src/service/canvas/executor.test.ts src/service/canvas/projects.ts src/presentation/actions/canvas.ts
git commit -m "feat(canvas): implement execution engine, Blob persistence, idempotent USD refunds, and server actions"
```

---

### Task 4: Install `@xyflow/react`, Studio Navigation Entry Below Home, Full-Bleed Shell & Starter Templates

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `src/presentation/studio/studio-shell.tsx` (add `"canvas"` to `StudioNavItem["icon"]`)
- Modify: `src/presentation/studio/studio-nav.tsx` (add `"canvas"` SVG icon in `RailIcon`)
- Modify: `src/presentation/studio/studio-nav-active.ts` & `src/presentation/studio/studio-nav-active.test.ts`
- Modify: `src/presentation/components/app-shell.tsx` (insert Canvas nav item right below Home in `section: "home"`)
- Modify: `src/presentation/components/app/director-dock/director-dock-config.ts` (add `canvas` to `isFullBleedStudioPath`)
- Create: `src/service/canvas/templates.ts`
- Create: `src/service/canvas/templates.test.ts`

**Interfaces:**
- Produces:
  - `src/service/canvas/templates.ts`: `CANVAS_STARTER_TEMPLATES`, `instantiateCanvasTemplate(templateId)` producing valid `CanvasNode[]` and `CanvasEdge[]` (3 curated templates: "Text → Image → Video", "Image → Edit → 2x Upscale", "Text → Image → Cutout").

- [ ] **Step 1: Install `@xyflow/react`**

Run: `npm install @xyflow/react`

- [ ] **Step 2: Write failing tests for nav active matching & starter templates**

Add `/app/canvas` test cases to `src/presentation/studio/studio-nav-active.test.ts` (ensuring `/app/canvas` activates Canvas pill and does NOT activate Home `/app`), and write `src/service/canvas/templates.test.ts` validating every template edge passes `validateEdgeConnection` and `computeExecutionWaves`.

- [ ] **Step 3: Implement nav entry, full-bleed path, and starter templates**

- Place `{ href: "/app/canvas", label: ..., icon: "canvas", section: "home" }` right below `/app` in `AppShell`.
- Update `isFullBleedStudioPath` to include `canvas`.

- [ ] **Step 4: Run tests and commit**

Run: `npx tsx --test src/presentation/studio/studio-nav-active.test.ts src/service/canvas/templates.test.ts`
Expected: PASS.

```bash
git add package.json package-lock.json src/presentation/studio/ src/presentation/components/app-shell.tsx src/presentation/components/app/director-dock/director-dock-config.ts src/service/canvas/templates.ts src/service/canvas/templates.test.ts
git commit -m "feat(canvas): install @xyflow/react, add Canvas nav below Home, and starter templates"
```

---

### Task 5: Interactive Node Canvas UI (`/app/canvas`) — Modular Node Cards, Sidebar, Topbar & Workspace

**Files:**
- Create: `src/app/app/canvas/nodes/port-colors.ts`
- Create: `src/app/app/canvas/nodes/media-node-card.tsx`
- Create: `src/app/app/canvas/nodes/prompt-node-card.tsx`
- Create: `src/app/app/canvas/nodes/model-node-card.tsx`
- Create: `src/app/app/canvas/canvas-lightbox.tsx`
- Create: `src/app/app/canvas/canvas-topbar.tsx`
- Create: `src/app/app/canvas/canvas-sidebar.tsx`
- Create: `src/app/app/canvas/canvas-workspace.tsx`
- Create: `src/app/app/canvas/page.tsx`
- Create: `src/app/app/canvas/loading.tsx`

**Interfaces:**
- Consumes: Server Actions from `src/presentation/actions/canvas.ts`, `CanvasModelSpec` from `src/service/canvas/model-catalog.ts`, `validateEdgeConnection` / `resolveNodeInputs` / `computeExecutionWaves` from `src/service/canvas/graph.ts`, `estimateCanvasModelCostUsd` from `src/service/canvas/pricing.ts`, `formatUsd` from `src/service/billing/usd.ts`, `CANVAS_STARTER_TEMPLATES` from `src/service/canvas/templates.ts`.

- [ ] **Step 1: Create `port-colors.ts` and the 3 node card components**

Each component is in its own file with `"use client"` at the top:
- `media-node-card.tsx`: renders image / video / audio preview, filename, delete button, and typed right output `<Handle>`.
- `prompt-node-card.tsx`: renders clean editable prompt textarea (`nodrag nowheel` classes so scrolling/selecting text never drags the node) and `text` output `<Handle>`.
- `model-node-card.tsx`: renders model title, provider pill (`Mentalok` / `OpenRouter`), status dot, typed left input `<Handle>` rows with clear bilingual labels and connection count badges (`Ref Images 1/4`), inline prompt box (hidden/locked cleanly when external `Prompt` node is connected), preset / aspectRatio / duration controls, collapsible Advanced options (`negativePrompt`, `seed`), `Run · $X.XXXX` button, inline generated image/video preview (click to open lightbox + download button), and right typed output `<Handle>`.

- [ ] **Step 2: Create `canvas-lightbox.tsx`, `canvas-topbar.tsx`, and `canvas-sidebar.tsx`**

- `canvas-topbar.tsx`: project switcher dropdown (switch / new / inline rename / delete), auto-save indicator, starter template menu, `+ Prompt` quick button, primary `Run Flow · $X.XX` button (shows wave progress and Cancel/Stop), and Fit View button.
- `canvas-sidebar.tsx`: collapsible left drawer with **Models** tab (search, category filter pills, draggable & click-to-add model tiles showing live status dot & USD price) and **Assets** tab (local upload button + Scro Characters, Products, and Recent Outputs draggable onto canvas).
- `canvas-lightbox.tsx`: clean modal to inspect full-resolution generated images or play videos + direct download link.

- [ ] **Step 3: Create `canvas-workspace.tsx`, `page.tsx`, and `loading.tsx`**

- Import `@xyflow/react/dist/style.css` inside `canvas-workspace.tsx` and apply Scro dark canvas theme overrides (`#0b0e13` canvas background, subtle dot grid, `#c6f24b` selected ring, smooth animated typed edges).
- Wire `isValidConnection` directly to `validateEdgeConnection` so incompatible ports and cycles are blocked interactively.
- Support dragging local files onto the canvas pane (`onDragOver` / `onDrop`) → uploads via `uploadCanvasMediaAction` and creates a `MediaNodeCard` at `screenToFlowPosition(...)`.
- Support dragging model tiles or Scro asset tiles from `canvas-sidebar.tsx` onto the canvas pane.
- Debounced 800ms auto-save via `saveCanvasProjectAction` when nodes/edges/viewport change.
- Active job 3-second polling loop via `pollCanvasJobsAction` (only runs while at least one node is `queued`/`running`) that updates node outputs and dispatches a balance refresh event so the Studio header USD credit updates immediately.
- `Run Flow` executes `computeExecutionWaves` level-by-level, waiting for each wave's jobs to finish before launching the next wave with fresh upstream `outputUrl`s.

- [ ] **Step 4: Typecheck and lint all new UI files**

Run: `npx tsc --noEmit && npx eslint src/app/app/canvas/ src/presentation/actions/canvas.ts src/service/canvas/ src/service/mentalok/`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/canvas/
git commit -m "feat(canvas): build interactive node canvas editor UI at /app/canvas"
```

---

### Task 6: i18n, `pipeline-models.md` / `AGENTS.md` Sync, & Full Verification

**Files:**
- Modify: `pipeline-models.md` (document Canvas Editor subsystem, 16 Mentalok AI Studio models + 10 OpenRouter models, dynamic USD markup billing, Vercel Blob persistence)
- Modify: `AGENTS.md` (add concise Canvas Editor bullet under Generation Queue & Providers)
- Modify: `src/util/i18n/messages/en.ts`, `src/util/i18n/messages/zh-Hant.ts`, `src/util/i18n/messages/zh-Hans.ts` (and remaining locale files if required by TypeScript message key type)

- [ ] **Step 1: Update `pipeline-models.md` and `AGENTS.md`**

Follow `.cursor/rules/sync-pipeline-models-doc.mdc` so `pipeline-models.md` and `AGENTS.md` reflect the new Canvas Editor subsystem, Mentalok AI Studio API (`MENTALOK_AI_STUDIO_API_KEY`), 16 Mentalok models, 10 OpenRouter models, and USD markup rules.

- [ ] **Step 2: Run full project verification suite**

Run:
1. `npx tsc --noEmit`
2. `npx eslint src/app/app/canvas/ src/service/canvas/ src/service/mentalok/ src/model/canvas.ts src/dao/canvas.ts src/presentation/actions/canvas.ts src/presentation/studio/ src/presentation/components/app-shell.tsx`
3. `npx tsx --test 'src/**/*.test.ts'`
4. `npm run build`

Expected: All typechecks, lint checks, unit tests, and production Webpack build succeed with exit code 0.

- [ ] **Step 3: Commit**

```bash
git add pipeline-models.md AGENTS.md src/util/i18n/
git commit -m "docs(canvas): sync pipeline-models.md, AGENTS.md, and i18n for Canvas Editor"
```
