# Canvas Agent Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chat dock below `/app/canvas` where a Scro AI agent builds and edits the node graph in the user's chosen language and explains what it built, without ever running generation.

**Architecture:** A Hermes-style tool loop runs on the server inside a Server Action. Pure tools edit an in-memory copy of the graph and log ordered ops. The client replays those ops onto the live React Flow graph with a per-turn undo snapshot. Chat history is stored per canvas in MongoDB.

**Tech Stack:** Next.js 16 Server Actions, AI SDK `ai` 7 (`generateText`, `tool`, `stepCountIs`), `@ai-sdk/google` Gemini 3.8 Flash, Zod, MongoDB, `@xyflow/react` 13, Node test runner via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-20-canvas-agent-chat-design.md`

## Global Constraints

- The agent has no tool that runs a node, runs a flow, or spends USD Credit. Chat is free.
- New model nodes must use an OpenRouter catalog model (`spec.provider === "openrouter"`).
- Languages: `zh-Hant`, `yue`, `en`, `zh-Hans`, `ja`, `ko`.
- Max 12 tool-loop steps per turn, then one grace call without tools. Max 20 added nodes per turn.
- Model input history: latest 20 messages.
- Collection `canvas_agent_messages`, accessed through a typed `db.collection<CanvasAgentMessage>()` in `src/dao/canvas.ts`.
- Tests never call a live model. Run with `npx tsx --test <file>`.
- New UI components live in `src/app/app/canvas/agent/`, one per file, `"use client"` when they use hooks.
- Reply to the user in Traditional Chinese; code identifiers in English.

---

### Task 1: Ops model and pure op replay

**Files:**
- Create: `src/service/canvas-agent/types.ts`
- Create: `src/service/canvas-agent/apply-ops.ts`
- Test: `src/service/canvas-agent/apply-ops.test.ts`

**Interfaces — Produces:**

```ts
export const CANVAS_AGENT_LANGUAGES = ["zh-Hant", "yue", "en", "zh-Hans", "ja", "ko"] as const;
export type CanvasAgentLanguage = (typeof CANVAS_AGENT_LANGUAGES)[number];

export type CanvasAgentOp =
  | { kind: "add_node"; node: CanvasNode }
  | { kind: "update_node"; nodeId: string; patch: Partial<CanvasNodeData> }
  | { kind: "remove_node"; nodeId: string }
  | { kind: "add_edge"; edge: CanvasEdge }
  | { kind: "remove_edge"; edgeId: string }
  | { kind: "move_node"; nodeId: string; position: { x: number; y: number } };

export type CanvasAgentGraph = { nodes: CanvasNode[]; edges: CanvasEdge[] };

export function applyCanvasAgentOp(graph: CanvasAgentGraph, op: CanvasAgentOp): { graph: CanvasAgentGraph; applied: boolean };
export function applyCanvasAgentOps(graph: CanvasAgentGraph, ops: readonly CanvasAgentOp[]): { graph: CanvasAgentGraph; skipped: number };
```

Rules: `add_node` skips a duplicate id. `update_node`/`move_node`/`remove_node` skip a missing node. `remove_node` also removes connected edges. `add_edge` skips when either endpoint is missing or the id exists, and replaces an existing edge into the same target handle. `remove_edge` skips a missing edge.

- [ ] Step 1: Write tests for each rule above (add, duplicate add skipped, update merge, remove node drops edges, add edge with missing endpoint skipped, single-handle replacement, move, `applyCanvasAgentOps` skipped count).
- [ ] Step 2: Run `npx tsx --test src/service/canvas-agent/apply-ops.test.ts` — expect FAIL (module missing).
- [ ] Step 3: Implement `types.ts` and `apply-ops.ts`.
- [ ] Step 4: Re-run — expect PASS.
- [ ] Step 5: Commit `feat(canvas-agent): add op model and pure op replay`.

### Task 2: Tool registry over a working graph

**Files:**
- Create: `src/service/canvas-agent/tools.ts`
- Test: `src/service/canvas-agent/tools.test.ts`

**Interfaces — Consumes:** Task 1 types; `validateEdgeConnection`, `computeExecutionWaves` from `@/service/canvas/graph`; `CanvasModelSpec`, `findCanvasModel` from `@/service/canvas/model-catalog`; `CanvasLibraryAsset` from `@/service/canvas/projects`.

**Produces:**

```ts
export const CANVAS_AGENT_MAX_ADDED_NODES = 20;

export type CanvasAgentWorkingGraph = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  catalog: readonly CanvasModelSpec[];
  assets: readonly CanvasLibraryAsset[];
  ops: CanvasAgentOp[];
  addedNodes: number;
  nextId: () => string;
};

export function createWorkingGraph(input: {
  nodes: CanvasNode[]; edges: CanvasEdge[];
  catalog: readonly CanvasModelSpec[]; assets: readonly CanvasLibraryAsset[];
  idPrefix?: string;
}): CanvasAgentWorkingGraph;

export type CanvasAgentToolResult = Record<string, unknown>;

// Pure handlers keyed by tool name; each returns JSON or { error }.
export const CANVAS_AGENT_TOOL_HANDLERS: {
  get_canvas(g, input: {}): CanvasAgentToolResult;
  list_models(g, input: {}): CanvasAgentToolResult;
  list_assets(g, input: {}): CanvasAgentToolResult;
  add_prompt_node(g, input: { text: string }): CanvasAgentToolResult;
  add_model_node(g, input: { modelId: string; prompt?: string; aspectRatio?: CanvasAspectRatio; durationSeconds?: number }): CanvasAgentToolResult;
  add_media_node(g, input: { assetId: string }): CanvasAgentToolResult;
  update_node(g, input: { nodeId: string; prompt?: string; text?: string; aspectRatio?: CanvasAspectRatio; durationSeconds?: number }): CanvasAgentToolResult;
  connect(g, input: { sourceId: string; targetId: string; targetPort: string }): CanvasAgentToolResult;
  disconnect(g, input: { edgeId: string }): CanvasAgentToolResult;
  delete_node(g, input: { nodeId: string }): CanvasAgentToolResult;
  arrange_layout(g, input: {}): CanvasAgentToolResult;
};

// AI SDK tool set bound to one working graph (Zod input schemas + execute).
export function buildCanvasAgentTools(g: CanvasAgentWorkingGraph): ToolSet;
```

Edits mutate `g.nodes`/`g.edges` and push an op. `connect` uses `validateEdgeConnection(..., { allowReplaceSingle: true })` and logs `remove_edge` for a replaced edge before `add_edge`. `delete_node` rejects `queued`/`running`. `add_model_node` rejects non-OpenRouter ids and clamps duration to the spec range. New nodes are placed right of the rightmost node; `arrange_layout` places nodes in columns by wave (prompt/media in column 0, model wave `i` in column `i + 1`), 380px apart, rows 300px apart, logging `move_node`.

- [ ] Step 1: Write tests: model list is OpenRouter-only; add prompt + model + connect logs 3 ops; video output into Seedream prompt port returns `{ error }`; Mentalok model rejected; delete removes edges and logs `remove_node`; running node delete rejected; replaced single-port edge logs remove then add; added-node limit; `arrange_layout` columns; `add_media_node` with unknown asset errors.
- [ ] Step 2: Run — expect FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run — expect PASS.
- [ ] Step 5: Commit `feat(canvas-agent): add canvas tool registry`.

### Task 3: System prompt and turn loop

**Files:**
- Create: `src/service/canvas-agent/prompt.ts`, `src/service/canvas-agent/loop.ts`
- Test: `src/service/canvas-agent/prompt.test.ts`, `src/service/canvas-agent/loop.test.ts`

**Produces:**

```ts
// prompt.ts
export const CANVAS_AGENT_LANGUAGE_LABELS: Record<CanvasAgentLanguage, string>;
export function canvasAgentLanguageRule(language: CanvasAgentLanguage): string;
export function buildCanvasAgentSystemPrompt(input: { language: CanvasAgentLanguage; graph: CanvasAgentWorkingGraph }): string;

// loop.ts
export const CANVAS_AGENT_MAX_STEPS = 12;
export type CanvasAgentHistoryMessage = { role: "user" | "assistant"; text: string };
export type CanvasAgentGenerate = (input: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: ToolSet;
  maxSteps: number;
}) => Promise<{ text: string; endedOnToolCalls: boolean }>;
export async function runCanvasAgentTurn(input: {
  language: CanvasAgentLanguage;
  message: string;
  history: readonly CanvasAgentHistoryMessage[];
  nodes: CanvasNode[]; edges: CanvasEdge[];
  catalog: readonly CanvasModelSpec[]; assets: readonly CanvasLibraryAsset[];
  generate?: CanvasAgentGenerate;
}): Promise<{ reply: string; ops: CanvasAgentOp[]; nodes: CanvasNode[]; edges: CanvasEdge[] }>;
```

The default `generate` wraps `generateText({ model: directorModel(), system, messages, tools, stopWhen: stepCountIs(maxSteps) })` and reports `endedOnToolCalls = result.finishReason === "tool-calls"`. When the first call ends on tool calls or returns empty text, the loop makes a second call without tools whose system prompt asks for a short summary in the chosen language.

- [ ] Step 1: Prompt tests: every language yields a distinct rule naming that language; prompt contains the OpenRouter model ids and current node ids; prompt states it cannot run generation; prompt does not mention Mentalok model ids.
- [ ] Step 2: Loop tests with a fake `generate` that calls tool `execute` directly: ops and final graph returned; history capped to 20 and the new user message last; grace call happens when the first call ends on tool calls; no grace call otherwise.
- [ ] Step 3: Run — expect FAIL. Implement. Run — expect PASS.
- [ ] Step 4: Commit `feat(canvas-agent): add system prompt and tool loop`.

### Task 4: Chat persistence and Server Actions

**Files:**
- Modify: `src/model/canvas.ts` (add `CanvasAgentMessage`)
- Modify: `src/dao/canvas.ts`, `src/dao/index.ts` (add `canvasAgentMessagesCollection`)
- Create: `src/service/canvas-agent/history.ts`
- Create: `src/presentation/actions/canvas-agent.ts`

**Produces:**

```ts
// model
export type CanvasAgentMessage = {
  _id: ObjectId; canvasId: ObjectId; clerkUserId: string;
  role: "user" | "assistant"; text: string; language: string;
  ops?: CanvasAgentOp[]; createdAt: Date;
};
// history.ts
export type CanvasAgentMessageDto = { id: string; role: "user" | "assistant"; text: string; language: string; ops?: CanvasAgentOp[]; createdAt: string };
export function serializeCanvasAgentMessage(m: CanvasAgentMessage): CanvasAgentMessageDto;
export async function listCanvasAgentMessages(clerkUserId: string, canvasId: string, limit?: number): Promise<CanvasAgentMessage[]>;
export async function appendCanvasAgentMessages(docs: CanvasAgentMessage[]): Promise<void>;
export async function clearCanvasAgentMessages(clerkUserId: string, canvasId: string): Promise<void>;
// actions
export async function listCanvasAgentMessagesAction(canvasId: string): Promise<CanvasAgentMessageDto[]>;
export async function sendCanvasAgentMessageAction(input: { canvasId: string; text: string; language: CanvasAgentLanguage; nodes: CanvasNode[]; edges: CanvasEdge[]; viewport: CanvasViewport }):
  Promise<{ ok: true; reply: CanvasAgentMessageDto; user: CanvasAgentMessageDto; ops: CanvasAgentOp[] } | { ok: false; error: string }>;
export async function clearCanvasAgentMessagesAction(canvasId: string): Promise<{ ok: boolean }>;
```

`sendCanvasAgentMessageAction` validates text (1–2000 chars) and language, saves the graph via `saveCanvasProject`, loads catalog + assets + last 20 messages, runs the turn, saves both messages and the new graph, and returns. Model failure returns `{ ok: false }` without saving anything.

- [ ] Step 1: Implement model, DAO, history, actions.
- [ ] Step 2: `npx tsc --noEmit` — expect no errors in touched files.
- [ ] Step 3: Commit `feat(canvas-agent): persist chat and expose server actions`.

### Task 5: Chat dock UI and workspace wiring

**Files:**
- Create: `src/app/app/canvas/agent/canvas-agent-dock.tsx`, `canvas-agent-header.tsx`, `canvas-agent-message.tsx`, `canvas-agent-composer.tsx`, `canvas-agent-empty.tsx`, `canvas-agent-copy.ts`
- Modify: `src/app/app/canvas/canvas-workspace.tsx` (vertical split, apply ops, undo)
- Modify: `src/app/app/canvas/page.tsx` (load initial messages)

Dock props: `{ locale, canvasId, initialMessages, getGraph(): {nodes, edges, viewport}, onApplyOps(ops): Promise<{ skipped: number; snapshotId: string }>, onUndo(snapshotId) }`. The dock owns messages, sending state, language (`localStorage` key `scro.canvasAgent.language`), collapse, and height (`localStorage` key `scro.canvasAgent.height`, 160–520px, default 260).

Workspace `applyAgentOps(ops)`: snapshot current domain graph, then for each op wait 250ms, apply `applyCanvasAgentOp` to the live graph, update React Flow nodes/edges (edge styling via `toFlowEdges`), and finally `fitView` and `scheduleAutosave`. Undo restores the snapshot and saves.

- [ ] Step 1: Build components and wire workspace.
- [ ] Step 2: `npx tsc --noEmit` and `npx eslint src/app/app/canvas src/service/canvas-agent src/presentation/actions/canvas-agent.ts`.
- [ ] Step 3: Commit `feat(canvas-agent): add chat dock below the canvas`.

### Task 6: Docs and full verification

**Files:** `pipeline-models.md`, `AGENTS.md`

- [ ] Step 1: Add the canvas agent row (Gemini 3.8 Flash, no generation, languages) to `pipeline-models.md` and one line to `AGENTS.md`.
- [ ] Step 2: Run `npx tsx --test 'src/service/canvas-agent/*.test.ts' 'src/service/canvas/*.test.ts'`, `npx tsc --noEmit`, eslint.
- [ ] Step 3: Browser check on `/app/canvas`: ask for "text → image → video", confirm nodes appear step by step, reply language matches selection, Undo restores the graph.
- [ ] Step 4: Commit `docs(canvas-agent): document canvas agent model`.
