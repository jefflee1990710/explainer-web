# Canvas Explainer Settings & Stale Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear stale canvas previews after any input change and move Explainer look settings into one Explainer Settings node.

**Architecture:** Pure helpers in `src/service/canvas/stale-outputs.ts` and `src/service/canvas/explainer-settings.ts` do every graph decision; the agent tools, server actions, and the client workspace only call them. The settings node is a new node type `settings` whose data maps 1:1 onto backing-video fields the director already reads.

**Tech Stack:** Next.js 16 (webpack), React Flow (`@xyflow/react`), MongoDB, Zod, `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-23-canvas-explainer-settings-design.md`

## Global Constraints

- No paid provider calls in tests; no Higgsfield calls at all.
- `db.collection<T>(name)` typing; Server Actions instead of REST.
- New UI components in their own file, `"use client"` when they use hooks, next to the canvas page.
- Reply text and UI copy: Traditional Chinese first, English for `en` locale.
- Do not commit the unrelated uncommitted download-title changes already in the tree.

---

### Task 1: Stale output helpers + model fields

**Files:**
- Modify: `src/model/canvas.ts` (node type `settings`, `outputClearedAt`, `explainerSettings`)
- Create: `src/model/explainer-settings.ts`
- Create: `src/service/canvas/stale-outputs.ts`, `src/service/canvas/stale-outputs.test.ts`

**Interfaces (Produces):**
- `clearNodeOutput(data: CanvasNodeData, clearedAt: string): CanvasNodeData`
- `downstreamNodeIds(edges, startIds): string[]` (inclusive, BFS order)
- `clearStaleOutputs(nodes, edges, changedIds, clearedAt): { nodes: N[]; clearedIds: string[] }`
- `isGenerationInputPatch(data, patch): boolean`

Tests: downstream walk through frame → video → mux → concat; running node untouched; idle node
without output not reported; `isGenerationInputPatch` true for prompt change, false for status /
outputUrl patch and for an unchanged prompt.

### Task 2: Server never undoes a clear

**Files:** `src/service/canvas/graph.ts`, `src/service/canvas/graph.test.ts`

- `mergeCanvasNodeSnapshots`: skip restore when `incoming.outputClearedAt && incoming.outputClearedAt !== previous.outputClearedAt`.
- `applyCompletedJobOutputs`: skip jobs with `updatedAt <= Date.parse(node.outputClearedAt)`.
- `getNodeOutputPortType` returns null for `settings` nodes.

Tests: cleared node not restored; later stale snapshot with same `outputClearedAt` still restored;
job before clear ignored, job after clear applied.

### Task 3: `clear_output` op + agent stale clearing

**Files:** `src/service/canvas-agent/types.ts`, `apply-ops.ts`, `apply-ops.test.ts`, `tools.ts`, `tools.test.ts`

- Op `{ kind: "clear_output"; nodeIds: string[]; clearedAt: string }`; replay applies `clearNodeOutput`.
- `markStale(g, ids)` in tools.ts runs `clearStaleOutputs` on the working graph and pushes one op.
- Called from `update_node`, `connect`, `disconnect`.

Tests: replay clears outputs; `update_node` on a completed frame emits `clear_output` with frame,
video, mux, concat ids.

### Task 4: Explainer settings pure module

**Files:** Create `src/service/canvas/explainer-settings.ts`, `explainer-settings.test.ts`

**Produces:**
- `EXPLAINER_SKILL_SLUGS`, `explainerBackgroundPresets(skillSlug)`, `normalizeExplainerSettings(raw)`
- `explainerSettingsChanges(a, b): { changed: (keyof ExplainerSettings)[]; restyleOnly: boolean }`
- `composeExplainerPlanSource({ topic, presenterPosition, narration }): string`, `topicFromPlanSource(source)`
- `explainerSettingsToolParams(s)`, `explainerSettingsFromToolParams(tp)`
- `explainerSettingsFromVideo(video)`
- `explainerSettingsNode({ groupId, position, data }): CanvasNode`, `explainerSettingsEdges(groupId, frameIds)`
- `buildExplainerReplanCard({ nodes, group, settingsNode, next, cardId }): CanvasNode`

### Task 5: Planner reads settings; expansion adds the node

**Files:** `src/service/canvas/scro-dispatch.ts`, `explainer-expand.ts`, `explainer-plan.ts`, their tests, `src/service/canvas/explainer-layout.ts` (settings column)

### Task 6: Restyle server action

**Files:** Create `src/service/canvas/explainer-restyle.ts`; modify `src/presentation/actions/canvas-explainer.ts`

`restyleCanvasExplainer({ clerkUserId, plannerVideoId, textStyleId }) → { ok: true; framePrompts: { clipNumber; prompt }[] } | { ok: false; error }`

### Task 7: Migration on load + one-off reset script

**Files:** Create `src/service/canvas/explainer-settings-migrate.ts` (+ test for the pure graph edit); modify `src/app/app/canvas/page.tsx`; create `scripts/reset-canvas-explainer-previews.ts`

### Task 8: Agent tool + prompt

**Files:** `src/service/canvas-agent/tools.ts`, `group-tools.ts`, `prompt.ts`, tests

### Task 9: Client

**Files:** Create `src/app/app/canvas/nodes/explainer-settings-node-card.tsx`, `explainer-settings-options.ts`; modify `canvas-workspace.tsx`, `nodes/port-colors.ts`, `nodes/model-node-card.tsx`

- NODE_TYPES `settings`; stale clearing in `onUpdateNodeData`, `handleConnect`, edge removal, `onDeleteNode`; `applyAgentOps` handles `clear_output` and pending settings; `onApplyExplainerSettings`.
- Model card renders a `settings` target handle row when wired.

### Task 10: Docs, lint, typecheck, tests

`AGENTS.md`, `pipeline-models.md`; `npx tsc --noEmit`; `npx eslint` on touched files; `npx tsx --test 'src/service/canvas/**/*.test.ts' 'src/service/canvas-agent/**/*.test.ts'`.
