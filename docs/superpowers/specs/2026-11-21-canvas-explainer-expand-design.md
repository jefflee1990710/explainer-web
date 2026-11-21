# Canvas Explainer Plan & Expand Design

**Date:** 2026-11-21  
**Status:** Approved direction (pending spec review)  
**Scope:** `/app/canvas` Explainer Scro Tool node turns into a free storyboard planner that expands into an editable per-clip node graph (frame → video → voice → concat).

---

## 1. Intent & Why

A 60s Explainer node shows a single `Run · $7.35` button (9 frames × $0.15 + 60s × $0.10/s). Users read this as "expensive" because the cost is opaque and all-or-nothing: one bad clip means re-running the whole node.

This design keeps the director (Gemini Phase A + Phase B) as the source of quality, but surfaces its output as a normal Canvas graph so users can see the price per step, edit prompts, delete clips, swap the video model, and re-run only the broken clip.

### Relation to `2026-11-20-scro-canvas-tools-design.md`

That spec's anti-goal "do NOT split Explainer into fragile micro-nodes that break Gemini multi-clip storyboard logic" still holds. Here the graph is **generated from** a completed director plan, not hand-built, so script, clip split, per-clip prompts, character lock, and voice rules are unchanged.

---

## 2. Goals & Non-Goals

### Goals
1. Dragging **Explainer** from the sidebar creates a **planner node**. Its primary action is `規劃分鏡（免費）` / `Plan storyboard (free)`.
2. Planning runs `runPhaseA` + `runPhaseBForClip` for every clip, then expands one row per clip:
   `Explainer Frame → Hailuo 3 video → Audio Mux ← TTS (1.25x)`, and all Audio Mux outputs feed one `FFmpeg Concat`.
3. New Scro Tool node **`scro:explainer-frame`** renders the start still with the same backend the director uses today (Nano Banana 2.1 for diagram explainers, Seedream 5.0 Pro otherwise), $0.15 each.
4. Planner node stays on the canvas showing the script and clip list. `重新規劃` asks for confirmation, then replaces the node group it expanded last time.
5. `Run Flow` price becomes the plain sum of expanded nodes (frames $0.15, video $0.10/s, TTS $0.02, FFmpeg $0).

### Non-Goals
- No change to Talking Head, Scro Swap, Teleport, Life Photo, Poster (single provider call or single ComfyUI workflow; nothing useful to expand).
- No grouping / collapsing UI for node rows (users chose flat per-clip nodes).
- No change to `/app/videos` history or non-canvas explainer flows.
- No Nano Banana 2.1 as a general-purpose canvas image model.

### Compatibility
- Existing saved graphs with one-click `scro:explainer` nodes (no `plannerMode`) still run through the current `submitScroAsyncNode` path and billing.

---

## 3. User Flow

1. Drag **Explainer** onto the canvas → planner node (prompt port + ref images port, director style, language, target duration, character, ratio — same fields as today).
2. Wire a prompt (or type one) and press `規劃分鏡（免費）`.
3. Node shows a loading state (Phase A, then Phase B per clip). No USD Credit is charged.
4. On success the client inserts the expanded nodes to the right of the planner, one horizontal row per clip, plus one Concat node at the end. Insertion is recorded for Undo like template loading.
5. User edits any node, deletes clips, or runs `Run Flow`. Per-node failures refund only that node.
6. `重新規劃`: confirm dialog → delete the previously expanded node ids that still exist → insert the new group.

---

## 4. Expanded Graph Shape

For each Phase A clip `n` (1..N):

| Node | `modelId` | Prefilled data |
| --- | --- | --- |
| Frame `n` | `scro:explainer-frame` | `prompt` = `buildFramePrompt(project, n, "start")`; `toolParams: { plannerVideoId, clipNumber: n }`; `aspectRatio` from planner |
| Video `n` | `openrouter:minimax/hailuo-3` | `prompt` = Phase B prompt for clip `n`; `durationSeconds` = Phase B `durationSeconds` (5–15) |
| Voice `n` | `scro:tts` | `prompt` = clip `englishVo`; `toolParams: { language, voicePreset or characterId, ttsSpeed: 1.25 for diagram explainers, else 1 }` |
| Mux `n` | `ffmpeg:audio-mux` | `presetId: "replace"` |

Edges per clip: `Frame.output → Video.startImage`, `Video.output → Mux.video`, `Voice.output → Mux.refAudio`, `Mux.output → Concat.videos`.

Clips with no spoken line (same check the director voice pipeline uses in `src/service/director/spoken-line.ts`) or narration off skip Voice + Mux: `Video.output → Concat.videos` directly.

`ffmpeg:concat` accepts up to 8 `videos` inputs. When N > 8, chain a second Concat: first 8 into Concat A, `Concat A + remaining clips` into Concat B (final). Layout: clip rows stacked vertically, 4 columns (Frame, Voice, Video, Mux), Concat to the right, vertically centered.

The planner node records `toolParams.expandedNodeIds: string[]` and `toolParams.plannerVideoId`.

---

## 5. Components

### 5.1 `src/service/canvas/explainer-expand.ts` (new, pure)
`buildExplainerExpansion(input: { plannerNodeId, plannerPosition, project: Project, phaseBPrompts: PhaseBPrompt[], framePrompts: string[], voice: {...}, idPrefix }) → { nodes: CanvasNode[]; edges: CanvasEdge[]; expandedNodeIds: string[] }`. No I/O, so it is unit-tested directly.

### 5.2 `src/service/canvas/explainer-plan.ts` (new)
`planCanvasExplainer({ clerkUserId, canvasId, nodeId })`:
1. Loads the canvas + planner node, resolves wired prompt / ref images (`resolveNodeInputs` in `graph.ts`).
2. Creates (or reuses on re-plan) the backing `videos` document exactly like the current `scro:explainer` dispatch (`skipBilling: true`, `creditsCharged: false`), so `buildFramePrompt`, cast, style, products and reference images stay identical.
3. Runs `runPhaseA`, saves `phaseA`, runs `runPhaseBForClip` per clip (bounded concurrency), saves prompts.
4. Builds `framePrompts` with `buildFramePrompt(project, n, "start")`.
5. Returns `buildExplainerExpansion(...)` output plus the script summary. Charges nothing.

### 5.3 Server Action `src/presentation/actions/canvas-explainer.ts` (new)
`"use server"` wrapper: `planCanvasExplainerAction(canvasId, nodeId)` → `requireClerkUserId()` → `planCanvasExplainer`. No new REST route.

### 5.4 `scro:explainer-frame` node
- Catalog: `src/service/canvas/model-catalog.ts` `SCRO_STATIC_MODELS`, category `scro-tool`, inputs `[promptPort(true), refImagesPort(4)]`, output image, `basePriceUsd: IMAGE_COST_USD`, plus a new optional `CanvasModelSpec.hiddenInSidebar: true` so the sidebar skips it (only created by expansion; still resolvable by `findCanvasModel`).
- Execution: `src/service/canvas/scro-dispatch.ts` sync branch. Loads `plannerVideoId` (ownership-checked), picks the route with `resolveImageRoute` / `imageRouteForSceneText` for that project's skill + style, attaches the same character / style / reference images the director pipeline attaches, uses the node's (possibly edited) prompt, persists to Blob via `persistMedia`. Falls back to Seedream 5.0 Pro + wired refs if the backing video was deleted.
- Pricing: `estimateCanvasModelCostUsd` → `IMAGE_COST_USD`.

### 5.5 Planner node UI
- Files under `src/app/app/canvas/` (new components in their own files, `"use client"` where hooks are used): `explainer-planner-body.tsx` (fields + plan button + script/clip list), `explainer-replan-dialog.tsx` (confirmation, following existing dialog styling).
- `canvas-workspace.tsx`: handler that calls the action and inserts nodes/edges the same way template loading does (`toFlowNodes` / `toFlowEdges`, `scheduleAutosave`, Undo entry). Re-plan removes `expandedNodeIds` still present first.
- Planner node shows `免費` instead of a USD price; Run Flow price ignores planner nodes.

### 5.6 Director rule files
Hailuo start-only motion rules (locked camera, silent on-screen character, eyes/hands on teaching element) already live in each explainer director's own rule file and are emitted by Phase B. No shared prompt block is added. If any explainer director's Phase B output is missing those rules, the fix goes into that director's own file under `src/service/director/rules/`.

### 5.7 Canvas AI Assistant
`src/service/canvas-agent/tools.ts` + `prompt.ts`: agent knows the planner mode, never adds `scro:explainer-frame` directly, and tells users to press `規劃分鏡` (planning is user-triggered because the agent never runs nodes).

---

## 6. Billing & Errors
- Planning: free. Gemini cost is absorbed, same as today's free storyboard drafts.
- Expanded nodes bill through the existing executor with per-node atomic refund on failure. No double charge: the backing `videos` doc stays `skipBilling: true`.
- Planning failure (content filter, Gemini error, missing prompt): node shows the error; nothing is inserted; nothing is charged.
- Re-plan only deletes ids in `expandedNodeIds`; user-added nodes and edges are untouched.
- Rate limit: one in-flight plan per planner node (button disabled + server-side guard on the backing video `status`).

---

## 7. Testing (no live provider calls)
- `explainer-expand.test.ts`: node count for N=3 / 9 / 12, edges per clip, chained Concat when N > 8, no-dialogue clips skip Voice + Mux, TTS speed 1.25 only for diagram explainers, unique ids, layout positions.
- `explainer-plan.test.ts`: mocked `runPhaseA` / `runPhaseBForClip`; asserts no wallet debit, backing video `skipBilling: true`, re-plan reuses the same video id.
- `pricing.test.ts`: `scro:explainer-frame` = $0.15; expanded 60s/9-clip graph sum matches frames + video + TTS.
- `scro-dispatch.test.ts`: frame node picks Nano Banana 2.1 route for paper-cutout skill and Seedream otherwise (mocked submit), ownership check on `plannerVideoId`.
- `executor.test.ts`: legacy one-click `scro:explainer` still bills $7.35 for 60s.

---

## 8. Docs
Same change updates `pipeline-models.md` and the model summary in `AGENTS.md`: Canvas Explainer planner (free Phase A/B), `scro:explainer-frame` image routing, expanded per-clip Hailuo 3 + ElevenLabs TTS (1.25x for diagram explainers) + FFmpeg Audio Mux + Concat.
