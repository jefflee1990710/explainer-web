# Canvas Agent Chat (`/app/canvas`) — Design

Date: 2026-11-20
Status: Approved in chat, pending spec review

## Goal

Add a chat room below the node canvas. The user talks to a Scro AI agent in a language they pick. The agent builds and edits the canvas graph (nodes and edges) and then explains what it built. It never runs generation and never charges USD Credit. The user presses Run themselves.

## Decisions

| Topic | Decision |
|---|---|
| Run / billing | Agent only builds and explains. No run or spend tool exists. Chat is free. |
| Edit scope | Add, update, and delete nodes and edges, including prompts and settings. Every agent turn can be undone in one click. |
| Languages | 繁體中文 (`zh-Hant`), 廣東話 (`yue`), English (`en`), 简体中文 (`zh-Hans`), 日本語 (`ja`), 한국어 (`ko`) |
| History | Saved per canvas in MongoDB, survives reload and device change |
| Architecture | Server-side tool loop called through a Server Action. The client replays the returned operations step by step. |
| Model | Gemini 3.8 Flash on Google AI Studio (`GOOGLE_GENERATIVE_AI_API_KEY`), the same client as the director |

## What we borrow from Hermes Agent

Hermes (`NousResearch/hermes-agent`) runs one turn as: assemble messages → call the model → run tool calls → append tool results → loop until the model answers with text only. We copy these parts:

- **Tool registry.** Each tool is a schema plus a handler, grouped by purpose (read-only vs edit).
- **Errors go back to the model.** A failing tool returns `{ "error": "..." }` as its result so the model can fix its own mistake. The turn is not aborted.
- **Step budget with a grace call.** The loop stops after a fixed number of steps. If the model is still calling tools at the limit, we make one more model call with no tools so it can summarize.
- **Language lives in the system prompt.** Hermes locales only translate UI strings and never change the model's reply language. The selected chat language must therefore be stated in the system prompt.
- **Progress events.** Hermes emits tool start and complete events. We return an ordered operation list that the UI replays as visible steps.

We do not copy the Python mixin stack, SQLite session store, terminal or browser tools, or offline trajectory compression.

## Architecture

### Server: `src/service/canvas-agent/`

**`tools.ts` — tool registry over an in-memory working graph**

Every tool is a pure function over a `CanvasAgentWorkingGraph` (`nodes`, `edges`, the catalog, the user's library assets, and an `ops` log). Tools never touch MongoDB or providers.

Read-only tools:

- `get_canvas` — summary of current nodes (id, type, model name, prompt excerpt, status, has output) and edges
- `list_models` — OpenRouter models only, with input ports, output type, presets, and duration range
- `list_assets` — the user's Characters, Products, and recent Canvas outputs (id, name, kind)

Edit tools:

- `add_prompt_node({ text })`
- `add_model_node({ modelId, prompt?, aspectRatio?, durationSeconds? })` — `modelId` must be an OpenRouter catalog model
- `add_media_node({ assetId })` — only an asset returned by `list_assets`
- `update_node({ nodeId, prompt?, text?, aspectRatio?, durationSeconds? })`
- `connect({ sourceId, targetId, targetPort })` — checked with the existing `validateEdgeConnection`. A single-value port that is already wired gets its old edge replaced.
- `disconnect({ edgeId })`
- `delete_node({ nodeId })` — also removes its edges. Rejected when the node is queued or running.
- `arrange_layout()` — places nodes left to right by execution wave (`computeExecutionWaves`)

Every edit appends an operation to `ops`, for example `{ kind: "add_node", node }`, `{ kind: "update_node", nodeId, patch }`, `{ kind: "add_edge", edge }`, `{ kind: "remove_edge", edgeId }`, `{ kind: "remove_node", nodeId }`, `{ kind: "move_node", nodeId, position }`.

Limits per turn: at most 20 added nodes. Failed validations return `{ error }`.

**`prompt.ts` — system prompt**

Assembled in this order:

1. Identity and rules: you are the Scro canvas assistant; you can only build and edit the graph; you never run generation or spend credit; tell the user to press Run.
2. How the canvas works: node types (Media, Prompt, Model), port types (image, video, audio, text), and wiring rules.
3. Available OpenRouter models (from the catalog).
4. Current canvas summary.
5. Language rule: reply only in the selected language (with a fixed instruction per language, for example Cantonese colloquial written Chinese for `yue`).
6. Answer format: after editing, explain in a few short sentences what was built and why it is wired that way, then remind the user to press Run.

**`loop.ts` — `runCanvasAgentTurn()`**

- Uses AI SDK `generateText` with the tools above and `stopWhen: stepCountIs(12)`.
- If the last step still ended on tool calls, make one more call without tools to produce the explanation.
- Returns `{ reply, ops, nodes, edges }`.
- The model call is injectable for tests.

**`apply-ops.ts` — shared op replay**

`applyCanvasAgentOp(graph, op)` returns `{ graph, applied: boolean }`. It is pure and used by the client to replay ops onto the live graph. An op whose node or edge no longer exists returns `applied: false`.

**`history.ts` — chat persistence**

- New collection `canvas_agent_messages` (`CanvasAgentMessage`: `canvasId`, `clerkUserId`, `role`, `text`, `language`, `ops?`, `createdAt`), typed accessor in `src/dao/canvas.ts`, index `{ canvasId: 1, clerkUserId: 1, createdAt: 1 }`.
- The model receives at most the latest 20 messages.

**Server Actions — `src/presentation/actions/canvas-agent.ts`**

- `listCanvasAgentMessagesAction(canvasId)`
- `sendCanvasAgentMessageAction({ canvasId, text, language, nodes, edges, viewport })` — saves the current graph first, runs the turn, saves the user and assistant messages, saves the new graph, and returns `{ reply, ops, nodes, edges, message }`.
- `clearCanvasAgentMessagesAction(canvasId)`

All three require the canvas owner (`requireAppUser`).

### Client: `src/app/app/canvas/agent/`

The canvas area becomes a vertical split: canvas above and a collapsible chat dock below (default about 260px tall, draggable height, collapsed state shows only the input row). One component per file, styled like the existing dark canvas cards with the lime accent:

- `canvas-agent-dock.tsx` — frame, collapse, height drag
- `canvas-agent-header.tsx` — title "Scro 畫布助手", language menu, clear chat. The language is stored in `localStorage` and defaults to the site locale.
- `canvas-agent-message.tsx` — user and assistant bubbles. Assistant bubbles list operation chips such as "+ Seedream 5.0 Pro" or "Prompt → Seedream" and an **Undo** button for that turn.
- `canvas-agent-composer.tsx` — Enter sends, Shift+Enter adds a newline, plus two or three starter suggestions
- `canvas-agent-empty.tsx` — empty state guidance

## Data flow

1. The user sends a message. The workspace flushes the current graph.
2. The Server Action runs the turn. The dock shows "thinking".
3. The workspace snapshots the current graph for Undo.
4. The returned `ops` are applied to the current graph one at a time, about 250ms apart, then the view fits to the graph and autosave runs.
5. Undo restores that turn's snapshot and saves.

## Error handling

- Tool errors go back to the model as `{ error }`.
- If the model or network fails, the canvas is not changed. The dock shows an error message with **Retry** and keeps the user's message.
- If the user edits the canvas while the agent is working, the client applies `ops` onto the live graph instead of replacing it. An operation that no longer applies (for example, the target node was deleted) is skipped and marked in the message.
- Only the canvas owner can read or change its chat. New model nodes are limited to OpenRouter models.

## Testing

No live model calls in tests.

- `tools.test.ts` — each tool on an in-memory graph: invalid port wiring, single-port replacement, node delete removing edges, running-node delete rejected, Mentalok model rejected, `arrange_layout` order.
- `loop.test.ts` — a fake model drives multi-step tool calls; checks the op log, the 12-step limit, and the grace summary.
- `prompt.test.ts` — every language produces its language rule, and the prompt contains no run or spend capability.
- `apply-ops.test.ts` — client-side op replay onto a changed graph skips operations that no longer apply.
- Browser check: ask the agent to build "text to image to video", confirm the graph appears, the explanation is in the selected language, and Undo restores the canvas.

## Docs

Update `pipeline-models.md` and the model summary in `AGENTS.md` with the canvas agent model (Gemini 3.8 Flash) and the fact that it never runs generation.

## Out of scope

- Token streaming
- The agent pressing Run or spending credit
- Voice input
- Uploading new local files from the chat
