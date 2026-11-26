# Canvas Unified Job Ledger and Thin Server Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modularize Canvas DTOs/serializers, unify job and node state settlement into a single ledger, and extract runtime/upload logic out of `src/presentation/actions/canvas.ts` with zero behavioral regressions.

**Architecture:** Establish strict one-way layering (`src/model/canvas-dto.ts` → `src/service/canvas/*` → `src/presentation/serialize/canvas.ts` → `src/presentation/actions/canvas.ts`). Centralize all `canvas_jobs` transitions, single-refund claims, and `canvas_projects.nodes.$.data` write-backs in `src/service/canvas/job-ledger.ts`, and move multi-step polling, local flow advancement, user credit reads, and MIME upload checks into `src/service/canvas/runtime.ts` and `src/service/canvas/media-upload.ts`.

**Tech Stack:** TypeScript, Next.js App Router (`"use server"` Server Actions), MongoDB (`mongodb` driver), Zod, Node.js built-in test runner (`node:test` + `node:assert/strict` via `tsx`).

**Spec:** `docs/superpowers/specs/2026-11-26-canvas-ledger-and-thin-actions-design.md`

## Global Constraints

- Zero behavioral, API contract, error copy, billing, or MongoDB schema changes.
- `src/model/canvas-dto.ts` must have zero runtime imports (TypeScript `import type` only).
- `src/service/` modules must never import from `src/presentation/`.
- `src/service/canvas/projects.ts` must `export type` re-export all DTO types from `@/model/canvas-dto` so existing 20+ type callers compile unchanged.
- `src/presentation/actions/canvas.ts` must retain `"use server"` and export only `async` functions and TypeScript types (no synchronous functions or value re-exports), with zero direct imports from `@/dao` or `mongodb`.
- Never make live paid provider calls or Higgsfield calls in tests; use pure functions and injected `deps` fakes.
- Verify with `npx tsx --test <file>`, `npx tsc --noEmit`, and `npx eslint <files>`.

---

### Task 1: Pure Canvas DTO Types and Presentation Serializers

**Files:**
- Create: `src/model/canvas-dto.ts`
- Create: `src/presentation/serialize/canvas.ts`
- Create: `src/presentation/serialize/canvas.test.ts`
- Modify: `src/service/canvas/projects.ts`
- Modify: `src/app/app/canvas/page.tsx`

**Interfaces:**
- Consumes: `CanvasProject`, `CanvasJob`, `CanvasFlowRunState`, `CanvasEdge`, `CanvasGroup`, `CanvasNode`, `CanvasViewport`, `CanvasJobStatus`, `CanvasOutputKind` from `@/model/canvas`; `CanvasModelProvider` from `@/service/canvas/model-catalog`; `failOrphanBusyNodes` from `@/service/canvas/orphan-busy`; `canvasGroupsForProject` from `@/service/canvas/groups`.
- Produces:
  - `@/model/canvas-dto`: `CanvasProjectSummaryDto`, `CanvasFlowRunDto`, `CanvasProjectDto`, `CanvasJobDto`, `CanvasLibraryAsset`, `CanvasLibraryCharacterOption`, `CanvasLibraryAssetsResult`, `CreateCanvasProjectInput`, `SaveCanvasProjectPatch`.
  - `@/presentation/serialize/canvas`:
    - `serializeCanvasFlowRun(run: CanvasFlowRunState): CanvasFlowRunDto`
    - `serializeCanvasProject(project: CanvasProject): CanvasProjectDto`
    - `serializeCanvasProjectSummary(project: CanvasProject): CanvasProjectSummaryDto`
    - `serializeCanvasJob(job: CanvasJob): CanvasJobDto`

- [ ] **Step 1: Write the failing serializer unit test**

Create `src/presentation/serialize/canvas.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob, CanvasProject } from "@/model/canvas";
import {
  serializeCanvasFlowRun,
  serializeCanvasJob,
  serializeCanvasProject,
  serializeCanvasProjectSummary,
} from "@/presentation/serialize/canvas";

describe("presentation/serialize/canvas", () => {
  it("serializes flow run state with defaulted failedNodeIds and optional error", () => {
    const dto = serializeCanvasFlowRun({
      flowRunId: "flow-1",
      status: "running",
      currentWave: 2,
      totalWaves: 4,
      waveIndex: 1,
      waves: [["n1"], ["n2"]],
      activeWaveJobIds: ["j2"],
      failedNodeIds: ["n0"],
      error: "Clip failed",
      startedAt: new Date("2026-11-26T00:00:00.000Z"),
      updatedAt: new Date("2026-11-26T00:01:00.000Z"),
    });

    assert.deepEqual(dto, {
      flowRunId: "flow-1",
      status: "running",
      currentWave: 2,
      totalWaves: 4,
      failedNodeIds: ["n0"],
      error: "Clip failed",
    });
  });

  it("marks orphan busy nodes failed when no flow is running and preserves them when flow is running", () => {
    const baseProject: CanvasProject = {
      _id: new ObjectId("674500000000000000000001"),
      clerkUserId: "user_1",
      title: "Demo Canvas",
      thumbnailUrl: "https://blob.example/thumb.png",
      viewport: { x: 10, y: 20, zoom: 1.25 },
      nodes: [
        {
          id: "m1",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", status: "running" },
        },
      ],
      edges: [],
      createdAt: new Date("2026-11-26T01:00:00.000Z"),
      updatedAt: new Date("2026-11-26T02:00:00.000Z"),
    };

    const idleSerialized = serializeCanvasProject(baseProject);
    assert.equal(idleSerialized.id, "674500000000000000000001");
    assert.equal(idleSerialized.nodes[0]?.data.status, "failed");
    assert.equal(idleSerialized.activeFlowRun, undefined);

    const runningSerialized = serializeCanvasProject({
      ...baseProject,
      activeFlowRun: {
        flowRunId: "flow-live",
        status: "running",
        currentWave: 1,
        totalWaves: 1,
        waveIndex: 0,
        waves: [["m1"]],
        activeWaveJobIds: [],
        failedNodeIds: [],
        startedAt: new Date("2026-11-26T01:30:00.000Z"),
        updatedAt: new Date("2026-11-26T01:30:00.000Z"),
      },
    });
    assert.equal(runningSerialized.nodes[0]?.data.status, "running");
    assert.equal(runningSerialized.activeFlowRun?.flowRunId, "flow-live");
  });

  it("serializes project summary and job DTOs with ISO timestamps", () => {
    const projectId = new ObjectId("674500000000000000000002");
    const folderId = new ObjectId("674500000000000000000003");
    const jobId = new ObjectId("674500000000000000000004");

    const summary = serializeCanvasProjectSummary({
      _id: projectId,
      clerkUserId: "user_1",
      title: "Summary Canvas",
      folderId,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        { id: "p1", type: "prompt", position: { x: 0, y: 0 }, data: { text: "hi" } },
      ],
      edges: [],
      createdAt: new Date("2026-11-26T03:00:00.000Z"),
      updatedAt: new Date("2026-11-26T04:00:00.000Z"),
    });

    assert.deepEqual(summary, {
      id: "674500000000000000000002",
      title: "Summary Canvas",
      nodeCount: 1,
      folderId: "674500000000000000000003",
      createdAt: "2026-11-26T03:00:00.000Z",
      updatedAt: "2026-11-26T04:00:00.000Z",
    });

    const job: CanvasJob = {
      _id: jobId,
      clerkUserId: "user_1",
      canvasId: projectId,
      nodeId: "m1",
      flowRunId: "flow-9",
      provider: "openrouter",
      modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      providerModelId: "bytedance-seed/seedream-5-0-pro",
      presetId: "16:9",
      status: "completed",
      externalJobId: "ext-1",
      inputSnapshot: {},
      chargedUsd: 0.135,
      outputUrl: "https://blob.example/out.png",
      outputKind: "image",
      createdAt: new Date("2026-11-26T05:00:00.000Z"),
      updatedAt: new Date("2026-11-26T05:00:05.000Z"),
    };

    assert.deepEqual(serializeCanvasJob(job), {
      id: "674500000000000000000004",
      canvasId: "674500000000000000000002",
      nodeId: "m1",
      flowRunId: "flow-9",
      provider: "openrouter",
      modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      providerModelId: "bytedance-seed/seedream-5-0-pro",
      presetId: "16:9",
      status: "completed",
      externalJobId: "ext-1",
      chargedUsd: 0.135,
      outputUrl: "https://blob.example/out.png",
      outputKind: "image",
      createdAt: "2026-11-26T05:00:00.000Z",
      updatedAt: "2026-11-26T05:00:05.000Z",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/presentation/serialize/canvas.test.ts`
Expected: FAIL with `Cannot find module '@/presentation/serialize/canvas'`

- [ ] **Step 3: Create `src/model/canvas-dto.ts` and `src/presentation/serialize/canvas.ts`, and update `projects.ts` & `page.tsx`**

Create `src/model/canvas-dto.ts`:

```ts
// Pure JSON-safe DTO and input types for the Interactive Node Canvas Editor (/app/canvas).
// Zero runtime or database imports so Client Components can safely import these types.

import type {
  CanvasEdge,
  CanvasFlowRunStatus,
  CanvasGroup,
  CanvasJobStatus,
  CanvasNode,
  CanvasOutputKind,
  CanvasViewport,
} from "@/model/canvas";
import type { CanvasModelProvider } from "@/service/canvas/model-catalog";

export type CanvasProjectSummaryDto = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  nodeCount: number;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CanvasFlowRunDto = {
  flowRunId: string;
  status: CanvasFlowRunStatus;
  currentWave: number;
  totalWaves: number;
  failedNodeIds: string[];
  error?: string;
};

export type CanvasProjectDto = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  viewport: CanvasViewport;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups: CanvasGroup[];
  activeFlowRun?: CanvasFlowRunDto;
  createdAt: string;
  updatedAt: string;
};

export type CanvasJobDto = {
  id: string;
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
  provider: CanvasModelProvider;
  modelId: string;
  providerModelId: string;
  presetId?: string;
  status: CanvasJobStatus;
  externalJobId?: string;
  chargedUsd: number;
  refundedAt?: string;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type CanvasLibraryAsset = {
  id: string;
  source: "character" | "product" | "canvas_output" | "outfit";
  name: string;
  mediaKind: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  // Face and standing figure, shown together when this asset is a character choice.
  portraitUrl?: string;
  fullBodyUrl?: string;
  createdAt: string;
  // Set on outfit tiles so a drop lands on the matching character input.
  outfitPart?: "hair" | "top" | "pants" | "shoes" | "accessory" | "look";
  outfitPrompt?: string;
  characterId?: string;
};

export type CanvasLibraryCharacterOption = {
  id: string;
  name: string;
  previewUrl?: string;
  // Identity close-up and standing figure, shown together in the character menu.
  portraitUrl?: string;
  fullBodyUrl?: string;
};

export type CanvasLibraryAssetsResult = {
  characters: CanvasLibraryAsset[];
  outfits: CanvasLibraryAsset[];
  products: CanvasLibraryAsset[];
  recentOutputs: CanvasLibraryAsset[];
  characterOptions: CanvasLibraryCharacterOption[];
};

export type CreateCanvasProjectInput = {
  title?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
  thumbnailUrl?: string;
  folderId?: string;
};

export type SaveCanvasProjectPatch = {
  title?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  groups?: CanvasGroup[];
  viewport?: CanvasViewport;
  thumbnailUrl?: string;
};
```

Create `src/presentation/serialize/canvas.ts`:

```ts
// Public JSON-safe DTO serializers for Canvas projects, jobs, and active flow runs.

import type {
  CanvasFlowRunState,
  CanvasJob,
  CanvasProject,
} from "@/model/canvas";
import type {
  CanvasFlowRunDto,
  CanvasJobDto,
  CanvasProjectDto,
  CanvasProjectSummaryDto,
} from "@/model/canvas-dto";
import { canvasGroupsForProject } from "@/service/canvas/groups";
import { failOrphanBusyNodes } from "@/service/canvas/orphan-busy";

// Converts persisted flow run state into a compact client DTO.
export function serializeCanvasFlowRun(
  run: Pick<
    CanvasFlowRunState,
    "flowRunId" | "status" | "currentWave" | "totalWaves" | "failedNodeIds" | "error"
  >,
): CanvasFlowRunDto {
  return {
    flowRunId: run.flowRunId,
    status: run.status,
    currentWave: run.currentWave,
    totalWaves: run.totalWaves,
    failedNodeIds: run.failedNodeIds ?? [],
    ...(run.error ? { error: run.error } : {}),
  };
}

// Serializes a MongoDB CanvasProject into a plain JSON-safe DTO for Client Components.
export function serializeCanvasProject(project: CanvasProject): CanvasProjectDto {
  return {
    id: project._id.toHexString(),
    title: project.title,
    ...(project.thumbnailUrl ? { thumbnailUrl: project.thumbnailUrl } : {}),
    viewport: project.viewport,
    nodes: failOrphanBusyNodes(
      project.nodes,
      project.activeFlowRun?.status === "running",
    ),
    edges: project.edges,
    groups: canvasGroupsForProject(project.nodes, project.groups),
    ...(project.activeFlowRun
      ? { activeFlowRun: serializeCanvasFlowRun(project.activeFlowRun) }
      : {}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// Serializes a CanvasProject into a lightweight list item for the project switcher dropdown.
export function serializeCanvasProjectSummary(
  project: CanvasProject,
): CanvasProjectSummaryDto {
  return {
    id: project._id.toHexString(),
    title: project.title,
    ...(project.thumbnailUrl ? { thumbnailUrl: project.thumbnailUrl } : {}),
    nodeCount: project.nodes.length,
    ...(project.folderId ? { folderId: project.folderId.toHexString() } : {}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// Serializes a MongoDB CanvasJob into a plain JSON-safe DTO for Server Actions.
export function serializeCanvasJob(job: CanvasJob): CanvasJobDto {
  return {
    id: job._id.toHexString(),
    canvasId: job.canvasId.toHexString(),
    nodeId: job.nodeId,
    ...(job.flowRunId ? { flowRunId: job.flowRunId } : {}),
    provider: job.provider,
    modelId: job.modelId,
    providerModelId: job.providerModelId,
    ...(job.presetId ? { presetId: job.presetId } : {}),
    status: job.status,
    ...(job.externalJobId ? { externalJobId: job.externalJobId } : {}),
    chargedUsd: job.chargedUsd,
    ...(job.refundedAt ? { refundedAt: job.refundedAt.toISOString() } : {}),
    ...(job.outputUrl ? { outputUrl: job.outputUrl } : {}),
    ...(job.outputKind ? { outputKind: job.outputKind } : {}),
    ...(job.error ? { error: job.error } : {}),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
```

Update `src/service/canvas/projects.ts`:
- Replace the inline DTO/input type definitions (lines 39–142) with imports and `export type` re-exports from `@/model/canvas-dto`.
- Remove `serializeCanvasProject`, `serializeCanvasProjectSummary`, and `serializeCanvasJob` (lines 153–216), plus the now-unused `canvasGroupsForProject`, `failOrphanBusyNodes`, `CanvasEdge`, `CanvasGroup`, `CanvasJob`, `CanvasJobStatus`, `CanvasOutputKind`, and `CanvasModelProvider` imports from `projects.ts`.
- Update `src/presentation/actions/canvas.ts` and `src/app/app/canvas/page.tsx` to import `serializeCanvasProject`, `serializeCanvasProjectSummary`, `serializeCanvasJob`, and `serializeCanvasFlowRun` from `@/presentation/serialize/canvas`.

- [ ] **Step 4: Run tests and typecheck to verify everything passes**

Run:
```bash
npx tsx --test src/presentation/serialize/canvas.test.ts src/service/canvas/folders.test.ts src/service/canvas/character-library-images.test.ts && npx tsc --noEmit
```
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/model/canvas-dto.ts src/presentation/serialize/canvas.ts src/presentation/serialize/canvas.test.ts src/service/canvas/projects.ts src/presentation/actions/canvas.ts src/app/app/canvas/page.tsx
git commit -m "Canvas: extract DB-free DTO types and presentation serializers."
```

---

### Task 2: Unified Canvas Job Ledger (`job-ledger.ts`)

**Files:**
- Create: `src/service/canvas/job-ledger.ts`
- Create: `src/service/canvas/job-ledger.test.ts`
- Modify: `src/service/canvas/executor.ts`
- Modify: `src/service/canvas/ffmpeg-ops.ts`

**Interfaces:**
- Consumes: `canvasJobsCollection`, `canvasProjectsCollection` from `@/dao`; `CanvasJob`, `CanvasJobDomainKind`, `CanvasNodeData`, `CanvasOutputKind` from `@/model/canvas`; `refundCreditUsd` from `@/service/billing/credits`.
- Produces (`src/service/canvas/job-ledger.ts`):
  - `CanvasJobUpdate`, `CanvasNodeStateUpdateInput`, `RefundCanvasJobResult`, `CanvasJobLedgerDeps`
  - `defaultUpdateCanvasJob(jobId: ObjectId, clerkUserId: string, update: CanvasJobUpdate): Promise<void>`
  - `defaultUpdateCanvasNodeState(input: CanvasNodeStateUpdateInput): Promise<void>`
  - `defaultClaimCanvasJobRefund(jobId: ObjectId, clerkUserId: string, refundedAt: Date): Promise<CanvasJob | null>`
  - `refundCanvasJobOnce(jobId: string | ObjectId, clerkUserId: string, deps?: Partial<CanvasJobRefundDeps>): Promise<RefundCanvasJobResult>`
  - `markCanvasJobRunning(input: MarkCanvasJobRunningInput, deps: CanvasJobWriteDeps): Promise<CanvasJob>`
  - `completeCanvasJob(input: CompleteCanvasJobInput, deps: CanvasJobWriteDeps): Promise<CanvasJob>`
  - `failCanvasJob(input: FailCanvasJobInput, deps: CanvasJobFailDeps): Promise<CanvasJob>`

- [ ] **Step 1: Write the failing unit tests for `job-ledger.ts`**

Create `src/service/canvas/job-ledger.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob, CanvasNodeData } from "@/model/canvas";
import {
  type CanvasJobUpdate,
  type CanvasNodeStateUpdateInput,
  buildCanvasNodeMongoUpdate,
  completeCanvasJob,
  failCanvasJob,
  markCanvasJobRunning,
  refundCanvasJobOnce,
} from "@/service/canvas/job-ledger";

function makeBaseJob(overrides: Partial<CanvasJob> = {}): CanvasJob {
  return {
    _id: new ObjectId("674500000000000000000010"),
    clerkUserId: "user_ledger",
    canvasId: new ObjectId("674500000000000000000020"),
    nodeId: "node-1",
    provider: "openrouter",
    modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
    providerModelId: "bytedance-seed/seedream-5-0-pro",
    status: "queued",
    inputSnapshot: {},
    chargedUsd: 0.135,
    spendEventKey: "canvas_job:674500000000000000000010",
    outputKind: "image",
    createdAt: new Date("2026-11-26T00:00:00.000Z"),
    updatedAt: new Date("2026-11-26T00:00:00.000Z"),
    ...overrides,
  };
}

describe("service/canvas/job-ledger", () => {
  it("buildCanvasNodeMongoUpdate unsets staleOutputUrl on completed output and sets thumbnailUrl", () => {
    const now = new Date("2026-11-26T01:00:00.000Z");
    const doc = buildCanvasNodeMongoUpdate({
      patch: {
        status: "completed",
        outputUrl: "https://blob.example/img.png",
        outputKind: "image",
        lastError: undefined,
      },
      thumbnailUrl: "https://blob.example/img.png",
      updatedAt: now,
    });

    assert.deepEqual(doc, {
      $set: {
        updatedAt: now,
        "nodes.$.data.status": "completed",
        "nodes.$.data.outputUrl": "https://blob.example/img.png",
        "nodes.$.data.outputKind": "image",
        thumbnailUrl: "https://blob.example/img.png",
      },
      $unset: {
        "nodes.$.data.lastError": "",
        "nodes.$.data.staleOutputUrl": "",
      },
    });
  });

  it("markCanvasJobRunning updates both job record and node state consistently", async () => {
    const jobWrites: CanvasJobUpdate[] = [];
    const nodeWrites: CanvasNodeStateUpdateInput[] = [];
    const job = makeBaseJob();
    const now = new Date("2026-11-26T01:05:00.000Z");

    const updated = await markCanvasJobRunning(
      {
        job,
        externalJobId: "ext-42",
        statusUrl: "https://api.example/status/42",
        domainKind: "video",
        updatedAt: now,
      },
      {
        updateCanvasJob: async (_id, _uid, u) => {
          jobWrites.push(u);
        },
        updateCanvasNodeState: async (input) => {
          nodeWrites.push(input);
        },
      },
    );

    assert.equal(updated.status, "running");
    assert.equal(updated.externalJobId, "ext-42");
    assert.equal(updated.statusUrl, "https://api.example/status/42");
    assert.equal(updated.domainKind, "video");
    assert.equal(jobWrites.length, 1);
    assert.equal(nodeWrites[0]?.patch.status, "running");
    assert.equal(nodeWrites[0]?.patch.lastError, undefined);
  });

  it("completeCanvasJob writes output, extra node fields, optional thumbnail, and clears job error", async () => {
    const jobWrites: CanvasJobUpdate[] = [];
    const nodeWrites: CanvasNodeStateUpdateInput[] = [];
    const job = makeBaseJob({ error: "transient old error" });
    const now = new Date("2026-11-26T01:10:00.000Z");

    const completed = await completeCanvasJob(
      {
        job,
        outputUrl: "https://blob.example/final.png",
        outputKind: "image",
        externalJobId: "req-9",
        extraNodePatch: { text: "caption body" } satisfies Partial<CanvasNodeData>,
        updateThumbnail: true,
        completedAt: now,
      },
      {
        updateCanvasJob: async (_id, _uid, u) => {
          jobWrites.push(u);
        },
        updateCanvasNodeState: async (input) => {
          nodeWrites.push(input);
        },
      },
    );

    assert.equal(completed.status, "completed");
    assert.equal(completed.outputUrl, "https://blob.example/final.png");
    assert.equal(completed.error, undefined);
    assert.deepEqual(jobWrites[0]?.$unset, { error: "" });
    assert.equal(nodeWrites[0]?.thumbnailUrl, "https://blob.example/final.png");
    assert.equal(nodeWrites[0]?.patch.text, "caption body");
  });

  it("failCanvasJob claims refund at most once and writes failure to job and node", async () => {
    let claimedOnce = false;
    const refunds: Array<{ amount: number; key?: string }> = [];
    const job = makeBaseJob();
    const failedAt = new Date("2026-11-26T01:15:00.000Z");

    const deps = {
      claimCanvasJobRefund: async () => {
        if (claimedOnce) return null;
        claimedOnce = true;
        return { ...job, refundedAt: failedAt };
      },
      refundCreditUsd: async (_uid: string, amount: number, key?: string) => {
        refunds.push({ amount, key });
      },
      now: () => failedAt,
      updateCanvasJob: async () => {},
      updateCanvasNodeState: async () => {},
    };

    const first = await failCanvasJob(
      { job, errorMessage: "Provider timeout", failedAt },
      deps,
    );
    const secondRefund = await refundCanvasJobOnce(job._id, job.clerkUserId, deps);

    assert.equal(first.status, "failed");
    assert.equal(first.error, "Provider timeout");
    assert.deepEqual(first.refundedAt, failedAt);
    assert.equal(refunds.length, 1);
    assert.equal(refunds[0]?.amount, 0.135);
    assert.deepEqual(secondRefund, {
      refunded: false,
      alreadyRefunded: true,
      refundedUsd: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/job-ledger.test.ts`
Expected: FAIL with `Cannot find module '@/service/canvas/job-ledger'`

- [ ] **Step 3: Implement `src/service/canvas/job-ledger.ts` and refactor `executor.ts` & `ffmpeg-ops.ts` to use it**

Create `src/service/canvas/job-ledger.ts`:

```ts
// Authoritative ledger for `canvas_jobs` state transitions, single-refund guarantees,
// and `canvas_projects.nodes.$.data` execution state write-backs.

import { ObjectId } from "mongodb";
import { canvasJobsCollection, canvasProjectsCollection } from "@/dao";
import type {
  CanvasJob,
  CanvasJobDomainKind,
  CanvasNodeData,
  CanvasOutputKind,
} from "@/model/canvas";
import { refundCreditUsd } from "@/service/billing/credits";

export type CanvasJobUpdate = {
  $set?: Partial<CanvasJob>;
  $unset?: Partial<Record<keyof CanvasJob, "" | 1>>;
};

export type CanvasNodeStateUpdateInput = {
  canvasId: ObjectId;
  clerkUserId: string;
  nodeId: string;
  patch: Partial<CanvasNodeData>;
  thumbnailUrl?: string;
  updatedAt: Date;
};

export type RefundCanvasJobResult = {
  refunded: boolean;
  alreadyRefunded: boolean;
  refundedUsd: number;
};

export type CanvasJobWriteDeps = {
  updateCanvasJob: (
    jobId: ObjectId,
    clerkUserId: string,
    update: CanvasJobUpdate,
  ) => Promise<void>;
  updateCanvasNodeState: (input: CanvasNodeStateUpdateInput) => Promise<void>;
};

export type CanvasJobRefundDeps = {
  claimCanvasJobRefund: (
    jobId: ObjectId,
    clerkUserId: string,
    refundedAt: Date,
  ) => Promise<CanvasJob | null>;
  refundCreditUsd: (
    clerkUserId: string,
    amountUsd: number,
    spendKey?: string,
  ) => Promise<unknown>;
  now: () => Date;
};

export type CanvasJobFailDeps = CanvasJobWriteDeps & Partial<CanvasJobRefundDeps>;

// Pure MongoDB `$set` / `$unset` builder for updating a single node's execution fields.
export function buildCanvasNodeMongoUpdate(input: {
  patch: Partial<CanvasNodeData>;
  thumbnailUrl?: string;
  updatedAt: Date;
}): Record<string, unknown> {
  const setFields: Record<string, unknown> = { updatedAt: input.updatedAt };
  const unsetFields: Record<string, ""> = {};

  for (const [key, value] of Object.entries(input.patch) as Array<
    [keyof CanvasNodeData, unknown]
  >) {
    const path = `nodes.$.data.${key}`;
    if (value === undefined) {
      unsetFields[path] = "";
    } else {
      setFields[path] = value;
    }
  }
  if (input.thumbnailUrl) {
    setFields.thumbnailUrl = input.thumbnailUrl;
  }
  // A finished rerun is the current preview, even if this node was marked old.
  if (
    input.patch.status === "completed" &&
    typeof input.patch.outputUrl === "string" &&
    input.patch.outputUrl.trim()
  ) {
    unsetFields["nodes.$.data.staleOutputUrl"] = "";
  }

  const updateDoc: Record<string, unknown> = { $set: setFields };
  if (Object.keys(unsetFields).length > 0) {
    updateDoc.$unset = unsetFields;
  }
  return updateDoc;
}

export async function defaultUpdateCanvasJob(
  jobId: ObjectId,
  clerkUserId: string,
  update: CanvasJobUpdate,
): Promise<void> {
  const jobs = await canvasJobsCollection();
  const mongoUpdate: Record<string, unknown> = {};
  if (update.$set && Object.keys(update.$set).length > 0) {
    mongoUpdate.$set = update.$set;
  }
  if (update.$unset && Object.keys(update.$unset).length > 0) {
    mongoUpdate.$unset = update.$unset;
  }
  if (Object.keys(mongoUpdate).length === 0) return;
  await jobs.updateOne({ _id: jobId, clerkUserId }, mongoUpdate);
}

export async function defaultUpdateCanvasNodeState(
  input: CanvasNodeStateUpdateInput,
): Promise<void> {
  const projects = await canvasProjectsCollection();
  const updateDoc = buildCanvasNodeMongoUpdate({
    patch: input.patch,
    thumbnailUrl: input.thumbnailUrl,
    updatedAt: input.updatedAt,
  });
  await projects.updateOne(
    { _id: input.canvasId, clerkUserId: input.clerkUserId, "nodes.id": input.nodeId },
    updateDoc,
  );
}

export async function defaultClaimCanvasJobRefund(
  jobId: ObjectId,
  clerkUserId: string,
  refundedAt: Date,
): Promise<CanvasJob | null> {
  const jobs = await canvasJobsCollection();
  return jobs.findOneAndUpdate(
    {
      _id: jobId,
      clerkUserId,
      refundedAt: { $exists: false },
    },
    {
      $set: { refundedAt, updatedAt: refundedAt },
    },
    { returnDocument: "after" },
  );
}

// Atomically marks `refundedAt` on `canvas_jobs` (`refundedAt: { $exists: false }`)
// before refunding USD credit so concurrent polls or retries can never double-refund.
export async function refundCanvasJobOnce(
  jobId: string | ObjectId,
  clerkUserId: string,
  deps?: Partial<CanvasJobRefundDeps>,
): Promise<RefundCanvasJobResult> {
  const claim = deps?.claimCanvasJobRefund ?? defaultClaimCanvasJobRefund;
  const refund = deps?.refundCreditUsd ?? refundCreditUsd;
  const now = deps?.now ?? (() => new Date());

  const objectId =
    typeof jobId === "string"
      ? ObjectId.isValid(jobId)
        ? new ObjectId(jobId)
        : null
      : jobId;

  if (!objectId) {
    return { refunded: false, alreadyRefunded: false, refundedUsd: 0 };
  }

  const claimed = await claim(objectId, clerkUserId, now());
  if (!claimed) {
    return { refunded: false, alreadyRefunded: true, refundedUsd: 0 };
  }

  if (claimed.chargedUsd > 0) {
    await refund(clerkUserId, claimed.chargedUsd, claimed.spendEventKey);
  }

  return {
    refunded: true,
    alreadyRefunded: false,
    refundedUsd: claimed.chargedUsd,
  };
}

export type MarkCanvasJobRunningInput = {
  job: CanvasJob;
  externalJobId?: string;
  statusUrl?: string;
  domainKind?: CanvasJobDomainKind;
  updatedAt: Date;
};

export async function markCanvasJobRunning(
  input: MarkCanvasJobRunningInput,
  deps: CanvasJobWriteDeps,
): Promise<CanvasJob> {
  const { job, externalJobId, statusUrl, domainKind, updatedAt } = input;
  const jobIdHex = job._id.toHexString();

  await deps.updateCanvasJob(job._id, job.clerkUserId, {
    $set: {
      status: "running",
      ...(externalJobId !== undefined ? { externalJobId } : {}),
      ...(statusUrl !== undefined ? { statusUrl } : {}),
      ...(domainKind !== undefined ? { domainKind } : {}),
      updatedAt,
    },
  });

  await deps.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "running",
      lastJobId: jobIdHex,
      lastCostUsd: job.chargedUsd,
      lastError: undefined,
    },
    updatedAt,
  });

  return {
    ...job,
    status: "running",
    ...(externalJobId !== undefined ? { externalJobId } : {}),
    ...(statusUrl !== undefined ? { statusUrl } : {}),
    ...(domainKind !== undefined ? { domainKind } : {}),
    updatedAt,
  };
}

export type CompleteCanvasJobInput = {
  job: CanvasJob;
  outputUrl: string;
  outputKind: CanvasOutputKind;
  externalJobId?: string;
  statusUrl?: string;
  extraNodePatch?: Partial<CanvasNodeData>;
  includeCostInNode?: boolean;
  updateThumbnail?: boolean;
  completedAt: Date;
};

export async function completeCanvasJob(
  input: CompleteCanvasJobInput,
  deps: CanvasJobWriteDeps,
): Promise<CanvasJob> {
  const {
    job,
    outputUrl,
    outputKind,
    externalJobId,
    statusUrl,
    extraNodePatch,
    includeCostInNode = true,
    updateThumbnail = false,
    completedAt,
  } = input;
  const jobIdHex = job._id.toHexString();

  await deps.updateCanvasJob(job._id, job.clerkUserId, {
    $set: {
      status: "completed",
      ...(externalJobId !== undefined ? { externalJobId } : {}),
      ...(statusUrl !== undefined ? { statusUrl } : {}),
      outputUrl,
      outputKind,
      updatedAt: completedAt,
    },
    $unset: { error: "" },
  });

  await deps.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "completed",
      lastJobId: jobIdHex,
      outputUrl,
      outputKind,
      ...(includeCostInNode ? { lastCostUsd: job.chargedUsd } : {}),
      ...extraNodePatch,
      lastError: undefined,
    },
    ...(updateThumbnail ? { thumbnailUrl: outputUrl } : {}),
    updatedAt: completedAt,
  });

  const next: CanvasJob = {
    ...job,
    status: "completed",
    ...(externalJobId !== undefined ? { externalJobId } : {}),
    ...(statusUrl !== undefined ? { statusUrl } : {}),
    outputUrl,
    outputKind,
    updatedAt: completedAt,
  };
  delete next.error;
  return next;
}

export type FailCanvasJobInput = {
  job: CanvasJob;
  errorMessage: string;
  failedAt: Date;
  refund?: boolean;
  includeCostInNode?: boolean;
};

export async function failCanvasJob(
  input: FailCanvasJobInput,
  deps: CanvasJobFailDeps,
): Promise<CanvasJob> {
  const {
    job,
    errorMessage,
    failedAt,
    refund = true,
    includeCostInNode = true,
  } = input;

  const refundResult = refund
    ? await refundCanvasJobOnce(job._id, job.clerkUserId, {
        claimCanvasJobRefund: deps.claimCanvasJobRefund,
        refundCreditUsd: deps.refundCreditUsd,
        now: deps.now ?? (() => failedAt),
      })
    : { refunded: false, alreadyRefunded: false, refundedUsd: 0 };

  await deps.updateCanvasJob(job._id, job.clerkUserId, {
    $set: {
      status: "failed",
      error: errorMessage,
      updatedAt: failedAt,
    },
  });

  await deps.updateCanvasNodeState({
    canvasId: job.canvasId,
    clerkUserId: job.clerkUserId,
    nodeId: job.nodeId,
    patch: {
      status: "failed",
      lastJobId: job._id.toHexString(),
      lastError: errorMessage,
      ...(includeCostInNode ? { lastCostUsd: job.chargedUsd } : {}),
    },
    updatedAt: failedAt,
  });

  return {
    ...job,
    status: "failed",
    error: errorMessage,
    ...(refundResult.refunded ? { refundedAt: failedAt } : {}),
    updatedAt: failedAt,
  };
}
```

Update `src/service/canvas/executor.ts`:
- Import and re-export `RefundCanvasJobResult` and `refundCanvasJobOnce` from `@/service/canvas/job-ledger`.
- In `createDefaultDeps()`, replace the inline `updateCanvasNodeState`, `updateCanvasJob`, and `claimCanvasJobRefund` implementations with `defaultUpdateCanvasNodeState`, `defaultUpdateCanvasJob`, and `defaultClaimCanvasJobRefund` from `@/service/canvas/job-ledger`.
- Replace the duplicated job + node write-back blocks in:
  - `settleSubmittedVideo` (both `completed` and `running` branches)
  - `executeDispatchedCanvasJob`:
    - Branch 1 sync image (`completeCanvasJob` with `updateThumbnail: true`)
    - Branch 3 async OpenRouter/MiniMax video (delegate to `settleSubmittedVideo` or `markCanvasJobRunning`)
    - Branch 4 FFmpeg enqueue (`markCanvasJobRunning` with `domainKind: "worker_ffmpeg"`)
    - Branch 5 `scro:auto-captions` (`completeCanvasJob` with `extraNodePatch: { text: out.srt }`), sync Scro tools (`completeCanvasJob` with `updateThumbnail: out.outputKind === "image"`), and async Scro tools (`markCanvasJobRunning` with `domainKind: submitted.domainKind`)
    - Mentalok `completed` (`completeCanvasJob` with `updateThumbnail: outputKind === "image"`) and `running` (`markCanvasJobRunning`)
    - `catch (error)` block (`failCanvasJob`)
  - `settleCompletedJob` (`completeCanvasJob` after `persistMedia` succeeds, `updateThumbnail: outputKind === "image"`)
  - `settleFailedJob` (`failCanvasJob`)

Update `src/service/canvas/ffmpeg-ops.ts`:
- Replace the inline `updateCanvasJob` and `updateCanvasNodeState` defaults with `defaultUpdateCanvasJob` and `defaultUpdateCanvasNodeState` from `@/service/canvas/job-ledger`.
- Replace the inline completion and `catch` error blocks (lines 545–581) with `completeCanvasJob({ job, outputUrl, outputKind: produced.kind, includeCostInNode: false, updateThumbnail: false, completedAt: now }, resolved)` and `failCanvasJob({ job, errorMessage: message, failedAt: now, refund: false, includeCostInNode: false }, resolved)` so existing `ffmpeg-ops.test.ts` expectations match identically while sharing the central node state writer.

- [ ] **Step 4: Run unit tests to verify zero regressions**

Run:
```bash
npx tsx --test src/service/canvas/job-ledger.test.ts src/service/canvas/executor.test.ts src/service/canvas/ffmpeg-ops.test.ts && npx tsc --noEmit
```
Expected: PASS (all new ledger tests plus all existing `executor.test.ts` and `ffmpeg-ops.test.ts` suites pass).

- [ ] **Step 5: Commit Task 2**

```bash
git add src/service/canvas/job-ledger.ts src/service/canvas/job-ledger.test.ts src/service/canvas/executor.ts src/service/canvas/ffmpeg-ops.ts
git commit -m "Canvas: centralize job transitions, refunds, and node write-backs in job-ledger."
```

---

### Task 3: Canvas Media Upload Domain Service (`media-upload.ts`)

**Files:**
- Create: `src/service/canvas/media-upload.ts`
- Create: `src/service/canvas/media-upload.test.ts`

**Interfaces:**
- Consumes: `CanvasMediaKind` from `@/model/canvas`; `persistBuffer` from `@/service/higgsfield/persist`.
- Produces (`src/service/canvas/media-upload.ts`):
  - `CANVAS_MAX_UPLOAD_BYTES` (`15 * 1024 * 1024`)
  - `ALLOWED_UPLOAD_MIME_MAP`
  - `UploadCanvasMediaResult`
  - `uploadCanvasMediaFromFormData(clerkUserId: string, formData: FormData, deps?: Partial<CanvasMediaUploadDeps>): Promise<UploadCanvasMediaResult>`

- [ ] **Step 1: Write the failing unit tests for `media-upload.ts`**

Create `src/service/canvas/media-upload.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANVAS_MAX_UPLOAD_BYTES,
  uploadCanvasMediaFromFormData,
} from "@/service/canvas/media-upload";

describe("service/canvas/media-upload", () => {
  it("rejects missing or empty file entries", async () => {
    const emptyForm = new FormData();
    const missing = await uploadCanvasMediaFromFormData("user_1", emptyForm);
    assert.deepEqual(missing, { ok: false, error: "請選擇要上傳的媒體檔案" });

    const zeroForm = new FormData();
    zeroForm.set("file", new File([new Uint8Array(0)], "empty.png", { type: "image/png" }));
    const zero = await uploadCanvasMediaFromFormData("user_1", zeroForm);
    assert.deepEqual(zero, { ok: false, error: "檔案內容不可為空" });
  });

  it("rejects files larger than 15 MB and unsupported MIME types", async () => {
    const bigForm = new FormData();
    const fakeBigFile = {
      size: CANVAS_MAX_UPLOAD_BYTES + 1,
      type: "image/png",
      name: "huge.png",
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File;
    bigForm.set("file", fakeBigFile);
    const tooLarge = await uploadCanvasMediaFromFormData("user_1", bigForm);
    assert.deepEqual(tooLarge, { ok: false, error: "檔案大小超過 15 MB 上限" });

    const badMimeForm = new FormData();
    badMimeForm.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "doc.pdf", { type: "application/pdf" }),
    );
    const badMime = await uploadCanvasMediaFromFormData("user_1", badMimeForm);
    assert.equal(badMime.ok, false);
    if (!badMime.ok) {
      assert.match(badMime.error, /application\/pdf/);
    }
  });

  it("strips MIME parameters and persists valid uploads to canvas/uploads/<uid>/<uuid>.<ext>", async () => {
    const calls: Array<{ pathname: string; contentType: string; bytes: number }> = [];
    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array([10, 20, 30, 40])], "clip.webm", {
        type: "VIDEO/WEBM; codecs=vp9",
      }),
    );

    const res = await uploadCanvasMediaFromFormData("user_abc", form, {
      randomUUID: () => "fixed-uuid",
      persistBuffer: async (buf, pathname, contentType) => {
        calls.push({ pathname, contentType, bytes: buf.byteLength });
        return `https://blob.example/${pathname}`;
      },
    });

    assert.deepEqual(res, {
      ok: true,
      url: "https://blob.example/canvas/uploads/user_abc/fixed-uuid.webm",
      mediaKind: "video",
      fileName: "clip.webm",
      contentType: "video/webm",
      sizeBytes: 4,
    });
    assert.deepEqual(calls, [
      {
        pathname: "canvas/uploads/user_abc/fixed-uuid.webm",
        contentType: "video/webm",
        bytes: 4,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/media-upload.test.ts`
Expected: FAIL with `Cannot find module '@/service/canvas/media-upload'`

- [ ] **Step 3: Implement `src/service/canvas/media-upload.ts`**

Create `src/service/canvas/media-upload.ts`:

```ts
// Domain validation and Blob storage service for local Canvas media uploads.

import type { CanvasMediaKind } from "@/model/canvas";
import { persistBuffer } from "@/service/higgsfield/persist";

export const CANVAS_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Strict MIME allowlist mapped to Canvas media kind and Blob extension.
export const ALLOWED_UPLOAD_MIME_MAP: Record<
  string,
  { mediaKind: CanvasMediaKind; ext: string }
> = {
  "image/png": { mediaKind: "image", ext: "png" },
  "image/jpeg": { mediaKind: "image", ext: "jpg" },
  "image/webp": { mediaKind: "image", ext: "webp" },
  "video/mp4": { mediaKind: "video", ext: "mp4" },
  "video/webm": { mediaKind: "video", ext: "webm" },
  "video/quicktime": { mediaKind: "video", ext: "mov" },
  "audio/mpeg": { mediaKind: "audio", ext: "mp3" },
  "audio/wav": { mediaKind: "audio", ext: "wav" },
  "audio/mp4": { mediaKind: "audio", ext: "m4a" },
  "audio/ogg": { mediaKind: "audio", ext: "ogg" },
};

export type UploadCanvasMediaResult =
  | {
      ok: true;
      url: string;
      mediaKind: CanvasMediaKind;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    }
  | {
      ok: false;
      error: string;
    };

export type CanvasMediaUploadDeps = {
  persistBuffer: (
    buffer: Buffer,
    pathname: string,
    contentType: string,
  ) => Promise<string>;
  randomUUID: () => string;
};

export async function uploadCanvasMediaFromFormData(
  clerkUserId: string,
  formData: FormData,
  deps?: Partial<CanvasMediaUploadDeps>,
): Promise<UploadCanvasMediaResult> {
  const uploadBuffer = deps?.persistBuffer ?? persistBuffer;
  const nextUuid = deps?.randomUUID ?? (() => crypto.randomUUID());

  const entry = formData.get("file");
  if (!entry || typeof entry === "string") {
    return { ok: false, error: "請選擇要上傳的媒體檔案" };
  }

  const file = entry as File;
  if (file.size <= 0) {
    return { ok: false, error: "檔案內容不可為空" };
  }
  if (file.size > CANVAS_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "檔案大小超過 15 MB 上限" };
  }

  const normalizedMime =
    (file.type || "").split(";")[0]?.trim().toLowerCase() || "";
  const allowed = ALLOWED_UPLOAD_MIME_MAP[normalizedMime];
  if (!allowed) {
    return {
      ok: false,
      error: `不支援的檔案格式（${normalizedMime || "unknown"}）。僅支援 PNG/JPEG/WebP、MP4/WebM/MOV、MP3/WAV/M4A/OGG。`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength <= 0 || buffer.byteLength > CANVAS_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "檔案大小無效或超過 15 MB 上限" };
  }

  const pathname = `canvas/uploads/${clerkUserId}/${nextUuid()}.${allowed.ext}`;
  const url = await uploadBuffer(buffer, pathname, normalizedMime);

  return {
    ok: true,
    url,
    mediaKind: allowed.mediaKind,
    fileName: file.name || `upload.${allowed.ext}`,
    contentType: normalizedMime,
    sizeBytes: buffer.byteLength,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/canvas/media-upload.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add src/service/canvas/media-upload.ts src/service/canvas/media-upload.test.ts
git commit -m "Canvas: extract media upload validation and Blob storage service."
```

---

### Task 4: Canvas Runtime Service and Thin Server Actions (`runtime.ts` & `actions/canvas.ts`)

**Files:**
- Create: `src/service/canvas/runtime.ts`
- Create: `src/service/canvas/runtime.test.ts`
- Modify: `src/service/canvas/executor.ts`
- Modify: `src/presentation/actions/canvas.ts`

**Interfaces:**
- Consumes: `canvasJobsCollection`, `canvasProjectsCollection`, `usersCollection` from `@/dao`; `resolveUserUsdBalance` from `@/service/billing/credit-balance`; `withUnlimitedCredits` from `@/service/billing/unlimited-credits`; `pollCanvasJobs`, `submitCanvasNodeJob` from `@/service/canvas/executor`; `healFinishedCanvasRuns`, `saveCanvasProject` from `@/service/canvas/projects`; `executeCanvasFlowTask`, `startCanvasFlowRun`, `startCanvasNodeAfterUpstream` from `@/service/canvas/worker-runner`; `shouldUseWorkerQueueOnly` from `@/service/worker/task-queue`.
- Produces (`src/service/canvas/runtime.ts`):
  - `readCanvasUserCreditUsd(clerkUserId: string, deps?: Partial<CanvasRuntimeDeps>): Promise<number>`
  - `runCanvasNodeForUser(clerkUserId: string, input: RunCanvasNodeRuntimeInput, deps?: Partial<CanvasRuntimeDeps>): Promise<RunCanvasNodeRuntimeResult>`
  - `runCanvasFlowForUser(clerkUserId: string, input: RunCanvasFlowRuntimeInput, deps?: Partial<CanvasRuntimeDeps>): Promise<RunCanvasFlowRuntimeResult>`
  - `pollCanvasJobsForUser(clerkUserId: string, input: { canvasId: string; jobIds: string[] }, deps?: Partial<CanvasRuntimeDeps>): Promise<{ jobs: CanvasJob[]; creditUsd: number }>`
  - `pollCanvasFlowForUser(clerkUserId: string, canvasId: string, deps?: Partial<CanvasRuntimeDeps>): Promise<{ nodes: CanvasNode[]; activeFlowRun?: CanvasFlowRunState; creditUsd: number }>`

- [ ] **Step 1: Write the failing unit tests for `runtime.ts`**

Create `src/service/canvas/runtime.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob, CanvasProject } from "@/model/canvas";
import {
  pollCanvasFlowForUser,
  pollCanvasJobsForUser,
  runCanvasNodeForUser,
} from "@/service/canvas/runtime";

const CANVAS_HEX = "6745000000000000000000aa";
const JOB_HEX = "6745000000000000000000bb";

describe("service/canvas/runtime", () => {
  it("pollCanvasJobsForUser reads DB snapshots directly when worker queue mode is active", async () => {
    let providerPollCalled = false;
    const fakeJob = {
      _id: new ObjectId(JOB_HEX),
      clerkUserId: "user_1",
      canvasId: new ObjectId(CANVAS_HEX),
      nodeId: "m1",
      provider: "openrouter",
      modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      providerModelId: "bytedance-seed/seedream-5-0-pro",
      status: "running",
      inputSnapshot: {},
      chargedUsd: 0.135,
      createdAt: new Date("2026-11-26T00:00:00.000Z"),
      updatedAt: new Date("2026-11-26T00:00:00.000Z"),
    } satisfies CanvasJob;

    const result = await pollCanvasJobsForUser(
      "user_1",
      { canvasId: CANVAS_HEX, jobIds: [JOB_HEX, "not-an-oid"] },
      {
        useWorkerQueueOnly: () => true,
        findJobsByIds: async (_canvasId, _uid, ids) => {
          assert.equal(ids.length, 1);
          assert.equal(ids[0]?.toHexString(), JOB_HEX);
          return [fakeJob];
        },
        readCreditUsd: async () => 12.5,
        pollJobsInProcess: async () => {
          providerPollCalled = true;
          return { jobs: [], creditUsd: 0 };
        },
      },
    );

    assert.equal(providerPollCalled, false);
    assert.equal(result.jobs.length, 1);
    assert.equal(result.creditUsd, 12.5);
  });

  it("pollCanvasJobsForUser delegates to pollCanvasJobs in local non-worker mode", async () => {
    let providerPollCalled = false;
    const res = await pollCanvasJobsForUser(
      "user_1",
      { canvasId: CANVAS_HEX, jobIds: [JOB_HEX] },
      {
        useWorkerQueueOnly: () => false,
        pollJobsInProcess: async (params) => {
          providerPollCalled = true;
          assert.equal(params.clerkUserId, "user_1");
          return { jobs: [], creditUsd: 8.25 };
        },
      },
    );

    assert.equal(providerPollCalled, true);
    assert.equal(res.creditUsd, 8.25);
  });

  it("pollCanvasFlowForUser settles active wave and advances local flow when worker queue is off", async () => {
    const events: string[] = [];
    const baseProject: CanvasProject = {
      _id: new ObjectId(CANVAS_HEX),
      clerkUserId: "user_1",
      title: "Flow Canvas",
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        { id: "m1", type: "model", position: { x: 0, y: 0 }, data: { status: "running" } },
      ],
      edges: [],
      activeFlowRun: {
        flowRunId: "flow-local",
        status: "running",
        currentWave: 1,
        totalWaves: 1,
        waveIndex: 0,
        waves: [["m1"]],
        activeWaveJobIds: [JOB_HEX],
        failedNodeIds: [],
        startedAt: new Date("2026-11-26T00:00:00.000Z"),
        updatedAt: new Date("2026-11-26T00:00:00.000Z"),
      },
      createdAt: new Date("2026-11-26T00:00:00.000Z"),
      updatedAt: new Date("2026-11-26T00:00:00.000Z"),
    };

    let loadCount = 0;
    const res = await pollCanvasFlowForUser("user_1", CANVAS_HEX, {
      useWorkerQueueOnly: () => false,
      findProject: async () => {
        loadCount += 1;
        return loadCount === 1
          ? baseProject
          : {
              ...baseProject,
              activeFlowRun: { ...baseProject.activeFlowRun!, status: "completed" },
            };
      },
      pollJobsInProcess: async () => {
        events.push("poll_wave_jobs");
        return { jobs: [], creditUsd: 5 };
      },
      advanceFlowTask: async () => {
        events.push("advance_flow");
        return { outcome: "completed" };
      },
      healProjectNodes: async (_uid, _id, nodes) => {
        events.push("heal_nodes");
        return nodes;
      },
      readCreditUsd: async () => 5,
    });

    assert.deepEqual(events, ["poll_wave_jobs", "advance_flow", "heal_nodes"]);
    assert.equal(res.activeFlowRun?.status, "completed");
    assert.equal(res.creditUsd, 5);
  });

  it("runCanvasNodeForUser saves optional snapshot and returns waitingForUpstream when upstream is busy", async () => {
    let savedPatchCalled = false;
    let submitCalled = false;

    const res = await runCanvasNodeForUser(
      "user_1",
      {
        canvasId: CANVAS_HEX,
        nodeId: "m2",
        nodes: [{ id: "m2", type: "model", position: { x: 0, y: 0 }, data: {} }],
      },
      {
        saveProject: async () => {
          savedPatchCalled = true;
          return {} as CanvasProject;
        },
        waitUpstream: async () => ({
          ok: true,
          activeFlowRun: {
            flowRunId: "flow-wait",
            status: "running",
            currentWave: 1,
            totalWaves: 2,
            waveIndex: 0,
            waves: [["m1"], ["m2"]],
            activeWaveJobIds: [],
            failedNodeIds: [],
            startedAt: new Date(),
            updatedAt: new Date(),
          },
        }),
        readCreditUsd: async () => 9.5,
        submitNodeJob: async () => {
          submitCalled = true;
          throw new Error("should not submit immediately");
        },
      },
    );

    assert.equal(savedPatchCalled, true);
    assert.equal(submitCalled, false);
    assert.equal(res.ok, true);
    if (res.ok && "waitingForUpstream" in res) {
      assert.equal(res.activeFlowRun.flowRunId, "flow-wait");
      assert.equal(res.creditUsd, 9.5);
    } else {
      assert.fail("expected waitingForUpstream response");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/runtime.test.ts`
Expected: FAIL with `Cannot find module '@/service/canvas/runtime'`

- [ ] **Step 3: Implement `src/service/canvas/runtime.ts`, wire `readCanvasUserCreditUsd` in `executor.ts`, and slim `src/presentation/actions/canvas.ts`**

Create `src/service/canvas/runtime.ts`:

```ts
// Domain orchestration for running Canvas nodes/flows, reading USD credit balance,
// and polling active jobs/flows across Vast Worker queue and local dev modes.

import { ObjectId } from "mongodb";
import {
  canvasJobsCollection,
  canvasProjectsCollection,
  usersCollection,
} from "@/dao";
import type {
  CanvasEdge,
  CanvasFlowRunState,
  CanvasJob,
  CanvasNode,
  CanvasProject,
  CanvasViewport,
} from "@/model/canvas";
import type { SaveCanvasProjectPatch } from "@/model/canvas-dto";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { withUnlimitedCredits } from "@/service/billing/unlimited-credits";
import {
  type PollCanvasJobsInput,
  type PollCanvasJobsResult,
  type SubmitCanvasNodeJobInput,
  type SubmitCanvasNodeJobResult,
  pollCanvasJobs,
  submitCanvasNodeJob,
} from "@/service/canvas/executor";
import {
  healFinishedCanvasRuns,
  saveCanvasProject,
} from "@/service/canvas/projects";
import {
  executeCanvasFlowTask,
  startCanvasFlowRun,
  startCanvasNodeAfterUpstream,
} from "@/service/canvas/worker-runner";
import { shouldUseWorkerQueueOnly } from "@/service/worker/task-queue";

export type RunCanvasNodeRuntimeInput = {
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
};

export type RunCanvasNodeRuntimeResult =
  | SubmitCanvasNodeJobResult
  | {
      ok: true;
      waitingForUpstream: true;
      activeFlowRun: CanvasFlowRunState;
      creditUsd: number;
    };

export type RunCanvasFlowRuntimeInput = {
  canvasId: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
  nodeIds?: string[];
  rerunNodeIds?: string[];
  rerunAll?: boolean;
};

export type RunCanvasFlowRuntimeResult =
  | { ok: true; activeFlowRun: CanvasFlowRunState; creditUsd: number }
  | { ok: false; error: string };

export type CanvasRuntimeDeps = {
  useWorkerQueueOnly: () => boolean;
  readCreditUsd: (clerkUserId: string) => Promise<number>;
  saveProject: (
    clerkUserId: string,
    canvasId: string,
    patch: SaveCanvasProjectPatch,
  ) => Promise<CanvasProject | null>;
  findProject: (
    canvasId: ObjectId,
    clerkUserId: string,
  ) => Promise<CanvasProject | null>;
  findJobsByIds: (
    canvasId: ObjectId,
    clerkUserId: string,
    jobIds: ObjectId[],
  ) => Promise<CanvasJob[]>;
  waitUpstream: typeof startCanvasNodeAfterUpstream;
  submitNodeJob: (
    input: SubmitCanvasNodeJobInput,
  ) => Promise<SubmitCanvasNodeJobResult>;
  startFlowRun: typeof startCanvasFlowRun;
  pollJobsInProcess: (
    input: PollCanvasJobsInput,
  ) => Promise<PollCanvasJobsResult>;
  advanceFlowTask: typeof executeCanvasFlowTask;
  healProjectNodes: typeof healFinishedCanvasRuns;
};

// Authoritative Canvas USD balance lookup (honoring unlimited credit accounts).
export async function readCanvasUserCreditUsd(
  clerkUserId: string,
): Promise<number> {
  const users = await usersCollection();
  const user = await users.findOne({ clerkUserId });
  if (!user) return 0;
  return resolveUserUsdBalance(withUnlimitedCredits(user)).creditUsd;
}

function resolveRuntimeDeps(
  overrides?: Partial<CanvasRuntimeDeps>,
): CanvasRuntimeDeps {
  return {
    useWorkerQueueOnly: shouldUseWorkerQueueOnly,
    readCreditUsd: readCanvasUserCreditUsd,
    saveProject: saveCanvasProject,
    findProject: async (canvasId, clerkUserId) => {
      const col = await canvasProjectsCollection();
      return col.findOne({ _id: canvasId, clerkUserId });
    },
    findJobsByIds: async (canvasId, clerkUserId, jobIds) => {
      if (jobIds.length === 0) return [];
      const col = await canvasJobsCollection();
      return col
        .find({ _id: { $in: jobIds }, canvasId, clerkUserId })
        .toArray();
    },
    waitUpstream: startCanvasNodeAfterUpstream,
    submitNodeJob: (input) => submitCanvasNodeJob(input),
    startFlowRun: startCanvasFlowRun,
    pollJobsInProcess: (input) => pollCanvasJobs(input),
    advanceFlowTask: executeCanvasFlowTask,
    healProjectNodes: healFinishedCanvasRuns,
    ...overrides,
  };
}

export async function runCanvasNodeForUser(
  clerkUserId: string,
  input: RunCanvasNodeRuntimeInput,
  deps?: Partial<CanvasRuntimeDeps>,
): Promise<RunCanvasNodeRuntimeResult> {
  const resolved = resolveRuntimeDeps(deps);

  if (
    input.nodes !== undefined ||
    input.edges !== undefined ||
    input.viewport !== undefined
  ) {
    const saved = await resolved.saveProject(clerkUserId, input.canvasId, {
      ...(input.nodes !== undefined ? { nodes: input.nodes } : {}),
      ...(input.edges !== undefined ? { edges: input.edges } : {}),
      ...(input.viewport !== undefined ? { viewport: input.viewport } : {}),
    });
    if (!saved) {
      return { ok: false, code: "NOT_FOUND", error: "找不到畫布專案" };
    }
  }

  if (!input.flowRunId) {
    const waiting = await resolved.waitUpstream({
      clerkUserId,
      canvasId: input.canvasId,
      nodeId: input.nodeId,
    });
    if (waiting && !waiting.ok) {
      return { ok: false, code: "INVALID_INPUTS", error: waiting.error };
    }
    if (waiting) {
      const creditUsd = await resolved.readCreditUsd(clerkUserId);
      return {
        ok: true,
        waitingForUpstream: true,
        activeFlowRun: waiting.activeFlowRun,
        creditUsd,
      };
    }
  }

  return resolved.submitNodeJob({
    clerkUserId,
    canvasId: input.canvasId,
    nodeId: input.nodeId,
    flowRunId: input.flowRunId,
    queueToWorker: true,
  });
}

export async function runCanvasFlowForUser(
  clerkUserId: string,
  input: RunCanvasFlowRuntimeInput,
  deps?: Partial<CanvasRuntimeDeps>,
): Promise<RunCanvasFlowRuntimeResult> {
  const resolved = resolveRuntimeDeps(deps);

  if (
    input.nodes !== undefined ||
    input.edges !== undefined ||
    input.viewport !== undefined
  ) {
    const saved = await resolved.saveProject(clerkUserId, input.canvasId, {
      ...(input.nodes !== undefined ? { nodes: input.nodes } : {}),
      ...(input.edges !== undefined ? { edges: input.edges } : {}),
      ...(input.viewport !== undefined ? { viewport: input.viewport } : {}),
    });
    if (!saved) return { ok: false, error: "找不到畫布專案" };
  }

  const started = await resolved.startFlowRun({
    clerkUserId,
    canvasId: input.canvasId,
    ...(input.nodeIds ? { nodeIds: input.nodeIds } : {}),
    ...(input.rerunNodeIds ? { rerunNodeIds: input.rerunNodeIds } : {}),
    ...(input.rerunAll ? { rerunAll: true } : {}),
  });
  if (!started.ok) return started;

  const creditUsd = await resolved.readCreditUsd(clerkUserId);
  return {
    ok: true,
    activeFlowRun: started.activeFlowRun,
    creditUsd,
  };
}

export async function pollCanvasJobsForUser(
  clerkUserId: string,
  input: { canvasId: string; jobIds: string[] },
  deps?: Partial<CanvasRuntimeDeps>,
): Promise<{ jobs: CanvasJob[]; creditUsd: number }> {
  const resolved = resolveRuntimeDeps(deps);

  if (resolved.useWorkerQueueOnly() && ObjectId.isValid(input.canvasId)) {
    const uniqueIds = input.jobIds
      .map((id) => id.trim())
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const [jobs, creditUsd] = await Promise.all([
      resolved.findJobsByIds(new ObjectId(input.canvasId), clerkUserId, uniqueIds),
      resolved.readCreditUsd(clerkUserId),
    ]);
    return { jobs, creditUsd };
  }

  return resolved.pollJobsInProcess({
    clerkUserId,
    canvasId: input.canvasId,
    jobIds: input.jobIds,
  });
}

export async function pollCanvasFlowForUser(
  clerkUserId: string,
  canvasId: string,
  deps?: Partial<CanvasRuntimeDeps>,
): Promise<{
  nodes: CanvasNode[];
  activeFlowRun?: CanvasFlowRunState;
  creditUsd: number;
}> {
  const resolved = resolveRuntimeDeps(deps);
  if (!ObjectId.isValid(canvasId)) {
    return { nodes: [], creditUsd: 0 };
  }

  const canvasObjectId = new ObjectId(canvasId);
  let project = await resolved.findProject(canvasObjectId, clerkUserId);
  if (!project) {
    return { nodes: [], creditUsd: 0 };
  }

  // Local dev has no Vast worker. Polling settles the current wave and, once its
  // jobs are done, advances or finishes the flow.
  if (
    !resolved.useWorkerQueueOnly() &&
    project.activeFlowRun?.status === "running"
  ) {
    if (project.activeFlowRun.activeWaveJobIds?.length) {
      await resolved
        .pollJobsInProcess({
          clerkUserId,
          canvasId,
          jobIds: project.activeFlowRun.activeWaveJobIds,
        })
        .catch(() => {});
    }
    const now = new Date();
    await resolved
      .advanceFlowTask({
        _id: new ObjectId(),
        kind: "canvas_flow",
        lane: "cpu",
        status: "in_progress",
        targetId: canvasId,
        payload: {
          flowRunId: project.activeFlowRun.flowRunId,
          clerkUserId,
        },
        attempts: 1,
        maxAttempts: 5,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .catch(() => {});
    project = (await resolved.findProject(canvasObjectId, clerkUserId)) ?? project;
  }

  const [nodes, creditUsd] = await Promise.all([
    resolved.healProjectNodes(clerkUserId, project._id, project.nodes),
    resolved.readCreditUsd(clerkUserId),
  ]);

  return {
    nodes,
    ...(project.activeFlowRun ? { activeFlowRun: project.activeFlowRun } : {}),
    creditUsd,
  };
}
```

Update `src/service/canvas/executor.ts`:
- Replace `defaultGetUserCreditUsd` with `readCanvasUserCreditUsd` imported from `@/service/canvas/runtime` (eliminating the duplicate `usersCollection` + `withUnlimitedCredits` + `resolveUserUsdBalance` helper in `executor.ts`).

Rewrite `src/presentation/actions/canvas.ts` as a pure thin Server Action gateway:

```ts
"use server";

// Authenticated Next.js Server Actions for the Interactive Node Canvas Editor (/app/canvas).
// Thin presentation gateway: authenticates the caller, delegates to `src/service/canvas/*`,
// and serializes domain records into JSON-safe DTOs.

import type {
  CanvasEdge,
  CanvasNode,
  CanvasViewport,
} from "@/model/canvas";
import type {
  CanvasFlowRunDto,
  CanvasJobDto,
  CanvasProjectDto,
  CreateCanvasProjectInput,
  SaveCanvasProjectPatch,
} from "@/model/canvas-dto";
import {
  serializeCanvasFlowRun,
  serializeCanvasJob,
  serializeCanvasProject,
} from "@/presentation/serialize/canvas";
import { requireAppUser } from "@/service/auth";
import { generateCanvasCharacterOutfit } from "@/service/canvas/character-outfit";
import type { SubmitCanvasNodeJobErrorCode } from "@/service/canvas/executor";
import {
  type CanvasFolderDto,
  createCanvasFolder,
  deleteCanvasFolder,
  listCanvasFolders,
  moveCanvasToFolder,
  renameCanvasFolder,
  serializeCanvasFolder,
} from "@/service/canvas/folders";
import {
  type UploadCanvasMediaResult,
  uploadCanvasMediaFromFormData,
} from "@/service/canvas/media-upload";
import {
  type CanvasModelSpec,
  getCanvasModelCatalog,
} from "@/service/canvas/model-catalog";
import {
  createCanvasProject,
  deleteCanvasProject,
  saveCanvasProject,
} from "@/service/canvas/projects";
import {
  pollCanvasFlowForUser,
  pollCanvasJobsForUser,
  runCanvasFlowForUser,
  runCanvasNodeForUser,
} from "@/service/canvas/runtime";
import { stopCanvasFlowRun } from "@/service/canvas/worker-runner";

export type UploadCanvasMediaActionResult = UploadCanvasMediaResult;

export type RunCanvasNodeActionInput = {
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
};

export type RunCanvasNodeActionResult =
  | {
      ok: true;
      job: CanvasJobDto;
      creditUsd: number;
    }
  | {
      ok: true;
      waitingForUpstream: true;
      activeFlowRun: CanvasFlowRunDto;
      creditUsd: number;
    }
  | {
      ok: false;
      code: SubmitCanvasNodeJobErrorCode;
      error: string;
      creditUsd?: number;
      requiredUsd?: number;
      availableUsd?: number;
      missingRequiredFields?: string[];
      missingUpstreamNodeIds?: string[];
      job?: CanvasJobDto;
    };

export type PollCanvasJobsActionResult = {
  jobs: CanvasJobDto[];
  creditUsd: number;
};

export async function createCanvasProjectAction(
  input?: CreateCanvasProjectInput,
): Promise<{ project: CanvasProjectDto }> {
  const user = await requireAppUser();
  const created = await createCanvasProject(user.clerkUserId, input);
  return { project: serializeCanvasProject(created) };
}

export async function renameCanvasProjectAction(
  canvasId: string,
  title: string,
): Promise<{ ok: true; project: CanvasProjectDto } | { ok: false; error: string }> {
  const user = await requireAppUser();
  const updated = await saveCanvasProject(user.clerkUserId, canvasId, { title });
  if (!updated) {
    return { ok: false, error: "找不到畫布專案" };
  }
  return { ok: true, project: serializeCanvasProject(updated) };
}

export async function deleteCanvasProjectAction(
  canvasId: string,
): Promise<{ deleted: boolean }> {
  const user = await requireAppUser();
  return deleteCanvasProject(user.clerkUserId, canvasId);
}

export async function listCanvasFoldersAction(): Promise<CanvasFolderDto[]> {
  const user = await requireAppUser();
  const folders = await listCanvasFolders(user.clerkUserId);
  return folders.map(serializeCanvasFolder);
}

export async function createCanvasFolderAction(
  name: string,
): Promise<{ ok: true; folder: CanvasFolderDto } | { ok: false; error: string }> {
  const user = await requireAppUser();
  const created = await createCanvasFolder(user.clerkUserId, name);
  if (!created) return { ok: false, error: "資料夾名稱不能是空白" };
  return { ok: true, folder: serializeCanvasFolder(created) };
}

export async function renameCanvasFolderAction(
  folderId: string,
  name: string,
): Promise<{ ok: true; folder: CanvasFolderDto } | { ok: false; error: string }> {
  const user = await requireAppUser();
  const updated = await renameCanvasFolder(user.clerkUserId, folderId, name);
  if (!updated) return { ok: false, error: "找不到資料夾" };
  return { ok: true, folder: serializeCanvasFolder(updated) };
}

export async function deleteCanvasFolderAction(
  folderId: string,
): Promise<{ ok: boolean }> {
  const user = await requireAppUser();
  return { ok: await deleteCanvasFolder(user.clerkUserId, folderId) };
}

export async function moveCanvasToFolderAction(
  canvasId: string,
  folderId: string | null,
): Promise<{ ok: boolean }> {
  const user = await requireAppUser();
  return { ok: await moveCanvasToFolder(user.clerkUserId, canvasId, folderId) };
}

export async function saveCanvasProjectAction(
  canvasId: string,
  patch: SaveCanvasProjectPatch,
): Promise<{ ok: true; project: CanvasProjectDto } | { ok: false; error: string }> {
  const user = await requireAppUser();
  const updated = await saveCanvasProject(user.clerkUserId, canvasId, patch);
  if (!updated) {
    return { ok: false, error: "找不到畫布專案" };
  }
  return { ok: true, project: serializeCanvasProject(updated) };
}

export async function uploadCanvasMediaAction(
  formData: FormData,
): Promise<UploadCanvasMediaActionResult> {
  const user = await requireAppUser();
  return uploadCanvasMediaFromFormData(user.clerkUserId, formData);
}

export async function runCanvasNodeAction(
  input: RunCanvasNodeActionInput,
): Promise<RunCanvasNodeActionResult> {
  const user = await requireAppUser();
  const result = await runCanvasNodeForUser(user.clerkUserId, input);

  if (result.ok && "waitingForUpstream" in result) {
    return {
      ok: true,
      waitingForUpstream: true,
      activeFlowRun: serializeCanvasFlowRun(result.activeFlowRun),
      creditUsd: result.creditUsd,
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      error: result.error,
      ...(result.creditUsd !== undefined ? { creditUsd: result.creditUsd } : {}),
      ...(result.requiredUsd !== undefined
        ? { requiredUsd: result.requiredUsd }
        : {}),
      ...(result.availableUsd !== undefined
        ? { availableUsd: result.availableUsd }
        : {}),
      ...(result.missingRequiredFields
        ? { missingRequiredFields: result.missingRequiredFields }
        : {}),
      ...(result.missingUpstreamNodeIds
        ? { missingUpstreamNodeIds: result.missingUpstreamNodeIds }
        : {}),
      ...(result.job ? { job: serializeCanvasJob(result.job) } : {}),
    };
  }

  return {
    ok: true,
    job: serializeCanvasJob(result.job),
    creditUsd: result.creditUsd,
  };
}

export async function pollCanvasJobsAction(input: {
  canvasId: string;
  jobIds: string[];
}): Promise<PollCanvasJobsActionResult> {
  const user = await requireAppUser();
  const result = await pollCanvasJobsForUser(user.clerkUserId, input);
  return {
    jobs: result.jobs.map(serializeCanvasJob),
    creditUsd: result.creditUsd,
  };
}

export async function refreshCanvasModelsAction(): Promise<{
  models: CanvasModelSpec[];
}> {
  await requireAppUser();
  const models = await getCanvasModelCatalog({ forceRefresh: true });
  return { models };
}

export async function runCanvasFlowAction(input: {
  canvasId: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
  nodeIds?: string[];
  rerunNodeIds?: string[];
  rerunAll?: boolean;
}): Promise<
  | { ok: true; activeFlowRun: CanvasFlowRunDto; creditUsd: number }
  | { ok: false; error: string }
> {
  const user = await requireAppUser();
  const started = await runCanvasFlowForUser(user.clerkUserId, input);
  if (!started.ok) return started;
  return {
    ok: true,
    activeFlowRun: serializeCanvasFlowRun(started.activeFlowRun),
    creditUsd: started.creditUsd,
  };
}

export async function stopCanvasFlowAction(
  canvasId: string,
): Promise<{ ok: true }> {
  const user = await requireAppUser();
  await stopCanvasFlowRun({ clerkUserId: user.clerkUserId, canvasId });
  return { ok: true };
}

export async function pollCanvasFlowAction(canvasId: string): Promise<{
  nodes: CanvasNode[];
  activeFlowRun?: CanvasFlowRunDto;
  creditUsd: number;
}> {
  const user = await requireAppUser();
  const polled = await pollCanvasFlowForUser(user.clerkUserId, canvasId);
  return {
    nodes: polled.nodes,
    ...(polled.activeFlowRun
      ? { activeFlowRun: serializeCanvasFlowRun(polled.activeFlowRun) }
      : {}),
    creditUsd: polled.creditUsd,
  };
}

export async function generateCanvasCharacterOutfitAction(input: {
  characterId: string;
  instruction: string;
  updateDefaultOutfit?: boolean;
}) {
  await requireAppUser();
  return generateCanvasCharacterOutfit(input);
}
```

- [ ] **Step 4: Run full verification suite (unit tests, typecheck, ESLint)**

Run:
```bash
npx tsx --test 'src/service/canvas/**/*.test.ts' 'src/service/canvas-agent/**/*.test.ts' 'src/service/worker/**/*.test.ts' 'src/presentation/serialize/canvas.test.ts' 'src/app/app/canvas/**/*.test.ts' && npx tsc --noEmit && npx eslint src/model/canvas-dto.ts src/presentation/serialize/canvas.ts src/presentation/serialize/canvas.test.ts src/presentation/actions/canvas.ts src/service/canvas/job-ledger.ts src/service/canvas/job-ledger.test.ts src/service/canvas/media-upload.ts src/service/canvas/media-upload.test.ts src/service/canvas/runtime.ts src/service/canvas/runtime.test.ts src/service/canvas/executor.ts src/service/canvas/ffmpeg-ops.ts src/service/canvas/projects.ts src/app/app/canvas/page.tsx
```
Expected: All tests PASS, `tsc --noEmit` exits 0, `eslint` exits 0 with 0 warnings/errors.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/service/canvas/runtime.ts src/service/canvas/runtime.test.ts src/service/canvas/executor.ts src/presentation/actions/canvas.ts
git commit -m "Canvas: extract execution runtime service and slim Server Actions to thin wrappers."
```
