# Interactive Node Canvas Editor (`/app/canvas`) Design Specification

**Date**: 2026-11-19
**Status**: Approved (pending written-spec review)
**Scope**: `explainer-web` — new interactive node-based image/video workflow editor located directly below **Home** in the Studio navigation, powered by OpenRouter and Mentalok AI Studio, billed natively in Scro **USD Credit Remaining (`creditUsd`)**.

---

## 1. Goals & Non-Goals

### Goals
1. **Far simpler than ComfyUI**: Users create image/video pipelines with only **3 intuitive node types** (`Media`, `Prompt`, `Model`)—no low-level Checkpoint/VAE/KSampler/Decode/Save boilerplate.
2. **Drag-and-drop first**: Drop local files (image/video/audio) directly onto the canvas, drag existing Scro Characters / Products / recent outputs from the Assets drawer, or drag/click any of 26 AI models from the Models drawer.
3. **Visual port chaining with guardrails**: Color-coded typed handles (`image`, `video`, `audio`, `text`) prevent invalid edges and cycles; every `Model` card renders its output preview inline AND exposes an output handle so outputs chain directly into downstream models (e.g., Text-to-Image → Image Edit → Image-to-Video → 2x Video Upscale).
4. **Dual-provider model ecosystem**:
   - **Mentalok AI Studio** (`https://aistudio.mentalok.io`): All 16 commercial-safe models across IMAGE, VIDEO, EDITING, SEGMENTATION, and UPSCALE, dynamically hydrated via `GET /api/v1/models` with static fallback specs.
   - **OpenRouter** (`https://openrouter.ai`): 10 curated production image & video models already proven in `src/service/openrouter/generate.ts`.
5. **Multi-project MongoDB persistence**: Create, list, switch, rename, delete, and auto-save multiple canvas projects (`canvas_projects`).
6. **Single-node Run + One-click Run Flow**: Run any individual model card or execute the entire graph in topological waves with live progress and permanent Vercel Blob persistence.
7. **Native USD Credit billing**: Live per-node and whole-flow USD cost estimates, server-recalculated atomic pre-charge via `consumeCreditUsd`, and idempotent automatic refund via `refundCreditUsd` on any failure.

### Non-Goals
- No low-level ComfyUI workflow JSON import/export or custom Python node scripting.
- No multi-user real-time collaborative cursors (CRDT/WebSockets).
- No mixing Canvas jobs into the Storyboard `generation_jobs` minute-cron pipeline (Canvas uses its own low-latency `canvas_jobs` collection).

---

## 2. Architecture Overview

- **Frontend Canvas Engine**: `@xyflow/react` v12 (React 19 compatible) styled exclusively with Scro Studio dark tokens (`src/presentation/studio/tokens.css`, `#c6f24b` accent).
- **Navigation Entry**: Added inside `StudioNav`'s `home` section right below **Home 首頁** (`/app`) as **Canvas 畫布** (`/app/canvas`).
- **Transport**: Next.js App Router Server Actions (`src/presentation/actions/canvas.ts`) for all mutations, media uploads, single-node submission, and active-job polling (aligning with the project preference for server-side functions over ad-hoc REST routes).
- **Storage**:
  - `canvas_projects` MongoDB collection (graph state, viewport, latest node outputs, thumbnail).
  - `canvas_jobs` MongoDB collection (execution audit trail, external job IDs, `chargedUsd`, `refundedAt`).
  - Vercel Blob (`persistMedia`) for all uploaded inputs and completed Mentalok/OpenRouter outputs (preventing Mentalok's 24-hour signed URL expiration from breaking saved canvases).

---

## 3. Model Catalog, Provider Clients & USD Pricing

### 3.1 Port Type System
Four strictly typed port kinds with distinct visual colors:

| Port Type | Hex Color | Purpose |
|-----------|-----------|---------|
| `image` | `#38bdf8` (Sky) | Start image, end image, edit input image, reference images |
| `video` | `#a78bfa` (Violet) | Video segmentation, video upscale input/output |
| `audio` | `#f59e0b` (Amber) | Talking-head audio, MiniMax H3 Ref2VA reference audio |
| `text` | `#c6f24b` (Lime) | Optional external `Prompt` node connected to a model's `prompt` input |

### 3.2 Canonical Model Catalog (`src/service/canvas/model-catalog.ts`)

Every model is defined by a `CanvasModelSpec`:
- `id`: unique slug (e.g. `mentalok:flux-schnell` or `openrouter:minimax/hailuo-3`)
- `provider`: `"mentalok" | "openrouter"`
- `providerModelId`: exact API slug sent to the provider
- `name`, `category`: `"image" | "video" | "editing" | "segmentation" | "upscale"`
- `inputs`: declared `CanvasPortSpec[]` (`id`, `label`, `type`, `required`, `multiple`, `maxConnections`)
- `output`: `{ id: "output", label: string, type: "image" | "video" }`
- `presets`: available preset options (Mentalok `presetId` values, or OpenRouter aspect ratio / duration defaults)
- `basePriceUsd`: static default price (overridden at runtime for Mentalok by cached `GET /api/v1/models`)
- `runtimeStatus?`: `"warm" | "cached" | "cold" | "booting" | "busy" | "unavailable"` (Mentalok live status)

#### Mentalok AI Studio — 16 Commercial-Safe Models
Fetched via `GET https://aistudio.mentalok.io/api/v1/models` with 60-second in-memory server cache; falls back gracefully to static specs if `MENTALOK_AI_STUDIO_API_KEY` is unset or the upstream request fails.

| `providerModelId` | Name | Category | Inputs | Output | Base USD | Valid `presetId` |
|---|---|---|---|---|---:|---|
| `flux-schnell` | FLUX.1 [schnell] | image | `prompt` | `image` | `$0.0012` | `flux-square-1024`, `flux-portrait-768`, `flux-landscape-1024` |
| `sdxl-lightning` | SDXL Lightning | image | `prompt` | `image` | `$0.0008` | `sdxl-square-1024`, `sdxl-portrait-832`, `sdxl-landscape-1216` |
| `flux-2-klein-4b` | FLUX.2 [klein] 4B | image | `prompt` | `image` | `$0.0012` | `flux2-klein-square`, `flux2-klein-portrait`, `flux2-klein-landscape` |
| `minimax-h3-image` | MiniMax-H3-Image | image | `prompt`, `refImages` (≤4) | `image` | `$0.0150` | `h3-image-2k`, `h3-image-portrait`, `h3-image-landscape`, `h3-image-4k` |
| `wan-2-1` | Wan 2.1 Video | video | `prompt`, `startImage` (opt) | `video` | `$0.0800` | `wan-480p`, `wan-720p` |
| `ltx-video` | LTX-Video | video | `prompt`, `startImage` (opt) | `video` | `$0.0350` | `ltx-standard-768`, `ltx-landscape-960` |
| `wan-2-2` | Wan 2.2 TI2V-5B | video | `prompt`, `startImage` (opt) | `video` | `$0.0800` | `wan22-720p`, `wan22-480p`, `wan22-portrait` |
| `ltx-2-5` | LTX-2.5 (Audio+Video) | video | `prompt`, `startImage` (opt), `endImage` (opt) | `video` | `$0.0450` | `ltx25-720p`, `ltx25-480p`, `ltx25-portrait` |
| `minimax-h3-ref2va` | MiniMax-H3 Ref2VA | video | `prompt`, `startImage` (opt), `endImage` (opt), `refImages` (≤4), `refAudio` (opt) | `video` | `$0.2100` | `h3-ref2va-480p`, `h3-ref2va-768p`, `h3-ref2va-portrait` |
| `qwen-image-edit-2511` | Qwen-Image-Edit (2511) | editing | `prompt`, `image` (req), `refImages` (≤3) | `image` | `$0.0120` | `qwen-edit-4step`, `qwen-edit-8step` |
| `sam-3-1` | SAM 3.1 (Image) | segmentation | `prompt`, `image` (req) | `image` | `$0.0012` | `sam31-standard`, `sam31-hq`, `sam31-fast` |
| `sam-3-1-video` | SAM 3.1 (Video) | segmentation | `prompt`, `video` (req) | `video` | `$0.0150` | `sam31-vid-standard`, `sam31-vid-hq`, `sam31-vid-fast` |
| `birefnet` | BiRefNet | segmentation | `image` (req) | `image` | `$0.0008` | `birefnet-auto` |
| `seedvr2-image` | SeedVR2 (Image) | upscale | `image` (req) | `image` | `$0.0040` | `seedvr2-img-2x`, `seedvr2-img-4x`, `seedvr2-img-1x` |
| `seedvr2-video` | SeedVR2 (Video) | upscale | `video` (req) | `video` | `$0.0350` | `seedvr2-vid-2x`, `seedvr2-vid-1x` |
| `relayvsr` | RelayVSR 2x | upscale | `video` (req) | `video` | `$0.0150` | `relayvsr-2x` |

#### OpenRouter — 10 Curated Production Models
Reuse existing `submitOpenRouterImage`, `submitOpenRouterVideo`, and `fetchOpenRouterStatus` in `src/service/openrouter/generate.ts`.

| `providerModelId` | Name | Category | Inputs | Output | Pricing Rule |
|---|---|---|---|---|---|
| `bytedance-seed/seedream-5-0-pro` | Seedream 5.0 Pro | image | `prompt`, `refImages` (≤14) | `image` | `$0.15` flat |
| `bytedance-seed/seedream-5-0-lite` | Seedream 5.0 Lite | image | `prompt`, `refImages` (≤14) | `image` | `$0.15` flat |
| `google/gemini-nano-banana-2.1` | Nano Banana 2.1 | image | `prompt`, `refImages` (≤14) | `image` | `$0.15` flat |
| `openai/gpt-5-image` | GPT-5 Image | image | `prompt`, `refImages` (≤4) | `image` | `$0.15` flat |
| `minimax/hailuo-3` | MiniMax Hailuo 3 | video | `prompt`, `startImage` (opt), `endImage` (opt), `refImages` (≤4) | `video` | `$0.10/s` (5–15s) |
| `bytedance/seedance-2.0` | Seedance 2.0 | video | `prompt`, `startImage` (opt), `endImage` (opt), `refImages` (≤4) | `video` | `$0.10/s` (5–15s) |
| `bytedance/seedance-2.0-fast` | Seedance 2.0 Fast | video | `prompt`, `startImage` (opt), `endImage` (opt), `refImages` (≤4) | `video` | `$0.10/s` (5–15s) |
| `bytedance/seedance-2.0-mini` | Seedance 2.0 Mini | video | `prompt`, `startImage` (opt), `endImage` (opt), `refImages` (≤4) | `video` | `$0.10/s` (5–15s) |
| `alibaba/wan-3.0` | Alibaba Wan 3.0 | video | `prompt`, `startImage` (opt), `endImage` (opt) | `video` | `$0.10/s` (5–15s) |
| `heygen/avatar-iv` | HeyGen Avatar IV | video | `startImage` (req), `refAudio` (req), `prompt` (opt) | `video` | `$0.18/s` (5–60s) |

### 3.3 Mentalok AI Studio REST Client (`src/service/mentalok/client.ts`)
- **Env vars**:
  - `MENTALOK_AI_STUDIO_API_KEY` (Bearer token `mtk_live_*`)
  - `MENTALOK_AI_STUDIO_BASE_URL` (default `https://aistudio.mentalok.io`)
- **Methods** (all accept optional `{ fetch }` for deterministic unit testing):
  - `listMentalokModels(options)` → `GET /api/v1/models`
  - `uploadMentalokMedia(input: { buffer: Buffer; contentType: string; filename?: string }, options)` → `POST /api/v1/uploads` (validates ≤ 15 MB, returns `{ url, contentType, expiresAt }`)
  - `createMentalokJob(payload, options)` → `POST /api/v1/jobs` (maps `startImage` / `endImage` into `keyframes`, `refImages` array, `imageUrl`, `videoUrl`, `refAudioUrl`, `prompt`, `negativePrompt`, `seed`, `presetId`)
  - `getMentalokJob(jobId, options)` → `GET /api/v1/jobs/{id}`
- **Media URL bridging**: Because user media is stored on public HTTPS Vercel Blob URLs, we pass the Blob URL directly; if a Mentalok endpoint rejects external URLs or the input is non-HTTPS/data URL, `ensureMentalokUrl` fetches the bytes and uploads via `POST /api/v1/uploads`.

### 3.4 USD Credit Pricing (`src/service/canvas/pricing.ts`)
- Uses exact integer-scaled arithmetic from `src/service/billing/usd.ts` (`mulUsd`, `roundUsd4`, `USD_SCALE = 10_000`).
- **Mentalok models**:
  - `CANVAS_MENTALOK_MARKUP` env var (default `1.5`).
  - `CANVAS_MIN_CHARGE_USD = 0.005`.
  - `priceUsd = Math.max(CANVAS_MIN_CHARGE_USD, roundUsd4(mulUsd(liveBasePriceUsd, markup)))`.
- **OpenRouter models**:
  - Image models: `IMAGE_COST_USD` (`$0.15`).
  - Standard video models: `videoCostUsd(durationSeconds)` (`$0.10/s`, clamped 5–15s).
  - `heygen/avatar-iv`: `talkingHeadVideoCostUsd(durationSeconds)` (`$0.18/s`, clamped 5–60s).
- **Server authority**: Client UI displays live estimated USD on each node card and on the `Run Flow` button; the Server Action always recalculates authoritative `costUsd` from server-side catalog state before calling `consumeCreditUsd`.

---

## 4. Data Model, Execution Engine & Persistence

### 4.1 MongoDB Collections (`src/model/canvas.ts`, `src/dao/canvas.ts`)
Both DAOs use typed `db.collection<T>(...)` and ensure indexes on `{ clerkUserId: 1, updatedAt: -1 }`.

```ts
export type CanvasNodeType = "media" | "prompt" | "model";

export type CanvasNode = {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: {
    label?: string;
    // Media node fields
    mediaKind?: "image" | "video" | "audio";
    mediaUrl?: string;
    fileName?: string;
    // Prompt node fields
    text?: string;
    // Model node fields
    modelId?: string;
    presetId?: string;
    prompt?: string;
    negativePrompt?: string;
    aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
    resolution?: "1k" | "2k" | "4k";
    durationSeconds?: number;
    seed?: number;
    // Execution state cached on node for instant reload
    status?: "idle" | "queued" | "running" | "completed" | "failed";
    lastJobId?: string;
    outputUrl?: string;
    outputKind?: "image" | "video";
    lastError?: string;
    lastCostUsd?: number;
  };
};

export type CanvasEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};

export type CanvasProject = {
  _id: ObjectId;
  clerkUserId: string;
  title: string;
  thumbnailUrl?: string;
  viewport: { x: number; y: number; zoom: number };
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  createdAt: Date;
  updatedAt: Date;
};

export type CanvasJob = {
  _id: ObjectId;
  clerkUserId: string;
  canvasId: ObjectId;
  nodeId: string;
  flowRunId?: string;
  provider: "mentalok" | "openrouter";
  modelId: string;
  providerModelId: string;
  presetId?: string;
  status: "queued" | "running" | "completed" | "failed";
  externalJobId?: string;
  statusUrl?: string;
  inputSnapshot: Record<string, unknown>;
  chargedUsd: number;
  refundedAt?: Date;
  outputUrl?: string;
  outputKind?: "image" | "video";
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 4.2 Graph Validation & Topological Execution (`src/service/canvas/graph.ts`)
Pure, side-effect-free module covered by unit tests:
1. `validateEdgeConnection(nodes, edges, candidate)`:
   - Rejects self-loops (`source === target`).
   - Looks up source output port type (`mediaKind` for `media`, `"text"` for `prompt`, spec `output.type` for `model`) and target input port spec (`model` spec `inputs`).
   - Enforces exact type match (`image === image`, `video === video`, `audio === audio`, `text === text`).
   - Enforces cardinality: single-value ports replace/reject duplicate connections; multi-value ports (`refImages`) enforce `maxConnections` (3, 4, or 14).
   - Runs DFS cycle detection to reject any edge introducing a cycle.
2. `resolveNodeInputs(nodeId, nodes, edges)`:
   - Collects incoming edges grouped by `targetHandle`.
   - For `prompt`: prefers connected `Prompt` node text; falls back to `node.data.prompt`.
   - For `image` / `startImage` / `endImage` / `refImages` / `video` / `refAudio`: reads upstream `Media` node `mediaUrl` or upstream `Model` node `outputUrl`.
   - Returns `{ ok: true, inputs }` or `{ ok: false, missingUpstreamNodeIds, missingRequiredFields }`.
3. `computeExecutionWaves(nodes, edges, targetModelNodeIds?)`:
   - Uses Kahn's topological sort across all `model` nodes (or ancestors of `targetModelNodeIds`).
   - Groups independent nodes into parallel waves (`string[][]`) so `Run Flow` runs Wave 0 in parallel, waits for permanent Blob outputs, then automatically launches Wave 1 with updated upstream outputs.

### 4.3 Execution, Polling, Blob Persistence & Idempotent Refunds (`src/service/canvas/executor.ts`)
1. **Submit (`submitCanvasNodeJob`)**:
   - Verifies user ownership of `canvasId`, validates model + resolved inputs, computes authoritative `costUsd`.
   - Atomically charges via `consumeCreditUsd(clerkUserId, costUsd)`. Returns structured `{ ok: false, code: "INSUFFICIENT_CREDIT", requiredUsd, availableUsd }` on low balance.
   - Inserts `canvas_jobs` record (`chargedUsd: costUsd`, `status: "queued"`).
   - Dispatches to provider:
     - **OpenRouter Image (sync)**: Receives image data URL → persists to Vercel Blob (`persistMedia`) → marks `canvas_jobs` `completed`, updates node `outputUrl`/`status` and project `thumbnailUrl` in `canvas_projects`.
     - **OpenRouter Video / Mentalok (async)**: Submits remote job → stores `externalJobId` / `statusUrl`, sets status `running`, updates node `status: "running"` + `lastJobId` in `canvas_projects`.
   - **Failure during submit**: Calls `refundCanvasJobOnce(jobId)` (atomic `findOneAndUpdate({ _id, refundedAt: { $exists: false } }, { $set: { refundedAt: now } })` → `refundCreditUsd`), sets status `failed` + error message, returns updated `creditUsd`.
2. **Poll (`pollCanvasJobs`)**:
   - Accepts `canvasId` + `jobIds[]` belonging to the authenticated user.
   - Queries provider (`getMentalokJob` or `fetchOpenRouterStatus`) in parallel for non-terminal jobs.
   - On provider `completed`: downloads output and persists to Vercel Blob via `persistMedia`, writes permanent `outputUrl` into both `canvas_jobs` and the matching node in `canvas_projects`, updates project `thumbnailUrl`.
   - On provider `failed` / `nsfw`: calls `refundCanvasJobOnce(jobId)`, persists error on both `canvas_jobs` and node.
   - Returns updated job states + fresh `creditUsd` so the Studio header updates live.

---

## 5. UI / UX & Component Architecture

### 5.1 Left Rail Navigation
- Update `src/presentation/components/app-shell.tsx`, `src/presentation/studio/studio-nav.tsx`, and `src/presentation/studio/studio-nav-active.ts`:
  - Add `{ href: "/app/canvas", label: ..., icon: "canvas", section: "home" }` immediately below `/app`.
  - Add a crisp node-graph SVG icon for `"canvas"` in `RailIcon`.

### 5.2 `/app/canvas` Workspace Layout & Modular Components
All page-specific components live under `src/app/app/canvas/` with `"use client"` on interactive files, keeping each file focused and maintainable:

- `src/app/app/canvas/page.tsx` — Server Component: authenticates user, ensures at least one default canvas project exists (or loads `?id=<canvasId>`), loads live/cached model catalog, user's canvas list, and Scro library assets (Characters, Products, recent outputs).
- `src/app/app/canvas/canvas-workspace.tsx` — Root client controller wrapping `<ReactFlowProvider>`:
  - Manages `nodes`, `edges`, `viewport`, active project state, debounced auto-save (800ms via `saveCanvasProjectAction`), drag-and-drop file handler (drops onto canvas pane upload via `uploadCanvasMediaAction` and place a `MediaNodeCard` at cursor coordinates), active-job 3-second polling loop, and `Run Flow` wave runner.
- `src/app/app/canvas/canvas-topbar.tsx` — Compact top toolbar:
  - Project selector dropdown (switch, new canvas, inline rename, delete with confirm).
  - Auto-save badge (`Saved` / `Saving...`).
  - Starter templates dropdown ("Text → Image → Video", "Image → Edit → 2x Upscale", "Text → Image → Cutout") and `+ Prompt` button.
  - Primary **`Run Flow · $X.XX`** button (shows live total USD cost and progress wave `1/2`, with Stop button while running) + Fit View button.
- `src/app/app/canvas/canvas-sidebar.tsx` — Collapsible 268px left drawer with 2 tabs:
  - **Models**: Search input + category filter pills (`All`, `Image`, `Video`, `Edit`, `Cutout`, `Upscale`), draggable/clickable model cards showing provider badge (`Mentalok` / `OpenRouter`), status dot (`warm` green / `cold` amber), and formatted USD price.
  - **Assets**: Local file upload button + grids of user's Scro **Characters**, **Products**, and **Recent Canvas Outputs** (all draggable onto canvas or click-to-add as `MediaNodeCard`).
- `src/app/app/canvas/nodes/port-colors.ts` — Shared port color constants & handle helper.
- `src/app/app/canvas/nodes/media-node-card.tsx` — Clean media preview card (image thumbnail, video `<video controls>`, audio player) + filename + output handle + delete button.
- `src/app/app/canvas/nodes/prompt-node-card.tsx` — Clean multi-line prompt card with `text` output handle for fan-out model comparisons.
- `src/app/app/canvas/nodes/model-node-card.tsx` — All-in-one model card:
  - Header: Model name, provider badge, status pill (`idle`/`queued`/`running`/`completed`/`failed`), delete button.
  - Left typed input handles with bilingual labels (`Start Image`, `End Image`, `Ref Images (n/max)`, `Image`, `Video`, `Audio`, `Prompt`).
  - Inline prompt textarea (automatically shows "Connected to Prompt node" badge when `prompt` handle is wired).
  - Preset selector (Mentalok) or aspect ratio / duration / resolution controls (OpenRouter), plus collapsible Advanced drawer (`negativePrompt`, `seed`).
  - Footer: **`Run · $0.005`** button (disabled with tooltip if required inputs are missing).
  - Inline result panel: renders generated image or video inside the card with zoom-to-lightbox and download buttons, plus right-side typed output handle to chain further downstream.
- `src/app/app/canvas/canvas-lightbox.tsx` — Full-screen modal viewer for inspecting and downloading generated images/videos.

### 5.3 Documentation & i18n Sync
- Update `pipeline-models.md` and `AGENTS.md` to document the new Canvas Editor subsystem, Mentalok AI Studio integration (16 models), and dynamic USD markup billing.
- Add `nav.canvas` and canvas UI copy to the i18n dictionaries so Traditional Chinese, Simplified Chinese, and English labels stay consistent.

---

## 6. Error Handling & Edge Cases

1. **Missing `MENTALOK_AI_STUDIO_API_KEY`**: Mentalok models remain visible in the catalog with static fallback specs, clearly badged as unavailable if key is not configured, and server returns a clean actionable error before charging credits.
2. **Insufficient USD Credit**: Pre-checked on client (shows balance gap + `/app/billing` shortcut) and enforced atomically on server before submitting to provider.
3. **Mentalok 24h Signed URL Expiration**: Every completed job output is copied to Vercel Blob via `persistMedia` during `pollCanvasJobs` before marking the node complete; if Blob persistence fails transiently, the job retries on the next poll without double-charging.
4. **Partial Flow Failure**: In `Run Flow`, if a Wave-0 node fails, it is auto-refunded and only its downstream dependents are skipped; unrelated parallel branches complete normally.
5. **Double Refund Protection**: `refundCanvasJobOnce` uses an atomic MongoDB conditional update (`refundedAt: { $exists: false }`) so concurrent polls can never refund the same job twice.
6. **File Size / Type Validation**: Local uploads enforce ≤ 15 MB and strict MIME allowlist (`image/png`, `image/jpeg`, `image/webp`, `video/mp4`, `video/webm`, `video/quicktime`, `audio/mpeg`, `audio/wav`, `audio/mp4`, `audio/ogg`).

---

## 7. Testing & Verification Plan

All unit tests run via `npx tsx --test` with mocked `fetch` and in-memory/mocked DAOs—**zero live paid API calls**:
- `src/service/mentalok/client.test.ts`: model list parsing, upload size validation, job create/poll payloads, HTTP error handling.
- `src/service/canvas/model-catalog.test.ts`: 16 Mentalok + 10 OpenRouter catalog integrity, live Mentalok cache merge, graceful fallback.
- `src/service/canvas/pricing.test.ts`: Mentalok dynamic markup + `$0.005` floor, OpenRouter image/video/avatar USD pricing, 4-decimal rounding.
- `src/service/canvas/graph.test.ts`: port type compatibility, self-loop rejection, cycle detection, `refImages` max connections, upstream input resolution, multi-wave topological sort.
- `src/service/canvas/executor.test.ts`: atomic pre-charge, insufficient credit rejection, sync OpenRouter image + Blob persistence, async Mentalok/OpenRouter polling + Blob persistence, idempotent single refund on submit failure or provider failure.
- Final verification: `npx tsc --noEmit`, `npx eslint` on all touched files, `npx tsx --test 'src/**/*.test.ts'`, and `npm run build`.
