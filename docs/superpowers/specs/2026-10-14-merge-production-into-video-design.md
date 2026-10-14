# Merge Production into Video (native ScroVideo)

Date: 2026-10-14
Status: approved (design)

## Goal

Remove the Production tab. After the user creates a video and Phase A (分鏡) finishes, they land directly in the Video tab (inline OpenCut). Each storyboard clip appears as a first-class **ScroVideo** in Assets and as a timeline placeholder that shows the start scene image or a loading state. Generation runs automatically in the background. When a clip video completes, the timeline element swaps in place to the real media. The right-hand Properties panel shows the same production controls that live on Production today: regenerate, Edit with AI, VO, and prompts. Bulk generate, the in-flight queue, and add/delete clip ship in the first version.

## Decisions already made

- Production tab is fully removed. All production work happens inside Video / OpenCut.
- Approach: **native ScroVideo** inside OpenCut (not an embedded Production desk shell).
- Before a clip video exists, the timeline still gets a **placeholder** element whose duration comes from the storyboard. Thumbnail is start scene image or loading. When the video is ready, the same element swaps source in place.
- After create / Phase A, generation **auto-queues** using the existing production plan (same behavior as today’s Production desk).
- First version includes **bulk generate, queue panel, add clip, and delete clip** in the Video chrome—not only per-clip Properties.
- Mongo models stay: `phaseA.clips`, `frames`, `clips` (rendered videos), scene chats. No parallel clip store. OpenCut edit blob gains a stable `scroClipNumber` (or equivalent) on timeline elements.
- Existing server actions for generate / regenerate / scene chat / frame edit remain the API surface. No second generation API.
- Image / video calls in automated tests stay prompt snapshots and pure functions. No live Higgsfield submit while developing.

## Out of scope (first version)

- Keeping a secondary Production route for power users.
- Rebuilding Edit with AI or Frame edit as brand-new chat UIs (reuse existing dialogs mounted on the OpenCut shell).
- The old Production filmstrip as the primary navigation surface (timeline + Assets replace it).
- Changing Higgsfield providers, credit math, or the core production-plan ordering rules (only the trigger surface moves).
- Perfect duration rematch when rendered video length differs a lot from storyboard length (one simple rule is enough; see Timeline duration).

## Current state (baseline)

- Steps: `input` → `production` → `export` (UI label “Video”). Gating: Video unlocks when every storyboard clip is `video_ready` (`status: "ready"`).
- Production UI lives under `src/presentation/components/project/` (~37 TSX, ~4300 lines): desk, filmstrip, inspector, toolbar, queue, scene chat, frame edit.
- Video tab: `opencut-direct-desk.tsx` → `src/opencut/embed/`. Clips import only after they have a completed video URL (`ScroClipImport`).
- Derived clip stage: `src/service/clip-stage.ts` (`no_frames` → … → `video_ready`).

## Architecture

```
Brief submit → Phase A job
                 ↓
         Video tab open (OpenCut)
                 ↓
    Insert ScroVideo placeholders by 分鏡 order
                 ↓
    Host starts production plan (auto queue)
                 ↓
    Poll / refresh project → scro-clip-updated events
                 ↓
    Assets + timeline thumbs update; video_ready → swap URL
```

- **Host** (`opencut-direct-desk` and related actions): owns project fetch, production-plan trigger, and push of clip updates into the editor.
- **Editor** (`src/opencut`): ScroVideo asset type, timeline elements with `scroClipNumber`, Properties panel, toolbar hooks for bulk / queue / add / delete.
- **Server**: existing clip / frame / scene-chat actions; step / status helpers updated so Video is allowed before global `ready`.

## Navigation and lifecycle

### Steps

- Replace user-facing steps with: **Input (brief)** → **Video**.
- Remove Production from `EditorStepSwitch` and related i18n.
- Deep links / bookmarks that pointed at Production redirect to Video.
- Optional: keep an Export *action* or sub-view later; it is not a separate Production-like step.

### Create flow

1. User submits brief → Phase A runs in the background (unchanged).
2. When Phase A has clips, the project is editable in Video (do **not** wait for all clips `video_ready`).
3. Redirect / open Video tab and load OpenCut.
4. If there is no saved OpenCut edit, insert placeholder elements on the main track in storyboard order, duration = each row’s `durationSeconds`.
5. Host starts the existing production plan automatically.
6. As each clip reaches `video_ready`, swap that element’s media to the completed URL without resetting `startTime`.

### Unlock rules

- **Video tab:** Phase A completed with at least one storyboard clip.
- **Final export / “all done” UX:** product can still prefer all clips `video_ready`; that gate moves to export, not to entering Video.
- Legacy projects stuck in `production` or not yet `ready` open Video and reconcile placeholders.

## ScroVideo model and stages

ScroVideo is the OpenCut-facing view of one storyboard clip. Persistence remains Mongo storyboard + frames + clip videos.

### Identity

- Stable key: `clipNumber` (and project / video id from host context).
- Timeline element and Assets row both carry `scroClipNumber` so restore and live updates do not depend on media file names.

### Derived UI stage

Computed from existing frame / clip records and the dual-beat vs start-only setting (same rules as today’s production plan):

| Stage | Meaning | Assets | Timeline / preview thumb |
|-------|---------|--------|---------------------------|
| `awaiting_frames` | No usable scene still | Empty / placeholder | Loading |
| `frames_generating` | Frame queued or in progress | Progress | Loading; show start still if already present |
| `frames_ready` | Required stills done (start, or start+end) | Start image | Start image |
| `video_generating` | Clip video queued or in progress | Start image + spinner | Start image + loading overlay |
| `video_ready` | Completed video URL | Video / poster | Real video (or poster) |
| `failed` | Frame or video failed | Error badge | Last usable image or error state |

### Timeline duration on swap

Default: keep the storyboard / placeholder duration on the element after swap so the reel length stays predictable. If the file is longer, trim; if shorter, leave a shortfall or mark in Properties (pick one concrete rule in the implementation plan and test it). Do not reshuffle later clips’ `startTime` unless the user asks for a ripple edit later (out of scope).

## Assets, insert, and live swap

### Assets

- Media (or a Scro subsection) lists ScroVideos ordered by `clipNumber`, with stage badge and start thumb / loading.
- Drag onto timeline: if that `clipNumber` is already on the main track, block duplicate insert (or confirm replace). If not on the track, allow drop.
- Selecting a ScroVideo in Assets (even off-timeline) opens the same Properties panel.

### Initial insert

- No saved edit → insert all placeholders in 分鏡 order on the main track.
- Saved edit → restore OpenCut project; refresh each `scroClipNumber` from server (poster / URL / stage) without reordering user edits.
- **Add clip:** update storyboard, add Assets row, **append** a placeholder to the main track (same as create-time behavior).

### Live updates

- Host watches project refresh / poll (reuse current production polling patterns).
- Event into editor: e.g. `scro-clip-updated { clipNumber, stage, posterUrl?, videoUrl? }`.
- Editor updates matching elements and Assets rows; preserves `startTime`.
- Retire the “import only completed mp4s” path in `ScroClipImport` in favor of placeholder-then-swap.

## Properties, Edit with AI, bulk, queue, clip CRUD

### Selection

- Selecting a timeline element with `scroClipNumber` (or an Assets ScroVideo) shows the **Scro clip** Properties panel.
- Other OpenCut elements keep the existing properties tabs.

### Panel contents (parity with Production inspector)

- Meta: Clip N, time range, duration.
- Stage + error text.
- Primary actions: generate frames / generate video / regenerate (stage-dependent), wired to existing actions.
- VO (including dual-beat start/end VO when applicable).
- Scene / motion copy; submitted image / video prompts (read-only; debug toggle may remain).
- **Edit with AI:** mount existing scene chat dialog on the OpenCut shell.
- **Per-frame redraw:** start/end thumbs open existing `FrameEditDialog`.

### Bulk / queue / add / delete (v1)

- Toolbar or Assets chrome: generate all, multi-select batch generate, in-flight queue UI—logic from `production-toolbar`, `production-queue`, `bulk-generate-dialog`, restyled for the editor.
- Add clip: existing add-clip flow + Assets + timeline append.
- Delete clip: confirm → delete server clip → remove Assets row and timeline element(s) with that `scroClipNumber`.
- Multi-select selection bar for batch generate / delete.

### Auto queue

- Entering Video with Phase A complete starts the same production plan host path as today. Properties and Queue are alternate views of one job system.

## Error handling

- Failed frame / video: show failure on Assets and timeline; Properties offers Retry; keep last good start still when present.
- Failed media fetch on swap: keep placeholder, toast error, do not delete the element.
- Storyboard vs timeline drift after add/delete: reconcile from server storyboard (add missing Assets rows; mark orphan timeline Scro elements).
- Partial legacy projects: always allow Video; build placeholders if no edit exists.

## Testing

- Unit: stage derivation; placeholder duration; swap keeps `startTime`; dual-beat vs start-only readiness.
- Integration: Phase A done → N placeholders; frame done → poster; video done → URL swap.
- Regression: Edit with AI, frame redraw, bulk generate, add/delete clip.
- Manual: create → land on Video; scrub while generating; refresh mid-edit without losing cuts.
- No live Higgsfield in CI or agent verification.

## Work packages and estimate

| Package | Content | Estimate (1 person) |
|---------|---------|---------------------|
| W1 | Steps / nav: remove Production, create → Video, unlock rules | 0.5–1 week |
| W2 | ScroVideo model + Assets list + stage UI | 1–1.5 weeks |
| W3 | Storyboard placeholders + restore/reconcile + live swap | 1.5–2 weeks |
| W4 | Properties (VO / prompt / generate / regenerate) → actions | 1–1.5 weeks |
| W5 | Edit with AI + FrameEdit on OpenCut shell | 0.5–1 week |
| W6 | Bulk / queue / add / delete / selection | 1–1.5 weeks |
| W7 | Auto production-plan trigger + poll / events | 0.5–1 week |
| W8 | Remove Production entry points, copy, tests, polish | 0.5–1 week |

**Total:** about **6–8 weeks** for one person (often 5–6 on the happy path). Two people: about **3.5–5 weeks**. Add about **+1 week** risk buffer for edit persistence vs live updates and duration mismatches.

### Milestones

1. **M1 (~2 weeks):** No Production tab; Video shows ScroVideo placeholders; auto generate; swap works (Properties can be thin).
2. **M2 (~+2 weeks):** Full Properties + Edit with AI + frame redraw.
3. **M3 (~+2 weeks):** Bulk / queue / add / delete; delete old Production entry points.

## Key files (starting points)

- Steps / gating: `src/service/project-status.ts`, `editor-step-switch.tsx`, `new-project-form.tsx`
- Production surface to retire as primary UX: `src/presentation/components/project/*`
- Stages: `src/service/clip-stage.ts`, production-plan services
- OpenCut host: `opencut-direct-desk.tsx`, `src/opencut/embed/scro-clip-import.tsx`
- Assets: `src/opencut/components/editor/panels/assets/`
- Properties: OpenCut properties panel + new Scro clip tab components (page-local under embed or assets)

## Success criteria

- User never needs the Production tab to finish a video.
- Create → Phase A → Video shows ordered placeholders immediately.
- Auto generation fills stills then videos; timeline thumbs and media update without a full re-import.
- Selecting a ScroVideo exposes regenerate, Edit with AI, VO, and prompts.
- Bulk generate, queue, add clip, and delete clip work from Video in v1.
- Old Production routes do not remain as a supported workflow.
