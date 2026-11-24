# Canvas Explainer Director Node Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Explainer Settings node with a persistent Explainer Director node that owns every Explainer parameter and the plan and exposes three text outputs per clip. Make Setting a plain key-value map that fills `{{key}}` at run time, and move Swap / Teleport parameters back onto their node cards.

**Architecture:** The existing `scro:explainer` planner card (`toolParams.plannerMode`) stays on the canvas after planning and stores the plan in `toolParams.plan`. The graph layer gains named source handles (`clip-<n>-frame|motion|voice`) for that node only. `resolveNodeInputs` reads a clip's text from the Director and renders `{{key}}` placeholders from merged vars. Settings kinds, `withWiredSettings`, and the Explainer Settings card are removed. A pure load migration converts older canvases.

**Tech Stack:** Next.js 16 (webpack), React Flow (`@xyflow/react`), TypeScript, zod, MongoDB, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-24-canvas-explainer-director-node-design.md`

## Global Constraints

- Reply and UI copy follow the repo: Traditional Chinese UI strings with English fallbacks (`isZh ? "…" : "…"`).
- No live paid provider calls in tests or verification: no Higgsfield, OpenRouter, MiniMax, Google, or ElevenLabs submits. Pure functions and mocks only.
- Tests: `npx tsx --test <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <files>`.
- Client components must not import modules that pull in `mongodb` / `@/dao`.
- New page-only UI components go in their own file in the same directory, with `"use client"` when they use hooks.
- MongoDB collections are typed (`db.collection<T>()` via `@/dao` accessors).
- Do **not** `git commit` or `git push` unless the user asks. Each task ends with a verification checkpoint instead of a commit.
- Five unit tests already fail on clean HEAD (model-logo brand mark, AppShell slogan, stuck-stage funnel, llms.txt pricing, videoBriefFields). Do not count them as regressions.
- Talking Head planning cards keep today's behavior (transient card that expands). Only `scro:explainer` becomes a Director.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/service/canvas/explainer-director.ts` (new) | Pure Director helpers: identity, params, stored plan, handles, output text, dirty check, changed targets |
| `src/service/canvas/explainer-director-apply.ts` (new) | Pure graph edits after a plan: build, rebuild, keep (drop cut wires) |
| `src/service/canvas/director-migrate.ts` (new) | Pure load migration for legacy settings nodes |
| `src/service/canvas/graph.ts` | Director source handles, port type, prompt resolution |
| `src/service/canvas/explainer-expand.ts` | Expansion wires prompts from Director handles |
| `src/service/canvas/explainer-plan.ts` | Server: compose plan source, snapshot `planningWith`, return `plan` |
| `src/app/app/canvas/nodes/explainer-director-card.tsx` (new) | Director card UI with outputs |
| `src/app/app/canvas/director-plan-decision-dialog.tsx` (new) | Build / rebuild / keep prompt |
| `src/app/app/canvas/canvas-workspace.tsx` | Plan completion flow, replan requests, trim sync, Setting tile |
| `src/service/canvas-agent/explainer-director-tool.ts` (new, replaces `explainer-settings-tool.ts`) | Assistant edits Director params |
| `src/model/canvas-settings.ts` | `CanvasSettingsData = { vars }` |
| `src/app/app/canvas/nodes/settings-node-card.tsx` | One Setting card |

---

### Task 1: Pure Director helpers

**Files:**
- Create: `src/service/canvas/explainer-director.ts`
- Test: `src/service/canvas/explainer-director.test.ts`

**Interfaces:**
- Consumes: `EXPLAINER_PLANNER_MODEL_ID` (`explainer-planner.ts`), `explainerTextStyleLine`, `TEXT_STYLE_VAR` (`settings/explainer-text-style.ts`), `renderPromptTemplate` (`settings/template.ts`).
- Produces: `isExplainerDirectorNode`, `directorParams`, `directorTextStyle`, `readDirectorPlan`, `directorHandleId`, `parseDirectorHandle`, `directorHandles`, `directorNeedsReplan`, `directorBaseVars`, `directorRawOutput`, `directorChangedTargets`, types `ExplainerDirectorParams`, `ExplainerDirectorClip`, `ExplainerDirectorPlan`, `DirectorOutputKind`.

- [ ] **Step 1: Write the failing test**

```ts
// src/service/canvas/explainer-director.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  directorChangedTargets,
  directorHandles,
  directorNeedsReplan,
  directorParams,
  directorRawOutput,
  isExplainerDirectorNode,
  parseDirectorHandle,
  readDirectorPlan,
  type ExplainerDirectorPlan,
} from "@/service/canvas/explainer-director";

function director(toolParams: Record<string, unknown> = {}, prompt = "How LLMs work"): CanvasNode {
  return {
    id: "dir",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId: "scro:explainer",
      prompt,
      aspectRatio: "9:16",
      toolParams: { plannerMode: true, skillSlug: "paper-cutout-explainer-video-director", textStyleId: "neon", ...toolParams },
    },
  };
}

function plan(n: number, base: CanvasNode): ExplainerDirectorPlan {
  return {
    plannerVideoId: "v1",
    plannedWith: directorParams(base),
    clips: Array.from({ length: n }, (_, i) => ({
      clipNumber: i + 1,
      framePrompt: `still ${i + 1} {{text_style}}`,
      videoPrompt: `motion ${i + 1}`,
      spokenLine: `line ${i + 1}`,
      durationSeconds: 6,
      refUrls: [],
    })),
  };
}

describe("explainer director", () => {
  it("recognizes only planner-mode explainer nodes", () => {
    assert.equal(isExplainerDirectorNode(director()), true);
    const talking = { ...director(), data: { ...director().data, modelId: "scro:talking-head" } };
    assert.equal(isExplainerDirectorNode(talking), false);
  });

  it("reads a valid plan and lists three handles per clip", () => {
    const base = director();
    const node = director({ plan: plan(2, base) });
    assert.deepEqual(directorHandles(readDirectorPlan(node)!), [
      "clip-1-frame", "clip-1-motion", "clip-1-voice",
      "clip-2-frame", "clip-2-motion", "clip-2-voice",
    ]);
    assert.equal(readDirectorPlan(director({ plan: { clips: "bad" } })), undefined);
    assert.deepEqual(parseDirectorHandle("clip-12-voice"), { clipNumber: 12, kind: "voice" });
    assert.equal(parseDirectorHandle("output"), undefined);
  });

  it("returns each output's raw text", () => {
    const base = director();
    const node = director({ plan: plan(1, base) });
    assert.equal(directorRawOutput(node, "clip-1-frame"), "still 1 {{text_style}}");
    assert.equal(directorRawOutput(node, "clip-1-voice"), "line 1");
    assert.equal(directorRawOutput(node, "clip-9-voice"), undefined);
  });

  it("needs a replan when any parameter but the text style changed", () => {
    const base = director();
    const planned = director({ plan: plan(1, base) });
    assert.equal(directorNeedsReplan(planned), false);
    assert.equal(directorNeedsReplan(director({ plan: plan(1, base), textStyleId: "chalk" })), false);
    assert.equal(directorNeedsReplan(director({ plan: plan(1, base), presenterPosition: "lower-left" })), true);
    assert.equal(directorNeedsReplan({ ...planned, data: { ...planned.data, prompt: "New topic" } }), true);
    assert.equal(directorNeedsReplan(director()), false);
  });

  it("lists targets whose wired output text changed", () => {
    const base = director();
    const before = director({ plan: plan(1, base) });
    const after = director({ plan: plan(1, base), textStyleId: "chalk" });
    const edges: CanvasEdge[] = [
      { id: "a", source: "dir", sourceHandle: "clip-1-frame", target: "frame", targetHandle: "prompt" },
      { id: "b", source: "dir", sourceHandle: "clip-1-motion", target: "video", targetHandle: "prompt" },
    ];
    assert.deepEqual(directorChangedTargets(before, after, edges), ["frame"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/explainer-director.test.ts`
Expected: FAIL with `Cannot find module '@/service/canvas/explainer-director'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/service/canvas/explainer-director.ts
// Pure helpers for the persistent Explainer Director node (scro:explainer in planner mode).

import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import { EXPLAINER_PLANNER_MODEL_ID } from "@/service/canvas/explainer-planner";
import { explainerTextStyleLine, TEXT_STYLE_VAR } from "@/service/canvas/settings/explainer-text-style";
import { renderPromptTemplate } from "@/service/canvas/settings/template";

export type DirectorOutputKind = "frame" | "motion" | "voice";
const HANDLE = /^clip-(\d+)-(frame|motion|voice)$/;

export type ExplainerDirectorParams = {
  topic: string;
  characterId?: string;
  durationPreset?: string;
  aspectRatio: CanvasAspectRatio;
  skillSlug: string;
  language: string;
  sceneTextLanguage?: string;
  directorBackgroundId?: string;
  presenterPosition: string;
  styleId?: string;
};

export type ExplainerDirectorClip = {
  clipNumber: number;
  framePrompt: string;
  videoPrompt: string;
  spokenLine: string;
  durationSeconds: number;
  refUrls: string[];
};

export type ExplainerDirectorPlan = {
  plannerVideoId: string;
  plannedWith: ExplainerDirectorParams;
  clips: ExplainerDirectorClip[];
};

type NodeLike = Pick<CanvasNode, "type" | "data">;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function isExplainerDirectorNode(node: NodeLike): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === EXPLAINER_PLANNER_MODEL_ID &&
    node.data.toolParams?.plannerMode === true
  );
}

// Every parameter that changes the plan. The text style is not one: it fills {{text_style}}.
export function directorParams(node: NodeLike): ExplainerDirectorParams {
  const tp = node.data.toolParams ?? {};
  const optional = (key: string, out: keyof ExplainerDirectorParams) => (str(tp[key]) ? { [out]: str(tp[key]) } : {});
  return {
    topic: (node.data.prompt ?? "").trim(),
    ...optional("characterId", "characterId"),
    ...optional("durationPreset", "durationPreset"),
    aspectRatio: node.data.aspectRatio ?? "9:16",
    skillSlug: str(tp.skillSlug) ?? "cartoon-explainer-video-director",
    language: str(tp.language) ?? "yue",
    ...optional("sceneTextLanguage", "sceneTextLanguage"),
    ...optional("directorBackgroundId", "directorBackgroundId"),
    presenterPosition: str(tp.presenterPosition) ?? "auto",
    ...optional("styleId", "styleId"),
  } as ExplainerDirectorParams;
}

export function directorTextStyle(node: NodeLike): string {
  return str(node.data.toolParams?.textStyleId) ?? "handwritten";
}

function readClip(raw: unknown): ExplainerDirectorClip | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  if (typeof c.clipNumber !== "number") return undefined;
  if (typeof c.framePrompt !== "string" || typeof c.videoPrompt !== "string" || typeof c.spokenLine !== "string") {
    return undefined;
  }
  return {
    clipNumber: c.clipNumber,
    framePrompt: c.framePrompt,
    videoPrompt: c.videoPrompt,
    spokenLine: c.spokenLine,
    durationSeconds: typeof c.durationSeconds === "number" ? c.durationSeconds : 6,
    refUrls: Array.isArray(c.refUrls) ? c.refUrls.filter((u): u is string => typeof u === "string") : [],
  };
}

export function readDirectorPlan(node: NodeLike): ExplainerDirectorPlan | undefined {
  const raw = node.data.toolParams?.plan;
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  if (typeof p.plannerVideoId !== "string" || !Array.isArray(p.clips) || !p.plannedWith) return undefined;
  const clips = p.clips.map(readClip);
  if (clips.length === 0 || clips.some((c) => !c)) return undefined;
  return {
    plannerVideoId: p.plannerVideoId,
    plannedWith: p.plannedWith as ExplainerDirectorParams,
    clips: (clips as ExplainerDirectorClip[]).sort((a, b) => a.clipNumber - b.clipNumber),
  };
}

export function directorHandleId(clipNumber: number, kind: DirectorOutputKind): string {
  return `clip-${clipNumber}-${kind}`;
}

export function parseDirectorHandle(handle: string | null | undefined): { clipNumber: number; kind: DirectorOutputKind } | undefined {
  const m = handle ? HANDLE.exec(handle) : null;
  return m ? { clipNumber: Number(m[1]), kind: m[2] as DirectorOutputKind } : undefined;
}

export function directorHandles(plan: ExplainerDirectorPlan): string[] {
  return plan.clips.flatMap((c) => (["frame", "motion", "voice"] as const).map((k) => directorHandleId(c.clipNumber, k)));
}

export function directorNeedsReplan(node: NodeLike): boolean {
  const plan = readDirectorPlan(node);
  if (!plan) return false;
  const now = directorParams(node) as Record<string, unknown>;
  const then = plan.plannedWith as Record<string, unknown>;
  const keys = new Set([...Object.keys(now), ...Object.keys(then)]);
  return [...keys].some((key) => (now[key] ?? null) !== (then[key] ?? null));
}

// The Director's own vars: its text style fills {{text_style}}.
export function directorBaseVars(node: NodeLike): Record<string, string> {
  return { [TEXT_STYLE_VAR]: explainerTextStyleLine(directorTextStyle(node)) };
}

export function directorRawOutput(node: NodeLike, handle: string): string | undefined {
  const parsed = parseDirectorHandle(handle);
  const clip = parsed ? readDirectorPlan(node)?.clips.find((c) => c.clipNumber === parsed.clipNumber) : undefined;
  if (!parsed || !clip) return undefined;
  return parsed.kind === "frame" ? clip.framePrompt : parsed.kind === "motion" ? clip.videoPrompt : clip.spokenLine;
}

function renderedOutputs(node: NodeLike): Map<string, string> {
  const plan = readDirectorPlan(node);
  const vars = directorBaseVars(node);
  const out = new Map<string, string>();
  for (const handle of plan ? directorHandles(plan) : []) {
    out.set(handle, renderPromptTemplate(directorRawOutput(node, handle) ?? "", vars).text);
  }
  return out;
}

// Targets wired to an output whose text differs (or disappeared) between two Director states.
export function directorChangedTargets(
  before: CanvasNode,
  after: CanvasNode,
  edges: readonly CanvasEdge[],
): string[] {
  const a = renderedOutputs(before);
  const b = renderedOutputs(after);
  const out: string[] = [];
  for (const e of edges) {
    if (e.source !== after.id || !parseDirectorHandle(e.sourceHandle)) continue;
    if (a.get(e.sourceHandle!) !== b.get(e.sourceHandle!) && !out.includes(e.target)) out.push(e.target);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/canvas/explainer-director.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Checkpoint**

Run: `npx eslint src/service/canvas/explainer-director.ts src/service/canvas/explainer-director.test.ts`
Expected: no errors. Do not commit.

---

### Task 2: Graph support for Director outputs

**Files:**
- Modify: `src/service/canvas/graph.ts` (`getNodeOutputPortType`, `validateEdgeConnection` source handle check, `resolveNodeInputs` prompt block)
- Modify: `src/service/canvas/settings/apply.ts` (`templateText` reads a Director's outputs)
- Modify: `src/app/app/canvas/canvas-workspace.tsx` (`toFlowEdges` port color, `isValidConnection` passes the source handle; already does)
- Test: `src/service/canvas/graph.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `getNodeOutputPortType(node, catalog?, sourceHandle?)`. `resolveNodeInputs` resolves Director prompt wires.

- [ ] **Step 1: Write the failing tests** (append inside `describe("canvas graph — resolveNodeInputs", …)` in `graph.test.ts`)

```ts
  it("reads a Director clip output as the prompt and merges vars with the receiver winning", () => {
    const dir: CanvasNode = {
      id: "dir",
      type: "model",
      position: { x: 0, y: 0 },
      data: {
        modelId: "scro:explainer",
        prompt: "t",
        aspectRatio: "9:16",
        toolParams: {
          plannerMode: true,
          textStyleId: "neon",
          plan: {
            plannerVideoId: "v",
            plannedWith: { topic: "t", aspectRatio: "9:16", skillSlug: "cartoon-explainer-video-director", language: "yue", presenterPosition: "auto" },
            clips: [{ clipNumber: 1, framePrompt: "{{mood}} board {{text_style}}", videoPrompt: "pan", spokenLine: "hi", durationSeconds: 6, refUrls: [] }],
          },
        },
      },
    };
    const setting = (id: string, vars: Record<string, string>): CanvasNode => ({
      id, type: "settings", position: { x: 0, y: 0 }, data: { settings: { kind: "custom", vars } },
    });
    const nodes: CanvasNode[] = [
      dir,
      setting("s-dir", { mood: "calm" }),
      setting("s-img", { mood: "busy" }),
      modelNode("img", "mentalok:flux-schnell"),
    ];
    const edges: CanvasEdge[] = [
      edge("e1", "dir", "img", "prompt", "clip-1-frame"),
      edge("e2", "s-dir", "dir", "settings"),
      edge("e3", "s-img", "img", "settings"),
    ];
    assert.equal(validateEdgeConnection(nodes, [], { source: "dir", sourceHandle: "clip-1-frame", target: "img", targetHandle: "prompt" }).valid, true);
    assert.equal(validateEdgeConnection(nodes, [], { source: "dir", sourceHandle: "clip-2-frame", target: "img", targetHandle: "prompt" }).valid, false);
    const resolved = resolveNodeInputs("img", nodes, edges);
    assert.ok(resolved.inputs.prompt?.startsWith("busy board Look: neon"));
  });

  it("reports an unplanned Director as a missing upstream", () => {
    const dir: CanvasNode = {
      id: "dir", type: "model", position: { x: 0, y: 0 },
      data: { modelId: "scro:explainer", toolParams: { plannerMode: true } },
    };
    const nodes: CanvasNode[] = [dir, modelNode("img", "mentalok:flux-schnell")];
    const resolved = resolveNodeInputs("img", nodes, [edge("e1", "dir", "img", "prompt", "clip-1-frame")]);
    assert.equal(resolved.ok, false);
    if (!resolved.ok) assert.deepEqual(resolved.missingUpstreamNodeIds, ["dir"]);
  });
```

(The Setting data shape `{ kind: "custom", vars }` is still valid here; Task 9 changes it to `{ vars }` and updates this test.)

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/service/canvas/graph.test.ts`
Expected: FAIL. `validateEdgeConnection` rejects `clip-1-frame` with "Unsupported source handle".

- [ ] **Step 3: Implement**

In `graph.ts`, import the helpers:

```ts
import {
  directorBaseVars,
  directorHandles,
  directorRawOutput,
  isExplainerDirectorNode,
  parseDirectorHandle,
  readDirectorPlan,
} from "@/service/canvas/explainer-director";
```

Replace `getNodeOutputPortType`'s signature and model branch:

```ts
export function getNodeOutputPortType(
  node: CanvasNode,
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
  sourceHandle?: string | null,
): CanvasPortType | null {
  // Director outputs are text; the Director has no plain output.
  if (isExplainerDirectorNode(node)) return parseDirectorHandle(sourceHandle) ? "text" : null;
  // …existing media / prompt / character / model branches unchanged…
}
```

Replace the source handle check in `validateEdgeConnection`:

```ts
  const sourceHandle = candidate.sourceHandle || "output";
  if (sourceHandle !== "output") {
    // Only a planned Director has named outputs, one per clip text.
    const plan = isExplainerDirectorNode(sourceNode) ? readDirectorPlan(sourceNode) : undefined;
    if (!plan || !directorHandles(plan).includes(sourceHandle)) {
      return { valid: false, reason: `Unsupported source handle "${sourceHandle}"` };
    }
  }
```

and change `const sourcePortType = getNodeOutputPortType(sourceNode, catalog);` to `getNodeOutputPortType(sourceNode, catalog, sourceHandle);`.

Replace the prompt block of `resolveNodeInputs` (from `const promptEdges` through the placeholder block added on 2026-11-24):

```ts
  // Resolve prompt: a connected Prompt node or Director output overrides inline node.data.prompt.
  const promptEdges = edgesByHandle.get("prompt") ?? [];
  let promptSource: CanvasNode | undefined;
  let director: { node: CanvasNode; handle: string } | undefined;
  for (const edge of promptEdges) {
    const source = nodeById.get(edge.source);
    if (source?.type === "prompt") {
      promptSource = source;
      break;
    }
    if (source && isExplainerDirectorNode(source) && parseDirectorHandle(edge.sourceHandle)) {
      director = { node: source, handle: edge.sourceHandle! };
      break;
    }
  }

  if (promptSource) {
    promptFromNode = true;
    const connectedText = promptSource.data.text?.trim();
    if (connectedText) inputs.prompt = connectedText;
  } else if (director) {
    promptFromNode = true;
    const text = directorRawOutput(director.node, director.handle)?.trim();
    if (text) inputs.prompt = text;
    else addUnique(missingUpstreamNodeIds, director.node.id);
  } else {
    const inlinePrompt = targetNode.data.prompt?.trim();
    if (inlinePrompt) inputs.prompt = inlinePrompt;
  }

  // `{{key}}`: Director text style, then the Director's Setting, the Prompt node's, and this node's (last wins).
  if (inputs.prompt) {
    const vars = {
      ...(director ? { ...directorBaseVars(director.node), ...wiredSettingsVars(director.node.id, nodes, edges) } : {}),
      ...(promptSource ? wiredSettingsVars(promptSource.id, nodes, edges) : {}),
      ...wiredSettingsVars(nodeId, nodes, edges),
    };
    const rendered = renderPromptTemplate(inputs.prompt, vars);
    inputs.prompt = rendered.text.trim() || undefined;
    for (const key of rendered.missing) addUnique(missingRequiredFields, promptPlaceholder(key));
  }
```

In `settings/apply.ts` `templateText`, read a Director's outputs so a Setting wired into it marks its downstream old:

```ts
import { directorHandles, directorRawOutput, isExplainerDirectorNode, readDirectorPlan } from "@/service/canvas/explainer-director";

function templateText(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[], target: CanvasNode): string {
  if (target.type === "prompt") return target.data.text ?? "";
  if (isExplainerDirectorNode(target)) {
    const plan = readDirectorPlan(target);
    return plan ? directorHandles(plan).map((h) => directorRawOutput(target, h) ?? "").join("\n") : "";
  }
  // …existing model branch unchanged…
}
```

In `canvas-workspace.tsx` `toFlowEdges`, pass the handle so Director wires get the text color:

```ts
    const portType = src ? getNodeOutputPortType(src, catalog, e.sourceHandle) : null;
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/service/canvas/graph.test.ts src/service/canvas/settings/apply.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `npx tsc --noEmit` and `npx eslint src/service/canvas/graph.ts src/service/canvas/settings/apply.ts`
Expected: clean. Do not commit.

---

### Task 3: Expansion wired from Director outputs, plus graph-apply helpers

**Files:**
- Modify: `src/service/canvas/explainer-expand.ts`
- Create: `src/service/canvas/explainer-director-apply.ts`
- Test: `src/service/canvas/explainer-expand.test.ts`, `src/service/canvas/explainer-director-apply.test.ts`

**Interfaces:**
- Consumes: `directorHandleId`, `directorHandles`, `ExplainerDirectorPlan` (Task 1).
- Produces:
  - `ExplainerExpansionInput.directorId?: string`. When set, the frame, video, and TTS nodes have `prompt: ""` and get a `prompt` edge from `directorId` with `sourceHandle` `clip-n-frame|motion|voice`, and no settings node is added.
  - `applyDirectorBuild(graph, { directorId, expansion, replaceGroup? })` returns `{ nodes, edges, removedIds }`.
  - `dropCutDirectorEdges(edges, directorId, plan)` returns `{ edges, cutTargets }`.

- [ ] **Step 1: Write the failing tests**

Append to `explainer-expand.test.ts`:

```ts
  it("wires each clip's prompts from the Director when directorId is set", () => {
    const out = buildExplainerExpansion({ ...base, directorId: "dir", clips: clips(2) });
    const frame = out.nodes.find((n) => n.id.endsWith("-frame-1"))!;
    assert.equal(frame.data.prompt, "");
    const promptEdges = out.edges.filter((e) => e.source === "dir");
    assert.deepEqual(
      promptEdges.map((e) => `${e.sourceHandle}->${e.target.replace(/^.*?-(frame|video|voice)-/, "$1-")}`).sort(),
      ["clip-1-frame->frame-1", "clip-1-motion->video-1", "clip-1-voice->voice-1", "clip-2-frame->frame-2", "clip-2-motion->video-2", "clip-2-voice->voice-2"],
    );
    assert.ok(!out.nodes.some((n) => n.type === "settings"));
  });
```

Create `explainer-director-apply.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { applyDirectorBuild, dropCutDirectorEdges } from "@/service/canvas/explainer-director-apply";
import type { ExplainerDirectorPlan } from "@/service/canvas/explainer-director";

const node = (id: string): CanvasNode => ({ id, type: "model", position: { x: 0, y: 0 }, data: { modelId: "x" } });
const wire = (source: string, target: string, sourceHandle = "output"): CanvasEdge => ({
  id: `${source}->${target}`, source, sourceHandle, target, targetHandle: "prompt",
});

describe("director graph apply", () => {
  it("rebuild removes the old group's members except the Director", () => {
    const graph = { nodes: [node("dir"), node("old-frame"), node("keep")], edges: [wire("dir", "old-frame", "clip-1-frame")] };
    const out = applyDirectorBuild(graph, {
      directorId: "dir",
      expansion: { nodes: [node("new-frame")], edges: [wire("dir", "new-frame", "clip-1-frame")] },
      replaceGroup: { id: "g", title: "t", color: "pink", kind: "explainer", memberIds: ["dir", "old-frame"] },
    });
    assert.deepEqual(out.nodes.map((n) => n.id).sort(), ["dir", "keep", "new-frame"]);
    assert.deepEqual(out.removedIds, ["old-frame"]);
    assert.deepEqual(out.edges.map((e) => e.target), ["new-frame"]);
  });

  it("keep drops wires from outputs the new plan no longer has", () => {
    const plan = { plannerVideoId: "v", plannedWith: {}, clips: [{ clipNumber: 1 }] } as unknown as ExplainerDirectorPlan;
    const edges = [wire("dir", "f1", "clip-1-frame"), wire("dir", "f2", "clip-2-frame"), wire("x", "y")];
    const out = dropCutDirectorEdges(edges, "dir", plan);
    assert.deepEqual(out.edges.map((e) => e.target), ["f1", "y"]);
    assert.deepEqual(out.cutTargets, ["f2"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/service/canvas/explainer-expand.test.ts src/service/canvas/explainer-director-apply.test.ts`
Expected: FAIL (`directorId` ignored; module missing).

- [ ] **Step 3: Implement**

In `explainer-expand.ts`:

```ts
import { directorHandleId } from "@/service/canvas/explainer-director";
// ExplainerExpansionInput gains:
  // Director node whose clip outputs feed each frame / video / voice prompt.
  directorId?: string;
```

Change the edge helper to accept a source handle:

```ts
  const edge = (source: string, target: string, targetHandle: string, sourceHandle = "output") =>
    edges.push({ id: `${source}:${sourceHandle}->${target}:${targetHandle}`, source, sourceHandle, target, targetHandle });
  const fromDirector = (clipNumber: number, kind: "frame" | "motion" | "voice", target: string) => {
    if (input.directorId) edge(input.directorId, target, "prompt", directorHandleId(clipNumber, kind));
  };
```

Keep existing edge ids for `output` handles by building the id as `${source}->${target}:${targetHandle}` when `sourceHandle === "output"`:

```ts
    edges.push({
      id: sourceHandle === "output" ? `${source}->${target}:${targetHandle}` : `${source}:${sourceHandle}->${target}:${targetHandle}`,
      source, sourceHandle, target, targetHandle,
    });
```

Then:

- Frame node: `prompt: input.directorId ? "" : clip.framePrompt`, then `fromDirector(n, "frame", frameId)`.
- Video node: `prompt: input.directorId ? "" : clip.videoPrompt`, then `fromDirector(n, "motion", videoId)`.
- Voice node: `prompt: input.directorId ? "" : line`, then `fromDirector(n, "voice", voiceId)`.
- Only add the settings node and settings edges when `!input.directorId && input.settings`.

Create `explainer-director-apply.ts`:

```ts
// Pure graph edits after a Director plan: build or rebuild its rows, or keep and cut lost outputs.

import type { CanvasEdge, CanvasGroup } from "@/model/canvas";
import { directorHandles, parseDirectorHandle, type ExplainerDirectorPlan } from "@/service/canvas/explainer-director";

type GraphNode = { id: string };
type GraphEdge = { id: string; source: string; target: string; sourceHandle?: string | null };

export function applyDirectorBuild<N extends GraphNode, E extends GraphEdge>(
  graph: { nodes: readonly N[]; edges: readonly E[] },
  input: { directorId: string; expansion: { nodes: readonly N[]; edges: readonly E[] }; replaceGroup?: CanvasGroup },
): { nodes: N[]; edges: E[]; removedIds: string[] } {
  const removed = new Set((input.replaceGroup?.memberIds ?? []).filter((id) => id !== input.directorId));
  const nodes = graph.nodes.filter((n) => !removed.has(n.id));
  const edges = graph.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeIds = new Set(edges.map((e) => e.id));
  return {
    nodes: [...nodes, ...input.expansion.nodes.filter((n) => !nodeIds.has(n.id))],
    edges: [...edges, ...input.expansion.edges.filter((e) => !edgeIds.has(e.id))],
    removedIds: [...removed],
  };
}

export function dropCutDirectorEdges<E extends Pick<CanvasEdge, "source" | "target" | "sourceHandle">>(
  edges: readonly E[],
  directorId: string,
  plan: ExplainerDirectorPlan,
): { edges: E[]; cutTargets: string[] } {
  const live = new Set(directorHandles(plan));
  const cutTargets: string[] = [];
  const kept = edges.filter((e) => {
    const cut = e.source === directorId && parseDirectorHandle(e.sourceHandle) && !live.has(e.sourceHandle!);
    if (cut && !cutTargets.includes(e.target)) cutTargets.push(e.target);
    return !cut;
  });
  return { edges: kept, cutTargets };
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/service/canvas/explainer-expand.test.ts src/service/canvas/explainer-director-apply.test.ts src/service/canvas/explainer-layout.test.ts`
Expected: PASS. If an existing expand test asserts an exact edge id, it still passes because `output` edges keep their old id format.

- [ ] **Step 5: Checkpoint**

Run: `npx eslint src/service/canvas/explainer-expand.ts src/service/canvas/explainer-director-apply.ts`. Do not commit.

---

### Task 4: Server plan returns the Director plan

**Files:**
- Modify: `src/service/canvas/explainer-plan.ts` (`startCanvasExplainerPlan`, `CanvasExplainerPlanState`, `planStateFromVideo`)
- Test: `src/service/canvas/explainer-plan.test.ts`

**Interfaces:**
- Consumes: Task 1 (`isExplainerDirectorNode`, `directorParams`, `readDirectorPlan`, `ExplainerDirectorPlan`), Task 3 (`directorId`), `composeExplainerPlanSource` (`explainer-settings.ts`).
- Produces: `CanvasExplainerPlanState` `ready` gains `plan?: ExplainerDirectorPlan`. For Explainer Directors the expansion is wired from `plannerNode.id` and carries no settings node. `planStateFromVideo` reads `toolParams.planningWith` for `plannedWith`. Exports the pure `explainerPlanSource(node)`.

- [ ] **Step 1: Write the failing tests** (append to `explainer-plan.test.ts`, reusing its existing video fixture helper; if the file builds the video inline, copy that object into a local `video()` helper first)

```ts
  it("returns the Director plan and wires the rows from the Director", () => {
    const plannerNode: CanvasNode = {
      id: "dir", type: "model", position: { x: 0, y: 0 },
      data: {
        modelId: "scro:explainer", prompt: "Topic", aspectRatio: "9:16",
        toolParams: { plannerMode: true, planningWith: { topic: "Topic", aspectRatio: "9:16", skillSlug: "cartoon-explainer-video-director", language: "yue", presenterPosition: "auto" } },
      },
    };
    const state = planStateFromVideo({ video: readyVideo(), blocker: null, plannerNode, buildFramePrompt: () => "built", idPrefix: "exp-abc123" });
    assert.equal(state.status, "ready");
    if (state.status !== "ready") return;
    assert.equal(state.plan?.clips.length, readyVideo().phaseA!.clips.length);
    assert.equal(state.plan?.plannedWith.topic, "Topic");
    assert.ok(state.edges.some((e) => e.source === "dir" && e.sourceHandle === "clip-1-frame"));
    assert.ok(!state.nodes.some((n) => n.type === "settings"));
  });

  it("keeps the voiceover in the plan source only when the topic is unchanged", () => {
    const planned: CanvasNode = {
      id: "dir", type: "model", position: { x: 0, y: 0 },
      data: {
        modelId: "scro:explainer", prompt: "Topic",
        toolParams: {
          plannerMode: true, presenterPosition: "lower-left",
          plan: { plannerVideoId: "v", plannedWith: { topic: "Topic", aspectRatio: "9:16", skillSlug: "s", language: "yue", presenterPosition: "auto" },
            clips: [{ clipNumber: 1, framePrompt: "f", videoPrompt: "m", spokenLine: "第一句", durationSeconds: 6, refUrls: [] }] },
        },
      },
    };
    assert.match(explainerPlanSource(planned), /第一句/);
    assert.match(explainerPlanSource(planned), /lower-left/);
    assert.doesNotMatch(explainerPlanSource({ ...planned, data: { ...planned.data, prompt: "Other" } }), /第一句/);
  });
```

`readyVideo()` must return a `Project` with `status: "production"`, `phaseA.clips` (2 clips with `clipNumber`, `englishVo`, `durationSeconds`), `canvasPlan.prompts` (one per clip), and `canvasPlan.framePrompts`. Reuse the fixture already used by the existing "ready" test in this file.

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/service/canvas/explainer-plan.test.ts`
Expected: FAIL (`plan` undefined; `explainerPlanSource` not exported).

- [ ] **Step 3: Implement**

In `explainer-plan.ts`:

```ts
import { composeExplainerPlanSource } from "@/service/canvas/explainer-settings";
import {
  directorParams,
  isExplainerDirectorNode,
  readDirectorPlan,
  type ExplainerDirectorParams,
  type ExplainerDirectorPlan,
} from "@/service/canvas/explainer-director";

// Plan source for a Director: topic, presenter line, and the old voiceover when the topic is unchanged.
export function explainerPlanSource(node: CanvasNode): string {
  const params = directorParams(node);
  const plan = readDirectorPlan(node);
  const keepNarration = plan && plan.plannedWith.topic === params.topic;
  return composeExplainerPlanSource({
    topic: params.topic,
    presenterPosition: params.presenterPosition as "auto" | "lower-left" | "lower-right",
    narration: keepNarration ? plan.clips.map((c) => c.spokenLine) : [],
  });
}
```

In `startCanvasExplainerPlan`, after `resolved` and the empty-topic check:

```ts
  const director = isExplainerDirectorNode(loaded.node);
  const inputs = director ? { ...resolved.inputs, prompt: explainerPlanSource(loaded.node) } : resolved.inputs;
```

Pass `inputs` to `createCanvasDirectorVideo`, and add to the `$set`:

```ts
          ...(director ? { "nodes.$[n].data.toolParams.planningWith": directorParams(loaded.node) } : {}),
```

Extend the state type:

```ts
      group: CanvasGroup;
      // Explainer Director: the plan to store on the node.
      plan?: ExplainerDirectorPlan;
```

In `planStateFromVideo`'s Explainer branch, build the clips once and use them for both the expansion and the plan:

```ts
  const directorId = isExplainerDirectorNode(plannerNode) ? plannerNode.id : undefined;
  const clips = phaseA.clips.map((clip) => ({
    clipNumber: clip.clipNumber,
    framePrompt: frameByClip.get(clip.clipNumber) || params.buildFramePrompt(video, clip.clipNumber),
    videoPrompt: promptByClip.get(clip.clipNumber)?.prompt ?? "",
    durationSeconds: promptByClip.get(clip.clipNumber)?.durationSeconds ?? clip.durationSeconds,
    spokenLine: clip.englishVo ?? "",
    refUrls: params.frameInputs?.refsByClip.get(clip.clipNumber) ?? [],
  }));
  const expansion = buildExplainerExpansion({
    idPrefix: params.idPrefix,
    // Rows sit to the right of a Director, which stays where it is.
    origin: directorId ? { x: plannerNode.position.x + 340, y: plannerNode.position.y } : plannerNode.position,
    aspectRatio: plannerNode.data.aspectRatio ?? "9:16",
    frameResolution: params.frameInputs?.resolution,
    language,
    voicePreset,
    characterId,
    ...(directorId
      ? { directorId }
      : { settings: { plannerVideoId: video._id.toHexString(), topic: topicFromPlanSource(video.source ?? ""), applied: explainerSettingsFromVideo(video) } }),
    clips,
  });
  const plannedWith =
    (plannerNode.data.toolParams?.planningWith as ExplainerDirectorParams | undefined) ?? directorParams(plannerNode);
  const plan: ExplainerDirectorPlan | undefined = directorId
    ? { plannerVideoId: video._id.toHexString(), plannedWith, clips }
    : undefined;
  const group = planGroup({
    id: params.idPrefix,
    kind: "explainer",
    title: phaseA.localizedTitle || phaseA.englishTitle,
    plannerNode,
    memberIds: [...(directorId ? [directorId] : []), ...expansion.nodes.map((n) => n.id)],
    language,
  });
  return { status: "ready", ...expansion, summary, group, ...(plan ? { plan } : {}) };
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/service/canvas/explainer-plan.test.ts src/service/canvas/explainer-expand.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `npx tsc --noEmit`. Do not commit.

---

### Task 5: Director card, plan completion, and the decision dialog

**Files:**
- Create: `src/app/app/canvas/nodes/explainer-director-card.tsx`
- Create: `src/app/app/canvas/director-plan-decision-dialog.tsx`
- Modify: `src/app/app/canvas/nodes/model-node-card.tsx` (render the Director card)
- Modify: `src/app/app/canvas/canvas-workspace.tsx` (polling completion, decision state, stale on edits)
- Modify: `src/app/app/canvas/nodes/port-colors.ts` (context type: `onPlanExplainer` already exists)

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Produces: `ExplainerDirectorCard`, `DirectorPlanDecisionDialog`. The workspace has `directorDecision` state and handles plan completion.

- [ ] **Step 1: Director card**

```tsx
// src/app/app/canvas/nodes/explainer-director-card.tsx
"use client";

// Explainer Director: every Explainer parameter, Plan / Replan, and three text outputs per clip.

import { Handle, Position } from "@xyflow/react";
import { AlertCircle, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { EXPLAINER_PRESENTER_POSITIONS, EXPLAINER_SCENE_TEXT_CHOICES, EXPLAINER_SKILL_SLUGS } from "@/model/explainer-settings";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";
import { explainerBackgroundPresets } from "@/service/canvas/explainer-settings";
import {
  directorHandleId,
  directorNeedsReplan,
  readDirectorPlan,
  type DirectorOutputKind,
} from "@/service/canvas/explainer-director";
import { readPlannerParams } from "@/service/canvas/explainer-planner";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";
import { SYSTEM_TEXT_STYLE_ORDER } from "@/service/director/subtitle-look";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";
import { ART_STYLE_LABELS, PRESENTER_LABELS, SCENE_TEXT_LABELS } from "@/app/app/canvas/nodes/explainer-settings-options";
import { DIALOG_FIELD, DIALOG_LABEL, DIALOG_TEXTAREA } from "@/app/app/canvas/scro-dialog-shell";

const KIND_LABEL: Record<DirectorOutputKind, { zh: string; en: string }> = {
  frame: { zh: "靜幀", en: "Still" },
  motion: { zh: "動作", en: "Motion" },
  voice: { zh: "旁白", en: "Voiceover" },
};

type Props = {
  id: string;
  data: CanvasNodeData;
  isZh: boolean;
  selected: boolean;
  disabled: boolean;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
  onPlan: () => void;
  onRemove: () => void;
};

export function ExplainerDirectorCard({ id, data, isZh, selected, disabled, characterOptions, onUpdate, onPlan, onRemove }: Props) {
  const tp = data.toolParams ?? {};
  const pick = (l: { zh: string; en: string }) => (isZh ? l.zh : l.en);
  const node = { type: "model" as const, data };
  const plan = readDirectorPlan(node);
  const { planStatus, planError } = readPlannerParams({ data });
  const planning = planStatus === "planning";
  const dirty = directorNeedsReplan(node);
  const setParam = (key: string, value: unknown) => onUpdate({ toolParams: { ...tp, [key]: value } });
  const skillSlug = String(tp.skillSlug ?? "cartoon-explainer-video-director");
  const backgrounds = explainerBackgroundPresets(skillSlug);
  const textColor = PORT_COLOR_MAP.text;

  return (
    <div
      className={`relative w-[300px] rounded-[16px] border bg-[#12161f]/95 text-white shadow-[0_14px_34px_rgba(0,0,0,0.45)] ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b]"
      }`}
    >
      <Handle type="target" id={SETTINGS_HANDLE} position={Position.Left} style={{ top: 22, width: 11, height: 11, background: "#0b0e13", border: "2px solid #64748b" }} />
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold">
          {planning ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#c6f24b]" /> : <Sparkles className="h-3.5 w-3.5 text-[#c6f24b]" />}
          {isZh ? "解說導演" : "Explainer Director"}
        </span>
        <button type="button" onClick={onRemove} title={isZh ? "移除" : "Remove"} className="nodrag cursor-pointer rounded-md p-1 text-white/40 hover:text-rose-400">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <label className={DIALOG_LABEL}>
          {isZh ? "主題 / 講稿" : "Topic / script"}
          <textarea rows={3} value={data.prompt ?? ""} onChange={(e) => onUpdate({ prompt: e.target.value })} className={DIALOG_TEXTAREA} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={DIALOG_LABEL}>
            {isZh ? "畫風" : "Art style"}
            <select value={skillSlug} onChange={(e) => onUpdate({ toolParams: { ...tp, skillSlug: e.target.value, directorBackgroundId: undefined } })} className={DIALOG_FIELD}>
              {EXPLAINER_SKILL_SLUGS.map((s) => <option key={s} value={s}>{pick(ART_STYLE_LABELS[s])}</option>)}
            </select>
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "旁白語言" : "Voice language"}
            <select value={String(tp.language ?? "yue")} onChange={(e) => setParam("language", e.target.value)} className={DIALOG_FIELD}>
              <option value="yue">廣東話</option>
              <option value="zh">國語</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "片長" : "Length"}
            <select value={String(tp.durationPreset ?? "30s")} onChange={(e) => setParam("durationPreset", e.target.value)} className={DIALOG_FIELD}>
              {["15s", "30s", "45s", "60s"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "比例" : "Ratio"}
            <select value={data.aspectRatio ?? "9:16"} onChange={(e) => onUpdate({ aspectRatio: e.target.value as CanvasNodeData["aspectRatio"] })} className={DIALOG_FIELD}>
              {["9:16", "16:9", "1:1"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className={`col-span-2 ${DIALOG_LABEL}`}>
            {isZh ? "角色" : "Character"}
            <select value={String(tp.characterId ?? "")} onChange={(e) => setParam("characterId", e.target.value || undefined)} className={DIALOG_FIELD}>
              <option value="">{isZh ? "不指定" : "None"}</option>
              {characterOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "背景" : "Background"}
            <select disabled={backgrounds.length === 0} value={String(tp.directorBackgroundId ?? "")} onChange={(e) => setParam("directorBackgroundId", e.target.value || undefined)} className={DIALOG_FIELD}>
              <option value="">{backgrounds.length === 0 ? (isZh ? "此畫風固定" : "Fixed for this style") : isZh ? "預設" : "Default"}</option>
              {backgrounds.map((bg) => <option key={bg.id} value={bg.id}>{isZh ? bg.nameZhHant : bg.nameEn}</option>)}
            </select>
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "主持人位置" : "Presenter"}
            <select value={String(tp.presenterPosition ?? "auto")} onChange={(e) => setParam("presenterPosition", e.target.value)} className={DIALOG_FIELD}>
              {EXPLAINER_PRESENTER_POSITIONS.map((p) => <option key={p} value={p}>{pick(PRESENTER_LABELS[p])}</option>)}
            </select>
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "畫面文字語言" : "On-screen text"}
            <select value={String(tp.sceneTextLanguage ?? "zh-Hant")} onChange={(e) => setParam("sceneTextLanguage", e.target.value)} className={DIALOG_FIELD}>
              {EXPLAINER_SCENE_TEXT_CHOICES.map((c) => <option key={c} value={c}>{pick(SCENE_TEXT_LABELS[c])}</option>)}
            </select>
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "文字樣式（即時生效）" : "Text style (instant)"}
            <select value={String(tp.textStyleId ?? "handwritten")} onChange={(e) => setParam("textStyleId", e.target.value)} className={DIALOG_FIELD}>
              {SYSTEM_TEXT_STYLE_ORDER.map((look) => <option key={look} value={look}>{look}</option>)}
            </select>
          </label>
        </div>

        {dirty ? (
          <p className="rounded-[8px] border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-[10.5px] text-amber-100">
            {isZh ? "設定已改，請 Replan。輸出暫時維持上次的規劃。" : "Settings changed. Replan to update; outputs keep the last plan."}
          </p>
        ) : null}
        {planStatus === "failed" && planError ? (
          <p className="flex items-start gap-1 rounded-[8px] bg-rose-500/10 px-2 py-1.5 text-[10.5px] text-rose-200">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            {planError}
          </p>
        ) : null}
        <button
          type="button"
          disabled={disabled || planning || !(data.prompt ?? "").trim()}
          onClick={onPlan}
          className={`nodrag inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11.5px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            !plan || dirty ? "bg-[#c6f24b] text-[#11141b]" : "border border-white/12 text-white/80 hover:bg-white/8"
          }`}
        >
          {planning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : plan ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {planning ? (isZh ? "規劃中…" : "Planning…") : plan ? (isZh ? "Replan（免費）" : "Replan (free)") : isZh ? "Plan（免費）" : "Plan (free)"}
        </button>
      </div>

      <div className="border-t border-white/6 py-1.5">
        {plan ? (
          plan.clips.flatMap((clip) =>
            (["frame", "motion", "voice"] as const).map((kind) => (
              <div key={`${clip.clipNumber}-${kind}`} className="relative flex justify-end px-3 py-0.5 text-[10.5px] text-white/70">
                Clip {clip.clipNumber} {pick(KIND_LABEL[kind])}
                <Handle
                  type="source"
                  id={directorHandleId(clip.clipNumber, kind)}
                  position={Position.Right}
                  style={{ width: 10, height: 10, background: textColor, border: "2px solid #0b0e13", right: -6 }}
                />
              </div>
            )),
          )
        ) : (
          <p className="px-3 py-1 text-right text-[10.5px] text-white/30">{isZh ? "規劃後出現輸出" : "Outputs appear after planning"}</p>
        )}
      </div>
    </div>
  );
}
```

Note: `id` is unused in the JSX; drop it from `Props` if ESLint flags it.

- [ ] **Step 2: Render it from the model card**

In `model-node-card.tsx`, before the existing `if (isExplainerPlannerNode(...))` branch:

```tsx
  if (isExplainerDirectorNode({ type: "model", data })) {
    return (
      <ExplainerDirectorCard
        id={id}
        data={data}
        isZh={isZh}
        selected={Boolean(selected)}
        disabled={isFlowRunning}
        characterOptions={characterOptions}
        onUpdate={(patch) => onUpdateNodeData(id, patch)}
        onPlan={() => onPlanExplainer(id)}
        onRemove={() => onDeleteNode(id)}
      />
    );
  }
```

Add the imports: `isExplainerDirectorNode` from `@/service/canvas/explainer-director` and `ExplainerDirectorCard` from `./explainer-director-card`. The old planning card still renders Talking Head planners.

- [ ] **Step 3: Decision dialog**

```tsx
// src/app/app/canvas/director-plan-decision-dialog.tsx
"use client";

// After a Director plan: build the rows (first plan), or rebuild / keep when the clip count changed.

import { ScroDialogShell } from "@/app/app/canvas/scro-dialog-shell";

export type DirectorDecision =
  | { kind: "build"; nodeId: string; clipCount: number }
  | { kind: "count"; nodeId: string; oldCount: number; newCount: number };

export function DirectorPlanDecisionDialog({
  decision,
  isZh,
  onConfirm,
  onDecline,
}: {
  decision: DirectorDecision | null;
  isZh: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  if (!decision) return null;
  const build = decision.kind === "build";
  return (
    <ScroDialogShell
      open
      isZh={isZh}
      title={build ? (isZh ? `已規劃 ${decision.clipCount} 段` : `Planned ${decision.clipCount} clips`) : isZh ? "段數改變了" : "Clip count changed"}
      description={
        build
          ? isZh ? "要不要自動建立每段的靜幀、影片、配音和拼接節點？不建立的話，只會亮起輸出口。" : "Build each clip's still, video, voice, and concat nodes? Otherwise only the outputs appear."
          : isZh
            ? `段數由 ${decision.oldCount} 變成 ${decision.newCount}。拆走舊節點重新建立，還是保留舊節點？保留的話，減少了的段會斷線。`
            : `Clips went from ${decision.oldCount} to ${decision.newCount}. Rebuild the nodes, or keep them? Keeping cuts wires from removed clips.`
      }
      submitLabel={build ? (isZh ? "自動建立" : "Build nodes") : isZh ? "拆走舊節點重建" : "Rebuild"}
      cancelLabel={build ? (isZh ? "只出輸出口" : "Outputs only") : isZh ? "保留舊節點" : "Keep"}
      canSubmit
      onCancel={onDecline}
      onSubmit={onConfirm}
    >
      {null}
    </ScroDialogShell>
  );
}
```

`ScroDialogShell` has no `cancelLabel` yet. Add an optional `cancelLabel?: string` prop that defaults to today's cancel text, and render it on the cancel button.

- [ ] **Step 4: Workspace plan completion**

In `canvas-workspace.tsx`:

1. State:

```ts
  const [directorDecision, setDirectorDecision] = useState<DirectorDecision | null>(null);
  // Plan results waiting for that decision, with the targets whose text changed.
  type PendingDirectorPlan = { state: Extract<CanvasExplainerPlanState, { status: "ready" }>; changed: string[] };
  const pendingDirectorPlanRef = useRef<Map<string, PendingDirectorPlan>>(new Map());
```

2. In the polling effect, after the `failed` branch, branch for Directors before today's replacement:

```ts
          if (state.plan && isExplainerDirectorNode(planner)) {
            onDirectorPlanReady(nodeId, state);
            continue;
          }
```

3. Add the handlers (`useCallback`, defined above the polling effect):

```ts
  // Stores the plan on the Director, then builds, updates in place, or asks.
  const onDirectorPlanReady = useCallback(
    (nodeId: string, state: Extract<CanvasExplainerPlanState, { status: "ready" }>) => {
      const director = nodesRef.current.find((n) => n.id === nodeId);
      if (!director || !state.plan) return;
      const before = toDomainNodes([director])[0]!;
      const oldPlan = readDirectorPlan(before);
      const nextToolParams = { ...director.data.toolParams, plan: state.plan, planStatus: "planned", planningWith: undefined };
      const after = { ...before, data: { ...before.data, toolParams: nextToolParams } };
      const changed = directorChangedTargets(before, after, toDomainEdges(edgesRef.current));
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, toolParams: nextToolParams } } : n)));
      if (!oldPlan) {
        pendingDirectorPlanRef.current.set(nodeId, { state, changed });
        setDirectorDecision({ kind: "build", nodeId, clipCount: state.plan.clips.length });
      } else if (oldPlan.clips.length === state.plan.clips.length) {
        markStale(changed);
        toast.success(isZh ? "已更新規劃，按 Run group 重新生成" : "Plan updated; press Run group to regenerate");
      } else {
        pendingDirectorPlanRef.current.set(nodeId, { state, changed });
        setDirectorDecision({ kind: "count", nodeId, oldCount: oldPlan.clips.length, newCount: state.plan.clips.length });
      }
      scheduleAutosave();
    },
    [setNodes, markStale, scheduleAutosave, isZh],
  );

  const resolveDirectorDecision = useCallback(
    (build: boolean) => {
      const decision = directorDecision;
      setDirectorDecision(null);
      if (!decision) return;
      const pending = pendingDirectorPlanRef.current.get(decision.nodeId);
      pendingDirectorPlanRef.current.delete(decision.nodeId);
      const state = pending?.state;
      if (!pending || !state?.plan) return;
      const domain = toDomainNodes(nodesRef.current);
      const oldGroup = snapshotGroups(domain).find((g) => g.memberIds.includes(decision.nodeId));
      if (build) {
        const allNodes = [...domain, ...state.nodes];
        const next = applyDirectorBuild(
          { nodes: nodesRef.current, edges: edgesRef.current },
          {
            directorId: decision.nodeId,
            expansion: { nodes: toFlowNodes(state.nodes), edges: toFlowEdges(state.edges, allNodes, models) },
            ...(decision.kind === "count" && oldGroup ? { replaceGroup: oldGroup } : {}),
          },
        );
        setNodes(next.nodes);
        setEdges(next.edges);
        updateGroups((prev) => [...prev.filter((g) => g.id !== oldGroup?.id), state.group]);
        pendingGroupLayoutRef.current = {
          ids: new Set(state.nodes.map((n) => n.id)),
          edges: state.edges,
          origin: { x: state.nodes[0]?.position.x ?? 0, y: state.nodes[0]?.position.y ?? 0 },
          layout: "explainer",
        };
        window.setTimeout(applyPendingGroupLayout, 600);
      } else if (decision.kind === "count") {
        const cut = dropCutDirectorEdges(edgesRef.current, decision.nodeId, state.plan);
        setEdges(cut.edges);
        // Kept rows whose text changed become old versions; cut rows lose their prompt.
        markStale(pending.changed.filter((id) => !cut.cutTargets.includes(id)));
        if (cut.cutTargets.length > 0) {
          toast.warning(
            isZh ? `這些節點失去了 prompt：${cut.cutTargets.join("、")}` : `These nodes lost their prompt: ${cut.cutTargets.join(", ")}`,
          );
        }
      }
      scheduleAutosave();
    },
    [directorDecision, models, setNodes, setEdges, updateGroups, snapshotGroups, markStale, scheduleAutosave, applyPendingGroupLayout, isZh],
  );
```

4. Render the dialog next to the other dialogs:

```tsx
      <DirectorPlanDecisionDialog
        decision={directorDecision}
        isZh={isZh}
        onConfirm={() => resolveDirectorDecision(true)}
        onDecline={() => resolveDirectorDecision(false)}
      />
```

5. Keep the old plan while replanning. In `startDirectorPlan`'s `markPlanning`, leave `plan` in `toolParams`; it already only resets `planStatus`, `planError`, and `plannerVideoId`.

6. Director edits mark only changed outputs. In `onUpdateNodeData`, before the generic stale logic:

```ts
      if (current && isExplainerDirectorNode(toDomainNodes([current])[0]!)) {
        const before = toDomainNodes([current])[0]!;
        const after = { ...before, data: { ...before.data, ...patch } };
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
        markStale(directorChangedTargets(before, after, toDomainEdges(edgesRef.current)));
        scheduleAutosave();
        return;
      }
```

7. The Explainer dialog submit already creates a `scro:explainer` planner card and starts the plan. Leave it; that card is now a Director. Also write `textStyleId: "handwritten"` and `presenterPosition: "auto"` into its `toolParams` so the card shows them.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`, then `npx eslint src/app/app/canvas/nodes/explainer-director-card.tsx src/app/app/canvas/director-plan-decision-dialog.tsx src/app/app/canvas/canvas-workspace.tsx src/app/app/canvas/nodes/model-node-card.tsx src/app/app/canvas/scro-dialog-shell.tsx`
Expected: clean.

Browser check (dev server `npm run dev`, `/app/canvas`): drop the Explainer tool. The card shows "規劃後出現輸出", and its fields edit. Do **not** press Plan during verification unless the user approves; it is free but runs Gemini planning on the worker.

---

### Task 6: Assistant drives the Director

**Files:**
- Create: `src/service/canvas-agent/explainer-director-tool.ts` (replaces `explainer-settings-tool.ts`)
- Modify: `src/service/canvas-agent/tools.ts` (register the tool under the same name `update_explainer_settings`; `get_canvas` Director info)
- Modify: `src/service/canvas-agent/group-tools.ts` (`replaceGroup` for an Explainer group with a Director)
- Modify: `src/service/canvas-agent/prompt.ts` (wording)
- Modify: `src/app/app/canvas/canvas-workspace.tsx` (run `replanRequested`)
- Delete: `src/service/canvas-agent/explainer-settings-tool.ts`, `explainer-settings-tool.test.ts`
- Test: `src/service/canvas-agent/explainer-director-tool.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `updateExplainerDirector(g, input)` with the same input schema as today (`updateExplainerSettingsSchema` plus optional `topic`). It writes Director `toolParams` / `prompt`. A text-style-only change emits `mark_stale` for the changed targets; any other change sets `toolParams.replanRequested = true`.

- [ ] **Step 1: Failing test**

```ts
// src/service/canvas-agent/explainer-director-tool.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import { updateExplainerDirector } from "@/service/canvas-agent/explainer-director-tool";
import { createWorkingGraph } from "@/service/canvas-agent/tools";

function graph() {
  const dir: CanvasNode = {
    id: "exp-abc123-director", type: "model", position: { x: 0, y: 0 },
    data: { modelId: "scro:explainer", prompt: "Topic", aspectRatio: "9:16", toolParams: { plannerMode: true, textStyleId: "neon" } },
  };
  let n = 0;
  return createWorkingGraph({
    nodes: [dir], edges: [], groups: [{ id: "exp-abc123", title: "E", color: "pink", kind: "explainer", memberIds: [dir.id] }],
    catalog: STATIC_CANVAS_MODELS, assets: [], characters: [], nextId: () => `id${++n}`,
  });
}

describe("update_explainer_settings on a Director", () => {
  it("text style only: no replan request", () => {
    const g = graph();
    const res = updateExplainerDirector(g, { textStyle: "chalk" }) as { ok: boolean; replan: boolean };
    assert.equal(res.ok, true);
    assert.equal(res.replan, false);
    assert.equal(g.nodes[0]!.data.toolParams?.replanRequested, undefined);
  });

  it("other changes request a replan", () => {
    const g = graph();
    const res = updateExplainerDirector(g, { presenter: "lower-left" }) as { ok: boolean; replan: boolean };
    assert.equal(res.replan, true);
    assert.equal(g.nodes[0]!.data.toolParams?.replanRequested, true);
    assert.equal(g.nodes[0]!.data.toolParams?.presenterPosition, "lower-left");
  });
});
```

- [ ] **Step 2: Run** `npx tsx --test src/service/canvas-agent/explainer-director-tool.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/service/canvas-agent/explainer-director-tool.ts
// Canvas agent tool: change an Explainer Director's parameters. A text style change applies at
// run time; anything else asks the canvas to replan for free after the reply.

import { z } from "zod";
import type { CanvasNode } from "@/model/canvas";
import { EXPLAINER_PRESENTER_POSITIONS, EXPLAINER_SCENE_TEXT_CHOICES, EXPLAINER_SKILL_SLUGS } from "@/model/explainer-settings";
import { SUBTITLE_LOOK_IDS } from "@/model/subtitle-look-id";
import { explainerBackgroundPresets } from "@/service/canvas/explainer-settings";
import { directorChangedTargets, isExplainerDirectorNode } from "@/service/canvas/explainer-director";
import { markStaleOutputs } from "@/service/canvas/stale-outputs";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/tools";

export const updateExplainerSettingsSchema = z.object({
  groupId: z.string().optional().describe("Explainer group id; needed only when the canvas has several Directors."),
  topic: z.string().optional().describe("New topic or script. A new topic writes new voiceover."),
  artStyle: z.enum(EXPLAINER_SKILL_SLUGS).optional(),
  background: z.string().optional().describe("Preset background id for the art style."),
  textStyle: z.enum(SUBTITLE_LOOK_IDS).optional().describe("On-screen lettering look. Applies without a replan."),
  textLanguage: z.enum(EXPLAINER_SCENE_TEXT_CHOICES).optional(),
  presenter: z.enum(EXPLAINER_PRESENTER_POSITIONS).optional(),
});
export type UpdateExplainerSettingsInput = z.infer<typeof updateExplainerSettingsSchema>;

function pickDirector(g: CanvasAgentWorkingGraph, groupId?: string): CanvasNode | { error: string } {
  const all = g.nodes.filter(isExplainerDirectorNode);
  if (groupId) {
    const group = g.groups.find((gr) => gr.id === groupId);
    return all.find((n) => group?.memberIds.includes(n.id)) ?? { error: `Group "${groupId}" has no Explainer Director.` };
  }
  if (all.length === 1) return all[0]!;
  if (all.length === 0) return { error: "No Explainer Director on the canvas. Add scro:explainer first." };
  return { error: `Several Explainer Directors (${all.map((n) => n.id).join(", ")}). Pass groupId.` };
}

export function updateExplainerDirector(g: CanvasAgentWorkingGraph, input: UpdateExplainerSettingsInput): Record<string, unknown> {
  const picked = pickDirector(g, input.groupId);
  if ("error" in picked) return picked;
  if (picked.data.toolParams?.planStatus === "planning") return { error: "This Explainer is planning right now; wait until it finishes." };
  const tp = picked.data.toolParams ?? {};
  const skillSlug = input.artStyle ?? String(tp.skillSlug ?? "cartoon-explainer-video-director");
  if (input.background && !explainerBackgroundPresets(skillSlug).some((bg) => bg.id === input.background)) {
    return { error: `Background "${input.background}" is not offered for ${skillSlug}.` };
  }
  const nextTp: Record<string, unknown> = {
    ...tp,
    skillSlug,
    ...(input.artStyle && input.artStyle !== tp.skillSlug && !input.background ? { directorBackgroundId: undefined } : {}),
    ...(input.background ? { directorBackgroundId: input.background } : {}),
    ...(input.textStyle ? { textStyleId: input.textStyle } : {}),
    ...(input.textLanguage ? { sceneTextLanguage: input.textLanguage } : {}),
    ...(input.presenter ? { presenterPosition: input.presenter } : {}),
  };
  const topic = input.topic?.trim();
  const replan =
    Boolean(topic && topic !== picked.data.prompt?.trim()) ||
    ["skillSlug", "directorBackgroundId", "sceneTextLanguage", "presenterPosition"].some((k) => nextTp[k] !== tp[k]);
  if (!replan && nextTp.textStyleId === tp.textStyleId) return { error: "Nothing changes." };
  if (replan) nextTp.replanRequested = true;
  const patch = { ...(topic ? { prompt: topic } : {}), toolParams: nextTp };
  const before = picked;
  const after: CanvasNode = { ...picked, data: { ...picked.data, ...patch } };
  g.nodes = g.nodes.map((n) => (n.id === picked.id ? after : n));
  g.ops.push({ kind: "update_node", nodeId: picked.id, patch });
  if (!replan) {
    const stale = markStaleOutputs(g.nodes, g.edges, directorChangedTargets(before, after, g.edges));
    if (stale.staleIds.length > 0) {
      g.nodes = stale.nodes;
      g.ops.push({ kind: "mark_stale", nodeIds: stale.staleIds });
    }
  }
  return {
    ok: true,
    directorId: picked.id,
    replan,
    note: replan
      ? "After your reply the canvas replans this Explainer for free and updates the Director's outputs in place. Tell the user to press Run group when it finishes."
      : "The new text style applies when the stills run. Tell the user to press Run group.",
  };
}
```

In `tools.ts`, import `updateExplainerDirector` and `updateExplainerSettingsSchema` from the new file, point the `update_explainer_settings` handler at it, and set the description: "Change an Explainer Director's topic, art style, background, on-screen text language, presenter position, or text style. Text style applies without a replan; anything else replans for free with the same voiceover unless the topic changes." In `get_canvas`, add for Director nodes:

```ts
    ...(isExplainerDirectorNode(node)
      ? {
          director: {
            params: directorParams(node),
            textStyle: directorTextStyle(node),
            planStatus: node.data.toolParams?.planStatus ?? "idle",
            clips: readDirectorPlan(node)?.clips.length ?? 0,
            needsReplan: directorNeedsReplan(node),
          },
        }
      : {}),
```

In `group-tools.ts` `replaceGroup`, when `target.kind === "explainer"` and a member satisfies `isExplainerDirectorNode`, do not remove nodes. Return `updateExplainerDirector(g, { groupId: target.group?.id, topic: prompt, ...(skillSlug ? { artStyle: skillSlug as never } : {}) })`. Also update `characterId` / `language` / `durationPreset` / `aspectRatio` on the Director the same way: add them to the patch before calling, and set `replanRequested: true`. Remove the `explainerSettingsOf` import and the `priorSettings` block.

In `prompt.ts`, replace the Explainer-look line with: "Explainer look or topic (background, text style, on-screen text language, presenter position, art style, new topic): call update_explainer_settings once and stop calling tools. The Explainer Director (`scro:explainer` card) owns these; never rewrite frame prompts or call replace_group for them."

In `canvas-workspace.tsx`, replace the effect that applied `explainerSettings.pending` (around the old line 1924) with:

```ts
  // The assistant asks for a replan by setting replanRequested on a Director.
  useEffect(() => {
    const requested = nodes.filter((n) => isExplainerDirectorNode({ type: "model", data: n.data }) && n.data.toolParams?.replanRequested === true);
    for (const n of requested) {
      setNodes((prev) => prev.map((p) => (p.id === n.id ? { ...p, data: { ...p.data, toolParams: { ...p.data.toolParams, replanRequested: undefined } } } : p)));
      void startDirectorPlan(n.id);
    }
  }, [nodes, setNodes, startDirectorPlan]);
```

- [ ] **Step 4: Run**

Run: `npx tsx --test src/service/canvas-agent/*.test.ts`
Expected: PASS. Update `group-tools.test.ts` cases that expected an Explainer `replace_group` to remove nodes: with a Director member, the Director's `prompt` now changes and `replanRequested` is `true`.

- [ ] **Step 5: Checkpoint**

Run: `npx tsc --noEmit`. Do not commit.

---

### Task 7: Swap / Teleport parameters on their node cards

**Files:**
- Modify: `src/service/canvas/scro-groups/swap.ts`, `teleport.ts`, `builder.ts`
- Create: `src/service/canvas/scro-groups/section-sync.ts`
- Create: `src/app/app/canvas/nodes/swap-light-look-field.tsx`
- Modify: `src/app/app/canvas/nodes/model-node-card.tsx` (light look field for relight), `src/app/app/canvas/canvas-workspace.tsx` (trim sync)
- Modify: `src/service/canvas-agent/group-tools.ts` (`updateGroupNodes` trim sync)
- Test: `src/service/canvas/scro-groups/swap-teleport.test.ts`, `src/service/canvas/scro-groups/section-sync.test.ts`

**Interfaces:**
- Produces: `renderDurationForTrim(nodes, group, trimToolParams)` returns `{ renderId, durationSeconds } | undefined`.

- [ ] **Step 1: Failing tests**

```ts
// src/service/canvas/scro-groups/section-sync.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import { renderDurationForTrim } from "@/service/canvas/scro-groups/section-sync";

const n = (id: string, modelId: string): CanvasNode => ({ id, type: "model", position: { x: 0, y: 0 }, data: { modelId } });
const group: CanvasGroup = { id: "swap-1", title: "S", color: "violet", kind: "swap", memberIds: ["swap-1-trim", "swap-1-render"] };

describe("renderDurationForTrim", () => {
  it("sets the render length to the trimmed section, clamped to 2–15 s", () => {
    const nodes = [n("swap-1-trim", "ffmpeg:trim-speed"), n("swap-1-render", "scro:swap-render")];
    assert.deepEqual(renderDurationForTrim(nodes, group, { ffmpegStartSec: 2, ffmpegEndSec: 9 }), { renderId: "swap-1-render", durationSeconds: 7 });
    assert.equal(renderDurationForTrim(nodes, group, { ffmpegStartSec: 0, ffmpegEndSec: 40 })?.durationSeconds, 15);
    assert.equal(renderDurationForTrim(nodes, group, { ffmpegStartSec: 0 }), undefined);
  });
});
```

In `swap-teleport.test.ts`, replace assertions about a `-settings` node with:

```ts
    assert.ok(!group.nodes.some((node) => node.type === "settings"));
    assert.equal(group.nodes.find((node) => node.id.endsWith("-grade"))?.data.toolParams?.gradeLook, "jutsu");
```

and for Teleport with a mood:

```ts
    assert.equal(group.nodes.find((node) => node.id.endsWith("-render"))?.data.prompt, "warm lantern light");
```

- [ ] **Step 2: Run** `npx tsx --test src/service/canvas/scro-groups/*.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/service/canvas/scro-groups/section-sync.ts
// Pure: a Swap / Teleport render runs as long as the trimmed section.

import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import { clampSectionLength } from "@/service/canvas/settings/section";

export function renderDurationForTrim(
  nodes: readonly CanvasNode[],
  group: CanvasGroup | undefined,
  toolParams: Record<string, unknown>,
): { renderId: string; durationSeconds: number } | undefined {
  if (!group || (group.kind !== "swap" && group.kind !== "teleport")) return undefined;
  const start = Number(toolParams.ffmpegStartSec ?? 0);
  const end = toolParams.ffmpegEndSec;
  if (typeof end !== "number" || !Number.isFinite(start)) return undefined;
  const render = nodes.find(
    (node) => group.memberIds.includes(node.id) && (node.data.modelId === "scro:swap-render" || node.data.modelId === "scro:teleport-render"),
  );
  return render ? { renderId: render.id, durationSeconds: clampSectionLength(end - start) } : undefined;
}
```

In `swap.ts` and `teleport.ts`, delete `swapSettingsValues` / `teleportSettingsValues`, the `b.settings(...)` call, the settings wires, and the `SETTINGS_HANDLE` import. In `teleport.ts`, set the render `prompt: input.mood?.trim() ?? ""`. In `builder.ts`, delete the `settings` method and the `settingsKindDef` / `CanvasSettingsData` imports. Remove any re-exports of `swapSettingsValues` / `teleportSettingsValues` (search with `rg "SettingsValues" src`).

```tsx
// src/app/app/canvas/nodes/swap-light-look-field.tsx
"use client";

// Light look picker on a Swap render node in relight mode.

import { JUTSU_LIGHT_LOOKS } from "@/service/jutsu/light-looks";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";

export function SwapLightLookField({ isZh, value, onChange }: { isZh: boolean; value: string | undefined; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-white/50">{isZh ? "打光風格" : "Light look"}</label>
      <CanvasPreviewSelect
        value={value ?? JUTSU_LIGHT_LOOKS[0]?.id ?? ""}
        ariaLabel={isZh ? "打光風格" : "Light look"}
        options={JUTSU_LIGHT_LOOKS.map((look) => ({ value: look.id, label: isZh ? look.nameZhHant : look.nameEn, previewUrl: look.image }))}
        onChange={onChange}
      />
    </div>
  );
}
```

In `model-node-card.tsx`, after the object-mode block in the `scro:swap` / `scro:swap-render` section:

```tsx
                {toolParams.swapMode === "relight" ? (
                  <SwapLightLookField
                    isZh={isZh}
                    value={typeof toolParams.lightLookId === "string" ? toolParams.lightLookId : undefined}
                    onChange={(lightLookId) => updateToolParam("lightLookId", lightLookId)}
                  />
                ) : null}
```

In `canvas-workspace.tsx` `onUpdateNodeData`, after computing `current`, when `current.data.modelId === "ffmpeg:trim-speed"` and `patch.toolParams` is set:

```ts
      const domain = toDomainNodes(nodesRef.current);
      const sync = patch.toolParams && current?.data.modelId === "ffmpeg:trim-speed"
        ? renderDurationForTrim(domain, snapshotGroups(domain).find((g) => g.memberIds.includes(nodeId)), patch.toolParams)
        : undefined;
```

Then in the same `setNodes` map, also patch `n.id === sync?.renderId` with `durationSeconds: sync.durationSeconds`. Include the render in `markStale` when its duration changes.

In `group-tools.ts` `updateGroupNodes`, after building `updates`, append a render update when a trim's `toolParams` change: `renderDurationForTrim(g.nodes, group, mergedToolParams)` gives `{ nodeId: renderId, durationSeconds }`.

- [ ] **Step 4: Run**

Run: `npx tsx --test src/service/canvas/scro-groups/*.test.ts src/service/canvas-agent/*.test.ts`
Expected: PASS. In `user-updates.test.ts`, tests that call `update_settings` with `values` on a Swap group now call `update_group_nodes` with `role: "trim"` and `toolParams: { ffmpegStartSec: 0, ffmpegEndSec: 10 }`. They assert the render `durationSeconds` is 10 and no longer assert the "update_settings" guard error.

- [ ] **Step 5: Checkpoint**

Run: `npx tsc --noEmit`. Do not commit.

---

### Task 8: Load migration

**Files:**
- Create: `src/service/canvas/director-migrate.ts`
- Modify: `src/service/canvas/explainer-settings-migrate.ts`. Keep its server-only `ensureSettingsNodes` name so `page.tsx` needs no change. Make it call the new pure migration, keep the backing-video lookup for Explainer groups with neither a settings node nor a Director, and persist when changed.
- Test: `src/service/canvas/director-migrate.test.ts`

**Interfaces:**
- Produces: `migrateLegacySettings(graph)` returns `{ nodes, edges, groups, changed }`, and `explainerDirectorFromSettings({ groupId, position, settings, groupParams })` returns a `CanvasNode`.
- Legacy shapes: `{ kind: "explainer", plannerVideoId, topic, applied, pending?, draft?, vars? }`, `{ kind: "swap" | "teleport", values, vars? }`, `{ kind: "custom", vars? }`, and data with `explainerSettings`.

- [ ] **Step 1: Failing tests**

```ts
// src/service/canvas/director-migrate.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { migrateLegacySettings } from "@/service/canvas/director-migrate";
import { isExplainerDirectorNode } from "@/service/canvas/explainer-director";

const model = (id: string, modelId: string, data: Partial<CanvasNode["data"]> = {}): CanvasNode => ({
  id, type: "model", position: { x: 100, y: 0 }, data: { modelId, ...data },
});
const settingsNode = (id: string, settings: unknown): CanvasNode =>
  ({ id, type: "settings", position: { x: 0, y: 0 }, data: { settings } }) as unknown as CanvasNode;
const wire = (s: string, t: string): CanvasEdge => ({ id: `${s}->${t}`, source: s, sourceHandle: "output", target: t, targetHandle: "settings" });

describe("migrateLegacySettings", () => {
  it("writes Swap values onto the wired nodes and removes the settings node", () => {
    const nodes = [
      settingsNode("swap-1-settings", { kind: "swap", values: { swapMode: "object", objectTarget: "hat", sectionStart: 1, sectionLength: 5, aspectRatio: "16:9", gradeLook: "talking-head" } }),
      model("swap-1-trim", "ffmpeg:trim-speed"),
      model("swap-1-render", "scro:swap-render"),
      model("swap-1-grade", "ffmpeg:color-grade"),
    ];
    const edges = ["swap-1-trim", "swap-1-render", "swap-1-grade"].map((t) => wire("swap-1-settings", t));
    const groups: CanvasGroup[] = [{ id: "swap-1", title: "S", color: "violet", kind: "swap", memberIds: nodes.map((n) => n.id) }];
    const out = migrateLegacySettings({ nodes, edges, groups });
    assert.equal(out.changed, true);
    assert.ok(!out.nodes.some((n) => n.type === "settings"));
    assert.equal(out.nodes.find((n) => n.id === "swap-1-render")?.data.toolParams?.objectTarget, "hat");
    assert.equal(out.nodes.find((n) => n.id === "swap-1-render")?.data.durationSeconds, 5);
    assert.equal(out.nodes.find((n) => n.id === "swap-1-grade")?.data.toolParams?.gradeLook, "talking-head");
    assert.equal(out.nodes.find((n) => n.id === "swap-1-trim")?.data.toolParams?.ffmpegEndSec, 6);
    assert.equal(out.edges.length, 0);
    assert.ok(!out.groups[0]!.memberIds.includes("swap-1-settings"));
  });

  it("turns an Explainer settings node into an idle Director and drops its frame wires", () => {
    const applied = { skillSlug: "paper-cutout-explainer-video-director", backgroundId: "wood-cardboard", textStyleId: "neon", sceneTextLanguage: "zh-Hant", presenterPosition: "lower-left" };
    const nodes = [
      settingsNode("exp-abc123-settings", { kind: "explainer", plannerVideoId: "v", topic: "LLM", applied }),
      model("exp-abc123-frame-1", "google:gemini-nano-banana-2.1", { prompt: "baked" }),
    ];
    const groups: CanvasGroup[] = [{ id: "exp-abc123", title: "E", color: "pink", kind: "explainer", memberIds: nodes.map((n) => n.id), params: { characterId: "c1", language: "yue", aspectRatio: "9:16" } }];
    const out = migrateLegacySettings({ nodes, edges: [wire("exp-abc123-settings", "exp-abc123-frame-1")], groups });
    const dir = out.nodes.find((n) => n.id === "exp-abc123-director")!;
    assert.equal(isExplainerDirectorNode(dir), true);
    assert.equal(dir.data.prompt, "LLM");
    assert.equal(dir.data.toolParams?.textStyleId, "neon");
    assert.equal(dir.data.toolParams?.directorBackgroundId, "wood-cardboard");
    assert.equal(dir.data.toolParams?.characterId, "c1");
    assert.equal(dir.data.toolParams?.planStatus, undefined);
    assert.equal(out.edges.length, 0);
    assert.equal(out.nodes.find((n) => n.id === "exp-abc123-frame-1")?.data.prompt, "baked");
    assert.deepEqual(out.groups[0]!.memberIds, ["exp-abc123-director", "exp-abc123-frame-1"]);
  });

  it("keeps a legacy Setting's vars as a plain Setting", () => {
    const out = migrateLegacySettings({ nodes: [settingsNode("s", { kind: "custom", vars: { mood: "calm" } })], edges: [], groups: [] });
    assert.deepEqual(out.nodes[0]!.data.settings, { vars: { mood: "calm" } });
  });

  it("leaves a migrated canvas unchanged", () => {
    const out = migrateLegacySettings({ nodes: [settingsNode("s", { vars: {} })], edges: [], groups: [] });
    assert.equal(out.changed, false);
  });
});
```

- [ ] **Step 2: Run** `npx tsx --test src/service/canvas/director-migrate.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/service/canvas/director-migrate.ts
// Pure: brings canvases saved with settings kinds up to date when they load.

import type { CanvasEdge, CanvasGroup, CanvasNode, CanvasNodeData } from "@/model/canvas";
import { explainerSettingsToolParams, normalizeExplainerSettings } from "@/service/canvas/explainer-settings";
import { EXPLAINER_PLANNER_MODEL_ID } from "@/service/canvas/explainer-planner";
import { clampSectionLength, trimToolParams } from "@/service/canvas/settings/section";

type Graph = { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[]; groups: readonly CanvasGroup[] };
type Legacy = Record<string, unknown> & { kind?: string; values?: Record<string, unknown>; vars?: Record<string, string> };
type Patch = Partial<CanvasNodeData> & { toolParams?: Record<string, unknown> };

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

// Same values today's Swap / Teleport settings wrote at run time.
function legacyPatch(kind: string, values: Record<string, unknown>, modelId: string | undefined): Patch {
  const start = Math.max(0, num(values.sectionStart, 0));
  const length = clampSectionLength(num(values.sectionLength, 6));
  if (modelId === "ffmpeg:trim-speed") return { presetId: "1.0x", toolParams: trimToolParams(start, length) };
  if (modelId === "ffmpeg:color-grade") return { presetId: String(values.gradeLook ?? "jutsu"), toolParams: { gradeLook: values.gradeLook ?? "jutsu" } };
  const ratio = values.aspectRatio as CanvasNodeData["aspectRatio"];
  if (kind === "swap" && modelId === "scro:swap-render") {
    return {
      aspectRatio: ratio, presetId: ratio, durationSeconds: length,
      toolParams: {
        swapMode: values.swapMode,
        ...(values.objectTarget ? { objectTarget: values.objectTarget } : {}),
        ...(values.objectEditMode ? { objectEditMode: values.objectEditMode } : {}),
        ...(values.lightLookId ? { lightLookId: values.lightLookId } : {}),
      },
    };
  }
  if (kind === "teleport" && modelId === "scro:teleport-render") {
    const mood = typeof values.mood === "string" ? values.mood.trim() : "";
    return { aspectRatio: ratio, presetId: ratio, durationSeconds: length, ...(mood ? { prompt: mood } : {}) };
  }
  return {};
}

function merge(data: CanvasNodeData, patch: Patch): CanvasNodeData {
  const { toolParams, ...rest } = patch;
  return { ...data, ...rest, ...(toolParams ? { toolParams: { ...(data.toolParams ?? {}), ...toolParams } } : {}) };
}

export function explainerDirectorFromSettings(input: {
  groupId: string;
  position: { x: number; y: number };
  settings: Legacy;
  groupParams: Record<string, unknown>;
}): CanvasNode {
  const applied = normalizeExplainerSettings((input.settings.applied ?? {}) as Record<string, unknown>);
  const p = input.groupParams;
  return {
    id: `${input.groupId}-director`,
    type: "model",
    position: input.position,
    data: {
      modelId: EXPLAINER_PLANNER_MODEL_ID,
      prompt: typeof input.settings.topic === "string" ? input.settings.topic : "",
      aspectRatio: (p.aspectRatio as CanvasNodeData["aspectRatio"]) ?? "9:16",
      status: "idle",
      toolParams: {
        plannerMode: true,
        ...(typeof p.characterId === "string" ? { characterId: p.characterId } : {}),
        ...(typeof p.language === "string" ? { language: p.language } : {}),
        ...(typeof p.durationPreset === "string" ? { durationPreset: p.durationPreset } : {}),
        ...explainerSettingsToolParams(applied),
      },
    },
  };
}

export function migrateLegacySettings(graph: Graph): { nodes: CanvasNode[]; edges: CanvasEdge[]; groups: CanvasGroup[]; changed: boolean } {
  let nodes = graph.nodes.map((n) => {
    // Oldest Explainer Settings nodes kept their data under `explainerSettings`.
    const legacy = (n.data as Record<string, unknown>).explainerSettings as Record<string, unknown> | undefined;
    if (!legacy) return n;
    const { explainerSettings: _drop, ...rest } = n.data as Record<string, unknown>;
    void _drop;
    return { ...n, data: { ...rest, settings: { kind: "explainer", ...legacy } } as unknown as CanvasNodeData };
  });
  let changed = nodes.some((n, i) => n !== graph.nodes[i]);
  let edges = [...graph.edges];
  let groups = [...graph.groups];
  const replaceMember = (oldId: string, newId: string | undefined) => {
    groups = groups.map((g) =>
      g.memberIds.includes(oldId)
        ? { ...g, memberIds: newId ? g.memberIds.map((id) => (id === oldId ? newId : id)) : g.memberIds.filter((id) => id !== oldId) }
        : g,
    );
  };

  for (const node of [...nodes]) {
    if (node.type !== "settings") continue;
    const s = node.data.settings as unknown as Legacy | undefined;
    if (!s || !("kind" in s)) continue;
    changed = true;
    const vars = s.vars && Object.keys(s.vars).length > 0 ? s.vars : undefined;
    const outgoing = edges.filter((e) => e.source === node.id && e.targetHandle === "settings");

    if (s.kind === "swap" || s.kind === "teleport") {
      for (const e of outgoing) {
        nodes = nodes.map((t) => (t.id === e.target ? { ...t, data: merge(t.data, legacyPatch(s.kind!, s.values ?? {}, t.data.modelId)) } : t));
      }
    }
    if (s.kind === "explainer") {
      const group = groups.find((g) => g.memberIds.includes(node.id));
      const director = explainerDirectorFromSettings({
        groupId: group?.id ?? node.id.replace(/-settings$/, ""),
        position: node.position,
        settings: s,
        groupParams: (group?.params ?? {}) as Record<string, unknown>,
      });
      nodes = nodes.map((n) => (n.id === node.id ? director : n));
      edges = edges.filter((e) => e.source !== node.id);
      replaceMember(node.id, director.id);
      if (vars) {
        const settingId = `${director.id}-setting`;
        nodes.push({ id: settingId, type: "settings", position: { x: node.position.x, y: node.position.y - 160 }, data: { settings: { vars } } } as CanvasNode);
        edges.push({ id: `${settingId}->${director.id}:settings`, source: settingId, sourceHandle: "output", target: director.id, targetHandle: "settings" });
      }
      continue;
    }

    if (vars) {
      nodes = nodes.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, settings: { vars } } } : n));
      // Swap / Teleport settings values are now on the nodes; a vars-only Setting keeps its wires.
    } else {
      nodes = nodes.filter((n) => n.id !== node.id);
      edges = edges.filter((e) => e.source !== node.id && e.target !== node.id);
      replaceMember(node.id, undefined);
    }
  }
  return { nodes, edges, groups, changed };
}
```

Rewrite `ensureSettingsNodes` in `explainer-settings-migrate.ts`:

1. Run `migrateLegacySettings({ nodes, edges, groups: canvasGroupsForProject(nodes, loaded.groups) })`.
2. Find Explainer groups that have frames but neither a Director (`isExplainerDirectorNode`) nor a settings node. Look up their backing video as today (`GROUP_VIDEO_SUFFIX`, `videosCollection().find(...)`). Build `explainerDirectorFromSettings({ groupId, position, settings: { topic: topicFromPlanSource(video.source ?? ""), applied: explainerSettingsFromVideo(video) }, groupParams: group.params ?? {} })`, then push it and add it to the group's `memberIds`.
3. Persist with `persist(...)` when anything changed.

Delete `upgradeLegacySettingsNodes` / `withToolSettingsNodes` in `settings/migrate.ts`, and `withExplainerSettingsNodes` / `explainerGroupsMissingSettings` along with their tests. Their behavior is now covered by `director-migrate.test.ts`.

- [ ] **Step 4: Run**

Run: `npx tsx --test src/service/canvas/director-migrate.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `npx tsc --noEmit`. Do not commit.

---

### Task 9: Setting becomes a plain key-value map; remove settings kinds

**Files:**
- Modify: `src/model/canvas-settings.ts`
- Rewrite: `src/service/canvas/settings/registry.ts`, `src/service/canvas/settings/apply.ts`
- Delete: `src/service/canvas/settings/{explainer,swap,teleport,custom,explainer-data}.ts`, `src/service/canvas/settings/registry.test.ts` (replace), `src/service/canvas/settings/migrate.ts` and its test, `src/service/canvas/explainer-restyle.ts`, `src/app/app/canvas/nodes/{explainer-settings-node-card,swap-settings-node-card,teleport-settings-node-card,custom-settings-node-card}.tsx`
- Modify: `src/app/app/canvas/nodes/settings-node-card.tsx`, `src/app/app/canvas/canvas-settings-tool.tsx`, `src/app/app/canvas/canvas-sidebar.tsx`, `src/app/app/canvas/canvas-workspace.tsx`, `src/app/app/canvas/nodes/model-node-card.tsx`, `src/app/app/canvas/nodes/prompt-node-card.tsx`, `src/app/app/canvas/nodes/settings-vars-editor.tsx`, `src/service/canvas/executor.ts`, `src/service/canvas/stale-outputs.ts`, `src/app/app/canvas/nodes/outdated-notice.tsx`, `src/service/canvas/explainer-settings.ts`, `src/service/canvas/explainer-expand.ts`, `src/service/canvas/explainer-plan.ts`, `src/presentation/actions/canvas-explainer.ts`, `src/service/canvas-agent/settings-tool.ts`, `src/service/canvas-agent/tools.ts`
- Test: `src/service/canvas/settings/registry.test.ts` (new), `apply.test.ts`, `graph.test.ts`, `stale-outputs.test.ts`, `settings-tool.test.ts`

**Interfaces:**
- Produces: `CanvasSettingsData = { vars: SettingsVars }`, `settingsVars(settings)`, `canWireSettings(target)` (Director, model, Prompt), `settingsStaleTargets(nodes, edges, settingsNodeId, next)`. `OutdatedReason` `"settings"` now means "upstream Director needs a replan".

- [ ] **Step 1: Failing tests**

Replace `registry.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWireSettings, settingsVars } from "@/service/canvas/settings/registry";

describe("Setting registry", () => {
  it("returns the vars map", () => {
    assert.deepEqual(settingsVars({ vars: { mood: "calm" } }), { mood: "calm" });
    assert.deepEqual(settingsVars({ vars: {} }), {});
  });
  it("wires into model and Prompt nodes only", () => {
    assert.equal(canWireSettings({ id: "m", type: "model", data: {} }), true);
    assert.equal(canWireSettings({ id: "p", type: "prompt", data: {} }), true);
    assert.equal(canWireSettings({ id: "x", type: "media", data: {} }), false);
  });
});
```

Add to `stale-outputs.test.ts`:

```ts
  it("reports nodes downstream of a Director that needs a replan", () => {
    const dir: CanvasNode = {
      id: "dir", type: "model", position: { x: 0, y: 0 },
      data: {
        modelId: "scro:explainer", prompt: "New", toolParams: {
          plannerMode: true,
          plan: { plannerVideoId: "v", plannedWith: { topic: "Old", aspectRatio: "9:16", skillSlug: "cartoon-explainer-video-director", language: "yue", presenterPosition: "auto" },
            clips: [{ clipNumber: 1, framePrompt: "f", videoPrompt: "m", spokenLine: "s", durationSeconds: 6, refUrls: [] }] },
        },
      },
    };
    const frame: CanvasNode = { id: "f", type: "model", position: { x: 0, y: 0 }, data: { modelId: "x", outputUrl: "u" } };
    const reasons = outdatedNodeReasons([dir, frame], [{ id: "e", source: "dir", sourceHandle: "clip-1-frame", target: "f", targetHandle: "prompt" }]);
    assert.equal(reasons.get("f"), "settings");
  });
```

(Use the existing export name for `outdatedNodeReasons` in `stale-outputs.ts`; check with `rg "export function outdated" src/service/canvas/stale-outputs.ts`.)

Change Setting fixtures in `graph.test.ts`, `apply.test.ts`, and `settings-tool.test.ts` from `{ kind: "custom", vars }` / `{ kind: "swap", values, … }` to `{ vars }`. In `settings-tool.test.ts`, delete the Swap `values` tests and keep the vars tests, now using a group whose `-settings` node is `{ vars: {} }`.

- [ ] **Step 2: Run** `npx tsx --test src/service/canvas/settings/registry.test.ts src/service/canvas/stale-outputs.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**

`src/model/canvas-settings.ts`, the full file:

```ts
import { z } from "zod";

// Free key-value pairs that fill `{{key}}` placeholders in wired prompts.
export type SettingsVars = Record<string, string>;

// A Setting node: one key-value map, wired into a Director, model, or Prompt node.
export type CanvasSettingsData = { vars: SettingsVars };

export const SETTINGS_VAR_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;

// passthrough keeps legacy fields (kind, values, applied…) until the load migration rewrites them.
export const canvasSettingsDataSchema = z
  .object({ vars: z.record(z.string().regex(SETTINGS_VAR_KEY), z.string().max(4000)).default({}) })
  .passthrough() as unknown as z.ZodType<CanvasSettingsData>;
```

Search for other imports from this file and fix them. `SwapSettings`, `TeleportSettings`, `CANVAS_GRADE_LOOKS`, `SWAP_OBJECT_EDIT_MODES`, `SWAP_SETTINGS_MODES`, and `CanvasGradeLook` are gone. Inline literal unions where they are still needed (`swap-dialog.tsx`, `tool-settings-shell.tsx`): `rg "canvas-settings\"" src`.

`settings/registry.ts`, the full file:

```ts
// Setting nodes: a plain key-value map that fills `{{key}}` in wired prompts.

import type { CanvasSettingsData, SettingsVars } from "@/model/canvas-settings";
import type { SettingsTarget } from "@/service/canvas/settings/types";

export function settingsVars(settings: CanvasSettingsData): SettingsVars {
  return settings.vars ?? {};
}

// Director, model, and Prompt nodes take one Setting on their `settings` handle.
export function canWireSettings(target: SettingsTarget): boolean {
  return target.type === "model" || target.type === "prompt";
}
```

In `settings/types.ts`, keep `SETTINGS_HANDLE` and `SettingsTarget`. Delete `SettingsPatch`, `SettingsResolveContext`, and `SettingsKindDef`.

In `settings/apply.ts`, keep only `templateText` and `settingsStaleTargets`, the latter reduced to the vars comparison:

```ts
export function settingsStaleTargets(nodes, edges, settingsNodeId, next: CanvasSettingsData): string[] {
  const current = nodes.find((n) => n.id === settingsNodeId)?.data.settings;
  const before = current ? settingsVars(current) : {};
  const after = settingsVars(next);
  return edges
    .filter((e) => e.source === settingsNodeId && e.targetHandle === SETTINGS_HANDLE)
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n): n is CanvasNode => Boolean(n))
    .filter((t) => promptPlaceholders(templateText(nodes, edges, t)).some((k) => before[k] !== after[k]))
    .map((n) => n.id);
}
```

In `executor.ts`, delete both `withWiredSettings` uses: use `loadedProject` directly and drop the import.

In `model-node-card.tsx`, delete `settingsOverrides`, `override`, `effective`, `controlled`, `controlledTitle`, and `mergeSettingsPatch`. Use `data` where `effective` was used, and remove every `disabled={controlled(...)}` / `title={controlled(...) ? … }` prop. The Setting row label stays `"設定" / "Setting"`; `wiredSettingsDef` becomes a fixed color `#c6f24b`. Also delete `settingsOverrides` from the `port-colors.ts` context type and from the workspace provider value.

Rename `custom-settings-node-card.tsx` to `settings-node-card.tsx`, replacing the switch:

```tsx
"use client";

// Setting node: a key-value map whose keys fill `{{key}}` in wired Director, model, or Prompt nodes.

import type { NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";
import { ToolSettingsShell } from "@/app/app/canvas/nodes/tool-settings-shell";
import { SettingsVarsEditor } from "@/app/app/canvas/nodes/settings-vars-editor";

export const SETTING_COLOR = "#c6f24b";

export function SettingsNodeCard({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const { locale, onUpdateNodeData } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  return (
    <ToolSettingsShell isZh={isZh} title="Setting" color={SETTING_COLOR} selected={Boolean(selected)}>
      <SettingsVarsEditor isZh={isZh} vars={data.settings?.vars} onChange={(vars) => onUpdateNodeData(id, { settings: { vars } })} />
    </ToolSettingsShell>
  );
}
```

In `settings-vars-editor.tsx`, delete the `presetVars` prop and the preset rows. In `tool-settings-shell.tsx`, delete `GradeLookField` and `GRADE_LABELS`.

In `canvas-settings-tool.tsx`, replace the kinds with one tile: delete `HAND_ADDED_SETTINGS_KINDS`, `HandAddedSettingsKind`, and `isHandAddedSettingsKind`; `CanvasSettingsTool` takes no `kind`, has title `"Setting"`, and color `SETTING_COLOR`. The drag MIME payload becomes `"setting"`, and `canvasSettingsToolVisible(query, categoryFiltered)` matches "setting", "settings", "設定", "variable", "變數". In `canvas-sidebar.tsx`, render one tile with `pickedKey` `"setting"` and `onAddSettingsNode()`. In `canvas-workspace.tsx`, `addSettingsNode(position?)` creates `{ type: "settings", data: { label: "Setting", settings: { vars: {} } } }`, and the drop handler checks `event.dataTransfer.getData(CANVAS_DRAG_SETTINGS_MIME)` is non-empty.

Also in `canvas-workspace.tsx`, delete `onApplyExplainerSettings`, the `restyleCanvasExplainerAction` import, the `explainerSettingsOf` / `explainerSettingsPatch` imports, `settingsOverridesById`, and the `settingsOverrides` memo. In `toFlowEdges`, `settingsStroke(src)` now returns `SETTING_COLOR` when `src?.type === "settings"`. `onUpdateNodeData` keeps the `settingsStaleTargets` call for `patch.settings`.

In `stale-outputs.ts`, rewrite the reasons loop:

```ts
  for (const node of nodes) {
    if (!isExplainerDirectorNode(node) || !directorNeedsReplan(node)) continue;
    for (const id of downstreamNodeIds(edges, [node.id])) {
      if (id !== node.id && byId.get(id)?.data.outputUrl) reasons.set(id, "settings");
    }
  }
```

and drop the `explainerSettingsOf` / `explainerSettingsChanges` imports. In `outdated-notice.tsx`, change the `"settings"` copy to `"解說導演的設定已改但未 Replan，這個預覽是舊版本。"` / `"The Explainer Director's settings changed but it was not replanned; this preview is an old version."`.

In `explainer-settings.ts`, delete `buildExplainerSettingsNode`, `explainerSettingsEdges`, `explainerSettingsNodeId`, `EXPLAINER_SETTINGS_HANDLE`, `buildExplainerReplanCard`, `groupNarration`, and `explainerSettingsChanges`, along with their tests in `explainer-settings.test.ts`. Keep `normalizeExplainerSettings`, `explainerBackgroundPresets`, `composeExplainerPlanSource`, `topicFromPlanSource`, `explainerSettingsToolParams`, `explainerSettingsFromToolParams`, `explainerVideoLookFields`, and `explainerSettingsFromVideo`.

In `explainer-expand.ts`, delete the `settings` input and its node and edges. In `explainer-plan.ts`, remove the non-Director `settings` branch from Task 4, so every Explainer expansion passes `directorId: plannerNode.id`.

In `canvas-explainer.ts` (actions), delete `restyleCanvasExplainerAction`. Delete `src/service/canvas/explainer-restyle.ts`.

In `settings-tool.ts`, `update_settings` takes `{ groupId?, nodeId?, vars }` only. Delete `values`, the Swap / Teleport schema imports, the color-fix guard, and `settingsControlledFields`; in `tools.ts`, remove the guard in `update_node` that used `settingsControlledFields`. In the `get_canvas` settings entry, output only `{ vars: settingsVars(...) }`.

Remove the stale `ExplainerSettingsNodeData` usage in `src/model/explainer-settings.ts` only if nothing imports it any more (`rg ExplainerSettingsNodeData src`).

- [ ] **Step 4: Run everything**

Run: `npx tsc --noEmit`
Expected: clean. Fix every remaining reference that `rg "settingsKindDef|withWiredSettings|explainerSettingsOf|kind: \"swap\"|kind: \"teleport\"|kind: \"explainer\"|kind: \"custom\"" src` still lists (outside `director-migrate.ts` and its test, which read legacy data on purpose).

Run: `npx tsx --test 'src/**/*.test.ts'`
Expected: only the five failures that already fail on HEAD.

- [ ] **Step 5: Checkpoint**

Run: `npx eslint` on every changed or created file. Do not commit.

---

### Task 10: Docs and final verification

**Files:**
- Modify: `AGENTS.md` (Interactive Node Canvas paragraph and Canvas AI Assistant paragraph)
- Modify: `pipeline-models.md` (canvas Explainer pipeline section)

- [ ] **Step 1: Update `AGENTS.md`**

Replace the sentences about the Explainer Settings node, text-style Apply, Replan planning card, settings kinds, Swap / Teleport settings nodes, `update_settings` values, and `update_explainer_settings` pending. Say instead:

- `scro:explainer` is a persistent **Explainer Director** card holding topic, character, length, ratio, art style, voice language, on-screen text language, background, presenter position, and text style.
- Free Plan stores `toolParams.plan` and shows outputs `clip-<n>-frame|motion|voice`. The first plan asks whether to build rows wired from those outputs.
- Replan updates outputs in place, keeping the voiceover unless the topic changed. A changed clip count asks Rebuild or Keep.
- Frame prompts keep `{{text_style}}`, filled from the Director's text style.
- Setting is one key-value map (`{ vars }`) wired into a Director, model, or Prompt node. `resolveNodeInputs` fills `{{key}}`: Director text style, then the Director's Setting, the Prompt node's, and the receiver's, last wins. An unfilled key blocks the run.
- Swap / Teleport parameters live on their trim, render, and grade nodes, and trim length syncs the render duration.
- The assistant: `update_explainer_settings` edits the Director, setting `replanRequested` unless only the text style changed. `replace_group` on an Explainer edits its Director. `update_settings` edits Setting vars.
- Older canvases migrate on load (`director-migrate.ts`).

- [ ] **Step 2: Update `pipeline-models.md`**

In the canvas Explainer section, describe the Director flow (Plan → outputs → optional auto-build → Nano Banana 2.1 still → MiniMax-H3 → TTS 1.25x → audio mux → concat). Remove the Explainer Settings node, Apply, and restyle. Models, providers, resolutions, and prices are unchanged.

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit`. Expected: clean.
Run: `npx tsx --test 'src/**/*.test.ts'`. Expected: only the five failures that already fail on HEAD.
Run: `npx eslint` on all changed files. Expected: clean.

Browser (`npm run dev`, an existing canvas with an Explainer group):
1. On load, the old Explainer Settings card is replaced by an Explainer Director card with the same topic and settings, and the frames still show their prompts.
2. The Tools tab shows Prompt and one "Setting" tile.
3. Add a Setting and add key `mood`. A model prompt containing `{{mood}}` shows a red chip until the Setting is wired, then a green chip.
4. A Swap group's render card shows Swap mode, Object, and Light look (relight), and changing the trim end updates the render seconds.
5. Do not press Plan or Run during verification unless the user approves.

- [ ] **Step 4: Report**

Tell the user, in Traditional Chinese: what changed, the test and lint results (naming the five failures that already fail on HEAD), what was browser-verified, and that nothing was committed.
