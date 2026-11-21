# Canvas Explainer Plan & Expand Design

**Date:** 2026-11-21  
**Status:** Approved (revised after code read: async planning, plan-only Phase A, frame node delegates to the frame pipeline)  
**Scope:** `/app/canvas` Explainer Scro Tool node turns into a free storyboard planner that expands into an editable per-clip node graph (frame → video → voice → concat).

---

## 1. Intent & Why

A 60s Explainer node shows a single `Run · $7.35` button (9 frames × $0.15 + 60s × $0.10/s). Users read this as "expensive" because the cost is opaque and all-or-nothing: one bad clip means re-running the whole node.

This design keeps the director (Gemini Phase A + Phase B) as the source of quality, but surfaces its output as a normal Canvas graph so users can see the price per step, edit prompts, delete clips, swap the video model, and re-run only the broken clip.

### Relation to `2026-11-20-scro-canvas-tools-design.md`

That spec's anti-goal "do NOT split Explainer into fragile micro-nodes that break Gemini multi-clip storyboard logic" still holds. Here the graph is **generated from** a completed director plan, and the frame node renders through the existing frame pipeline, so script, clip split, per-clip prompts, character lock, prop/set locks, and image routing are unchanged.

---

## 2. Goals & Non-Goals

### Goals
1. Dragging **Explainer** from the sidebar creates a **planner node** (`toolParams.plannerMode: true`). Its primary action is `規劃分鏡（免費）` / `Plan storyboard (free)`.
2. Planning runs in the background (worker), then the client expands one row per clip:
   `Explainer Frame → Hailuo 3 video → Audio Mux ← TTS (1.25x)`, and all Audio Mux outputs feed `FFmpeg Concat`.
3. New Scro Tool node **`scro:explainer-frame`** renders the clip's start still through the existing frame pipeline of the backing video (same references, locks, and Nano Banana 2.1 / Seedream routing), $0.15 each.
4. Planner node stays on the canvas showing the script. `重新規劃` asks for confirmation, then replaces the node group it expanded last time.
5. `Run Flow` price is the plain sum of expanded nodes (frames $0.15, video $0.10/s, TTS $0.02, FFmpeg $0). Planner nodes count $0 and are never executed by Run Flow.

### Non-Goals
- No change to Talking Head, Scro Swap, Teleport, Life Photo, Poster.
- No grouping / collapsing UI for node rows.
- No Undo for expansion (Undo exists only for canvas-agent turns). The re-plan confirmation protects the user instead.
- No change to `/app/videos` history or non-canvas explainer flows.
- No Nano Banana 2.1 as a general-purpose canvas image model.

### Compatibility
- Saved graphs with one-click `scro:explainer` nodes (no `plannerMode`) still run through the current `submitScroAsyncNode` path and billing.
- Starter template `explainer` and the canvas agent create planner nodes from now on.

---

## 3. User Flow

1. Drag **Explainer** onto the canvas → planner node (prompt port + ref images port, director style, language, target duration, character, ratio — same fields as today).
2. Wire a prompt (or type one) and press `規劃分鏡（免費）`.
3. The server action saves the graph, creates the backing `videos` doc (`skipBilling: true`, `canvasPlanOnly: true`), queues Phase A on the worker, and returns at once. The node shows `規劃中…`.
4. The client polls `getCanvasExplainerPlanAction` every 3s. The plan is **ready** when Phase B prompts are stored and `stillBlocker(project)` returns null (character still + prop/set locks done), so every frame can render immediately.
5. On ready the server returns the expansion; the client inserts the nodes to the right of the planner and stores `expandedNodeIds`, `planStatus: "expanded"`, and a short script summary on the planner.
6. User edits any node, deletes clips, or runs `Run Flow`. Per-node failures refund only that node.
7. `重新規劃`: confirm dialog → delete `expandedNodeIds` still present → start a new plan on a **new** backing video (old frames stay valid for nothing; simpler than resetting the old doc).

---

## 4. Expanded Graph Shape

For each Phase A clip `n` (1..N), row y = `planner.y + (n-1) * 300`:

| Node | `modelId` | x offset | Prefilled data |
| --- | --- | --- | --- |
| Frame `n` | `scro:explainer-frame` | +420 | `prompt` = `buildFramePrompt(project, n, "start")`; `toolParams: { plannerVideoId, clipNumber: n }`; `aspectRatio` from planner |
| Voice `n` | `scro:tts` | +420, y+150 | `prompt` = clip `englishVo`; `toolParams: { language, voicePreset or characterId, ttsSpeed: 1.25 }` |
| Video `n` | `openrouter:minimax/hailuo-3` | +800 | `prompt` = Phase B prompt for clip `n`; `durationSeconds` = Phase B `durationSeconds` clamped 5–15 |
| Mux `n` | `ffmpeg:audio-mux` | +1180 | `presetId: "replace"`, `toolParams: { ffmpegMixMode: "replace", ffmpegAudioGainDb: 0 }` |

Edges per clip: `Frame.output → Video.startImage`, `Video.output → Mux.video`, `Voice.output → Mux.refAudio`, `Mux.output → Concat.videos`.

Clips whose `englishVo` is empty or `isSilentSpokenLine` skip Voice + Mux: `Video.output → Concat.videos` directly.

`ffmpeg:concat` accepts up to 8 `videos`. When N > 8: rows 1–8 feed Concat A; Concat A plus rows 9..N feed Concat B (final). Concat nodes sit at x +1560, vertically centered on their inputs.

Voice preset: character with a cloned voice → `toolParams.characterId`; else by language and `voiceGender`: yue `cathy`/`alan`, zh `una`/`yu`, en `bella`/`brian`. All three planner directors are diagram explainers, so `ttsSpeed` is always 1.25 (matches the `atempo=1.25` the director pipeline applies).

---

## 5. Components

### 5.1 Backing video: plan-only Phase A
- `Project` gains `canvasPlanOnly?: boolean` and `canvasPlan?: { prompts: PhaseBPrompt[]; error?: string }`.
- `runPhaseAJob`: when `canvasPlanOnly`, do not set `autoVideoClips`, keep the still + video-lock steps, skip `enqueueSceneImagesForNewVideo`, then run Phase B for every clip (`runCanvasPlanPhaseB`, concurrency 3) and store `canvasPlan`. Phase B failure stores `canvasPlan.error` and the plan shows failed.
- `enqueueSceneImagesForNewVideo` returns early when `canvasPlanOnly` (lock completion re-calls it).

### 5.2 `src/service/canvas/explainer-expand.ts` (new, pure)
`buildExplainerExpansion(input) → { nodes, edges, expandedNodeIds }`. No I/O; unit-tested directly.

### 5.3 `src/service/canvas/explainer-plan.ts` (new)
- `createCanvasDirectorVideo(...)`: extracted from today's `scro:explainer` branch in `submitScroAsyncNode` so both paths insert the same doc. Planner adds `canvasPlanOnly: true` and `autoProduceAllClips: false`.
- `startCanvasExplainerPlan({ clerkUserId, canvasId, nodeId })`: validates the planner node, resolves inputs with `resolveNodeInputs`, creates the doc, `schedulePhaseAWorkerTask`, returns `{ plannerVideoId }`. Charges nothing.
- `readCanvasExplainerPlan({ clerkUserId, plannerVideoId, plannerNode })`: returns `planning | failed | ready(expansion, summary)`.

### 5.4 Server Actions `src/presentation/actions/canvas-explainer.ts` (new)
`startCanvasExplainerPlanAction` (saves the graph snapshot first, like `runCanvasNodeAction`) and `getCanvasExplainerPlanAction`. No REST route.

### 5.5 `scro:explainer-frame` node
- Catalog entry in `SCRO_STATIC_MODELS`: inputs `[promptPort(true)]`, image output, `basePriceUsd: IMAGE_COST_USD`, new optional `CanvasModelSpec.hiddenInSidebar: true`.
- Async execution (`submitScroAsyncNode`, new `domainKind: "explainer_frame"`): loads the backing video (ownership-checked), returns an error when `stillBlocker` is non-null, writes the node prompt onto the frame `(clipNumber, "start")` with `promptEdited: true`, then `regenerateFrame(project, n, "start", undefined, { useStoredPrompt: true })`.
- Poll (`pollScroAsyncJob`): frame `completed` → `blobUrl ?? outputUrl`; `failed` → frame error.
- Billing: `$0.15` through the canvas job; the backing video stays `skipBilling: true`.

### 5.6 Planner exclusion
`isExplainerPlannerNode(node)` = `modelId === "scro:explainer" && toolParams.plannerMode === true`.
- `computeExecutionWaves` skips planner nodes.
- `submitCanvasNodeJob` rejects planner nodes with `INVALID_INPUTS` ("請按「規劃分鏡」").
- Flow price and the node card show `免費` for planners.

### 5.7 Planner UI (`src/app/app/canvas/nodes/`)
- `explainer-planner-panel.tsx` (`"use client"`): plan button, `規劃中…` state, error, script summary, `重新規劃`.
- `explainer-replan-dialog.tsx`: confirmation following existing dialog styling.
- `model-node-card.tsx`: renders the panel instead of the Run button for planner nodes.
- `canvas-workspace.tsx`: `onPlanExplainer(nodeId)` handler, 3s plan polling for nodes with `planStatus: "planning"`, insertion via `toFlowNodes` / `toFlowEdges`, `addModelNodeAt` sets `plannerMode: true` for `scro:explainer`.

### 5.8 Director rule files
Hailuo start-only motion rules already come from `runPhaseBForClip` (`DIAGRAM_EXPLAINER_VIDEO_GUARD` / `PAPERCRAFT_DIORAMA_VIDEO_GUARD`). No shared prompt block is added.

### 5.9 Canvas AI Assistant
`prompt.ts`: explainer nodes are planners; the agent adds and wires them, never adds `scro:explainer-frame`, and tells the user to press `規劃分鏡`.

---

## 6. Billing & Errors
- Planning: free (Gemini + still + locks are absorbed, same as today's free storyboard drafts). No frames are drawn until the user runs a frame node.
- Expanded nodes bill through the existing executor with per-node atomic refund on failure.
- Planning failure (content filter, Gemini error, missing prompt): planner shows the error; nothing is inserted; nothing is charged.
- Re-plan only deletes ids in `expandedNodeIds`; user-added nodes and edges stay.
- Double-click guard: plan button disabled while `planStatus === "planning"`.

---

## 7. Testing (no live provider calls)
- `explainer-expand.test.ts`: node/edge counts for N=3/9/12, chained Concat when N > 8, silent clips skip Voice + Mux, voice preset mapping, unique ids.
- `explainer-planner.test.ts`: `isExplainerPlannerNode`, planner price is 0, `computeExecutionWaves` skips planners.
- `explainer-plan-phase-b.test.ts`: mocked Phase B runner; stores prompts in clip order; error captured.
- `explainer-plan.test.ts`: `readCanvasExplainerPlan` states with mocked deps.
- `scro-dispatch.test.ts`: frame submit writes stored prompt + calls `regenerateFrame`; refuses foreign video; poll maps frame status.
- `pricing.test.ts`: `scro:explainer-frame` = $0.15.
- `executor.test.ts`: legacy one-click `scro:explainer` still bills $7.35 for 60s; planner node is rejected.

---

## 8. Docs
Same change updates `pipeline-models.md` and the model summary in `AGENTS.md`.
