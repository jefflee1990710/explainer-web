# Canvas Explainer Plan & Expand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dragging Explainer onto `/app/canvas` creates a free storyboard planner that expands into an editable per-clip graph (Explainer Frame → Hailuo 3 → Audio Mux ← TTS → FFmpeg Concat).

**Architecture:** The planner creates a backing `videos` doc with `canvasPlanOnly: true`; the existing Phase A worker job writes the storyboard, keeps the still + lock steps, skips frame drawing, and stores Phase B prompts. The client polls until ready, then inserts nodes built by a pure expansion function. The new `scro:explainer-frame` node renders through the backing video's existing frame pipeline, so image quality and routing do not change.

**Tech Stack:** Next.js 16 (webpack), React Flow (`@xyflow/react`), MongoDB, Node `node:test` + `tsx`, AI SDK (Gemini via `directorModel()`).

**Spec:** `docs/superpowers/specs/2026-11-21-canvas-explainer-expand-design.md`

## Global Constraints

- Never call Higgsfield, OpenRouter, Google, or ElevenLabs in tests; inject fakes (`deps`).
- Reply text / UI copy: Traditional Chinese first, English second (existing `isZh ? … : …` pattern).
- `db.collection` access only through `@/dao` typed accessors.
- Server calls from the client use Server Actions (no new REST route).
- New UI components go in their own files; files using hooks start with `"use client"`.
- Short, clear comments only where the code cannot show the constraint.
- Do not stage the user's pre-existing uncommitted edits in `canvas-workspace.tsx`, `agent/canvas-agent-*.ts(x)`; commit only the hunks this plan adds (`git add -p`).
- Run single test files with `npx tsx --test <file>`; typecheck with `npx tsc --noEmit`; lint touched files with `npx eslint <files>`.
- Planner price is free; frames `$0.15`; video `$0.10/s` (5–15s billed); TTS `$0.02`; FFmpeg `$0`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/model/project.ts` (modify) | `canvasPlanOnly`, `canvasPlan` fields |
| `src/model/canvas.ts` (modify) | `CanvasJobDomainKind` adds `"explainer_frame"` |
| `src/service/canvas/explainer-planner.ts` (new, pure) | `isExplainerPlannerNode`, `readPlannerParams` |
| `src/service/canvas/explainer-expand.ts` (new, pure) | `buildExplainerExpansion`, `explainerVoicePreset` |
| `src/service/canvas/explainer-plan-phase-b.ts` (new) | Phase B for every clip of a plan-only video |
| `src/service/canvas/explainer-frame.ts` (new) | Submit / poll one start frame on the backing video |
| `src/service/canvas/explainer-plan.ts` (new) | Start plan, read plan state |
| `src/service/canvas/scro-dispatch.ts` (modify) | Extract `createCanvasDirectorVideo`; route `scro:explainer-frame` |
| `src/service/canvas/model-catalog.ts` (modify) | `hiddenInSidebar`, `scro:explainer-frame` spec |
| `src/service/canvas/model-names.ts` (modify) | Localized name |
| `src/service/canvas/graph.ts` (modify) | Waves skip planners |
| `src/service/canvas/executor.ts` (modify) | Reject planners; poll `explainer_frame` |
| `src/service/director/jobs.ts` (modify) | Plan-only branch |
| `src/service/clip/enqueue-scene-images.ts` (modify) | Plan-only guard |
| `src/presentation/actions/canvas-explainer.ts` (new) | Server Actions |
| `src/app/app/canvas/nodes/explainer-planner-panel.tsx` (new) | Planner UI |
| `src/app/app/canvas/nodes/explainer-replan-dialog.tsx` (new) | Re-plan confirmation |
| `src/app/app/canvas/nodes/model-node-card.tsx` (modify) | Use panel for planners |
| `src/app/app/canvas/nodes/port-colors.ts` (modify) | Context: `onPlanExplainer` |
| `src/app/app/canvas/canvas-workspace.tsx` (modify) | Plan handler, polling, insertion, price |
| `src/app/app/canvas/canvas-sidebar.tsx` (modify) | Hide `hiddenInSidebar` |
| `src/service/canvas/templates.ts` (modify) | Explainer template is a planner |
| `src/service/canvas-agent/tools.ts`, `prompt.ts` (modify) | Agent creates planners, never frame nodes |
| `pipeline-models.md`, `AGENTS.md` (modify) | Docs sync |

---

### Task 1: Planner helpers + model fields

**Files:**
- Create: `src/service/canvas/explainer-planner.ts`
- Create: `src/service/canvas/explainer-planner.test.ts`
- Modify: `src/model/project.ts` (after `autoProduceAllClips?: boolean;`, ~line 614)
- Modify: `src/model/canvas.ts` (`CanvasJobDomainKind`, `canvasJobDomainKindSchema`)

**Interfaces:**
- Produces: `isExplainerPlannerNode(node: Pick<CanvasNode,"type"|"data">): boolean`; `EXPLAINER_PLANNER_MODEL_ID = "scro:explainer"`; `ExplainerPlanStatus = "planning" | "expanded" | "failed"`; `readPlannerParams(node) → { plannerVideoId?: string; planStatus?: ExplainerPlanStatus; expandedNodeIds: string[]; planError?: string; planSummary?: string }`.
- Produces on `Project`: `canvasPlanOnly?: boolean; canvasPlan?: { prompts: PhaseBPrompt[]; error?: string }`.
- Produces on `CanvasJobDomainKind`: `"explainer_frame"`.

- [ ] **Step 1: Write the failing test**

```ts
// src/service/canvas/explainer-planner.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { isExplainerPlannerNode, readPlannerParams } from "@/service/canvas/explainer-planner";

const node = (data: CanvasNode["data"]): CanvasNode => ({
  id: "n1",
  type: "model",
  position: { x: 0, y: 0 },
  data,
});

describe("explainer planner helpers", () => {
  it("detects planner nodes only when plannerMode is true on scro:explainer", () => {
    assert.equal(isExplainerPlannerNode(node({ modelId: "scro:explainer", toolParams: { plannerMode: true } })), true);
    assert.equal(isExplainerPlannerNode(node({ modelId: "scro:explainer" })), false);
    assert.equal(isExplainerPlannerNode(node({ modelId: "scro:tts", toolParams: { plannerMode: true } })), false);
    assert.equal(isExplainerPlannerNode({ type: "prompt", data: { toolParams: { plannerMode: true } } }), false);
  });

  it("reads planner params defensively", () => {
    const params = readPlannerParams(
      node({
        modelId: "scro:explainer",
        toolParams: {
          plannerMode: true,
          plannerVideoId: "abc",
          planStatus: "planning",
          expandedNodeIds: ["a", 3, "b"],
        },
      }),
    );
    assert.deepEqual(params, {
      plannerVideoId: "abc",
      planStatus: "planning",
      expandedNodeIds: ["a", "b"],
      planError: undefined,
      planSummary: undefined,
    });
    assert.equal(readPlannerParams(node({ toolParams: { planStatus: "weird" } })).planStatus, undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/explainer-planner.test.ts`
Expected: FAIL — cannot find module `explainer-planner`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/service/canvas/explainer-planner.ts
// Pure helpers for the Canvas Explainer planner node (scro:explainer with plannerMode).

import type { CanvasNode } from "@/model/canvas";

export const EXPLAINER_PLANNER_MODEL_ID = "scro:explainer";

export type ExplainerPlanStatus = "planning" | "expanded" | "failed";

const PLAN_STATUSES: readonly ExplainerPlanStatus[] = ["planning", "expanded", "failed"];

export function isExplainerPlannerNode(node: Pick<CanvasNode, "type" | "data">): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === EXPLAINER_PLANNER_MODEL_ID &&
    node.data.toolParams?.plannerMode === true
  );
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function readPlannerParams(node: Pick<CanvasNode, "data">) {
  const params = node.data.toolParams ?? {};
  const status = params.planStatus;
  return {
    plannerVideoId: str(params.plannerVideoId),
    planStatus: PLAN_STATUSES.find((s) => s === status),
    expandedNodeIds: Array.isArray(params.expandedNodeIds)
      ? params.expandedNodeIds.filter((id): id is string => typeof id === "string")
      : [],
    planError: str(params.planError),
    planSummary: str(params.planSummary),
  };
}
```

In `src/model/project.ts`, after `autoProduceAllClips?: boolean;`:

```ts
  // Canvas Explainer planner: Phase A + Phase B only, no frames until a canvas frame node runs.
  canvasPlanOnly?: boolean;
  canvasPlan?: { prompts: PhaseBPrompt[]; error?: string };
```

In `src/model/canvas.ts`:

```ts
export type CanvasJobDomainKind = "video" | "jutsu" | "teleport" | "worker_ffmpeg" | "explainer_frame";
```
and add `"explainer_frame",` to `canvasJobDomainKindSchema`'s `z.enum([...])`.

- [ ] **Step 4: Run test + typecheck**

Run: `npx tsx --test src/service/canvas/explainer-planner.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/explainer-planner.ts src/service/canvas/explainer-planner.test.ts src/model/project.ts src/model/canvas.ts
git commit -m "feat(canvas): explainer planner helpers and plan-only video fields"
```

---

### Task 2: Pure expansion builder

**Files:**
- Create: `src/service/canvas/explainer-expand.ts`
- Create: `src/service/canvas/explainer-expand.test.ts`

**Interfaces:**
- Consumes: `isSilentSpokenLine` from `@/service/director/spoken-line`.
- Produces:
  ```ts
  export type ExplainerExpansionClip = { clipNumber: number; framePrompt: string; videoPrompt: string; durationSeconds: number; spokenLine: string };
  export type ExplainerExpansionInput = {
    idPrefix: string;
    origin: { x: number; y: number };
    plannerVideoId: string;
    aspectRatio: CanvasAspectRatio;
    language: "yue" | "zh" | "en";
    voicePreset: string;
    characterId?: string;
    clips: ExplainerExpansionClip[];
  };
  export function explainerVoicePreset(language: "yue" | "zh" | "en", gender?: "male" | "female"): string;
  export function buildExplainerExpansion(input: ExplainerExpansionInput): { nodes: CanvasNode[]; edges: CanvasEdge[]; expandedNodeIds: string[] };
  export const EXPLAINER_HAILUO_MODEL_ID = "openrouter:minimax/hailuo-3";
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/service/canvas/explainer-expand.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXPLAINER_HAILUO_MODEL_ID,
  buildExplainerExpansion,
  explainerVoicePreset,
  type ExplainerExpansionClip,
} from "@/service/canvas/explainer-expand";

function clips(n: number, silent: number[] = []): ExplainerExpansionClip[] {
  return Array.from({ length: n }, (_, i) => ({
    clipNumber: i + 1,
    framePrompt: `frame ${i + 1}`,
    videoPrompt: `video ${i + 1}`,
    durationSeconds: i === 0 ? 3 : 20,
    spokenLine: silent.includes(i + 1) ? "(no dialogue)" : `line ${i + 1}`,
  }));
}

const base = {
  idPrefix: "x",
  origin: { x: 100, y: 50 },
  plannerVideoId: "vid1",
  aspectRatio: "9:16" as const,
  language: "en" as const,
  voicePreset: "bella",
};

describe("buildExplainerExpansion", () => {
  it("builds frame, voice, video, mux per clip and one concat for 3 clips", () => {
    const out = buildExplainerExpansion({ ...base, clips: clips(3) });
    const byModel = (id: string) => out.nodes.filter((n) => n.data.modelId === id);
    assert.equal(byModel("scro:explainer-frame").length, 3);
    assert.equal(byModel("scro:tts").length, 3);
    assert.equal(byModel(EXPLAINER_HAILUO_MODEL_ID).length, 3);
    assert.equal(byModel("ffmpeg:audio-mux").length, 3);
    assert.equal(byModel("ffmpeg:concat").length, 1);
    assert.equal(out.edges.length, 3 * 4);
    assert.deepEqual(out.expandedNodeIds, out.nodes.map((n) => n.id));
    assert.equal(new Set(out.nodes.map((n) => n.id)).size, out.nodes.length);
  });

  it("prefills prompts, params, and clamps durations to 5-15", () => {
    const out = buildExplainerExpansion({ ...base, characterId: "char1", clips: clips(2) });
    const frame = out.nodes.find((n) => n.data.modelId === "scro:explainer-frame")!;
    assert.equal(frame.data.prompt, "frame 1");
    assert.deepEqual(frame.data.toolParams, { plannerVideoId: "vid1", clipNumber: 1 });
    const videos = out.nodes.filter((n) => n.data.modelId === EXPLAINER_HAILUO_MODEL_ID);
    assert.deepEqual(videos.map((v) => v.data.durationSeconds), [5, 15]);
    assert.equal(videos[0]!.data.prompt, "video 1");
    const tts = out.nodes.find((n) => n.data.modelId === "scro:tts")!;
    assert.equal(tts.data.prompt, "line 1");
    assert.deepEqual(tts.data.toolParams, {
      language: "en",
      voicePreset: "bella",
      ttsSpeed: 1.25,
      characterId: "char1",
    });
  });

  it("wires silent clips straight into concat", () => {
    const out = buildExplainerExpansion({ ...base, clips: clips(2, [2]) });
    assert.equal(out.nodes.filter((n) => n.data.modelId === "scro:tts").length, 1);
    const concat = out.nodes.find((n) => n.data.modelId === "ffmpeg:concat")!;
    const video2 = out.nodes.filter((n) => n.data.modelId === EXPLAINER_HAILUO_MODEL_ID)[1]!;
    assert.ok(out.edges.some((e) => e.source === video2.id && e.target === concat.id && e.targetHandle === "videos"));
  });

  it("chains concat nodes so none exceeds 8 inputs", () => {
    for (const n of [9, 12, 16]) {
      const out = buildExplainerExpansion({ ...base, clips: clips(n) });
      const concats = out.nodes.filter((node) => node.data.modelId === "ffmpeg:concat");
      for (const c of concats) {
        const inputs = out.edges.filter((e) => e.target === c.id).length;
        assert.ok(inputs <= 8, `concat ${c.id} has ${inputs} inputs for n=${n}`);
      }
      const finals = concats.filter((c) => !out.edges.some((e) => e.source === c.id));
      assert.equal(finals.length, 1);
    }
  });
});

describe("explainerVoicePreset", () => {
  it("maps language and gender to narrator presets", () => {
    assert.equal(explainerVoicePreset("yue", "female"), "cathy");
    assert.equal(explainerVoicePreset("yue", "male"), "alan");
    assert.equal(explainerVoicePreset("zh", "female"), "una");
    assert.equal(explainerVoicePreset("zh", "male"), "yu");
    assert.equal(explainerVoicePreset("en", "male"), "brian");
    assert.equal(explainerVoicePreset("en"), "bella");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/explainer-expand.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/service/canvas/explainer-expand.ts
// Pure: turns a finished Explainer plan into per-clip canvas nodes and edges.

import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import { isSilentSpokenLine } from "@/service/director/spoken-line";

export const EXPLAINER_HAILUO_MODEL_ID = "openrouter:minimax/hailuo-3";
// Diagram explainers speed narration with atempo=1.25 in the director pipeline.
const EXPLAINER_TTS_SPEED = 1.25;
const CONCAT_MAX_INPUTS = 8;
const ROW_HEIGHT = 300;
const COL = { frame: 420, video: 800, mux: 1180, concat: 1560 } as const;

export type ExplainerExpansionClip = {
  clipNumber: number;
  framePrompt: string;
  videoPrompt: string;
  durationSeconds: number;
  spokenLine: string;
};

export type ExplainerExpansionInput = {
  idPrefix: string;
  origin: { x: number; y: number };
  plannerVideoId: string;
  aspectRatio: CanvasAspectRatio;
  language: "yue" | "zh" | "en";
  voicePreset: string;
  characterId?: string;
  clips: ExplainerExpansionClip[];
};

export function explainerVoicePreset(
  language: "yue" | "zh" | "en",
  gender?: "male" | "female",
): string {
  const male = gender === "male";
  if (language === "yue") return male ? "alan" : "cathy";
  if (language === "zh") return male ? "yu" : "una";
  return male ? "brian" : "bella";
}

export function buildExplainerExpansion(input: ExplainerExpansionInput) {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const id = (suffix: string) => `${input.idPrefix}-${suffix}`;
  const edge = (source: string, target: string, targetHandle: string) =>
    edges.push({ id: `${source}->${target}:${targetHandle}`, source, sourceHandle: "output", target, targetHandle });

  // Final outputs per clip (mux, or video for silent clips), in clip order.
  const clipOutputs: { nodeId: string; y: number }[] = [];

  input.clips.forEach((clip, index) => {
    const y = input.origin.y + index * ROW_HEIGHT;
    const n = clip.clipNumber;
    const frameId = id(`frame-${n}`);
    const videoId = id(`video-${n}`);
    nodes.push({
      id: frameId,
      type: "model",
      position: { x: input.origin.x + COL.frame, y },
      data: {
        modelId: "scro:explainer-frame",
        presetId: input.aspectRatio,
        aspectRatio: input.aspectRatio,
        prompt: clip.framePrompt,
        toolParams: { plannerVideoId: input.plannerVideoId, clipNumber: n },
        status: "idle",
      },
    });
    nodes.push({
      id: videoId,
      type: "model",
      position: { x: input.origin.x + COL.video, y },
      data: {
        modelId: EXPLAINER_HAILUO_MODEL_ID,
        presetId: input.aspectRatio,
        aspectRatio: input.aspectRatio,
        durationSeconds: Math.min(15, Math.max(5, Math.round(clip.durationSeconds))),
        prompt: clip.videoPrompt,
        status: "idle",
      },
    });
    edge(frameId, videoId, "startImage");

    const line = clip.spokenLine.trim();
    if (!line || isSilentSpokenLine(line)) {
      clipOutputs.push({ nodeId: videoId, y });
      return;
    }
    const voiceId = id(`voice-${n}`);
    const muxId = id(`mux-${n}`);
    nodes.push({
      id: voiceId,
      type: "model",
      position: { x: input.origin.x + COL.frame, y: y + ROW_HEIGHT / 2 },
      data: {
        modelId: "scro:tts",
        presetId: "natural",
        prompt: line,
        toolParams: {
          language: input.language,
          voicePreset: input.voicePreset,
          ttsSpeed: EXPLAINER_TTS_SPEED,
          ...(input.characterId ? { characterId: input.characterId } : {}),
        },
        status: "idle",
      },
    });
    nodes.push({
      id: muxId,
      type: "model",
      position: { x: input.origin.x + COL.mux, y },
      data: {
        modelId: "ffmpeg:audio-mux",
        presetId: "replace",
        toolParams: { ffmpegMixMode: "replace", ffmpegAudioGainDb: 0 },
        status: "idle",
      },
    });
    edge(videoId, muxId, "video");
    edge(voiceId, muxId, "refAudio");
    clipOutputs.push({ nodeId: muxId, y });
  });

  // First concat takes up to 8 clips; each next one takes the previous concat + up to 7 clips.
  let remaining = [...clipOutputs];
  let previous: { nodeId: string; y: number } | undefined;
  let step = 0;
  while (remaining.length > 0 || !previous) {
    const room = previous ? CONCAT_MAX_INPUTS - 1 : CONCAT_MAX_INPUTS;
    const batch = remaining.slice(0, room);
    remaining = remaining.slice(room);
    const ys = [...(previous ? [previous.y] : []), ...batch.map((b) => b.y)];
    const centerY = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : input.origin.y;
    const concatId = id(`concat-${step + 1}`);
    nodes.push({
      id: concatId,
      type: "model",
      position: { x: input.origin.x + COL.concat + step * 380, y: centerY },
      data: {
        modelId: "ffmpeg:concat",
        presetId: "pad-200ms",
        toolParams: { ffmpegTransition: "pad-200ms" },
        status: "idle",
      },
    });
    if (previous) edge(previous.nodeId, concatId, "videos");
    for (const item of batch) edge(item.nodeId, concatId, "videos");
    previous = { nodeId: concatId, y: centerY };
    step += 1;
    if (batch.length === 0) break;
  }

  return { nodes, edges, expandedNodeIds: nodes.map((n) => n.id) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/canvas/explainer-expand.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/explainer-expand.ts src/service/canvas/explainer-expand.test.ts
git commit -m "feat(canvas): pure explainer plan expansion into per-clip nodes"
```

---

### Task 3: Plan-only Phase A + Phase B for every clip

**Files:**
- Create: `src/service/canvas/explainer-plan-phase-b.ts`
- Create: `src/service/canvas/explainer-plan-phase-b.test.ts`
- Modify: `src/service/director/jobs.ts` (inside `runPhaseAJob`)
- Modify: `src/service/clip/enqueue-scene-images.ts` (top of `enqueueSceneImagesForNewVideo`)

**Interfaces:**
- Consumes: `Project.canvasPlanOnly`, `Project.canvasPlan` (Task 1).
- Produces: `collectPhaseBPrompts(clipNumbers: number[], runClip: (n: number) => Promise<PhaseBPrompt>, concurrency?: number): Promise<PhaseBPrompt[]>` (ordered by clip number); `runCanvasPlanPhaseB(project: Project): Promise<PhaseBPrompt[]>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/service/canvas/explainer-plan-phase-b.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectPhaseBPrompts } from "@/service/canvas/explainer-plan-phase-b";

describe("collectPhaseBPrompts", () => {
  it("returns prompts in clip order with bounded concurrency", async () => {
    let active = 0;
    let peak = 0;
    const out = await collectPhaseBPrompts([1, 2, 3, 4, 5], async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, (6 - n) * 3));
      active -= 1;
      return { clipNumber: n, durationSeconds: 6, prompt: `p${n}` };
    }, 2);
    assert.deepEqual(out.map((p) => p.prompt), ["p1", "p2", "p3", "p4", "p5"]);
    assert.ok(peak <= 2);
  });

  it("rejects when any clip fails", async () => {
    await assert.rejects(
      collectPhaseBPrompts([1, 2], async (n) => {
        if (n === 2) throw new Error("filtered");
        return { clipNumber: n, durationSeconds: 5, prompt: "ok" };
      }),
      /filtered/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/explainer-plan-phase-b.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```ts
// src/service/canvas/explainer-plan-phase-b.ts
// Phase B for every clip of a Canvas Explainer plan (same inputs as task-senders' clip video).

import type { PhaseBPrompt, Project } from "@/model/project";
import { withCurrentCharacterVoices } from "@/service/character/voice-cast";
import { loadStoredSkill } from "@/service/director/load-skill";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { resolveRunSkill } from "@/service/director/run-skill";
import { resolveSceneText } from "@/service/director/scene-text";
import { loadRenderableStyle } from "@/service/style/renderable-style";

export async function collectPhaseBPrompts(
  clipNumbers: number[],
  runClip: (clipNumber: number) => Promise<PhaseBPrompt>,
  concurrency = 3,
): Promise<PhaseBPrompt[]> {
  const results = new Map<number, PhaseBPrompt>();
  const queue = [...clipNumbers];
  const worker = async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      results.set(next, await runClip(next));
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, queue.length)) }, worker));
  return clipNumbers.map((n) => results.get(n)!);
}

export async function runCanvasPlanPhaseB(project: Project): Promise<PhaseBPrompt[]> {
  if (!project.phaseA) throw new Error("尚未有分鏡");
  const stored = await loadStoredSkill(project.skillId);
  if (!stored) throw new Error("找不到風格");
  const skill = await resolveRunSkill(stored);
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const cast = await withCurrentCharacterVoices(project.cast);
  const phaseA = project.phaseA;
  return collectPhaseBPrompts(
    phaseA.clips.map((clip) => clip.clipNumber),
    (clipNumber) =>
      runPhaseBForClip({
        skill,
        style,
        phaseA,
        clipNumber,
        language: project.language,
        narrationEnabled: project.narrationEnabled,
        voiceGender: project.voiceGender,
        speechPace: project.speechPace,
        characterImageUrl: project.characterImageUrl,
        cast,
        sceneTextOff: !resolveSceneText(project).enabled,
        directorBackgroundId: project.directorBackgroundId,
        backgroundImageUrls: project.backgroundImageUrls,
      }),
  );
}
```

In `src/service/clip/enqueue-scene-images.ts`, right after `if (!project?.phaseA) return;`:

```ts
  // Canvas planner videos draw frames only when a canvas frame node runs.
  if (project.canvasPlanOnly) return;
```

In `src/service/director/jobs.ts` `runPhaseAJob`:

1. Change `initialAutoVideoClips` so planner videos never auto-produce:

```ts
    const initialAutoVideoClips =
      !project.canvasPlanOnly &&
      !options?.clipsOnly &&
      nextPhaseA.clips.some((clip) => clip.clipNumber === 1)
        ? [1]
        : undefined;
```

2. Replace the block `// Frames wait until locks are ready; lock completion re-calls this.` `if (!options?.clipsOnly) { await enqueueSceneImagesForNewVideo(...) ... }` with:

```ts
    if (project.canvasPlanOnly) {
      // Canvas planner: store every clip's video prompt instead of drawing frames.
      const planned = await projects.findOne({ _id: projectId });
      const canvasPlan = planned
        ? await runCanvasPlanPhaseB(planned)
            .then((prompts) => ({ prompts }))
            .catch((error: unknown) => ({ prompts: [], error: errorMessage(error, "分鏡提示詞生成失敗") }))
        : { prompts: [], error: "找不到影片" };
      await projects.updateOne(
        { _id: projectId, "phaseALock.token": token },
        { $set: { canvasPlan, updatedAt: new Date() } },
      );
    } else if (!options?.clipsOnly) {
      // Frames wait until locks are ready; lock completion re-calls this.
      await enqueueSceneImagesForNewVideo(projectId).catch(async (error: unknown) => {
        console.error("[frames] auto enqueue failed", { projectId, error });
        const fresh = await projects.findOne({ _id: projectId });
        if (fresh?.autoProduceAllClips) {
          throw error;
        }
      });
    }
```

and add the import `import { runCanvasPlanPhaseB } from "@/service/canvas/explainer-plan-phase-b";`.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx tsx --test src/service/canvas/explainer-plan-phase-b.test.ts && npx tsx --test 'src/service/director/*.test.ts' && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/explainer-plan-phase-b.ts src/service/canvas/explainer-plan-phase-b.test.ts src/service/director/jobs.ts src/service/clip/enqueue-scene-images.ts
git commit -m "feat(director): plan-only Phase A stores Phase B prompts for canvas explainer"
```

---

### Task 4: `scro:explainer-frame` catalog entry + sidebar/agent hiding

**Files:**
- Modify: `src/service/canvas/model-catalog.ts` (`CanvasModelSpec`, `SCRO_STATIC_MODELS`)
- Modify: `src/service/canvas/model-names.ts`
- Modify: `src/app/app/canvas/canvas-sidebar.tsx` (`availableModels` memo, ~line 115)
- Modify: `src/service/canvas-agent/tools.ts` (`list_models` output and `add_model_node` guard)
- Modify: `src/service/canvas/pricing.ts` (`scro:explainer-frame` → `IMAGE_COST_USD`)
- Test: `src/service/canvas/pricing.test.ts`, `src/service/canvas/model-catalog.test.ts`

**Interfaces:**
- Produces: `CanvasModelSpec.hiddenInSidebar?: boolean`; spec `{ id: "scro:explainer-frame", category: "scro-tool", inputs: [promptPort(true)], output: imageOutput(), basePriceUsd: IMAGE_COST_USD, hiddenInSidebar: true, supportsAspectRatio: false }`.

- [ ] **Step 1: Write failing tests**

Append to `src/service/canvas/pricing.test.ts` inside the existing Scro `describe`:

```ts
  it("prices scro:explainer-frame at one image ($0.15)", () => {
    const frame = findCanvasModel("scro:explainer-frame");
    assert.ok(frame);
    assert.equal(frame.hiddenInSidebar, true);
    assert.equal(estimateCanvasModelCostUsd(frame), 0.15);
  });
```

(`findCanvasModel` is already imported in that file; if not, add `import { findCanvasModel } from "@/service/canvas/model-catalog";`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/service/canvas/pricing.test.ts`
Expected: FAIL — `frame` is undefined.

- [ ] **Step 3: Implement**

`CanvasModelSpec` gains:

```ts
  // Created only by other features (e.g. Explainer expansion); not listed in the sidebar or agent catalog.
  hiddenInSidebar?: boolean;
```

Add to `SCRO_STATIC_MODELS` after `scro:explainer`:

```ts
  {
    id: "scro:explainer-frame",
    provider: "scro",
    providerModelId: "explainer-frame",
    name: "Explainer Frame",
    category: "scro-tool",
    inputs: [promptPort(true)],
    output: imageOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: IMAGE_COST_USD,
    supportsAspectRatio: false,
    hiddenInSidebar: true,
    available: true,
  },
```

`pricing.ts` switch: change `case "scro:life": case "scro:poster":` to also include `case "scro:explainer-frame":`.

`model-names.ts` `CANVAS_MODEL_LOCAL_NAMES`:

```ts
  "scro:explainer-frame": {
    "zh-Hant": "Explainer 分鏡靜幀",
    "zh-Hans": "Explainer 分镜静帧",
    ja: "Explainer 絵コンテ静止画",
    ko: "Explainer 스토리보드 스틸",
  },
```

`canvas-sidebar.tsx` `availableModels` filter:

```ts
      .filter((spec) => !spec.hiddenInSidebar)
      .filter((spec) => spec.provider !== "mentalok" || !openRouterCategories.has(spec.category))
```

`canvas-agent/tools.ts`: wherever `list_models` maps the catalog, filter `!spec.hiddenInSidebar`; in `add_model_node` right after the spec lookup:

```ts
    if (spec.hiddenInSidebar) {
      return { error: `${spec.id} is created by Explainer planning; add scro:explainer instead.` };
    }
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/service/canvas/pricing.test.ts src/service/canvas/model-catalog.test.ts 'src/service/canvas-agent/*.test.ts'`
Expected: PASS. If `model-catalog.test.ts` asserts an exact Scro tool count, update that expected count by +1 and the id list to include `scro:explainer-frame`.

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/model-catalog.ts src/service/canvas/model-names.ts src/service/canvas/pricing.ts src/service/canvas/pricing.test.ts src/service/canvas/model-catalog.test.ts src/app/app/canvas/canvas-sidebar.tsx src/service/canvas-agent/tools.ts
git commit -m "feat(canvas): hidden scro:explainer-frame node spec at \$0.15"
```

---

### Task 5: Frame node submit + poll through the backing video

**Files:**
- Create: `src/service/canvas/explainer-frame.ts`
- Create: `src/service/canvas/explainer-frame.test.ts`
- Modify: `src/service/canvas/scro-dispatch.ts` (`submitScroAsyncNode`, `pollScroAsyncJob`, return types)
- Modify: `src/service/canvas/executor.ts` (poll branch ~line 1464)

**Interfaces:**
- Produces:
  ```ts
  export type ExplainerFrameDeps = {
    findVideo: (videoId: ObjectId, clerkUserId: string) => Promise<Project | null>;
    stillBlocker: (project: Project) => Promise<string | null>;
    storeStartPrompt: (videoId: ObjectId, clipNumber: number, prompt: string, hasFrame: boolean) => Promise<void>;
    regenerateStart: (project: Project, clipNumber: number) => Promise<void>;
  };
  export async function submitExplainerFrame(params: { clerkUserId: string; node: CanvasNode; prompt: string }, deps?: Partial<ExplainerFrameDeps>): Promise<{ domainKind: "explainer_frame"; externalJobId: string }>;
  export function explainerFrameJobId(videoId: string, clipNumber: number): string; // `${videoId}:${clipNumber}`
  export async function pollExplainerFrame(params: { clerkUserId: string; externalJobId: string }, deps?: Partial<Pick<ExplainerFrameDeps, "findVideo">>): Promise<{ status: "running" } | { status: "completed"; outputUrl: string } | { status: "failed"; error: string }>;
  ```
- `submitScroAsyncNode` / `pollScroAsyncJob` `domainKind` unions add `"explainer_frame"`.

- [ ] **Step 1: Write the failing test**

```ts
// src/service/canvas/explainer-frame.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { pollExplainerFrame, submitExplainerFrame } from "@/service/canvas/explainer-frame";

const videoId = new ObjectId();
const node: CanvasNode = {
  id: "f1",
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId: "scro:explainer-frame", prompt: "edited", toolParams: { plannerVideoId: videoId.toHexString(), clipNumber: 2 } },
};
const video = (frames: Project["frames"] = []) =>
  ({ _id: videoId, clerkUserId: "u1", status: "production", phaseA: { clips: [{ clipNumber: 2 }] }, frames }) as unknown as Project;

describe("submitExplainerFrame", () => {
  it("stores the edited prompt then regenerates the start frame", async () => {
    const calls: string[] = [];
    const res = await submitExplainerFrame(
      { clerkUserId: "u1", node, prompt: "edited" },
      {
        findVideo: async (id, uid) => (id.equals(videoId) && uid === "u1" ? video() : null),
        stillBlocker: async () => null,
        storeStartPrompt: async (_id, clip, prompt, hasFrame) => {
          calls.push(`store:${clip}:${prompt}:${hasFrame}`);
        },
        regenerateStart: async (_p, clip) => {
          calls.push(`regen:${clip}`);
        },
      },
    );
    assert.deepEqual(calls, ["store:2:edited:false", "regen:2"]);
    assert.deepEqual(res, { domainKind: "explainer_frame", externalJobId: `${videoId.toHexString()}:2` });
  });

  it("refuses another user's video and blocked locks", async () => {
    await assert.rejects(
      submitExplainerFrame({ clerkUserId: "u2", node, prompt: "x" }, { findVideo: async () => null }),
      /找不到/,
    );
    await assert.rejects(
      submitExplainerFrame(
        { clerkUserId: "u1", node, prompt: "x" },
        { findVideo: async () => video(), stillBlocker: async () => "角色定裝圖正在產生，請稍候再試" },
      ),
      /角色定裝圖/,
    );
  });
});

describe("pollExplainerFrame", () => {
  const jobId = `${videoId.toHexString()}:2`;
  it("maps the start frame status", async () => {
    const at = (status: string, extra: object = {}) =>
      pollExplainerFrame(
        { clerkUserId: "u1", externalJobId: jobId },
        { findVideo: async () => video([{ clipNumber: 2, position: "start", prompt: "p", status, ...extra } as never]) },
      );
    assert.deepEqual(await at("in_progress"), { status: "running" });
    assert.deepEqual(await at("completed", { blobUrl: "https://b/x.png" }), { status: "completed", outputUrl: "https://b/x.png" });
    assert.deepEqual(await at("failed", { error: "nsfw" }), { status: "failed", error: "nsfw" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/service/canvas/explainer-frame.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/service/canvas/explainer-frame.ts
// Canvas Explainer Frame node: draws one start still through the backing video's frame pipeline.

import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import type { CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { regenerateFrame, stillBlocker } from "@/service/higgsfield/pipeline";

export type ExplainerFrameDeps = {
  findVideo: (videoId: ObjectId, clerkUserId: string) => Promise<Project | null>;
  stillBlocker: (project: Project) => Promise<string | null>;
  storeStartPrompt: (videoId: ObjectId, clipNumber: number, prompt: string, hasFrame: boolean) => Promise<void>;
  regenerateStart: (project: Project, clipNumber: number) => Promise<void>;
};

const defaultDeps: ExplainerFrameDeps = {
  findVideo: async (videoId, clerkUserId) =>
    (await videosCollection()).findOne({ _id: videoId, clerkUserId }),
  stillBlocker,
  storeStartPrompt: async (videoId, clipNumber, prompt, hasFrame) => {
    const videos = await videosCollection();
    if (hasFrame) {
      await videos.updateOne(
        { _id: videoId },
        { $set: { "frames.$[f].prompt": prompt, "frames.$[f].promptEdited": true, updatedAt: new Date() } },
        { arrayFilters: [{ "f.clipNumber": clipNumber, "f.position": "start" }] },
      );
      return;
    }
    // Idle placeholder; regenerateFrame flips it to queued with this stored prompt.
    await videos.updateOne(
      { _id: videoId },
      {
        $push: { frames: { clipNumber, position: "start", prompt, status: "failed", promptEdited: true } },
        $set: { updatedAt: new Date() },
      },
    );
  },
  regenerateStart: (project, clipNumber) =>
    regenerateFrame(project, clipNumber, "start", undefined, { useStoredPrompt: true }),
};

export function explainerFrameJobId(videoId: string, clipNumber: number) {
  return `${videoId}:${clipNumber}`;
}

function parseJobId(externalJobId: string) {
  const [videoHex, clipRaw] = externalJobId.split(":");
  const clipNumber = Number(clipRaw);
  if (!videoHex || !ObjectId.isValid(videoHex) || !Number.isInteger(clipNumber)) return null;
  return { videoId: new ObjectId(videoHex), clipNumber };
}

export async function submitExplainerFrame(
  params: { clerkUserId: string; node: CanvasNode; prompt: string },
  deps?: Partial<ExplainerFrameDeps>,
): Promise<{ domainKind: "explainer_frame"; externalJobId: string }> {
  const resolved = { ...defaultDeps, ...deps };
  const videoHex = params.node.data.toolParams?.plannerVideoId;
  const clipNumber = params.node.data.toolParams?.clipNumber;
  if (typeof videoHex !== "string" || !ObjectId.isValid(videoHex) || typeof clipNumber !== "number") {
    throw new Error("這個分鏡靜幀缺少規劃資料，請重新規劃分鏡");
  }
  const videoId = new ObjectId(videoHex);
  const project = await resolved.findVideo(videoId, params.clerkUserId);
  if (!project?.phaseA) throw new Error("找不到這個解說的分鏡，請重新規劃");
  if (!project.phaseA.clips.some((clip) => clip.clipNumber === clipNumber)) {
    throw new Error("找不到這段分鏡，請重新規劃");
  }
  const blocker = await resolved.stillBlocker(project);
  if (blocker) throw new Error(blocker);
  const hasFrame = (project.frames || []).some(
    (frame) => frame.clipNumber === clipNumber && frame.position === "start",
  );
  await resolved.storeStartPrompt(videoId, clipNumber, params.prompt, hasFrame);
  const fresh = await resolved.findVideo(videoId, params.clerkUserId);
  if (!fresh) throw new Error("找不到這個解說的分鏡，請重新規劃");
  await resolved.regenerateStart(fresh, clipNumber);
  return { domainKind: "explainer_frame", externalJobId: explainerFrameJobId(videoHex, clipNumber) };
}

export async function pollExplainerFrame(
  params: { clerkUserId: string; externalJobId: string },
  deps?: Partial<Pick<ExplainerFrameDeps, "findVideo">>,
): Promise<{ status: "running" } | { status: "completed"; outputUrl: string } | { status: "failed"; error: string }> {
  const findVideo = deps?.findVideo ?? defaultDeps.findVideo;
  const parsed = parseJobId(params.externalJobId);
  if (!parsed) return { status: "failed", error: "無效的分鏡靜幀任務" };
  const project = await findVideo(parsed.videoId, params.clerkUserId);
  if (!project) return { status: "failed", error: "找不到這個解說的分鏡" };
  const frame = (project.frames || []).find(
    (f) => f.clipNumber === parsed.clipNumber && f.position === "start",
  );
  if (!frame) return { status: "running" };
  const url = frame.blobUrl || frame.outputUrl;
  if (frame.status === "completed" && url) return { status: "completed", outputUrl: url };
  if (frame.status === "failed") return { status: "failed", error: frame.error || "分鏡靜幀生成失敗" };
  return { status: "running" };
}
```

In `scro-dispatch.ts`:
- import `{ pollExplainerFrame, submitExplainerFrame } from "@/service/canvas/explainer-frame"`.
- `submitScroAsyncNode` return type: `domainKind: "video" | "jutsu" | "teleport" | "explainer_frame"`. Before the `scro:swap` branch:

```ts
  if (modelId === "scro:explainer-frame") {
    const prompt = inputs.prompt?.trim();
    if (!prompt) throw new Error("分鏡靜幀需要提示詞");
    return submitExplainerFrame({ clerkUserId, node, prompt });
  }
```

- `pollScroAsyncJob` params `domainKind` union adds `"explainer_frame"`; first branch:

```ts
  if (params.domainKind === "explainer_frame") {
    return pollExplainerFrame({ clerkUserId: params.clerkUserId, externalJobId: params.externalJobId });
  }
```

In `executor.ts` poll branch (~line 1464), extend the allowed kinds and the cast:

```ts
      (job.domainKind !== "video" &&
        job.domainKind !== "jutsu" &&
        job.domainKind !== "teleport" &&
        job.domainKind !== "explainer_frame")
```
```ts
        domainKind: job.domainKind as "video" | "jutsu" | "teleport" | "explainer_frame",
```

Also update `ScroAsyncSubmitDeps`/`CanvasExecutorDeps` typing if `tsc` reports the narrower union.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx tsx --test src/service/canvas/explainer-frame.test.ts src/service/canvas/scro-dispatch.test.ts src/service/canvas/executor.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/explainer-frame.ts src/service/canvas/explainer-frame.test.ts src/service/canvas/scro-dispatch.ts src/service/canvas/executor.ts
git commit -m "feat(canvas): explainer frame node renders through backing video frame pipeline"
```

---

### Task 6: Planner exclusion (waves, executor, flow price)

**Files:**
- Modify: `src/service/canvas/graph.ts` (`computeExecutionWaves`, first loop)
- Modify: `src/service/canvas/executor.ts` (after `if (!spec) {...}` ~line 597)
- Test: `src/service/canvas/explainer-planner.test.ts`, `src/service/canvas/executor.test.ts`

**Interfaces:**
- Consumes: `isExplainerPlannerNode` (Task 1).

- [ ] **Step 1: Write failing tests**

Append to `explainer-planner.test.ts`:

```ts
import { computeExecutionWaves } from "@/service/canvas/graph";

describe("planner exclusion", () => {
  it("never schedules planner nodes in flow waves", () => {
    const nodes: CanvasNode[] = [
      node({ modelId: "scro:explainer", toolParams: { plannerMode: true } }),
      { id: "tts", type: "model", position: { x: 0, y: 0 }, data: { modelId: "scro:tts", prompt: "hi" } },
    ];
    assert.deepEqual(computeExecutionWaves(nodes, []), [["tts"]]);
  });
});
```

Append to `executor.test.ts` (reuse its `createHarness` like the existing explainer test):

```ts
  it("rejects running a planner node directly", async () => {
    const harness = createHarness({
      initialCreditUsd: 20,
      nodes: [
        {
          id: "exp",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "scro:explainer", prompt: "Explain inflation", toolParams: { plannerMode: true } },
        },
      ],
    });
    const res = await submitCanvasNodeJob(
      { clerkUserId: "user_1", canvasId: harness.project._id.toHexString(), nodeId: "exp" },
      harness.deps,
    );
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.code, "INVALID_INPUTS");
    assert.equal(harness.wallet.creditUsd, 20);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/service/canvas/explainer-planner.test.ts src/service/canvas/executor.test.ts`
Expected: FAIL (planner appears in waves; planner node is charged).

- [ ] **Step 3: Implement**

`graph.ts` (import `isExplainerPlannerNode` from `@/service/canvas/explainer-planner`):

```ts
  for (const node of nodes) {
    // Planner nodes only plan; their expanded nodes do the work.
    if (node.type === "model" && !isExplainerPlannerNode(node)) {
```

`executor.ts` right after the `if (!spec) { ... }` block:

```ts
  if (isExplainerPlannerNode(node)) {
    return {
      ok: false,
      code: "INVALID_INPUTS",
      error: "請按「規劃分鏡」，再執行展開後的節點",
    };
  }
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/service/canvas/explainer-planner.test.ts src/service/canvas/executor.test.ts src/service/canvas/graph.test.ts`
Expected: PASS (legacy 60s explainer still bills $7.35).

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/graph.ts src/service/canvas/executor.ts src/service/canvas/explainer-planner.test.ts src/service/canvas/executor.test.ts
git commit -m "feat(canvas): planner nodes never run or bill directly"
```

---

### Task 7: Plan service + Server Actions

**Files:**
- Modify: `src/service/canvas/scro-dispatch.ts` (extract `createCanvasDirectorVideo` from the `scro:talking-head || scro:explainer` branch)
- Create: `src/service/canvas/explainer-plan.ts`
- Create: `src/service/canvas/explainer-plan.test.ts`
- Create: `src/presentation/actions/canvas-explainer.ts`

**Interfaces:**
- Produces in `scro-dispatch.ts`:
  ```ts
  export async function createCanvasDirectorVideo(params: { clerkUserId: string; modelId: "scro:talking-head" | "scro:explainer"; node: CanvasNode; inputs: ResolvedCanvasInputs; planOnly?: boolean }): Promise<ObjectId>;
  ```
- Produces in `explainer-plan.ts`:
  ```ts
  export type CanvasExplainerPlanState =
    | { status: "planning" }
    | { status: "failed"; error: string }
    | { status: "ready"; nodes: CanvasNode[]; edges: CanvasEdge[]; expandedNodeIds: string[]; summary: string };
  export async function startCanvasExplainerPlan(params: { clerkUserId: string; canvasId: string; nodeId: string }): Promise<{ ok: true; plannerVideoId: string } | { ok: false; error: string }>;
  export function planStateFromVideo(params: { video: Project | null; blocker: string | null; plannerNode: CanvasNode; buildFramePrompt: (project: Project, clipNumber: number) => string; idPrefix: string }): CanvasExplainerPlanState;
  export async function readCanvasExplainerPlan(params: { clerkUserId: string; canvasId: string; nodeId: string }): Promise<CanvasExplainerPlanState>;
  ```
- Server Actions: `startCanvasExplainerPlanAction(input: { canvasId: string; nodeId: string; nodes?: CanvasNode[]; edges?: CanvasEdge[]; viewport?: CanvasViewport })`, `getCanvasExplainerPlanAction(input: { canvasId: string; nodeId: string })`.

- [ ] **Step 1: Write the failing test (pure state mapping)**

```ts
// src/service/canvas/explainer-plan.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { planStateFromVideo } from "@/service/canvas/explainer-plan";

const planner: CanvasNode = {
  id: "exp",
  type: "model",
  position: { x: 10, y: 20 },
  data: {
    modelId: "scro:explainer",
    aspectRatio: "9:16",
    toolParams: { plannerMode: true, language: "yue", characterId: "c1" },
  },
};
const videoId = new ObjectId();
const video = (extra: Partial<Project>) =>
  ({
    _id: videoId,
    status: "production",
    language: "yue",
    voiceGender: "male",
    phaseA: {
      localizedTitle: "復利",
      clips: [
        { clipNumber: 1, englishVo: "第一句", durationSeconds: 6 },
        { clipNumber: 2, englishVo: "第二句", durationSeconds: 7 },
      ],
    },
    ...extra,
  }) as unknown as Project;
const args = (v: Project | null, blocker: string | null = null) => ({
  video: v,
  blocker,
  plannerNode: planner,
  buildFramePrompt: (_p: Project, n: number) => `frame ${n}`,
  idPrefix: "p",
});

describe("planStateFromVideo", () => {
  it("is planning until Phase B prompts exist and locks are ready", () => {
    assert.deepEqual(planStateFromVideo(args(video({ status: "phase_a" }))), { status: "planning" });
    assert.deepEqual(planStateFromVideo(args(video({}))), { status: "planning" });
    const withPrompts = video({ canvasPlan: { prompts: [{ clipNumber: 1, durationSeconds: 6, prompt: "v1" }, { clipNumber: 2, durationSeconds: 7, prompt: "v2" }] } });
    assert.deepEqual(planStateFromVideo(args(withPrompts, "角色定裝圖正在產生")), { status: "planning" });
  });

  it("reports failures", () => {
    assert.equal(planStateFromVideo(args(null)).status, "failed");
    assert.deepEqual(planStateFromVideo(args(video({ status: "failed", error: "boom" }))), { status: "failed", error: "boom" });
    assert.deepEqual(planStateFromVideo(args(video({ canvasPlan: { prompts: [], error: "filtered" } }))), { status: "failed", error: "filtered" });
  });

  it("returns the expansion when ready", () => {
    const ready = planStateFromVideo(
      args(video({ canvasPlan: { prompts: [{ clipNumber: 1, durationSeconds: 6, prompt: "v1" }, { clipNumber: 2, durationSeconds: 7, prompt: "v2" }] } })),
    );
    assert.equal(ready.status, "ready");
    if (ready.status !== "ready") return;
    const tts = ready.nodes.filter((n) => n.data.modelId === "scro:tts");
    assert.deepEqual(tts.map((n) => n.data.toolParams?.voicePreset), ["alan", "alan"]);
    assert.equal(tts[0]!.data.toolParams?.characterId, "c1");
    assert.match(ready.summary, /復利/);
    assert.match(ready.summary, /1\. 第一句/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/service/canvas/explainer-plan.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`scro-dispatch.ts`: move the body of the `if (modelId === "scro:talking-head" || modelId === "scro:explainer") { ... }` branch — from `const users = await usersCollection();` through the `videos.insertOne({...})` call — into:

```ts
export async function createCanvasDirectorVideo(params: {
  clerkUserId: string;
  modelId: "scro:talking-head" | "scro:explainer";
  node: CanvasNode;
  inputs: ResolvedCanvasInputs;
  // Canvas Explainer planner: storyboard + prompts only, frames wait for frame nodes.
  planOnly?: boolean;
}): Promise<ObjectId> {
  const { clerkUserId, modelId, node, inputs } = params;
  // …moved body unchanged, except the last three fields of the inserted doc become:
  //   skipBilling: true,
  //   autoProduceAllClips: !params.planOnly,
  //   ...(params.planOnly ? { canvasPlanOnly: true } : {}),
  return insert.insertedId;
}
```

and the original branch becomes:

```ts
  if (modelId === "scro:talking-head" || modelId === "scro:explainer") {
    const videoId = await createCanvasDirectorVideo({ clerkUserId, modelId, node, inputs });
    schedulePhaseAWorkerTask(videoId);
    return { domainKind: "video", externalJobId: videoId.toHexString() };
  }
```

`explainer-plan.ts`:

```ts
// Canvas Explainer planner: start the free plan and read it back as expandable nodes.

import { ObjectId } from "mongodb";
import { canvasProjectsCollection, videosCollection } from "@/dao";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { Project } from "@/model/project";
import { buildExplainerExpansion, explainerVoicePreset } from "@/service/canvas/explainer-expand";
import { isExplainerPlannerNode, readPlannerParams } from "@/service/canvas/explainer-planner";
import { resolveNodeInputs } from "@/service/canvas/graph";
import { getCanvasModelCatalog } from "@/service/canvas/model-catalog";
import { createCanvasDirectorVideo } from "@/service/canvas/scro-dispatch";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { stillBlocker } from "@/service/higgsfield/pipeline";
import { schedulePhaseAWorkerTask } from "@/service/worker/schedule";

export type CanvasExplainerPlanState =
  | { status: "planning" }
  | { status: "failed"; error: string }
  | { status: "ready"; nodes: CanvasNode[]; edges: CanvasEdge[]; expandedNodeIds: string[]; summary: string };

async function loadPlanner(clerkUserId: string, canvasId: string, nodeId: string) {
  if (!ObjectId.isValid(canvasId)) return null;
  const canvas = await (await canvasProjectsCollection()).findOne({ _id: new ObjectId(canvasId), clerkUserId });
  const node = canvas?.nodes.find((n) => n.id === nodeId);
  return canvas && node && isExplainerPlannerNode(node) ? { canvas, node } : null;
}

export async function startCanvasExplainerPlan(params: {
  clerkUserId: string;
  canvasId: string;
  nodeId: string;
}): Promise<{ ok: true; plannerVideoId: string } | { ok: false; error: string }> {
  const loaded = await loadPlanner(params.clerkUserId, params.canvasId, params.nodeId);
  if (!loaded) return { ok: false, error: "找不到分鏡規劃節點" };
  const catalog = await getCanvasModelCatalog();
  const inputs = resolveNodeInputs(params.nodeId, loaded.canvas.nodes, loaded.canvas.edges, catalog);
  if (!inputs.inputs.prompt?.trim()) return { ok: false, error: "請先輸入或連接解說主題" };
  try {
    const videoId = await createCanvasDirectorVideo({
      clerkUserId: params.clerkUserId,
      modelId: "scro:explainer",
      node: loaded.node,
      inputs: inputs.inputs,
      planOnly: true,
    });
    const plannerVideoId = videoId.toHexString();
    await (await canvasProjectsCollection()).updateOne(
      { _id: loaded.canvas._id, clerkUserId: params.clerkUserId },
      {
        $set: {
          "nodes.$[n].data.toolParams.plannerVideoId": plannerVideoId,
          "nodes.$[n].data.toolParams.planStatus": "planning",
          updatedAt: new Date(),
        },
        $unset: { "nodes.$[n].data.toolParams.planError": "" },
      },
      { arrayFilters: [{ "n.id": params.nodeId }] },
    );
    schedulePhaseAWorkerTask(videoId);
    return { ok: true, plannerVideoId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "分鏡規劃失敗" };
  }
}

function plannerLanguage(raw: unknown): "yue" | "zh" | "en" {
  return raw === "zh" || raw === "en" ? raw : "yue";
}

export function planStateFromVideo(params: {
  video: Project | null;
  blocker: string | null;
  plannerNode: CanvasNode;
  buildFramePrompt: (project: Project, clipNumber: number) => string;
  idPrefix: string;
}): CanvasExplainerPlanState {
  const { video, plannerNode } = params;
  if (!video) return { status: "failed", error: "找不到這次的分鏡規劃" };
  if (video.status === "failed") return { status: "failed", error: video.error || "分鏡規劃失敗" };
  if (video.canvasPlan?.error) return { status: "failed", error: video.canvasPlan.error };
  const prompts = video.canvasPlan?.prompts ?? [];
  if (video.status !== "production" || !video.phaseA || prompts.length === 0 || params.blocker) {
    return { status: "planning" };
  }
  const toolParams = plannerNode.data.toolParams ?? {};
  const language = plannerLanguage(video.language ?? toolParams.language);
  const characterId = typeof toolParams.characterId === "string" && toolParams.characterId ? toolParams.characterId : undefined;
  const promptByClip = new Map(prompts.map((p) => [p.clipNumber, p]));
  const phaseA = video.phaseA;
  const expansion = buildExplainerExpansion({
    idPrefix: params.idPrefix,
    origin: plannerNode.position,
    plannerVideoId: video._id.toHexString(),
    aspectRatio: plannerNode.data.aspectRatio ?? "9:16",
    language,
    voicePreset: explainerVoicePreset(language, video.voiceGender === "male" ? "male" : "female"),
    characterId,
    clips: phaseA.clips.map((clip) => ({
      clipNumber: clip.clipNumber,
      framePrompt: params.buildFramePrompt(video, clip.clipNumber),
      videoPrompt: promptByClip.get(clip.clipNumber)?.prompt ?? "",
      durationSeconds: promptByClip.get(clip.clipNumber)?.durationSeconds ?? clip.durationSeconds,
      spokenLine: clip.englishVo ?? "",
    })),
  });
  const summary = [
    phaseA.localizedTitle || phaseA.englishTitle,
    ...phaseA.clips.map((clip) => `${clip.clipNumber}. ${clip.englishVo}`),
  ]
    .filter(Boolean)
    .join("\n");
  return { status: "ready", ...expansion, summary };
}

export async function readCanvasExplainerPlan(params: {
  clerkUserId: string;
  canvasId: string;
  nodeId: string;
}): Promise<CanvasExplainerPlanState> {
  const loaded = await loadPlanner(params.clerkUserId, params.canvasId, params.nodeId);
  if (!loaded) return { status: "failed", error: "找不到分鏡規劃節點" };
  const { plannerVideoId } = readPlannerParams(loaded.node);
  if (!plannerVideoId || !ObjectId.isValid(plannerVideoId)) {
    return { status: "failed", error: "尚未開始規劃" };
  }
  const video = await (await videosCollection()).findOne({
    _id: new ObjectId(plannerVideoId),
    clerkUserId: params.clerkUserId,
  });
  const ready = Boolean(video?.canvasPlan?.prompts?.length) && video?.status === "production";
  const blocker = video && ready ? await stillBlocker(video) : null;
  return planStateFromVideo({
    video,
    blocker,
    plannerNode: loaded.node,
    buildFramePrompt: (project, clipNumber) => buildFramePrompt(project, clipNumber, "start"),
    idPrefix: `exp-${plannerVideoId.slice(-6)}`,
  });
}
```

`src/presentation/actions/canvas-explainer.ts`:

```ts
"use server";

// Server Actions for the Canvas Explainer planner (free storyboard planning + expansion).

import type { CanvasEdge, CanvasNode, CanvasViewport } from "@/model/canvas";
import { requireAppUser } from "@/service/auth";
import {
  type CanvasExplainerPlanState,
  readCanvasExplainerPlan,
  startCanvasExplainerPlan,
} from "@/service/canvas/explainer-plan";
import { saveCanvasProject } from "@/service/canvas/projects";

export async function startCanvasExplainerPlanAction(input: {
  canvasId: string;
  nodeId: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
}): Promise<{ ok: true; plannerVideoId: string } | { ok: false; error: string }> {
  const user = await requireAppUser();
  // Save the latest graph first so the wired prompt and planner fields are current.
  if (input.nodes || input.edges || input.viewport) {
    const saved = await saveCanvasProject(user.clerkUserId, input.canvasId, {
      ...(input.nodes ? { nodes: input.nodes } : {}),
      ...(input.edges ? { edges: input.edges } : {}),
      ...(input.viewport ? { viewport: input.viewport } : {}),
    });
    if (!saved) return { ok: false, error: "找不到畫布專案" };
  }
  return startCanvasExplainerPlan({ clerkUserId: user.clerkUserId, canvasId: input.canvasId, nodeId: input.nodeId });
}

export async function getCanvasExplainerPlanAction(input: {
  canvasId: string;
  nodeId: string;
}): Promise<CanvasExplainerPlanState> {
  const user = await requireAppUser();
  return readCanvasExplainerPlan({ clerkUserId: user.clerkUserId, canvasId: input.canvasId, nodeId: input.nodeId });
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx tsx --test src/service/canvas/explainer-plan.test.ts src/service/canvas/scro-dispatch.test.ts src/service/canvas/executor.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/explainer-plan.ts src/service/canvas/explainer-plan.test.ts src/service/canvas/scro-dispatch.ts src/presentation/actions/canvas-explainer.ts
git commit -m "feat(canvas): start and read explainer plans via server actions"
```

---

### Task 8: Planner UI, workspace wiring, templates, agent prompt

**Files:**
- Create: `src/app/app/canvas/nodes/explainer-planner-panel.tsx`
- Create: `src/app/app/canvas/nodes/explainer-replan-dialog.tsx`
- Modify: `src/app/app/canvas/nodes/port-colors.ts` (context type)
- Modify: `src/app/app/canvas/nodes/model-node-card.tsx`
- Modify: `src/app/app/canvas/canvas-workspace.tsx`
- Modify: `src/service/canvas/templates.ts` (explainer template `toolParams.plannerMode: true`)
- Modify: `src/service/canvas-agent/tools.ts` (`add_model_node` merges `plannerMode: true` for `scro:explainer`)
- Modify: `src/service/canvas-agent/prompt.ts` (line describing `scro:explainer`)

**Interfaces:**
- Consumes: `readPlannerParams`, `isExplainerPlannerNode` (Task 1); actions (Task 7).
- Produces on `CanvasNodeActionsContextValue`: `onPlanExplainer: (nodeId: string) => void`.

- [ ] **Step 1: Context + panel components**

`port-colors.ts` `CanvasNodeActionsContextValue` adds:

```ts
  onPlanExplainer: (nodeId: string) => void;
```

`explainer-replan-dialog.tsx` — before writing, open an existing confirmation dialog in `src/app/app/canvas/` (e.g. the project delete confirm in `canvas-topbar.tsx` or its dialog file) and copy its markup/classes. Contract:

```tsx
"use client";

// Confirms replacing the nodes a previous Explainer plan expanded.

type Props = {
  open: boolean;
  isZh: boolean;
  expandedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ExplainerReplanDialog({ open, isZh, expandedCount, onCancel, onConfirm }: Props) {
  if (!open) return null;
  return (
    <div className="nodrag fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="w-[340px] rounded-[16px] border border-[#252c3b] bg-[#12161f] p-4 text-white shadow-[0_18px_42px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[13px] font-bold">{isZh ? "重新規劃分鏡？" : "Re-plan storyboard?"}</div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-white/70">
          {isZh
            ? `上次展開的 ${expandedCount} 個節點會被刪除，再換成新的分鏡。你自己加的節點不會受影響。`
            : `The ${expandedCount} nodes from the last plan will be removed and replaced. Nodes you added stay.`}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-[10px] px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/8">
            {isZh ? "取消" : "Cancel"}
          </button>
          <button type="button" onClick={onConfirm} className="cursor-pointer rounded-[10px] bg-[#c6f24b] px-3 py-1.5 text-[12px] font-bold text-[#11141b]">
            {isZh ? "重新規劃" : "Re-plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

`explainer-planner-panel.tsx`:

```tsx
"use client";

// Explainer planner controls: free plan button, planning state, script summary, re-plan.

import { useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { readPlannerParams } from "@/service/canvas/explainer-planner";
import { ExplainerReplanDialog } from "@/app/app/canvas/nodes/explainer-replan-dialog";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  disabled: boolean;
  missingLabels: string[];
  liveExpandedCount: number;
  onPlan: () => void;
};

export function ExplainerPlannerPanel({ data, isZh, disabled, missingLabels, liveExpandedCount, onPlan }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { planStatus, planError, planSummary } = readPlannerParams({ data });
  const planning = planStatus === "planning";
  const canPlan = !disabled && !planning && missingLabels.length === 0;

  const handleClick = () => {
    if (liveExpandedCount > 0) setConfirmOpen(true);
    else onPlan();
  };

  return (
    <div className="space-y-2">
      {planStatus === "failed" && planError ? (
        <div className="flex items-start gap-1.5 rounded-[10px] border border-rose-500/35 bg-rose-500/10 p-2 text-[11px] text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
          <span className="line-clamp-3">{planError}</span>
        </div>
      ) : null}

      {planSummary ? (
        <pre className="nodrag nowheel max-h-[140px] overflow-y-auto whitespace-pre-wrap rounded-[10px] border border-white/8 bg-[#0b0e14]/80 p-2 font-sans text-[10.5px] leading-relaxed text-white/75">
          {planSummary}
        </pre>
      ) : null}

      <button
        type="button"
        disabled={!canPlan}
        onClick={handleClick}
        title={missingLabels.length > 0 ? `${isZh ? "缺少必要輸入：" : "Missing required: "}${missingLabels.join(", ")}` : undefined}
        className={`nodrag flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-bold transition ${
          canPlan
            ? "bg-[#c6f24b] text-[#11141b] shadow-[0_6px_18px_rgba(198,242,75,0.2)] hover:brightness-105"
            : "cursor-not-allowed bg-white/8 text-white/40"
        }`}
      >
        {planning ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{isZh ? "規劃中…" : "Planning…"}</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {liveExpandedCount > 0
                ? isZh ? "重新規劃（免費）" : "Re-plan (free)"
                : isZh ? "規劃分鏡（免費）" : "Plan storyboard (free)"}
            </span>
          </>
        )}
      </button>

      <ExplainerReplanDialog
        open={confirmOpen}
        isZh={isZh}
        expandedCount={liveExpandedCount}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onPlan();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Model node card uses the panel for planners**

In `model-node-card.tsx`:
- import `isExplainerPlannerNode`, `readPlannerParams` from `@/service/canvas/explainer-planner` and `ExplainerPlannerPanel`.
- destructure `onPlanExplainer` and a new context value `liveNodeIds` (see Step 3) from `useCanvasNodeActions()`.
- compute:

```tsx
  const isPlanner = isExplainerPlannerNode({ type: "model", data });
  const liveExpandedCount = isPlanner
    ? readPlannerParams({ data }).expandedNodeIds.filter((nid) => liveNodeIds.has(nid)).length
    : 0;
```

- replace the `{/* Single-node Run CTA */}` `<button>` with:

```tsx
        {isPlanner ? (
          <ExplainerPlannerPanel
            data={data}
            isZh={isZh}
            disabled={isFlowRunning}
            missingLabels={missingRequiredLabels}
            liveExpandedCount={liveExpandedCount}
            onPlan={() => onPlanExplainer(id)}
          />
        ) : (
          /* existing Run button unchanged */
        )}
```

- [ ] **Step 3: Workspace wiring**

In `canvas-workspace.tsx` (stage only these hunks with `git add -p`):

1. Imports: `startCanvasExplainerPlanAction`, `getCanvasExplainerPlanAction` from `@/presentation/actions/canvas-explainer`; `isExplainerPlannerNode`, `readPlannerParams` from `@/service/canvas/explainer-planner`.

2. `addModelNodeAt`: new Explainer drops become planners and default to 9:16:

```ts
          aspectRatio: spec.supportsAspectRatio ? (spec.id === "scro:explainer" ? "9:16" : "16:9") : undefined,
          ...
          ...(spec.id === "scro:explainer" ? { toolParams: { plannerMode: true, durationPreset: "30s" } } : {}),
```

3. Plan handler (after `onRunNode`):

```ts
  // Free Explainer planning: drop the previous expansion, then queue Phase A on the worker.
  const onPlanExplainer = useCallback(
    async (nodeId: string) => {
      const planner = nodesRef.current.find((n) => n.id === nodeId);
      if (!planner) return;
      const stale = new Set(readPlannerParams(planner).expandedNodeIds);
      const nextNodes = nodesRef.current
        .filter((n) => !stale.has(n.id))
        .map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  toolParams: { ...n.data.toolParams, planStatus: "planning", expandedNodeIds: [], planError: undefined, planSummary: undefined },
                },
              }
            : n,
        );
      const nextEdges = edgesRef.current.filter((e) => !stale.has(e.source) && !stale.has(e.target));
      setNodes(nextNodes);
      setEdges(nextEdges);
      const res = await startCanvasExplainerPlanAction({
        canvasId: activeProjectIdRef.current,
        nodeId,
        nodes: toDomainNodes(nextNodes),
        edges: toDomainEdges(nextEdges),
        viewport: viewportRef.current,
      });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  toolParams: res.ok
                    ? { ...n.data.toolParams, plannerVideoId: res.plannerVideoId, planStatus: "planning" }
                    : { ...n.data.toolParams, planStatus: "failed", planError: res.error },
                },
              }
            : n,
        ),
      );
      if (!res.ok) toast.error(res.error);
      scheduleAutosave();
    },
    [setNodes, setEdges, scheduleAutosave],
  );
```

4. Plan polling (next to the job polling effect):

```ts
  const planningNodeIdsKey = useMemo(
    () =>
      nodes
        .filter((n) => isExplainerPlannerNode(toDomainNodes([n])[0]!) && readPlannerParams(n).planStatus === "planning" && readPlannerParams(n).plannerVideoId)
        .map((n) => n.id)
        .join(","),
    [nodes],
  );

  useEffect(() => {
    if (!planningNodeIdsKey) return;
    const ids = planningNodeIdsKey.split(",");
    let alive = true;
    const timer = window.setInterval(async () => {
      for (const nodeId of ids) {
        try {
          const state = await getCanvasExplainerPlanAction({ canvasId: activeProjectIdRef.current, nodeId });
          if (!alive || state.status === "planning") continue;
          if (state.status === "failed") {
            onUpdateNodeData(nodeId, {
              toolParams: { ...nodesRef.current.find((n) => n.id === nodeId)?.data.toolParams, planStatus: "failed", planError: state.error },
            });
            continue;
          }
          setNodes((prev) => [
            ...prev.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      toolParams: { ...n.data.toolParams, planStatus: "expanded", expandedNodeIds: state.expandedNodeIds, planSummary: state.summary },
                    },
                  }
                : n,
            ),
            ...toFlowNodes(state.nodes),
          ]);
          setEdges((prev) => [
            ...prev,
            ...toFlowEdges(state.edges, [...toDomainNodes(nodesRef.current), ...state.nodes], models),
          ]);
          scheduleAutosave();
          window.setTimeout(() => void reactFlow.fitView({ padding: 0.2, duration: 300 }), 60);
        } catch {
          // Keep polling on transient network errors.
        }
      }
    }, JOB_POLL_INTERVAL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [planningNodeIdsKey, models, onUpdateNodeData, setNodes, setEdges, scheduleAutosave, reactFlow]);
```

(If `toDomainNodes([n])` is awkward for a single flow node, call `isExplainerPlannerNode({ type: "model", data: n.data })` when `n.type === "model"`.)

5. Flow price memo: inside the loop add `if (isExplainerPlannerNode({ type: "model", data: node.data })) continue;` before `count += 1`.

6. `nodeContextValue`: add `onPlanExplainer` and `liveNodeIds: new Set(nodes.map((n) => n.id))` (memoized on `nodes`); add both to `CanvasNodeActionsContextValue` (`liveNodeIds: ReadonlySet<string>`) and the dependency array.

- [ ] **Step 4: Templates + agent**

`templates.ts` explainer template `toolParams`:

```ts
            toolParams: {
              plannerMode: true,
              skillSlug: "cartoon-explainer-video-director",
              language: "yue",
              durationPreset: "30s",
            },
```

`canvas-agent/tools.ts` `add_model_node` `addNode(...)` data:

```ts
      ...(spec.id === "scro:explainer"
        ? { toolParams: { ...(input.toolParams ?? {}), plannerMode: true } }
        : input.toolParams
          ? { toolParams: input.toolParams }
          : {}),
```

`canvas-agent/prompt.ts` line for `scro:explainer`, append:

```
It is a free planner: after you add and wire it, tell the user to press 「規劃分鏡」. Planning expands it into per-clip Explainer Frame → MiniMax Hailuo 3 → Audio Mux ← TTS rows and an FFmpeg Concat; never add "scro:explainer-frame" yourself.
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npx eslint src/app/app/canvas/nodes/explainer-planner-panel.tsx src/app/app/canvas/nodes/explainer-replan-dialog.tsx src/app/app/canvas/nodes/model-node-card.tsx src/app/app/canvas/nodes/port-colors.ts src/app/app/canvas/canvas-workspace.tsx src/service/canvas/templates.ts src/service/canvas-agent/tools.ts src/service/canvas-agent/prompt.ts && npx tsx --test 'src/service/canvas/*.test.ts' 'src/service/canvas-agent/*.test.ts'`
Expected: all pass.

Manual check with `npm run dev` (no paid runs): drag Explainer → card shows `規劃分鏡（免費）` and no USD price; top bar flow price excludes it; template "AI Explainer Video" also shows the planner. Do NOT press Run on frame/video nodes during development.

- [ ] **Step 6: Commit**

```bash
git add src/app/app/canvas/nodes/explainer-planner-panel.tsx src/app/app/canvas/nodes/explainer-replan-dialog.tsx src/app/app/canvas/nodes/model-node-card.tsx src/app/app/canvas/nodes/port-colors.ts src/service/canvas/templates.ts src/service/canvas-agent/tools.ts src/service/canvas-agent/prompt.ts
git add -p src/app/app/canvas/canvas-workspace.tsx
git commit -m "feat(canvas): explainer planner UI expands storyboard into per-clip nodes"
```

---

### Task 9: Docs sync

**Files:**
- Modify: `pipeline-models.md` (line ~50, `/app/canvas` row: the `scro:explainer` item)
- Modify: `AGENTS.md` (Interactive Node Canvas bullet)

- [ ] **Step 1: Update `pipeline-models.md`**

Replace `` `scro:explainer`（自動全剪輯成片，依片長估算預扣） `` with:

```
`scro:explainer`（免費分鏡規劃節點：背景 worker 跑 Phase A + 每段 Phase B（`gemini-3.8-flash`），只鎖角色定裝圖與道具／場景參考，不畫靜幀；完成後展開成每段「`scro:explainer-frame`（`$0.15`，走該解說影片原本的畫格流程：白板／剪紙／紙模型用 Nano Banana 2.1，其他用 Seedream 5.0 Pro）→ OpenRouter `minimax/hailuo-3`（只用起始幀，`$0.10/s`，5–15s）→ `ffmpeg:audio-mux` ← `scro:tts`（ElevenLabs `eleven_v4`，`ttsSpeed 1.25`）」，再接 `ffmpeg:concat`（超過 8 段會串接）。規劃節點本身不執行、不計入 Run Flow 價錢；舊畫布的一鍵 `scro:explainer` 節點仍按「每段靜幀 $0.15 + $0.10/s」整筆預扣）
```

- [ ] **Step 2: Update `AGENTS.md`**

In the **Interactive Node Canvas** bullet, after the sentence listing the 7 Scro Tool nodes, add:

```
Dropping `scro:explainer` creates a free planner (`toolParams.plannerMode`): the worker runs Phase A plus every clip's Phase B on a `canvasPlanOnly` backing video (still and prop/set locks only, no frames), then the client expands it into per-clip `scro:explainer-frame` ($0.15, drawn through that video's frame pipeline) → `minimax/hailuo-3` → `ffmpeg:audio-mux` ← `scro:tts` (1.25x) rows and an `ffmpeg:concat` chain (`src/service/canvas/explainer-plan.ts`, `explainer-expand.ts`). Planner nodes never run or bill; legacy one-click explainer nodes still do.
```

- [ ] **Step 3: Commit**

```bash
git add pipeline-models.md AGENTS.md
git commit -m "docs: canvas explainer planner and expanded per-clip pipeline"
```

---

## Final verification

- [ ] `npx tsx --test 'src/service/**/*.test.ts'` — all pass.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npx eslint` on every touched file — clean.
- [ ] `git status` shows only the user's original uncommitted hunks left unstaged.
