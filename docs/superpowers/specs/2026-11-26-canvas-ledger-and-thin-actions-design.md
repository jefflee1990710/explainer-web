# Canvas Unified Job Ledger, Runtime Services, and Thin Server Actions (Subproject 1)

Date: 2026-11-26
Status: approved in chat (three sections), spec awaiting review

## Problem

Across the Interactive Node Canvas (`/app/canvas`) and its task execution layer, three boundary
violations make maintenance error-prone:

1. **Client-facing DTOs live inside a MongoDB-coupled service (`src/service/canvas/projects.ts`)**:
   More than 20 client components import DTO types (`CanvasProjectSummaryDto`, `CanvasLibraryAsset`,
   `CanvasLibraryCharacterOption`, etc.) from `@/service/canvas/projects`, which imports `mongodb`
   and `@/dao`. Any accidental value import pulls server-only database modules toward the client
   bundle, and DTO serializers (`serializeCanvasProject`, `serializeCanvasJob`, plus four inline
   copies of `activeFlowRun` DTO mapping) live outside `src/presentation/`.
2. **Duplicated job and node state settlement (`executor.ts` vs. `ffmpeg-ops.ts`)**:
   `src/service/canvas/executor.ts` and `src/service/canvas/ffmpeg-ops.ts` each implement their own
   `updateCanvasJob` and `updateCanvasNodeState` MongoDB writers and hand-assemble `$set` / `$unset`
   across seven execution branches (sync image, Google video, OpenRouter/MiniMax video, Mentalok,
   FFmpeg enqueue/settle, `scro:auto-captions`, sync/async Scro tools, and poll settlement). Any
   invariant—such as unsetting `nodes.$.data.staleOutputUrl` on completion, updating canvas
   `thumbnailUrl` on image outputs, or running single-refund protection on failure—must be
   remembered in every branch.
3. **Business, DAO, and local-worker orchestration inside `"use server"` actions
   (`src/presentation/actions/canvas.ts`)**:
   `pollCanvasJobsAction`, `pollCanvasFlowAction`, `runCanvasNodeAction`, `runCanvasFlowAction`, and
   `uploadCanvasMediaAction` directly query `canvasProjectsCollection`, `canvasJobsCollection`, and
   `usersCollection`, branch on `shouldUseWorkerQueueOnly()`, synthesize fake `WorkerTask` records
   to advance local dev flows, and validate 15 MB MIME uploads. Because this logic is trapped in
   Next.js Server Actions, it cannot be unit-tested cleanly with `Deps` injection or reused by API
   / MCP entrypoints.

## Goals

1. **Zero behavioral or schema change**: Preserve every Server Action name, parameter shape, return
   payload, Chinese/English error string, MongoDB document field, billing charge/refund rule, and
   existing import path (via compatibility re-exports).
2. **Database-free DTO & serializer modules**: Extract pure DTO types into `src/model/canvas-dto.ts`
   (zero runtime dependencies, type-re-exported from `src/service/canvas/projects.ts` so all 20+
   existing type callers compile unchanged) and DTO serializers into
   `src/presentation/serialize/canvas.ts` (including a single `serializeCanvasFlowRun` helper,
   consumed directly by `src/presentation/actions/canvas.ts` and `src/app/app/canvas/page.tsx` so
   `service` never imports from `presentation`).
3. **Single authoritative `job-ledger.ts`**: Centralize `canvas_jobs` transitions (`running`,
   `completed`, `failed`), atomic single-refund (`refundCanvasJobOnce`), and
   `canvas_projects.nodes.$.data` state write-backs into `src/service/canvas/job-ledger.ts`, reused
   by both `executor.ts` and `ffmpeg-ops.ts` while keeping `CanvasExecutorDeps` and
   `ExecuteCanvasFfmpegDeps` 100% compatible with existing unit tests.
4. **Domain `runtime.ts` & `media-upload.ts` + thin `actions/canvas.ts`**: Move upload validation,
   user USD credit lookup, pre-run graph save + upstream wait orchestration, and worker-queue vs.
   local-dev polling out of `src/presentation/actions/canvas.ts` into testable `src/service/canvas/`
   modules so every Server Action becomes a 5–12 line auth + delegation + DTO wrapper.

## Non-goals

- Splitting `executor.ts` provider branches into individual provider adapter files (deferred to
  Subproject 2).
- Splitting `canvas-workspace.tsx` or `model-node-card.tsx` into client hooks and subcomponents
  (deferred to Subproject 3).
- Refactoring `worker-runner.ts` wave state transitions or converting `task-executor.ts` into a
  declarative task registry (deferred to Subproject 4).
- Changing any MongoDB collection, index, model catalog entry, pricing, or worker queue protocol.

## Architecture & Module Boundaries

Strict one-way dependency direction:

`src/model/canvas-dto.ts` → `src/service/canvas/*` → `src/presentation/serialize/canvas.ts` →
`src/presentation/actions/canvas.ts` → `src/app/app/canvas/*`

### 1. Pure DTO Types (`src/model/canvas-dto.ts`)

Contains TypeScript types only (no `mongodb`, no `@/dao`, no runtime code):

- `CanvasProjectSummaryDto`
- `CanvasFlowRunDto`
- `CanvasProjectDto`
- `CanvasJobDto`
- `CanvasLibraryAsset`
- `CanvasLibraryCharacterOption`
- `CanvasLibraryAssetsResult`
- `CreateCanvasProjectInput`
- `SaveCanvasProjectPatch`

`src/service/canvas/projects.ts` imports these types and `export type { ... }` re-exports them for
full backward compatibility.

### 2. Public DTO Serializers (`src/presentation/serialize/canvas.ts`)

Pure synchronous functions converting domain models (`CanvasProject`, `CanvasJob`,
`CanvasFlowRunState`) into client-safe DTOs:

- `serializeCanvasFlowRun(run: CanvasFlowRunState): CanvasFlowRunDto` — maps `flowRunId`, `status`,
  `currentWave`, `totalWaves`, `failedNodeIds ?? []`, and optional `error`. Eliminates the four
  duplicated inline mappings in `projects.ts` and `actions/canvas.ts`.
- `serializeCanvasProject(project: CanvasProject): CanvasProjectDto` — applies
  `failOrphanBusyNodes(project.nodes, project.activeFlowRun?.status === "running")` and
  `canvasGroupsForProject(project.nodes, project.groups)`, plus `serializeCanvasFlowRun` when
  `activeFlowRun` is present.
- `serializeCanvasProjectSummary(project: CanvasProject): CanvasProjectSummaryDto`
- `serializeCanvasJob(job: CanvasJob): CanvasJobDto`

Only `src/presentation/actions/canvas.ts` and `src/app/app/canvas/page.tsx` call these value
serializers, so both import directly from `@/presentation/serialize/canvas`. `src/service/` does not
import from `src/presentation/`, preserving strict one-way layering.

### 3. Unified Job Ledger (`src/service/canvas/job-ledger.ts`)

Single source of truth for `canvas_jobs` persistence, atomic USD credit refund, and
`canvas_projects.nodes.$.data` execution state updates.

#### Default DAO Writers (shared by `executor.ts` and `ffmpeg-ops.ts`)

```ts
export type CanvasJobUpdate = {
  $set?: Partial<CanvasJob>;
  $unset?: Partial<Record<keyof CanvasJob, "">>;
};

export type CanvasNodeStateUpdateInput = {
  canvasId: ObjectId;
  clerkUserId: string;
  nodeId: string;
  patch: Partial<CanvasNodeData>;
  thumbnailUrl?: string;
  updatedAt: Date;
};
```

- `defaultUpdateCanvasJob(jobId, clerkUserId, update)`: Runs `jobs.updateOne({ _id: jobId, clerkUserId }, mongoUpdate)` only when `$set` or `$unset` is non-empty.
- `defaultUpdateCanvasNodeState(input)`: Maps defined keys of `patch` to `$set["nodes.$.data.<key>"]`
  and `undefined` keys to `$unset["nodes.$.data.<key>"]`; sets `thumbnailUrl` when provided; and
  enforces the invariant that whenever `patch.status === "completed"` and `patch.outputUrl` is a
  non-empty string, `unsetFields["nodes.$.data.staleOutputUrl"] = ""` is always included.
- `defaultClaimCanvasJobRefund(jobId, clerkUserId, refundedAt)`: Atomically claims refund ownership
  via `findOneAndUpdate({ _id: jobId, clerkUserId, refundedAt: { $exists: false } }, { $set: { refundedAt, updatedAt: refundedAt } }, { returnDocument: "after" })`.

#### High-Level Settlement Operations (DI-friendly)

Each operation accepts a minimal structural subset of `CanvasExecutorDeps` (`LedgerDeps`) so existing
test fakes in `executor.test.ts` and `ffmpeg-ops.test.ts` work without change:

1. `refundCanvasJobOnce(jobId, clerkUserId, deps?)`: Claims `refundedAt` once and calls
   `refundCreditUsd(clerkUserId, claimed.chargedUsd, claimed.spendEventKey)` when
   `claimed.chargedUsd > 0`. Re-exported from `executor.ts`.
2. `markCanvasJobRunning(input, deps)`:
   - Updates `canvas_jobs` with `status: "running"`, optional `externalJobId`, `statusUrl`,
     `domainKind`, and `updatedAt`.
   - Updates the node state with `status: "running"`, `lastJobId`, `lastCostUsd`, and
     `lastError: undefined`.
   - Returns the updated `CanvasJob` object in memory.
3. `completeCanvasJob(input, deps)`:
   - Updates `canvas_jobs` with `status: "completed"`, `outputUrl`, `outputKind`, optional
     `externalJobId`, `updatedAt`, and `$unset: { error: "" }`.
   - Updates the node state with `status: "completed"`, `lastJobId`, `outputUrl`, `outputKind`,
     optional `lastCostUsd`, optional extra node fields (such as `text: out.srt` for
     `scro:auto-captions`), `lastError: undefined`, and sets `thumbnailUrl: outputUrl` when
     `updateThumbnail` is true (`outputKind === "image"` in `executor.ts`).
   - Returns the completed `CanvasJob` object in memory.
4. `failCanvasJob(input, deps)`:
   - When `refund !== false`, runs `refundCanvasJobOnce` first.
   - Updates `canvas_jobs` with `status: "failed"`, `error: errorMessage`, and `updatedAt`.
   - Updates the node state with `status: "failed"`, `lastJobId`, `lastError: errorMessage`, and
     optional `lastCostUsd`.
   - Returns the failed `CanvasJob` object (including `refundedAt` when newly refunded).

In `ffmpeg-ops.ts`, `executeCanvasFfmpegJob` replaces its inline MongoDB writers and completion/error
blocks with `defaultUpdateCanvasJob`, `defaultUpdateCanvasNodeState`, `completeCanvasJob`
(`updateThumbnail: false` to preserve current FFmpeg thumbnail behavior), and `failCanvasJob`
(`refund: false` when custom test `deps` omit refund helpers, or full refund support when wired).

### 4. Media Upload Service (`src/service/canvas/media-upload.ts`)

Extracts upload validation and Blob persistence from `actions/canvas.ts`:

- Exports `CANVAS_MAX_UPLOAD_BYTES` (`15 * 1024 * 1024`), `ALLOWED_UPLOAD_MIME_MAP`,
  `UploadCanvasMediaResult`, and `uploadCanvasMediaFromFormData(clerkUserId, formData, deps?)`.
- `deps` defaults to `{ persistBuffer, randomUUID: () => crypto.randomUUID() }` so unit tests verify
  missing files, empty files, >15 MB files, unsupported MIME types, MIME parameter stripping (e.g.
  `audio/webm;codecs=opus` vs `video/webm`), and Blob path generation (`canvas/uploads/<uid>/<uuid>.<ext>`)
  without touching Vercel Blob.

### 5. Canvas Execution Runtime Service (`src/service/canvas/runtime.ts`)

Extracts multi-step orchestration, user balance lookup, and dual-mode polling out of
`actions/canvas.ts`:

- `readCanvasUserCreditUsd(clerkUserId, deps?)`: Queries `usersCollection().findOne({ clerkUserId })`
  and computes `resolveUserUsdBalance(withUnlimitedCredits(user)).creditUsd` (0 if missing). Also
  used as `defaultGetUserCreditUsd` inside `executor.ts` so balance resolution lives in one place.
- `runCanvasNodeForUser(clerkUserId, input, deps?)`:
  1. If `nodes`, `edges`, or `viewport` is provided, calls `saveCanvasProject`; returns
     `{ ok: false, code: "NOT_FOUND", error: "找不到畫布專案" }` when missing.
  2. When `!input.flowRunId`, checks `startCanvasNodeAfterUpstream({ clerkUserId, canvasId, nodeId })`;
     if waiting on busy upstream nodes, returns `{ ok: true, waitingForUpstream: true, activeFlowRun, creditUsd }`.
  3. Otherwise delegates to `submitCanvasNodeJob({ clerkUserId, canvasId, nodeId, flowRunId, queueToWorker: true })`.
- `runCanvasFlowForUser(clerkUserId, input, deps?)`:
  1. Saves optional graph patch via `saveCanvasProject`.
  2. Starts the flow via `startCanvasFlowRun` and attaches fresh `creditUsd`.
- `pollCanvasJobsForUser(clerkUserId, input, deps?)`:
  - When `shouldUseWorkerQueueOnly()` is true: validates `canvasId` and `jobIds`, reads matching
    `canvas_jobs` documents directly, and pairs them with `readCanvasUserCreditUsd`.
  - When false: delegates to `pollCanvasJobs` so local dev actively polls upstream providers.
- `pollCanvasFlowForUser(clerkUserId, canvasId, deps?)`:
  1. Loads owned `CanvasProject` (returns `{ nodes: [], creditUsd: 0 }` if invalid/missing).
  2. When `!shouldUseWorkerQueueOnly()` and `project.activeFlowRun?.status === "running"`, settles
     `activeWaveJobIds` via `pollCanvasJobs` (swallowing transient errors), advances one wave via
     `executeCanvasFlowTask`, and reloads `project`.
  3. Runs `healFinishedCanvasRuns(clerkUserId, project._id, project.nodes)` and pairs with
     `readCanvasUserCreditUsd`.

### 6. Thin Server Actions (`src/presentation/actions/canvas.ts`)

- Retains `"use server"` and exports the exact same action functions and TypeScript types
  (`UploadCanvasMediaActionResult`, `RunCanvasNodeActionInput`, `RunCanvasNodeActionResult`,
  `PollCanvasJobsActionResult`, and all 14 `*Action` functions).
- Removes all imports of `@/dao`, `mongodb`, `persistBuffer`, `shouldUseWorkerQueueOnly`,
  `resolveUserUsdBalance`, and `withUnlimitedCredits`.
- Each action authenticates with `requireAppUser()`, calls the corresponding domain function in
  `projects.ts`, `folders.ts`, `media-upload.ts`, `runtime.ts`, `worker-runner.ts`, `model-catalog.ts`,
  or `character-outfit.ts`, and serializes domain records via `@/presentation/serialize/canvas`.

## Error Handling & Edge Cases

- **Transient Blob failure during poll (`settleCompletedJob`)**: `persistMedia` continues to run
  *before* `completeCanvasJob`. If `persistMedia` throws, `settleCompletedJob` logs a warning and
  returns the still-`running` job without calling `completeCanvasJob` or `failCanvasJob`, preserving
  retry-without-double-charge semantics.
- **Concurrent failure / timeout polls**: `failCanvasJob` delegates to `refundCanvasJobOnce`, whose
  `refundedAt: { $exists: false }` filter guarantees at most one `refundCreditUsd` call even if two
  pollers fail the same job simultaneously.
- **Stale preview badge clearing**: `defaultUpdateCanvasNodeState` centrally unsets
  `nodes.$.data.staleOutputUrl` whenever a completed output URL is written, covering sync image,
  async video, Scro tools, and FFmpeg uniformly.
- **Next.js `"use server"` module rules**: `src/presentation/actions/canvas.ts` only exports `async`
  functions and TypeScript types (no synchronous helpers or barrel value re-exports).

## Testing Strategy

1. **`src/presentation/serialize/canvas.test.ts` (new)**:
   - Verifies `serializeCanvasFlowRun`, `serializeCanvasProject` (including orphan busy node failure
     marking when flow is idle vs. preserved when flow is running), `serializeCanvasProjectSummary`,
     and `serializeCanvasJob`.
2. **`src/service/canvas/job-ledger.test.ts` (new)**:
   - Verifies `markCanvasJobRunning`, `completeCanvasJob` (including `staleOutputUrl` clearing,
     optional `text` patch, and conditional `thumbnailUrl`), `failCanvasJob` (single refund + node
     failure fields), and `refundCanvasJobOnce` idempotency.
3. **`src/service/canvas/media-upload.test.ts` (new)**:
   - Verifies empty/missing file rejection, >15 MB rejection, MIME allowlist & parameter stripping,
     and `persistBuffer` pathname format.
4. **`src/service/canvas/runtime.test.ts` (new)**:
   - Verifies `pollCanvasJobsForUser` in both worker-queue mode (DB-only read) and local mode
     (`pollCanvasJobs` delegation), `pollCanvasFlowForUser` local wave advancement + healing, and
     `runCanvasNodeForUser` upstream-waiting vs. direct job submission.
5. **Existing regression suite (unchanged)**:
   - `npx tsx --test 'src/service/canvas/**/*.test.ts'` (including `executor.test.ts`,
     `ffmpeg-ops.test.ts`, `worker-runner.test.ts`, `graph.test.ts`, `stale-outputs.test.ts`).
   - `npx tsc --noEmit` and `npx eslint` on all touched and created files.
