# Generation Task Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Higgsfield request (still, frame, clip video, character version) becomes a MongoDB task that is inserted as `pending`, submitted by `after()` or a per-minute cron, and refreshed by a second per-minute cron, with a task list UI.

**Architecture:** Upgrade the existing `generationJobs` collection in place. A pending job has no `requestId` yet; a runner atomically claims it (`pending → submitting`), calls a per-kind sender that talks to the provider, then writes `requestId`/`statusUrl`/`submittedAt` and hands off to the existing `applyJobStatus` / reconcile path. Webhook and the 2.5s editor poll stay untouched.

**Tech Stack:** Next.js 16 App Router (route handlers, server actions, `after`), MongoDB driver 7, zod 4, node:test via `tsx`, Vercel Cron (`vercel.json`).

**Spec:** `docs/superpowers/specs/2026-09-28-generation-task-queue-design.md`

## Global Constraints

- Reply / UI copy in Traditional Chinese; identifiers in English.
- Server work goes through server actions, not REST (cron routes are the only new route handlers).
- `db.collection<Type>(...)` typing: always go through `generationJobsCollection()` (already typed).
- New UI components each in their own file; generic ones in `src/presentation/components/app/tasks/`; `'use client'` whenever a hook is used.
- Short, clear comments; match surrounding comment density.
- Existing refund rule stays: **whoever atomically flips a job to `failed` refunds it, exactly once**.
- Tests: `npx tsx --test <files>`; checks: `npx tsc --noEmit`, `npx eslint <files>`.
- Before writing route handlers, read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (Next 16 conventions). `after()` behaviour: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`.

## Simplifications vs. spec (spec updated in Task 11)

1. No `clerkUserId`, `input`, `chargedCredits`, `refundedAt` fields: the owner comes from the project / character, the frame revision is already stored on the frame, and the atomic status claim is the refund guard (same as today).
2. No `cancelled` status: redraws are already blocked while a frame/clip is in flight, so a pending task is never superseded.
3. Cron config lives in `vercel.json` (no `@vercel/config` dependency in the repo).
4. Editor tiles keep their current copy; the "排隊中 / 送出中 / 生成中" distinction lives in the task list.
5. Character version cards are unchanged — version status already mirrors the job.

## File Map

| File | Responsibility |
| --- | --- |
| `src/model/generation-job.ts` | Add statuses `pending`/`submitting`, fields `attempts`, `lockedUntil`, `nextAttemptAt`, `submittedAt`; `requestId` optional |
| `src/service/generation/task-policy.ts` (+test) | Pure rules: in-flight, retry delay, retryable, timeout |
| `src/service/higgsfield/reconcile.ts` (+test) | Treat `pending`/`submitting` as in flight |
| `src/service/generation/task-store.ts` | DB ops: insert pending, claim, mark submitted/retry, claim failure; `kickJob` |
| `src/service/generation/task-senders.ts` | Per-kind provider submit (still/frame/video/character) |
| `src/service/generation/task-runner.ts` | `runJobById`, `runClaimedJob`, `failJob`, `drainPendingJobs`, `refreshSubmittedJobs` |
| `src/service/higgsfield/pipeline.ts` | Frames/still/deferred end enqueue instead of submitting inline |
| `src/service/clip/auto-video.ts`, `src/service/director/jobs.ts` | Clip video enqueue; drop `runClipVideoJob` |
| `src/service/character/actions.ts`, `generate.ts` | Character versions enqueue |
| `src/service/generation/cron-auth.ts` (+test) | `CRON_SECRET` Bearer check |
| `src/presentation/api/cron/{submit-jobs,refresh-jobs}/route.ts` + `src/app/api/cron/*/route.ts` | Cron handlers |
| `vercel.json` | Two `* * * * *` crons |
| `src/service/generation/task-list.ts` (+test) | Build `PublicTask[]` for a user / one video |
| `src/presentation/actions/tasks.ts` | `listTasksAction` server action |
| `src/presentation/components/app/tasks/*` | Status badge, row, list, page view, editor dialog |
| `src/app/app/tasks/page.tsx` | `/app/tasks` |
| `app-shell.tsx`, `studio-shell.tsx`, i18n messages, `app/layout.tsx` | Nav item + active count |
| `production-queue.tsx`, `production-toolbar.tsx`, `clip-production.tsx` | Queue chip opens the video's task dialog |
| `clip-video-panel.tsx`, `clip-workspace.tsx` | Remove "看起來卡住了？重試" |

---

### Task 1: Job model + pure queue policy

**Files:**
- Modify: `src/model/generation-job.ts`
- Create: `src/service/generation/task-policy.ts`
- Test: `src/service/generation/task-policy.test.ts`

**Interfaces:**
```ts
export type GenerationStatus =
  | "pending" | "submitting" | "queued" | "in_progress" | "completed" | "failed" | "nsfw";
// GenerationJob gains:
//   requestId?: string; attempts?: number; lockedUntil?: Date;
//   nextAttemptAt?: Date; submittedAt?: Date;
export const MAX_SUBMIT_ATTEMPTS = 3;
export const SUBMIT_LOCK_MS = 5 * 60_000;
export const PROVIDER_TIMEOUT_MS = 30 * 60_000;
export function isJobInFlight(status: GenerationStatus): boolean;
export function isJobTerminal(status: GenerationStatus): boolean;
export function retryDelayMs(attempts: number): number; // 1→1m, 2→3m, ≥3→10m
export class PermanentJobError extends Error {}
export function shouldRetrySubmit(error: unknown, attempts: number): boolean;
export function providerTimedOut(job: Pick<GenerationJob, "status" | "submittedAt" | "createdAt">, now: number): boolean;
```

- [ ] **Step 1: Write the failing test**

```ts
// src/service/generation/task-policy.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PermanentJobError,
  PROVIDER_TIMEOUT_MS,
  isJobInFlight,
  isJobTerminal,
  providerTimedOut,
  retryDelayMs,
  shouldRetrySubmit,
} from "@/service/generation/task-policy";

test("pending and submitting count as in flight", () => {
  for (const status of ["pending", "submitting", "queued", "in_progress"] as const) {
    assert.equal(isJobInFlight(status), true, status);
  }
  for (const status of ["completed", "failed", "nsfw"] as const) {
    assert.equal(isJobInFlight(status), false, status);
    assert.equal(isJobTerminal(status), true, status);
  }
});

test("retry delay backs off 1 / 3 / 10 minutes", () => {
  assert.equal(retryDelayMs(1), 60_000);
  assert.equal(retryDelayMs(2), 3 * 60_000);
  assert.equal(retryDelayMs(3), 10 * 60_000);
  assert.equal(retryDelayMs(9), 10 * 60_000);
});

test("transient errors retry until the attempt cap; permanent never", () => {
  assert.equal(shouldRetrySubmit(new Error("network"), 1), true);
  assert.equal(shouldRetrySubmit(new Error("network"), 2), true);
  assert.equal(shouldRetrySubmit(new Error("network"), 3), false);
  assert.equal(shouldRetrySubmit(new PermanentJobError("找不到風格"), 1), false);
});

test("provider timeout uses submittedAt, falls back to createdAt", () => {
  const now = Date.parse("2026-09-28T12:00:00Z");
  const old = new Date(now - PROVIDER_TIMEOUT_MS - 1);
  const fresh = new Date(now - 60_000);
  assert.equal(providerTimedOut({ status: "queued", submittedAt: old, createdAt: fresh }, now), true);
  assert.equal(providerTimedOut({ status: "in_progress", createdAt: old }, now), true);
  assert.equal(providerTimedOut({ status: "queued", submittedAt: fresh, createdAt: old }, now), false);
  assert.equal(providerTimedOut({ status: "pending", createdAt: old }, now), false);
  assert.equal(providerTimedOut({ status: "completed", submittedAt: old, createdAt: old }, now), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/generation/task-policy.test.ts`
Expected: FAIL — cannot find module `task-policy`.

- [ ] **Step 3: Update the model**

In `src/model/generation-job.ts`:

```ts
export type GenerationStatus =
  // Waiting in our queue; not sent to the provider yet.
  | "pending"
  // A runner holds the lock and is sending it now.
  | "submitting"
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw";
```

In `GenerationJob` replace `requestId: string;` and add fields after `status`:

```ts
  // Unset until the provider accepts the request.
  requestId?: string;
  statusUrl?: string;
  status: GenerationStatus;
  // Submit attempts so far (queue retries stop at MAX_SUBMIT_ATTEMPTS).
  attempts?: number;
  // A `submitting` job whose lock expired can be claimed again.
  lockedUntil?: Date;
  // Earliest time a `pending` job may be retried.
  nextAttemptAt?: Date;
  // When the provider accepted it; drives the provider timeout.
  submittedAt?: Date;
```

Zod: `requestId: z.string().optional()`, status enum adds `"pending", "submitting"`, add `attempts: z.number().optional()`, `lockedUntil: z.date().optional()`, `nextAttemptAt: z.date().optional()`, `submittedAt: z.date().optional()`.

- [ ] **Step 4: Write the policy module**

```ts
// src/service/generation/task-policy.ts
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";

// Pure queue rules shared by the runner, crons, and reconcile.

export const MAX_SUBMIT_ATTEMPTS = 3;
export const SUBMIT_LOCK_MS = 5 * 60_000;
export const PROVIDER_TIMEOUT_MS = 30 * 60_000;
// Jobs sent per cron run; keeps one invocation well under the function timeout.
export const SUBMIT_BATCH = 6;

const RETRY_DELAYS_MS = [60_000, 3 * 60_000, 10 * 60_000];

// Thrown by senders when retrying cannot help (missing style, frames gone...).
export class PermanentJobError extends Error {}

export function isJobInFlight(status: GenerationStatus) {
  return (
    status === "pending" ||
    status === "submitting" ||
    status === "queued" ||
    status === "in_progress"
  );
}

export function isJobTerminal(status: GenerationStatus) {
  return status === "completed" || status === "failed" || status === "nsfw";
}

// Delay before the next attempt, given how many attempts already ran.
export function retryDelayMs(attempts: number) {
  const index = Math.min(Math.max(attempts, 1), RETRY_DELAYS_MS.length) - 1;
  return RETRY_DELAYS_MS[index];
}

export function shouldRetrySubmit(error: unknown, attempts: number) {
  if (error instanceof PermanentJobError) return false;
  return attempts < MAX_SUBMIT_ATTEMPTS;
}

// Sent to the provider but no result for too long: fail and refund.
export function providerTimedOut(
  job: Pick<GenerationJob, "status" | "submittedAt" | "createdAt">,
  now: number,
) {
  if (job.status !== "queued" && job.status !== "in_progress") return false;
  const since = (job.submittedAt ?? job.createdAt).getTime();
  return now - since > PROVIDER_TIMEOUT_MS;
}
```

- [ ] **Step 5: Fix type fallout from optional `requestId`**

Run: `npx tsc --noEmit`
Expected errors only where `job.requestId` is used as `string`. Fix each by guarding:
- `pipeline.ts` `applyJobStatus` persist path: `` `explainer/${projectId.toHexString()}/${folder}/${job.requestId ?? job._id.toHexString()}` ``
- `refreshProjectJobs` / `refreshCharacterAction` loops: `if (!job.statusUrl || !job.requestId) continue;` (inside the map: `if (!job.statusUrl || !job.requestId) return null;`), and pass `requestId: result.job.requestId!` only after that guard (prefer narrowing via a local `const requestId = job.requestId`).
- Any other hit: narrow, never cast.

Re-run `npx tsc --noEmit` → PASS.

- [ ] **Step 6: Run tests**

Run: `npx tsx --test src/service/generation/task-policy.test.ts src/service/higgsfield/*.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/model/generation-job.ts src/service/generation/task-policy.ts src/service/generation/task-policy.test.ts src/service/higgsfield src/service/character
git commit -m "feat(queue): pending/submitting job statuses and queue policy"
```

---

### Task 2: Reconcile treats queued-in-our-queue as in flight

**Files:**
- Modify: `src/service/higgsfield/reconcile.ts`
- Test: `src/service/higgsfield/reconcile.test.ts`

- [ ] **Step 1: Write the failing test** (append; reuse the file's `job()` helper and existing frame/clip fixtures)

```ts
test("a pending frame job clears the old still and shows queued", () => {
  const frames: ClipFrame[] = [
    {
      clipNumber: 1,
      position: "start",
      status: "completed",
      prompt: "p",
      blobUrl: "https://old/still.png",
      submittedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  const [frame] = reconcileFrames(frames, [
    job({ kind: "frame", clipIndex: 0, framePosition: "start", status: "pending", requestId: undefined }),
  ]);
  assert.equal(frame.status, "queued");
  assert.equal(frame.blobUrl, undefined);
});

test("a submitting clip job clears the old video", () => {
  const clips: ProjectClip[] = [
    {
      clipNumber: 1,
      durationSeconds: 6,
      prompt: "",
      status: "completed",
      blobUrl: "https://old/clip.mp4",
      submittedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  const [clip] = reconcileClips(clips, [job({ kind: "video", clipIndex: 0, status: "submitting" })]);
  assert.equal(clip.status, "queued");
  assert.equal(clip.blobUrl, undefined);
});
```

Adjust fixture fields to whatever `ClipFrame`/`ProjectClip` require (copy an existing fixture in the file).

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test src/service/higgsfield/reconcile.test.ts`
Expected: FAIL — `blobUrl` still `https://old/...` (pending not treated as in flight).

- [ ] **Step 3: Implement**

In `reconcile.ts` import `isJobInFlight` from `@/service/generation/task-policy` and replace both
`const pending = job.status === "queued" || job.status === "in_progress";` with
`const pending = isJobInFlight(job.status);`. `toFrameStatus` already maps unknown statuses to `"queued"` — keep it.

- [ ] **Step 4: Run tests** — `npx tsx --test src/service/higgsfield/reconcile.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/higgsfield/reconcile.ts src/service/higgsfield/reconcile.test.ts
git commit -m "feat(queue): reconcile pending/submitting jobs as in flight"
```

---

### Task 3: Task store (DB ops + kick)

**Files:**
- Create: `src/service/generation/task-store.ts`

**Interfaces:**
```ts
export type NewJob = Omit<GenerationJob, "_id" | "status" | "createdAt" | "updatedAt" | "model"> & { model?: string };
export async function insertPendingJob(job: NewJob): Promise<ObjectId>;
export async function claimJobById(id: ObjectId): Promise<GenerationJob | null>;
export async function claimNextJob(): Promise<GenerationJob | null>;
export async function markSubmitted(id: ObjectId, sent: { requestId: string; statusUrl?: string; status?: string; model: string }): Promise<void>;
export async function markRetry(job: GenerationJob, message: string): Promise<void>;
export async function claimFailure(id: ObjectId, message: string, status?: "failed" | "nsfw"): Promise<GenerationJob | null>;
export function kickJob(id: ObjectId): void;
```

No unit test (thin Mongo wrappers); covered by the runner smoke test in Task 7 and manual verification.

- [ ] **Step 1: Implement**

```ts
// src/service/generation/task-store.ts
import { after } from "next/server";
import type { ObjectId } from "mongodb";
import { generationJobsCollection } from "@/dao";
import {
  MAX_SUBMIT_ATTEMPTS,
  SUBMIT_LOCK_MS,
  retryDelayMs,
} from "@/service/generation/task-policy";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";

export type NewJob = Omit<
  GenerationJob,
  "_id" | "status" | "createdAt" | "updatedAt" | "model"
> & { model?: string };

// Queue a job; the provider is not called here.
export async function insertPendingJob(job: NewJob): Promise<ObjectId> {
  const jobs = await generationJobsCollection();
  const now = new Date();
  const { insertedId } = await jobs.insertOne({
    ...job,
    model: job.model ?? "",
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  } as GenerationJob);
  return insertedId;
}

// Due pending jobs, or submitting jobs whose runner died mid-send.
function claimableFilter(now: Date) {
  return {
    attempts: { $lt: MAX_SUBMIT_ATTEMPTS },
    $or: [
      { status: "pending" as const, nextAttemptAt: { $lte: now } },
      { status: "submitting" as const, lockedUntil: { $lt: now } },
    ],
  };
}

function claimUpdate(now: Date) {
  return {
    $set: {
      status: "submitting" as const,
      lockedUntil: new Date(now.getTime() + SUBMIT_LOCK_MS),
      updatedAt: now,
    },
    $inc: { attempts: 1 },
  };
}

// Atomic claim so `after()` and the cron never send the same job twice.
export async function claimJobById(id: ObjectId) {
  const jobs = await generationJobsCollection();
  const now = new Date();
  return jobs.findOneAndUpdate({ _id: id, ...claimableFilter(now) }, claimUpdate(now), {
    returnDocument: "after",
  });
}

// Oldest claimable job first.
export async function claimNextJob() {
  const jobs = await generationJobsCollection();
  const now = new Date();
  return jobs.findOneAndUpdate(claimableFilter(now), claimUpdate(now), {
    sort: { createdAt: 1 },
    returnDocument: "after",
  });
}

// Provider accepted the request.
export async function markSubmitted(
  id: ObjectId,
  sent: { requestId: string; statusUrl?: string; status?: string; model: string },
) {
  const jobs = await generationJobsCollection();
  const now = new Date();
  await jobs.updateOne(
    { _id: id, status: "submitting" },
    {
      $set: {
        requestId: sent.requestId,
        statusUrl: sent.statusUrl,
        model: sent.model,
        status: (sent.status as GenerationStatus) || "queued",
        submittedAt: now,
        updatedAt: now,
      },
      $unset: { lockedUntil: "", nextAttemptAt: "", error: "" },
    },
  );
}

// Transient send failure: back to pending with a backoff.
export async function markRetry(job: GenerationJob, message: string) {
  const jobs = await generationJobsCollection();
  const now = new Date();
  await jobs.updateOne(
    { _id: job._id, status: "submitting" },
    {
      $set: {
        status: "pending",
        error: message,
        nextAttemptAt: new Date(now.getTime() + retryDelayMs(job.attempts ?? 1)),
        updatedAt: now,
      },
      $unset: { lockedUntil: "" },
    },
  );
}

// Flip to failed only if nobody else did; the winner refunds.
export async function claimFailure(
  id: ObjectId,
  message: string,
  status: "failed" | "nsfw" = "failed",
) {
  const jobs = await generationJobsCollection();
  return jobs.findOneAndUpdate(
    { _id: id, status: { $nin: ["failed", "nsfw", "completed"] } },
    {
      $set: { status, error: message, updatedAt: new Date() },
      $unset: { lockedUntil: "", nextAttemptAt: "" },
    },
    { returnDocument: "after" },
  );
}

// Try to send right after the response. Outside a request scope (scripts)
// `after` throws; the submit cron picks the job up within a minute instead.
export function kickJob(id: ObjectId) {
  try {
    after(async () => {
      const { runJobById } = await import("@/service/generation/task-runner");
      await runJobById(id);
    });
  } catch {
    // No request scope: leave it pending for the cron.
  }
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → fails only on the missing `task-runner` module (created in Task 5). If you run tasks strictly in order, create an empty `task-runner.ts` exporting `export async function runJobById(_id: ObjectId) {}` now and replace it in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/service/generation/task-store.ts src/service/generation/task-runner.ts
git commit -m "feat(queue): task store with atomic claim, retry, failure claim"
```

---

### Task 4: Per-kind senders

**Files:**
- Create: `src/service/generation/task-senders.ts`
- Modify: `src/service/higgsfield/pipeline.ts` (export provider-only helpers)
- Modify: `src/service/character/generate.ts`

**Interfaces:**
```ts
export type Sent = { requestId: string; statusUrl?: string; status?: string; model: string;
  images?: Array<{ url: string }>; video?: { url: string } };
// pipeline.ts (new exports, provider call only — no DB job writes)
export async function sendStill(project: Project): Promise<Sent>;
export async function sendFrame(project: Project, clipNumber: number, position: FramePosition): Promise<Sent>;
export async function sendClipVideo(project: Project, clipNumber: number, prompt: PhaseBPrompt): Promise<Sent>;
// character/generate.ts
export async function sendCharacterVersion(character: Character, version: CharacterVersion): Promise<Sent>;
// task-senders.ts
export async function sendJob(job: GenerationJob): Promise<Sent>;
```

- [ ] **Step 1: Provider-only helpers in `pipeline.ts`**

Replace `submitOneFrame` with `sendFrame` (same body minus the `jobs.insertOne` and `persistImmediateSubmit`; revision is read from the stored frame):

```ts
export type Sent = {
  requestId: string;
  statusUrl?: string;
  status?: string;
  model: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
};

function toSent(
  model: string,
  submitted: { request_id: string; status_url?: string; status?: string; images?: Array<{ url: string }>; video?: { url: string } },
): Sent {
  return {
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: submitted.status,
    model,
    images: submitted.images,
    video: submitted.video,
  };
}

// Send one frame to the provider. The prompt and revision come from the stored
// frame so a retry rebuilds exactly what the user asked for.
export async function sendFrame(project: Project, clipNumber: number, position: FramePosition) {
  const skill = await loadSkill(project);
  const revision = project.frames?.find(
    (frame) => frame.clipNumber === clipNumber && frame.position === position,
  )?.revision;
  const sceneText = resolveSceneText(project);
  const prompt = buildFramePrompt(project, clipNumber, position, { revision });
  const refs = sceneImageReferenceUrls({
    annotatedUrl: revision?.annotatedUrl,
    lockUrls: frameLockReferenceUrls(project),
  });
  const model = imageModelForSubmit(resolveImageRoute(sceneText.language), refs.length > 0);
  const submitted = await submitImage({
    model,
    prompt,
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    negativePrompt: sceneTextNegativePrompt(sceneText.enabled, sceneText.inWorldLabels),
    sceneTextLanguage: sceneText.language,
    referenceImageUrls: refs,
  });
  return toSent(model, submitted);
}

// Send the character lock still (free).
export async function sendStill(project: Project) {
  const skill = await loadSkill(project);
  const model = imageModelForSubmit(resolveImageRoute(), Boolean(project.characterImageUrl));
  const submitted = await submitImage({
    model,
    prompt: stillPrompt(project),
    aspectRatio: project.aspectRatio,
    quality: skill.higgsfieldDefaults.imageQuality || "medium",
    resolution: skill.higgsfieldDefaults.imageResolution || "1k",
    referenceImageUrls: [project.characterImageUrl],
  });
  return toSent(model, submitted);
}

// Send one clip video from its two keyframes.
export async function sendClipVideo(project: Project, clipNumber: number, prompt: PhaseBPrompt) {
  const { start, end } = assertClipKeyframes(project.frames, clipNumber);
  const submitted = await submitClipVideo({
    prompt: prompt.prompt,
    aspectRatio: project.aspectRatio,
    durationSeconds: prompt.durationSeconds,
    startImageUrl: start,
    endImageUrl: end,
  });
  return toSent(MINIMAX_H3_VIDEO_MODEL, submitted);
}
```

Also `export` the existing `persistImmediateSubmit`, changing its parameter to `Sent`:

```ts
export async function persistImmediateSubmit(sent: Sent) {
  // `Sent` keeps the provider's `images` / `video` keys, which is all this reads.
  const outputUrl = mediaUrlFromResponse(sent);
  if (sent.status === "completed" && outputUrl) {
    await applyJobStatus({ requestId: sent.requestId, status: "completed", outputUrl });
  }
}
```

Also `export` `failDeferredEndIfNeeded`.

- [ ] **Step 2: Character sender**

In `src/service/character/generate.ts`, replace `submitCharacterVersion` with a provider-only `sendCharacterVersion` returning `Sent` (same `submitImage` call, `model: BLUEPRINT_MODEL`), plus an enqueue helper:

```ts
// Queue one version's sheet; the queue sends it and marks it failed + refunds on error.
export async function enqueueCharacterVersion(character: Character, version: CharacterVersion) {
  const jobs = await generationJobsCollection();
  // Retry reuses the version id; drop its settled job so the new one is the only one.
  await jobs.deleteMany({ kind: "character", versionId: version.id });
  const id = await insertPendingJob({
    characterId: character._id,
    versionId: version.id,
    clipIndex: -1,
    kind: "character",
    model: BLUEPRINT_MODEL,
  });
  kickJob(id);
}
```

Import `Sent` type from pipeline would create a cycle (`pipeline` → `character/sync` → ...). Put `Sent` and `toSent` in a new tiny module `src/service/generation/sent.ts` instead and import it from both `pipeline.ts` and `character/generate.ts`.

- [ ] **Step 3: `task-senders.ts`**

```ts
// src/service/generation/task-senders.ts
import { charactersCollection, skillsCollection, videosCollection } from "@/dao";
import { sendCharacterVersion } from "@/service/character/generate";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { videoStyle } from "@/service/higgsfield/frame-prompts";
import { sendClipVideo, sendFrame, sendStill } from "@/service/higgsfield/pipeline";
import { PermanentJobError } from "@/service/generation/task-policy";
import type { Sent } from "@/service/generation/sent";
import type { Character } from "@/model/character";
import type { GenerationJob } from "@/model/generation-job";

// Load fresh state and call the provider for one claimed job.
export async function sendJob(job: GenerationJob): Promise<Sent> {
  if (job.kind === "character") return sendCharacter(job);

  if (!job.projectId) throw new PermanentJobError("任務缺少影片");
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: job.projectId });
  if (!project) throw new PermanentJobError("影片已不存在");

  if (job.kind === "still") return sendStill(project);
  const clipNumber = job.clipIndex + 1;
  if (job.kind === "frame") {
    if (!job.framePosition) throw new PermanentJobError("任務缺少畫格位置");
    return sendFrame(project, clipNumber, job.framePosition);
  }
  return sendVideo(project, clipNumber);
}

async function sendCharacter(job: GenerationJob) {
  const characters = await charactersCollection();
  const character = (await characters.findOne({ _id: job.characterId })) as Character | null;
  const version = character?.versions.find((item) => item.id.equals(job.versionId!));
  if (!character || !version) throw new PermanentJobError("角色版本已不存在");
  return sendCharacterVersion(character, version);
}

// Phase B runs once: a retry reuses the prompt already written to the clip.
async function sendVideo(project: Project, clipNumber: number) {
  if (!project.phaseA) throw new PermanentJobError("找不到分鏡");
  const clip = project.clips.find((item) => item.clipNumber === clipNumber);
  if (clip?.prompt) {
    return sendVideoOrStop(project, {
      clipNumber,
      prompt: clip.prompt,
      durationSeconds: clip.durationSeconds,
    });
  }

  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill) throw new PermanentJobError("找不到風格");
  const prompt = await runPhaseBForClip({
    skill,
    style: videoStyle(project),
    phaseA: project.phaseA,
    clipNumber,
    language: project.language,
    voiceGender: project.voiceGender,
    characterImageUrl: project.characterImageUrl,
    cast: project.cast,
  });
  const projects = await videosCollection();
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        "clips.$[clip].prompt": prompt.prompt,
        "clips.$[clip].durationSeconds": prompt.durationSeconds,
        updatedAt: new Date(),
      },
    },
    { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
  );
  return sendVideoOrStop(project, prompt);
}

// Keyframes missing will not fix themselves; do not burn retries on it.
async function sendVideoOrStop(project: Project, prompt: PhaseBPrompt) {
  const { start, end } = clipKeyframeUrls(project.frames, prompt.clipNumber);
  if (!start || !end) {
    throw new PermanentJobError("這段的起點或終點畫格還沒有檔案，無法產片");
  }
  return sendClipVideo(project, prompt.clipNumber, prompt);
}
```

Extra imports for this file: `import { clipKeyframeUrls } from "@/service/higgsfield/clip-keyframes";` and `import type { PhaseBPrompt, Project } from "@/model/project";`.

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit`. Callers of the removed `submitOneFrame` / `submitCharacterVersion` will break; they are rewritten in Tasks 6 and 8. To keep this commit green, leave `submitCharacterVersion` and the old `submitOneFrame` in place until those tasks delete them.

- [ ] **Step 5: Commit**

```bash
git add src/service/generation/sent.ts src/service/generation/task-senders.ts src/service/higgsfield/pipeline.ts src/service/character/generate.ts
git commit -m "feat(queue): provider-only senders per job kind"
```

---

### Task 5: Task runner (submit, retry, fail + refund, drain, refresh)

**Files:**
- Create/replace: `src/service/generation/task-runner.ts`

**Interfaces:**
```ts
export async function runJobById(id: ObjectId): Promise<void>;
export async function runClaimedJob(job: GenerationJob): Promise<void>;
export async function failJob(job: GenerationJob, message: string): Promise<boolean>;
export async function drainPendingJobs(limit?: number): Promise<{ sent: number; failed: number; retried: number }>;
export async function refreshSubmittedJobs(): Promise<{ refreshed: number; timedOut: number }>;
```

- [ ] **Step 1: Implement**

```ts
// src/service/generation/task-runner.ts
import type { ObjectId } from "mongodb";
import { generationJobsCollection, videosCollection } from "@/dao";
import { refundCredits } from "@/service/billing/credits";
import { failCharacterVersion } from "@/service/character/sync";
import { fetchHiggsfieldStatus, mediaUrlFromResponse } from "@/service/higgsfield/generate";
import { jobNeedsRefresh, userFacingJobError } from "@/service/higgsfield/job-status";
import {
  applyJobStatus,
  failDeferredEndIfNeeded,
  persistImmediateSubmit,
  refreshProjectJobs,
  syncProjectFromJobs,
} from "@/service/higgsfield/pipeline";
import { FRAME_COST, VIDEO_COST } from "@/service/production-plan";
import {
  MAX_SUBMIT_ATTEMPTS,
  SUBMIT_BATCH,
  providerTimedOut,
  shouldRetrySubmit,
} from "@/service/generation/task-policy";
import { sendJob } from "@/service/generation/task-senders";
import {
  claimFailure,
  claimJobById,
  claimNextJob,
  markRetry,
  markSubmitted,
} from "@/service/generation/task-store";
import type { GenerationJob } from "@/model/generation-job";

type RunOutcome = "sent" | "retried" | "failed";

// `after()` entry: claim this job if nobody else has, then send it.
export async function runJobById(id: ObjectId) {
  const job = await claimJobById(id);
  if (job) await runClaimedJob(job);
}

// Send one claimed job; transient errors go back to pending, others fail + refund.
export async function runClaimedJob(job: GenerationJob): Promise<RunOutcome> {
  try {
    const sent = await sendJob(job);
    await markSubmitted(job._id, sent);
    // Sync providers return the file on submit; land it now.
    await persistImmediateSubmit(sent);
    if (job.projectId) await syncProjectFromJobs(job.projectId);
    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "送出失敗";
    if (shouldRetrySubmit(error, job.attempts ?? 1)) {
      await markRetry(job, message);
      return "retried";
    }
    await failJob(job, message);
    return "failed";
  }
}

// Mark failed and refund exactly once (the status claim is the guard).
export async function failJob(job: GenerationJob, message: string) {
  const error = userFacingJobError("failed", message);
  const claimed = await claimFailure(job._id, error);
  if (!claimed) return false;

  if (job.kind === "character") {
    if (job.characterId && job.versionId) {
      await failCharacterVersion(job.characterId, job.versionId, error);
    }
    return true;
  }
  if (!job.projectId) return true;

  const projects = await videosCollection();
  const project = await projects.findOne({ _id: job.projectId });
  if (project) {
    if (job.kind === "frame") await refundCredits(project.clerkUserId, FRAME_COST);
    if (job.kind === "video") await refundCredits(project.clerkUserId, VIDEO_COST);
    if (job.kind === "frame" && job.framePosition === "start") {
      await failDeferredEndIfNeeded(job.projectId, job.clipIndex + 1, error);
    }
  }
  await syncProjectFromJobs(job.projectId);
  return true;
}

// Cron 1: send due pending jobs, and fail ones whose runner died on the last attempt.
export async function drainPendingJobs(limit = SUBMIT_BATCH) {
  const jobs = await generationJobsCollection();
  const exhausted = await jobs
    .find({
      status: "submitting",
      lockedUntil: { $lt: new Date() },
      attempts: { $gte: MAX_SUBMIT_ATTEMPTS },
    })
    .limit(limit)
    .toArray();
  let failed = 0;
  for (const job of exhausted) {
    if (await failJob(job, "送出逾時，credit 已退回")) failed += 1;
  }

  let sent = 0;
  let retried = 0;
  for (let index = 0; index < limit; index += 1) {
    const job = await claimNextJob();
    if (!job) break;
    const outcome = await runClaimedJob(job);
    if (outcome === "sent") sent += 1;
    else if (outcome === "retried") retried += 1;
    else failed += 1;
  }
  return { sent, failed, retried };
}

// Cron 2: poll every submitted job across users, then time out stragglers.
export async function refreshSubmittedJobs() {
  const jobs = await generationJobsCollection();
  const candidates = await jobs
    .find({ status: { $in: ["queued", "in_progress", "completed"] } })
    .sort({ updatedAt: 1 })
    .limit(200)
    .toArray();
  const due = candidates.filter(jobNeedsRefresh);

  // Project jobs refresh per project so the project sync runs once each.
  const projectIds = new Map<string, ObjectId>();
  for (const job of due) {
    if (job.projectId) projectIds.set(job.projectId.toHexString(), job.projectId);
  }
  for (const projectId of projectIds.values()) {
    await refreshProjectJobs(projectId).catch((error) =>
      console.error("[queue] project refresh failed", { projectId, error }),
    );
  }
  for (const job of due.filter((item) => item.kind === "character")) {
    if (!job.statusUrl || !job.requestId) continue;
    try {
      const remote = await fetchHiggsfieldStatus(job.statusUrl);
      await applyJobStatus({
        requestId: job.requestId,
        status: remote.status,
        outputUrl: mediaUrlFromResponse(remote),
      });
    } catch (error) {
      console.error("[queue] character refresh failed", { jobId: job._id, error });
    }
  }

  // Re-read: the refresh above may have just finished some of them.
  const now = Date.now();
  const stale = await jobs.find({ status: { $in: ["queued", "in_progress"] } }).toArray();
  let timedOut = 0;
  for (const job of stale) {
    if (!providerTimedOut(job, now)) continue;
    if (await failJob(job, "產生逾時，credit 已退回")) timedOut += 1;
  }
  return { refreshed: due.length, timedOut };
}
```

Notes for the implementer:
- `jobNeedsRefresh(job)` takes `{ status, statusUrl, outputUrl, blobUrl }`, so `candidates.filter(jobNeedsRefresh)` type-checks as is.
- `userFacingJobError("failed", message)` returns the message unchanged unless it looks like NSFW / timeout.
- For `stale`, add `.limit(200)` and a filter `{ $or: [{ submittedAt: { $lt: cutoff } }, { submittedAt: { $exists: false }, createdAt: { $lt: cutoff } }] }` with `cutoff = new Date(now - PROVIDER_TIMEOUT_MS)` so the query does not scan every in-flight job.

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/service/generation/task-runner.ts
git commit -m "feat(queue): runner with retry, idempotent fail + refund, cron drains"
```

---

### Task 6: Frames and still go through the queue

**Files:**
- Modify: `src/service/higgsfield/pipeline.ts`

- [ ] **Step 1: Still enqueue**

Rewrite `submitStillIfNeeded`: keep the cast / `characterStillUrl` early returns and the delete of failed still jobs; replace the `submitImage` + `insertOne` + `persistImmediateSubmit` with:

```ts
  const id = await insertPendingJob({ projectId: project._id, clipIndex: -1, kind: "still" });
  kickJob(id);
```

Keep the `$unset: { stillError }` update. `runStillJob`'s catch in `director/jobs.ts` stays (now only DB errors reach it).

- [ ] **Step 2: Frame enqueue helper**

Replace `submitOneFrame` with:

```ts
// Queue one frame; the queue sends it (see task-senders) and refunds on failure.
async function enqueueFrame(project: Project, clipNumber: number, position: FramePosition) {
  const id = await insertPendingJob({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "frame",
    framePosition: position,
  });
  kickJob(id);
}
```

- [ ] **Step 3: `regenerateFrames`**

Inside the `for (const target of ready)` loop: keep `deleteMany`, then **write the frame first, then enqueue** (the job's `createdAt` must be ≥ the frame's `submittedAt` for `appliesToClaim`):

```ts
    const prompt = buildFramePrompt(project, target.clipNumber, target.position, {
      revision: target.revision,
    });
    await projects.updateOne(/* same $set/$unset as today, using `prompt` */);
    await enqueueFrame(project, target.clipNumber, target.position);
```

Drop the `skill` load at the top (senders load it). `submittedAt` is still computed before the loop.

- [ ] **Step 4: `submitDeferredEndIfNeeded`**

Same pattern: keep the guards, `deleteMany`, then write `queued` / `submittedAt` / `prompt` (built with `buildFramePrompt(project, clipNumber, "end", { revision: end.revision })`), then `await enqueueFrame(project, clipNumber, "end")`, then `syncProjectFromJobs`.

- [ ] **Step 5: Remove dead code**

Delete `submitOneFrame` and `submitClipVideoJob` (video moves in Task 7) only once nothing imports them — `rg "submitOneFrame|submitClipVideoJob" src` must be empty after Task 7. The `failUnsubmittedFrames` catch paths in `generation/actions.ts` and `clip/production.ts` stay: they now only fire on DB errors, which is still correct.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npx tsx --test src/service/higgsfield/*.test.ts src/service/generation/*.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/service/higgsfield/pipeline.ts
git commit -m "feat(queue): frames and still are queued instead of submitted inline"
```

---

### Task 7: Clip videos go through the queue

**Files:**
- Modify: `src/service/clip/auto-video.ts`
- Modify: `src/service/director/jobs.ts`
- Modify: `src/service/higgsfield/pipeline.ts`

- [ ] **Step 1: Clear the old prompt on claim**

In `claimAndStartClipVideo`, the existing-clip branch `$set` adds `"clips.$.prompt": ""` so the sender runs Phase B for this attempt (the push branch already sets `prompt: ""`).

- [ ] **Step 2: Enqueue instead of `after(runClipVideoJob)`**

Replace `after(() => runClipVideoJob(project._id, clipNumber));` with:

```ts
  // Old video jobs would outrank the new claim in reconcile; replace them.
  const jobs = await generationJobsCollection();
  await jobs.deleteMany({ projectId: project._id, kind: "video", clipIndex: clipNumber - 1 });
  const id = await insertPendingJob({
    projectId: project._id,
    clipIndex: clipNumber - 1,
    kind: "video",
  });
  kickJob(id);
```

Wrap the delete + insert in `try/catch`: on error refund `VIDEO_COST` and mark the clip failed (move `compensateClipVideo` from `director/jobs.ts` into `auto-video.ts` for this), then return `{ ok: false, error }`. Remove the `after` import if unused.

- [ ] **Step 3: Delete the old background job**

In `director/jobs.ts` delete `compensateClipVideo` (moved) and `runClipVideoJob`, and the now-unused imports (`refundCredits`, `hasJobSince`, `submitClipVideoJob`, `runPhaseBForClip`, `VIDEO_COST`, `generationJobsCollection` if unused). In `pipeline.ts` delete `submitClipVideoJob`. `rg "runClipVideoJob|submitClipVideoJob|submitOneFrame" src` → no hits.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx eslint src/service/clip src/service/director src/service/higgsfield src/service/generation`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/clip/auto-video.ts src/service/director/jobs.ts src/service/higgsfield/pipeline.ts
git commit -m "feat(queue): clip videos are queued; Phase B runs at send time"
```

---

### Task 8: Character versions go through the queue

**Files:**
- Modify: `src/service/character/actions.ts`
- Modify: `src/service/character/generate.ts`

- [ ] **Step 1: Replace the three `after(async () => { await submitOrFail(...) })` blocks** (create ~L173, edit ~L238, retry ~L345) with `await enqueueCharacterVersion(character, version)` (use the matching variables: `doc, retryVersion` for retry). Delete `submitOrFail` and the `after` import if unused.

- [ ] **Step 2: Remove `submitCharacterVersion`** from `generate.ts`; `rg "submitCharacterVersion" src` → no hits.

- [ ] **Step 3: `refreshCharacterAction`** keeps working: its loop already skips jobs without `statusUrl` (pending ones). Leave the 15-minute stale guard; it is refund-safe via `failCharacterVersion`.

- [ ] **Step 4: Verify** — `npx tsc --noEmit && npx eslint src/service/character` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/character
git commit -m "feat(queue): character versions are queued"
```

---

### Task 9: Cron routes, auth, and schedule

**Files:**
- Create: `src/service/generation/cron-auth.ts`, `src/service/generation/cron-auth.test.ts`
- Create: `src/presentation/api/cron/submit-jobs/route.ts`, `src/presentation/api/cron/refresh-jobs/route.ts`
- Create: `src/app/api/cron/submit-jobs/route.ts`, `src/app/api/cron/refresh-jobs/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Read** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (confirm `GET(request: Request)` signature and segment config such as `dynamic` / `maxDuration` in Next 16).

- [ ] **Step 2: Write the failing test**

```ts
// src/service/generation/cron-auth.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { isCronAuthorized } from "@/service/generation/cron-auth";

function req(auth?: string) {
  return new Request("https://x.test/api/cron/submit-jobs", {
    headers: auth ? { authorization: auth } : {},
  });
}

test("accepts the exact bearer secret", () => {
  assert.equal(isCronAuthorized(req("Bearer s3cret"), "s3cret"), true);
});

test("rejects missing, wrong, or unset secrets", () => {
  assert.equal(isCronAuthorized(req(), "s3cret"), false);
  assert.equal(isCronAuthorized(req("Bearer nope"), "s3cret"), false);
  assert.equal(isCronAuthorized(req("Bearer "), ""), false);
  assert.equal(isCronAuthorized(req("Bearer x"), undefined), false);
});
```

Run: `npx tsx --test src/service/generation/cron-auth.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement auth**

```ts
// src/service/generation/cron-auth.ts
import { timingSafeEqual } from "node:crypto";

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export function isCronAuthorized(request: Request, secret = process.env.CRON_SECRET) {
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
```

Run the test → PASS.

- [ ] **Step 4: Route handlers**

```ts
// src/presentation/api/cron/submit-jobs/route.ts
import { drainPendingJobs } from "@/service/generation/task-runner";
import { isCronAuthorized } from "@/service/generation/cron-auth";

// Every minute: send due pending generation jobs to Higgsfield.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const result = await drainPendingJobs();
  return Response.json(result);
}
```

```ts
// src/presentation/api/cron/refresh-jobs/route.ts
import { refreshSubmittedJobs } from "@/service/generation/task-runner";
import { isCronAuthorized } from "@/service/generation/cron-auth";

// Every minute: pull provider results and time out stuck jobs.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const result = await refreshSubmittedJobs();
  return Response.json(result);
}
```

App-router re-exports (same convention as the webhook):

```ts
// src/app/api/cron/submit-jobs/route.ts
export { GET } from "@/presentation/api/cron/submit-jobs/route";
```

```ts
// src/app/api/cron/refresh-jobs/route.ts
export { GET } from "@/presentation/api/cron/refresh-jobs/route";
```

If the route docs require `export const dynamic = "force-dynamic"` for GET handlers to not be cached in Next 16, add it to the `src/app/...` files (segment config must live in the app file).

- [ ] **Step 5: Schedule**

```json
{
  "crons": [
    { "path": "/api/cron/submit-jobs", "schedule": "* * * * *" },
    { "path": "/api/cron/refresh-jobs", "schedule": "* * * * *" }
  ]
}
```

- [ ] **Step 6: Proxy check**

`src/proxy.ts` only attaches the Clerk session (`clerkMiddleware()` with no protect), so `/api/cron/*` is reachable without login — no change needed. Confirm the curl in Step 7 does not redirect to sign-in.

- [ ] **Step 7: Local smoke test**

```bash
echo 'CRON_SECRET=local-cron' >> .env.local   # only if not present
npm run dev   # separate terminal
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/cron/submit-jobs              # expect 401
curl -s -H "Authorization: Bearer local-cron" http://localhost:3000/api/cron/submit-jobs         # expect {"sent":..}
curl -s -H "Authorization: Bearer local-cron" http://localhost:3000/api/cron/refresh-jobs        # expect {"refreshed":..}
```

- [ ] **Step 8: Commit**

```bash
git add src/service/generation/cron-auth.ts src/service/generation/cron-auth.test.ts src/presentation/api/cron src/app/api/cron vercel.json
git commit -m "feat(queue): per-minute submit and refresh crons"
```

Deploy note (tell the user, don't do it): set `CRON_SECRET` in Vercel project env (Production) before merging.

---

### Task 10: Task list data + server action

**Files:**
- Create: `src/service/generation/task-list.ts`, `src/service/generation/task-list.test.ts`
- Create: `src/presentation/actions/tasks.ts`

**Interfaces:**
```ts
export type TaskStage = "queued" | "sending" | "generating" | "done" | "failed";
export type PublicTask = {
  id: string; kind: GenerationKind; stage: TaskStage;
  title: string;          // video title or character name
  detail: string;         // e.g. "Clip 2 · 起始畫格" / "角色藍圖" / "定裝圖" / "Clip 3 影片"
  previewUrl?: string; isVideo: boolean; href: string;
  error?: string; attempts: number; createdAt: string; updatedAt: string;
};
export function taskStage(status: GenerationStatus): TaskStage;
export function taskDetail(job: Pick<GenerationJob, "kind" | "clipIndex" | "framePosition">): string;
export async function listTasks(clerkUserId: string, options?: { videoId?: string; limit?: number }): Promise<PublicTask[]>;
export async function countActiveTasks(clerkUserId: string): Promise<number>;
```

- [ ] **Step 1: Failing test for the pure parts**

```ts
// src/service/generation/task-list.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { taskDetail, taskStage } from "@/service/generation/task-list";

test("status maps to the five UI stages", () => {
  assert.equal(taskStage("pending"), "queued");
  assert.equal(taskStage("submitting"), "sending");
  assert.equal(taskStage("queued"), "generating");
  assert.equal(taskStage("in_progress"), "generating");
  assert.equal(taskStage("completed"), "done");
  assert.equal(taskStage("failed"), "failed");
  assert.equal(taskStage("nsfw"), "failed");
});

test("detail names the clip and slot", () => {
  assert.equal(taskDetail({ kind: "frame", clipIndex: 1, framePosition: "start" }), "Clip 2 · 起始畫格");
  assert.equal(taskDetail({ kind: "frame", clipIndex: 0, framePosition: "end" }), "Clip 1 · 結尾畫格");
  assert.equal(taskDetail({ kind: "video", clipIndex: 2 }), "Clip 3 · 影片");
  assert.equal(taskDetail({ kind: "still", clipIndex: -1 }), "角色定裝圖");
  assert.equal(taskDetail({ kind: "character", clipIndex: -1 }), "角色藍圖");
});
```

Run → FAIL (module missing).

- [ ] **Step 2: Implement**

```ts
// src/service/generation/task-list.ts
import { ObjectId } from "mongodb";
import { charactersCollection, generationJobsCollection, videosCollection } from "@/dao";
import { isJobInFlight } from "@/service/generation/task-policy";
import { mediaSrc } from "@/util/media-src";
import type { GenerationJob, GenerationKind, GenerationStatus } from "@/model/generation-job";

export type TaskStage = "queued" | "sending" | "generating" | "done" | "failed";

export type PublicTask = {
  id: string;
  kind: GenerationKind;
  stage: TaskStage;
  title: string;
  detail: string;
  previewUrl?: string;
  isVideo: boolean;
  href: string;
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export function taskStage(status: GenerationStatus): TaskStage {
  if (status === "pending") return "queued";
  if (status === "submitting") return "sending";
  if (status === "completed") return "done";
  if (status === "failed" || status === "nsfw") return "failed";
  return "generating";
}

export function taskDetail(job: Pick<GenerationJob, "kind" | "clipIndex" | "framePosition">) {
  if (job.kind === "still") return "角色定裝圖";
  if (job.kind === "character") return "角色藍圖";
  const clip = `Clip ${job.clipIndex + 1}`;
  if (job.kind === "video") return `${clip} · 影片`;
  return `${clip} · ${job.framePosition === "end" ? "結尾畫格" : "起始畫格"}`;
}

// Jobs have no owner field: scope by the user's videos and characters.
async function ownedScope(clerkUserId: string, videoId?: string) {
  const videos = await videosCollection();
  const videoFilter = videoId && ObjectId.isValid(videoId)
    ? { _id: new ObjectId(videoId), clerkUserId }
    : { clerkUserId };
  const videoDocs = await videos
    .find(videoFilter, { projection: { _id: 1, projectId: 1, "phaseA.localizedTitle": 1 } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  const characters = videoId
    ? []
    : await (await charactersCollection())
        .find({ clerkUserId }, { projection: { _id: 1, name: 1 } })
        .limit(200)
        .toArray();
  return { videoDocs, characters };
}

export async function listTasks(
  clerkUserId: string,
  options: { videoId?: string; limit?: number } = {},
): Promise<PublicTask[]> {
  const { videoDocs, characters } = await ownedScope(clerkUserId, options.videoId);
  if (videoDocs.length === 0 && characters.length === 0) return [];
  const videoById = new Map(videoDocs.map((doc) => [doc._id.toHexString(), doc]));
  const characterById = new Map(characters.map((doc) => [doc._id.toHexString(), doc]));

  const jobs = await generationJobsCollection();
  const docs = await jobs
    .find({
      $or: [
        { projectId: { $in: videoDocs.map((doc) => doc._id) } },
        { characterId: { $in: characters.map((doc) => doc._id) } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 100)
    .toArray();

  return docs.map((job) => {
    const video = job.projectId ? videoById.get(job.projectId.toHexString()) : undefined;
    const character = job.characterId ? characterById.get(job.characterId.toHexString()) : undefined;
    return {
      id: job._id.toHexString(),
      kind: job.kind,
      stage: taskStage(job.status),
      title: character?.name ?? video?.phaseA?.localizedTitle ?? "未命名影片",
      detail: taskDetail(job),
      previewUrl: job.status === "completed" ? mediaSrc(job) : undefined,
      isVideo: job.kind === "video",
      href: video
        ? `/app/projects/${video.projectId.toHexString()}?video=${video._id.toHexString()}`
        : "/app/characters",
      error: job.status === "failed" || job.status === "nsfw" ? job.error : undefined,
      attempts: job.attempts ?? 0,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  });
}

// Sidebar badge: tasks still waiting or generating.
export async function countActiveTasks(clerkUserId: string) {
  const tasks = await listTasks(clerkUserId, { limit: 200 });
  return tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
}
```

Check `mediaSrc`'s parameter type (`src/util/media-src.ts`) and adapt; drop the unused `isJobInFlight` import if not needed.

- [ ] **Step 3: Server action**

```ts
// src/presentation/actions/tasks.ts
"use server";

import { requireAppUser } from "@/service/auth";
import { listTasks, type PublicTask } from "@/service/generation/task-list";

export type TasksResult = { ok: true; tasks: PublicTask[] } | { ok: false; error: string };

// Generation tasks for the signed-in user, optionally one video only.
export async function listTasksAction(videoId?: string): Promise<TasksResult> {
  try {
    const user = await requireAppUser();
    return { ok: true, tasks: await listTasks(user.clerkUserId, { videoId }) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "讀取任務失敗" };
  }
}
```

- [ ] **Step 4: Verify** — `npx tsx --test src/service/generation/task-list.test.ts && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/generation/task-list.ts src/service/generation/task-list.test.ts src/presentation/actions/tasks.ts
git commit -m "feat(queue): task list data and server action"
```

---

### Task 11: Task list UI, `/app/tasks`, nav, editor dialog, stuck-button removal, spec sync

**Files:**
- Create: `src/presentation/components/app/tasks/task-stage-badge.tsx`
- Create: `src/presentation/components/app/tasks/task-row.tsx`
- Create: `src/presentation/components/app/tasks/task-list.tsx`
- Create: `src/presentation/components/app/tasks/use-task-poll.ts`
- Create: `src/presentation/components/app/tasks/tasks-view.tsx`
- Create: `src/presentation/components/app/tasks/task-list-dialog.tsx`
- Create: `src/app/app/tasks/page.tsx`
- Modify: `src/presentation/studio/studio-shell.tsx`, `src/presentation/components/app-shell.tsx`, `src/app/app/layout.tsx`, `src/util/i18n/messages/*.ts` (+ `types.ts`)
- Modify: `src/presentation/components/project/production-queue.tsx`, `production-toolbar.tsx`, `clip-production.tsx`
- Modify: `src/presentation/components/project/clip-video-panel.tsx`, `clip-workspace.tsx`
- Modify: `docs/superpowers/specs/2026-09-28-generation-task-queue-design.md`

Follow the existing studio look: `var(--studio-ink)`, `var(--studio-muted)`, `var(--studio-teal)`, `var(--studio-line)`, `var(--studio-canvas)`, `text-accent` for errors, `Spinner` from `@/presentation/components/spinner`, dialog shell from `create-folder-modal.tsx`.

- [ ] **Step 1: Stage badge**

```tsx
// src/presentation/components/app/tasks/task-stage-badge.tsx
import type { TaskStage } from "@/service/generation/task-list";

const LABEL: Record<TaskStage, string> = {
  queued: "排隊中",
  sending: "送出中",
  generating: "生成中",
  done: "完成",
  failed: "失敗",
};

const TONE: Record<TaskStage, string> = {
  queued: "text-[var(--studio-muted)] border-[var(--studio-line)]",
  sending: "text-[var(--studio-teal)] border-[var(--studio-teal)]/40",
  generating: "text-[var(--studio-teal)] border-[var(--studio-teal)]/40",
  done: "text-[var(--studio-ink)] border-[var(--studio-line)]",
  failed: "text-accent border-accent/40",
};

// Small pill for one task's stage.
export function TaskStageBadge({ stage }: { stage: TaskStage }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE[stage]}`}>
      {LABEL[stage]}
    </span>
  );
}
```

- [ ] **Step 2: Row** — thumbnail (image, or `<video muted playsInline preload="metadata">` when `isVideo`; placeholder box with `Spinner` while in flight), title, detail, badge, relative time, error line, and a `Link` to `href`.

```tsx
// src/presentation/components/app/tasks/task-row.tsx
import Link from "next/link";
import { Spinner } from "@/presentation/components/spinner";
import { TaskStageBadge } from "@/presentation/components/app/tasks/task-stage-badge";
import type { PublicTask } from "@/service/generation/task-list";

// One generation task: preview, what it is, where it stands.
export function TaskRow({ task }: { task: PublicTask }) {
  const busy = task.stage !== "done" && task.stage !== "failed";
  const time = new Date(task.updatedAt).toLocaleString("zh-Hant", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="flex items-center gap-3 border-b border-[var(--studio-line)] px-3 py-2.5 last:border-b-0">
      <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--studio-line)] bg-[var(--studio-canvas)]">
        {task.previewUrl ? (
          task.isVideo ? (
            <video src={task.previewUrl} muted playsInline preload="metadata" controls className="h-full w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={task.previewUrl} alt="" className="h-full w-full object-contain" />
          )
        ) : busy ? (
          <Spinner className="h-4 w-4 text-[var(--studio-muted)]" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={task.href} className="line-clamp-1 text-sm font-semibold text-[var(--studio-ink)] hover:underline">
          {task.title}
        </Link>
        <p className="text-xs text-[var(--studio-muted)]">
          {task.detail} · {time}
          {task.stage === "queued" && task.attempts > 0 ? ` · 第 ${task.attempts + 1} 次嘗試` : ""}
        </p>
        {task.error ? <p className="line-clamp-2 text-xs text-accent">{task.error}</p> : null}
      </div>
      <TaskStageBadge stage={task.stage} />
    </li>
  );
}
```

(If other files use `next/image` for remote Blob media, match them instead of `<img>`; `preview-strip.tsx` is the reference.)

- [ ] **Step 3: Poll hook + list**

```ts
// src/presentation/components/app/tasks/use-task-poll.ts
"use client";

import { useEffect, useState } from "react";
import { listTasksAction } from "@/presentation/actions/tasks";
import type { PublicTask } from "@/service/generation/task-list";

const POLL_MS = 5_000;

// Refresh the task list every few seconds while mounted.
export function useTaskPoll(initial: PublicTask[], videoId?: string) {
  const [tasks, setTasks] = useState(initial);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    async function tick() {
      const result = await listTasksAction(videoId);
      if (!alive) return;
      if (result.ok) {
        setTasks(result.tasks);
        setError("");
      } else {
        setError(result.error);
      }
    }
    void tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [videoId]);
  return { tasks, error };
}
```

```tsx
// src/presentation/components/app/tasks/task-list.tsx
import { TaskRow } from "@/presentation/components/app/tasks/task-row";
import type { PublicTask } from "@/service/generation/task-list";

// Plain list of tasks; empty state when nothing ran yet.
export function TaskList({ tasks }: { tasks: PublicTask[] }) {
  if (tasks.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-[var(--studio-muted)]">目前沒有生成任務。</p>;
  }
  return <ul className="rounded-lg border border-[var(--studio-line)]">{tasks.map((task) => <TaskRow key={task.id} task={task} />)}</ul>;
}
```

- [ ] **Step 4: Page view + route**

```tsx
// src/presentation/components/app/tasks/tasks-view.tsx
"use client";

import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import type { PublicTask } from "@/service/generation/task-list";

// /app/tasks: every image / video task, live.
export function TasksView({ initial }: { initial: PublicTask[] }) {
  const { tasks, error } = useTaskPoll(initial);
  const active = tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold">生成任務</h1>
        <p className="mt-1 text-sm text-[var(--studio-muted)]">
          {active > 0 ? `${active} 個任務進行中，每 5 秒更新` : "所有任務都已完成"}
        </p>
      </header>
      {error ? <p role="alert" className="text-sm text-accent">{error}</p> : null}
      <TaskList tasks={tasks} />
    </div>
  );
}
```

Match the header styles of `CharactersHeader` (`src/presentation/components/app/characters/characters-header.tsx`) when implementing.

```tsx
// src/app/app/tasks/page.tsx
import { requireAppUser } from "@/service/auth";
import { listTasks } from "@/service/generation/task-list";
import { TasksView } from "@/presentation/components/app/tasks/tasks-view";

export default async function TasksPage() {
  const user = await requireAppUser();
  const tasks = await listTasks(user.clerkUserId);
  return <TasksView initial={tasks} />;
}
```

- [ ] **Step 5: Nav item + badge**

- `studio-shell.tsx`: icon union adds `"tasks"`; `StudioNavItem` gains `badge?: number`; render the badge (small teal pill with the count, hidden when 0) next to the rail icon; add a `tasks` icon branch in `RailIcon`:
  ```tsx
  if (name === "tasks") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" />
      </svg>
    );
  }
  ```
- `types.ts` + all 11 locale files in `src/util/i18n/messages/`: `nav.tasks` — zh-Hant "生成任務", zh-Hans "生成任务", en "Tasks", de "Aufgaben", es "Tareas", fr "Tâches", id "Tugas", ja "タスク", ko "작업", pt "Tarefas", ru "Задачи". Check `merge.ts` / `index.ts` for any locale fallback that also needs the key.
- `app-shell.tsx`: new prop `activeTasks: number`; add `{ href: "/app/tasks", label: t("nav.tasks"), icon: "tasks", badge: activeTasks }` after characters.
- `src/app/app/layout.tsx`: `const activeTasks = await countActiveTasks(user.clerkUserId);` and pass it.

- [ ] **Step 6: Editor dialog from the queue chip**

```tsx
// src/presentation/components/app/tasks/task-list-dialog.tsx
"use client";

import { useEffect, useId } from "react";
import { TaskList } from "@/presentation/components/app/tasks/task-list";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";

// This video's tasks, opened from the production queue chip.
export function TaskListDialog({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const titleId = useId();
  const { tasks, error } = useTaskPoll([], videoId);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-xl font-bold">這支影片的生成任務</h2>
        {error ? <p role="alert" className="mt-2 text-sm text-accent">{error}</p> : null}
        <div className="mt-4"><TaskList tasks={tasks} /></div>
      </div>
    </div>
  );
}
```

- `production-queue.tsx`: add prop `onOpen: () => void`; wrap the existing `<span>` content in a `<button type="button" onClick={onOpen} className="... cursor-pointer hover:underline" title="查看生成任務">`.
- `production-toolbar.tsx`: new prop `videoId: string`; own `const [tasksOpen, setTasksOpen] = useState(false)`; `<ProductionQueue {...queue} onOpen={() => setTasksOpen(true)} />` and `{tasksOpen ? <TaskListDialog videoId={videoId} onClose={() => setTasksOpen(false)} /> : null}`; add `useState` import (file already `"use client"`).
- `clip-production.tsx`: pass `videoId={project.id}`.

- [ ] **Step 7: Remove the stuck retry**

- `clip-workspace.tsx`: delete the `<ClipVideoPanel ... part="stuck" />` block.
- `clip-video-panel.tsx`: delete the `now` state + interval effect, the `stuck` calc, the `if (part === "stuck")` branch, `part` from props/type (and from the remaining `part="player"` call sites: `rg -n 'part="player"' src`), and unused imports (`STUCK_CLAIM_MS`, `VIDEO_COST`, `RefreshIcon`, `useEffect`/`useState` if unused). Update the header comment.

- [ ] **Step 8: Spec sync**

Edit the spec so it matches the "Simplifications vs. spec" section at the top of this plan (fields list, no `cancelled`, `vercel.json`, editor copy unchanged, character cards unchanged).

- [ ] **Step 9: Verify**

```bash
npx tsc --noEmit
npx eslint src/presentation/components/app/tasks src/presentation/components/project src/presentation/studio src/presentation/components/app-shell.tsx src/app/app
npx tsx --test src/service/generation/*.test.ts src/service/higgsfield/*.test.ts src/presentation/*.test.ts
```

Expected: all PASS.

Browser (dev server): `/app/tasks` renders, sidebar shows 生成任務 with a count while something runs; in a video editor, clicking the 排隊/產製中 chip opens the dialog; generate one frame and watch it go 排隊中 → 送出中 → 生成中 → 完成 with a thumbnail (run the submit/refresh crons by curl if `after()` already sent it, the stage just skips ahead).

- [ ] **Step 10: Commit**

```bash
git add src docs/superpowers/specs/2026-09-28-generation-task-queue-design.md
git commit -m "feat(queue): task list page, nav badge, editor task dialog"
```

---

## Final verification

- [ ] `npx tsc --noEmit` and `npx eslint src` clean.
- [ ] All tests: `npx tsx --test $(rg --files -g '*.test.ts' src)`.
- [ ] `rg "runClipVideoJob|submitClipVideoJob|submitOneFrame|submitCharacterVersion|part=\"stuck\"" src` → no hits.
- [ ] Manual: frame redo, clip video, 補齊剩餘, character create/edit/retry, new video still — each creates a `pending` job that ends `completed` (Mongo `generationJobs`), credits unchanged on success and refunded exactly once on a forced failure (e.g. temporarily throw in `sendFrame`).
- [ ] Remind user: add `CRON_SECRET` to Vercel env before deploying.
