# Per-clip production: frames and video one clip at a time

Date: 2026-09-19  
Status: approved in chat, pending spec review

## Goal

Today a video moves through one linear project status
(`frames_generating → frames_ready → approved → generating → ready`). Every
clip's frames are charged and submitted together, Phase B writes prompts for
every clip at once, and all clip videos are submitted together. A user who
wants to perfect clip 1 before touching clip 2 cannot; a user who wants to
redo clip 1 after the video is ready cannot redo just that clip.

This spec replaces the linear middle of the lifecycle with one `production`
status in which **every clip is independent**: generate its two frames,
review/annotate/redraw them, generate its video, and come back to redo any of
it at any time. Credits are charged per action, not per project. The UI is a
clip timeline with a single-clip workspace ("layout A" chosen in
brainstorming).

## Decisions already made

- **Phase A stays a whole-project gate.** The storyboard proposal is planned
  and approved once; per-clip work begins after approval. Rewriting the whole
  proposal after production has started is out of scope (per-clip text edits
  remain available).
- **Layout A**: horizontal clip timeline on top, one selected clip's full
  workspace (storyboard text / start+end frames / video) below.
- **Derive, don't store, per-clip stage.** No new `clipStates[]`; stage is a
  pure function of the existing `frames[]`, `clips[]` and a few timestamps.
- **Stale is a warning, not a lock.** Editing a clip's text after its frames or
  video exist marks them stale; old media stays visible and playable until the
  user regenerates.
- **A bulk "fill remaining" action stays** for users who do not want to click
  through clips; it only fills gaps and never touches existing or stale media.
- **Per-clip Phase B.** The video prompt for a clip is written when its video
  is requested, with the neighbouring clips' storyboard rows as continuity
  context.
- **No data migration.** Legacy statuses are normalised to `production` on
  read; legacy `frames[]`/`clips[]`/`phaseB` are read as-is.

## Out of scope

- Reordering, adding or deleting clips.
- Per-clip model selection.
- Stitching clips into one output file.
- Rewriting the whole Phase A proposal once production has started.
- Regenerating the character still on demand (it is resubmitted automatically
  on the next frame request if it failed).

## Data model

### `ProjectStatus` (`src/types/project.ts`)

```ts
export type ProjectStatus =
  | "draft"
  | "phase_a"
  | "awaiting_approval"
  | "production"   // storyboard approved; clips are produced independently
  | "ready"        // every clip has a completed video
  | "failed";      // Phase A failed; frame/video failures are per clip
```

Legacy values `frames_generating`, `frames_ready`, `approved`, `generating`
remain in the stored union as `LegacyProjectStatus` and are mapped to
`production` by `normalizeProjectStatus()` in `src/lib/project-status.ts`.
`toPublicVideo` and every action that gates on status call it.

### New timestamps

```ts
StoryboardRow.editedAt?: Date;   // set when the user edits this clip's text
ClipFrame.submittedAt?: Date;    // set when the frame job is submitted
ProjectClip.submittedAt?: Date;  // set when the video job is requested
Project.stillError?: string;     // character still failed; retried on next frame request
```

Legacy fields kept optional and no longer written by the new flow:
`framesCreditCost`, `framesCharged`, `framesSubmittedAt`, `creditCost`,
`creditsCharged`, `phaseB`. `PublicVideo` mirrors the new fields as ISO
strings.

### Per-clip stage — `src/lib/clip-stage.ts` (new, pure)

```ts
export type ClipStage =
  | "no_frames"          // neither frame exists (or both are missing)
  | "frames_generating"  // any frame queued/in_progress
  | "frames_failed"      // any frame failed, none generating
  | "frames_ready"       // both frames completed, no video yet
  | "video_generating"   // clip queued/in_progress
  | "video_failed"       // clip failed
  | "video_ready";       // clip completed

export type ClipState = {
  clipNumber: number;
  stage: ClipStage;
  stale: { frames: boolean; video: boolean };
};

export function clipStateFor(project: PublicVideo | Project, clipNumber: number): ClipState;
export function clipStatesFor(project): ClipState[];              // one per phaseA.clips row
export function isProjectBusy(project): boolean;                  // phase_a, or any frame/clip queued|in_progress
export function isProjectReady(project): boolean;                 // every clip video_ready
```

Precedence when several conditions hold: `video_generating` >
`frames_generating` > `frames_failed` > `video_ready` > `video_failed` >
`frames_ready` > `no_frames`. Frame activity outranks a finished video because
the user is actively redrawing; the video panel still shows the stored video
from `clips[]` regardless of stage. A clip with a failed video and completed
frames is `video_failed` (not `frames_ready`) so the UI can show "retry".

Timestamps (`editedAt`, `submittedAt`) are stored as ISO-8601 strings so they
serialise unchanged through `toPublicVideo` and compare lexicographically.

Stale rules:

- `stale.frames = row.editedAt > frame.submittedAt` for either frame.
- `stale.video = row.editedAt > clip.submittedAt || any frame.submittedAt > clip.submittedAt`.
- Missing timestamps never produce stale (legacy data is never flagged).

### Fill-remaining plan — `src/lib/production-plan.ts` (new, pure)

```ts
export type RemainingPlan = {
  frames: number[];      // clips to submit both frames for (no_frames | frames_failed)
  videos: number[];      // clips to submit video for (frames_ready | video_failed, not stale.frames)
  cost: number;          // frames.length * 2 + videos.length * 1
};
export function planRemaining(project): RemainingPlan;
```

Skips clips that are generating, `video_ready`, or whose frames are stale.
Shared by the dialog (preview) and the server action (authoritative recompute).

## Backend

### Credits

| Action | Cost | Refund |
|---|---|---|
| Clip frames (start + end) | 2 | 1 per failed frame, at failure time |
| Single frame redo | 1 | 1 on failure |
| Clip video | 1 | 1 on failure (LLM, submit, or generation) |
| Character still | 0 | — |
| Approve storyboard | 0 | — |

Invariant: every charged credit maps to one job; a failed job refunds exactly
once (`wasFailed` guard already present in `applyJobStatus`).

### `approveStoryboardAction` (`src/lib/actions/generation.ts`, changed)

Requires `awaiting_approval`. Sets `status: "production"`, clears `error`. If
the project has no cast and no `characterStillUrl`, submits the still job
(free) so it is usually ready before the first frame request. Does **not**
charge or submit frames. `approveAndGenerateAction` is deleted.

### `src/lib/actions/clip-production.ts` (new)

All actions: `requireAppUser`, project must belong to the user, status must
normalise to `production` or `ready`, `clipNumber` must exist in
`phaseA.clips`. Charging order everywhere: `assertCanSpendCredits` →
`consumeCredits` → write DB → submit / `after()`. If the synchronous submit
throws after charging, refund in the same action and return the error.

- **`generateClipFramesAction(projectId, clipNumber)`** — 2 credits. If the
  project has no cast: still must be `completed`; if it failed or is missing,
  resubmit it and return `"角色定裝圖正在產生，請稍候再試"` without charging.
  Deletes the clip's existing frame jobs, submits start and end via the
  existing `submitOneFrame`, writes `frames[]` entries with `queued` +
  `submittedAt`, and sets status `production` (a `ready` project drops back).
- **`generateClipVideoAction(projectId, clipNumber)`** — 1 credit. Both frames
  must be `completed`. Atomic claim with
  `findOneAndUpdate({ _id, "clips.clipNumber": n, "clips.status": { $nin: ["queued","in_progress"] } }, …)`
  (or `$push` if the clip has no entry yet); a lost claim returns
  `"這段正在生成中"` without charging. Writes `clips[n] = { status: "queued", submittedAt }`,
  status `production`, then `after(() => runClipVideoJob(id, n))`.
- **`generateRemainingAction(projectId)`** — recomputes `planRemaining` on the
  server, `assertCanSpendCredits(cost)`, then processes clips one by one with
  the same per-clip logic (charge → submit; refund that clip on failure).
  Returns the project plus a list of clip numbers that failed to submit.

Kept, adjusted: `regenerateFrameAction` (writes `submittedAt`, keeps
`production`), `updateClipStoryboardAction` (writes `row.editedAt`; with
`regenerate` behaves like `generateClipFramesAction`),
`refreshGenerationAction` (polls providers when status normalises to
`production` and any job is pending).

### `src/lib/director/run-phase-b.ts`

Add `runPhaseBForClip({ skill, style, phaseA, clipNumber, language, characterImageUrl, cast })`
returning `{ prompt, durationSeconds }` validated by a new `phaseBClipSchema`
in `schemas.ts`. Same system prompt as `runPhaseB`; the user prompt includes
the full approved Phase A JSON for context, then asks for **only** clip `n`,
quoting the previous clip's `explainerScene`/`motionCamera` end state and the
next clip's start state (omitted at the ends) so the motion hands off cleanly.
The batch `runPhaseB` stays for legacy reads only and is no longer called.

### `src/lib/director/jobs.ts`

- Add `runClipVideoJob(projectId, clipNumber)`: load project + skill →
  `runPhaseBForClip` → write `clips[n].prompt`/`durationSeconds` → delete the
  clip's old video job → `submitClipVideo` → insert job → `syncProjectFromJobs`.
  On any throw: set `clips[n].status = "failed"`, `error`, refund 1.
- Delete `runFrameGenerationJob` and `runPhaseBAndGenerateJob`.

### `src/lib/higgsfield/pipeline.ts`

- `submitOneFrame` unchanged. Add `submitClipVideoJob(project, clipNumber)`
  (single clip; deletes the old job first). Remove `submitClipJobs`'
  "already has video jobs → return" guard and `startProjectGeneration`.
- `startFrameGeneration` shrinks to `submitStillIfNeeded(project)`.
- **`syncProjectFromJobs` rewrite — reconcile per clip regardless of status:**
  - still completed → set `characterStillUrl`; still failed → set
    `stillError` (no project-level failure).
  - `frames[]`: for each existing entry, take status/URLs from the newest job
    matching its `clipIndex` + `framePosition`; entries without a job keep
    their stored values.
  - `clips[]`: for each existing entry, same from the newest `video` job for
    its `clipIndex`.
  - project status (only when it normalises to `production`/`ready`):
    `isProjectReady(project) ? "ready" : "production"`.
  - Delete `failFramesStage` and `failVideoStage`.
- `applyJobStatus`: on `video` job failure, refund 1 (mirrors the frame branch).

### Polling — `src/app/app/projects/new/use-project-poll.ts`

Replace the `IN_FLIGHT`/`NEEDS_JOB_REFRESH` sets with `isProjectBusy(project)`;
call `refreshGenerationAction` whenever busy and status is not `phase_a`.
Interval 3 s.

### `src/lib/project-status.ts`

`STATUS_META` covers the six statuses. `production` is `{ tone: "working",
step: 2, busy: true }` — the static `busy` keeps `folderRollupStatus` and the
dashboard "active" filter working from statuses alone (a folder with any clip
in production reads as working). Components that have the full project
(stepper pulse, polling) use `isProjectBusy(project)` for the precise answer.
`PROJECT_STEP_IDS` becomes `["input", "scene", "production"]`. `failedStepFor`
→ 2 when `phaseA` exists, else 1.

## UI

All new components live in `src/components/project/` because the `/new` form
and the project page render the same production view.

| File | Responsibility |
|---|---|
| `clip-production.tsx` | Container. Props: `project`, `credits`, `subscribed`, `pending`, `error`, callbacks. Owns selected clip (default: first clip not `video_ready`, else #1), ← / → keyboard navigation, header with overall counts ("畫格 4/6 · 影片 1/6", remaining credits), footer (fill-remaining or ready banner), and the `ClipPlayer` when `ready`. |
| `clip-timeline.tsx` | Horizontal chip rail, one chip per clip: number, stage colour (todo dashed / busy yellow + spinner / done green / failed red), start-frame thumbnail when available, ⚠ badge when stale. Click selects. |
| `clip-workspace.tsx` | Selected clip: three columns on desktop (text / frames / video), stacked on mobile. Stale banner on top with "重畫兩張 · 2". Prev/next buttons. Continuity hint under the end frame when the next clip has frames. |
| `frame-tile.tsx` | `FrameTile` extracted from `frames-timeline.tsx`, plus an empty "待畫格" state. |
| `clip-video-panel.tsx` | Video column: empty → "產這段影片 · 1" (disabled with reason until `frames_ready`); generating → skeleton; ready → `<video controls>` + "重產影片 · 1"; failed → error + "重試 · 1 (已退款)". "重產影片" is disabled with a reason while `stale.frames`. |
| `fill-remaining-dialog.tsx` | Confirmation listing each group (frames / retry frames / videos) with counts, unit price, total, remaining credits; states that existing and ⚠ clips are untouched and that newly framed clips still need a video click. |

Reused unchanged: `frame-edit-dialog.tsx`, `clip-edit-dialog.tsx`,
`clip-player.tsx`.

Deleted: `components/project/frames-timeline.tsx`,
`projects/new/generation-panel.tsx`, `projects/[id]/frames-step.tsx`,
`projects/[id]/generation-progress.tsx`.

`new-project-form.tsx`: status branches become `phase_a` → spinner,
`awaiting_approval` → `StoryboardPreview`, `production | ready` →
`ClipProduction`, `failed` → existing failure card. The wrapper's `run()`
pattern (pending key, error, billing redirect, `router.refresh()`) is kept;
pending keys: `frames:{n}`, `frame:{n}:{pos}`, `video:{n}`, `clip:{n}`,
`clip:{n}:regen`, `remaining`.

Every paid button prints its cost ("產這段影片 · 1"). When credits are short
the button is disabled with the reason beside it; when unsubscribed the click
routes to `/app/billing` (existing behaviour).

Stepper: 3 steps 題材 → 分鏡 → 製作; the third shows "影片 2/6" while
`production` and a check when `ready`. All 11 i18n message files get the new
step label and drop the `frames` one.

## Error handling

| Situation | Behaviour |
|---|---|
| Provider rejects a frame submit inside an action | Refund in the same action, return error, no `frames[]` entry written |
| One of two frames fails | Refund 1, clip → `frames_failed`; the good frame stays; retry resubmits only the failed one (1) |
| Phase B LLM fails inside `runClipVideoJob` | `clips[n]` → `failed` with message, refund 1 |
| Video generation fails | `applyJobStatus` refunds 1, clip → `failed` |
| Still fails | `stillError` set; next frame request resubmits the still and returns a wait message without charging |
| Double click "產影片" | Atomic claim; loser gets "這段正在生成中", no charge |
| Fill-remaining partially fails | Per-clip charge/refund; response lists clips that did not go out |
| Legacy project opened | Status normalised; stored `frames[]`/`clips[]` read directly; `phaseB.prompts[n]` used as fallback prompt display |
| Legacy batch-charged project has a later job failure | Refunds 1 per job as usual; the batch flags are never used to refund again |

## Testing

- `src/lib/clip-stage.test.ts` — each of the 7 stages; precedence; the three
  stale triggers; no stale without timestamps; `isProjectReady`;
  `normalizeProjectStatus` legacy mapping.
- `src/lib/production-plan.test.ts` — skips generating / ready / stale-frames
  clips; groups and cost are correct; empty plan when nothing to do.
- `src/lib/director/run-phase-b.test.ts` — `runPhaseBForClip` prompt contains
  neighbour context; first and last clips omit the missing neighbour (mocked
  model).
- `src/lib/higgsfield/reconcile.test.ts` — the pure reconciliation behind
  `syncProjectFromJobs`: a mix of clips with and without video jobs; newest
  job wins; one failure does not touch other clips; `ready` only when every
  clip is complete; non-production statuses pass through.
- Existing `frame-prompts.test.ts`, `phase-a-edit.test.ts`, `folder.test.ts`
  must still pass (folder helpers reference statuses).
- Manual browser pass: create → approve → frames #1 → video #1 → frames #2 →
  edit #1 text (⚠ appears) → redraw #1 → fill remaining → `ready` → redo one
  clip → back to `production`.
