# Canvas Talking Head Director Persistent Node Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Talking Head Director (`scro:talking-head`, `plannerMode: true`) on the canvas after planning and generation, exposing `opening-frame` and per-clip `clip-<n>-motion` / `clip-<n>-voice` text outputs wired to downstream nodes, with in-place Replan, `Setting` (`{{key}}`) support, and Canvas AI Assistant parity with Explainer Director.

**Architecture:** Add a dedicated pure domain module `src/service/canvas/talking-head-director.ts` alongside `explainer-director.ts`, unify shared persistent-director operations behind a thin pure dispatcher `src/service/canvas/director-node.ts`, wire graph/stale/settings/plan/workspace/agent consumers through that dispatcher, and sync non-prompt Talking Head group settings on same-count Replan.

**Tech Stack:** TypeScript, Next.js App Router, React Flow (`@xyflow/react`), Node built-in test runner (`node:test` + `tsx`), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-11-25-canvas-talking-head-director-node-design.md`

## Global Constraints

- Never call live paid providers or Higgsfield APIs during tests or development (`npx tsx --test` uses pure unit tests only).
- Do not modify or revert pre-existing uncommitted user changes in the working tree.
- Always run `npx tsc --noEmit`, targeted `npx eslint`, and `npx tsx --test` on modified/new test files before committing.
- Keep `AGENTS.md` and `pipeline-models.md` in sync with the persistent Talking Head Director behavior.
- Output handles for Talking Head Director are strictly: `opening-frame`, `clip-<n>-motion`, `clip-<n>-voice` (all `text` port type).

---

### Task 1: Talking Head Director domain module & same-count group sync

**Files:**
- Create: `src/service/canvas/talking-head-director.ts`
- Create: `src/service/canvas/talking-head-director.test.ts`

**Interfaces:**
- Consumes: `TALKING_HEAD_PLANNER_MODEL_ID` from `@/service/canvas/explainer-planner`; `CanvasAspectRatio`, `CanvasEdge`, `CanvasGroup`, `CanvasNode` from `@/model/canvas`.
- Produces (exported from `src/service/canvas/talking-head-director.ts`):
  - `TALKING_HEAD_OPENING_FRAME_HANDLE = "opening-frame"`
  - `TalkingHeadClipOutputKind = "motion" | "voice"`
  - `TalkingHeadDirectorParams`, `TalkingHeadDirectorClip`, `TalkingHeadDirectorPlan`
  - `isTalkingHeadDirectorNode(node): boolean`
  - `talkingHeadDirectorParams(node): TalkingHeadDirectorParams`
  - `readTalkingHeadPlan(node): TalkingHeadDirectorPlan | undefined`
  - `talkingHeadClipHandleId(clipNumber: number, kind: TalkingHeadClipOutputKind): string`
  - `parseTalkingHeadHandle(handle: string | null | undefined): { kind: "opening-frame" } | { kind: TalkingHeadClipOutputKind; clipNumber: number } | undefined`
  - `talkingHeadHandles(plan: TalkingHeadDirectorPlan): string[]`
  - `talkingHeadNeedsReplan(node): boolean`
  - `talkingHeadRawOutput(node, handle: string): string | undefined`
  - `talkingHeadChangedTargets(before, after, edges): string[]`
  - `talkingHeadGradeLook(framing: string): "talking-head-selfie" | "talking-head"`
  - `syncTalkingHeadGroupNodes<N, E>(graph, input): { nodes: N[]; edges: E[]; group: CanvasGroup; changedIds: string[] }`

- [ ] **Step 1: Write the failing test**

Create `src/service/canvas/talking-head-director.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import {
  isTalkingHeadDirectorNode,
  parseTalkingHeadHandle,
  readTalkingHeadPlan,
  syncTalkingHeadGroupNodes,
  TALKING_HEAD_OPENING_FRAME_HANDLE,
  talkingHeadChangedTargets,
  talkingHeadClipHandleId,
  talkingHeadDirectorParams,
  talkingHeadHandles,
  talkingHeadNeedsReplan,
  talkingHeadRawOutput,
  type TalkingHeadDirectorPlan,
} from "@/service/canvas/talking-head-director";

function director(toolParams: Record<string, unknown> = {}, prompt = "Hello camera"): CanvasNode {
  return {
    id: "th-dir",
    type: "model",
    position: { x: 0, y: 0 },
    data: {
      modelId: "scro:talking-head",
      prompt,
      aspectRatio: "9:16",
      toolParams: {
        plannerMode: true,
        characterId: "char-1",
        language: "yue",
        framing: "collarbone-close",
        ...toolParams,
      },
    },
  };
}

function makePlan(n: number, base: CanvasNode, extra: Partial<TalkingHeadDirectorPlan> = {}): TalkingHeadDirectorPlan {
  return {
    plannerVideoId: "vid-1",
    plannedWith: talkingHeadDirectorParams(base),
    framePrompt: "opening portrait",
    frameRefUrls: ["https://cdn/char1.png"],
    voicePreset: "alan",
    clips: Array.from({ length: n }, (_, i) => ({
      clipNumber: i + 1,
      spokenLine: `spoken ${i + 1}`,
      heygenPrompt: `motion ${i + 1}`,
      durationSeconds: 8,
    })),
    ...extra,
  };
}

describe("talking head director", () => {
  it("recognizes only planner-mode talking-head nodes", () => {
    assert.equal(isTalkingHeadDirectorNode(director()), true);
    assert.equal(isTalkingHeadDirectorNode(director({ plannerMode: false })), false);
    const explainer = { ...director(), data: { ...director().data, modelId: "scro:explainer" } };
    assert.equal(isTalkingHeadDirectorNode(explainer), false);
  });

  it("reads a valid plan and lists opening-frame plus two handles per clip", () => {
    const base = director();
    const node = director({ plan: makePlan(2, base) });
    assert.deepEqual(talkingHeadHandles(readTalkingHeadPlan(node)!), [
      TALKING_HEAD_OPENING_FRAME_HANDLE,
      "clip-1-motion",
      "clip-1-voice",
      "clip-2-motion",
      "clip-2-voice",
    ]);
    assert.equal(readTalkingHeadPlan(director({ plan: { clips: "bad" } })), undefined);
    assert.deepEqual(parseTalkingHeadHandle("opening-frame"), { kind: "opening-frame" });
    assert.deepEqual(parseTalkingHeadHandle("clip-3-motion"), { kind: "motion", clipNumber: 3 });
    assert.deepEqual(parseTalkingHeadHandle(talkingHeadClipHandleId(2, "voice")), { kind: "voice", clipNumber: 2 });
    assert.equal(parseTalkingHeadHandle("clip-1-frame"), undefined);
    assert.equal(parseTalkingHeadHandle("output"), undefined);
  });

  it("returns raw text for opening-frame and clip outputs", () => {
    const base = director();
    const node = director({ plan: makePlan(1, base) });
    assert.equal(talkingHeadRawOutput(node, "opening-frame"), "opening portrait");
    assert.equal(talkingHeadRawOutput(node, "clip-1-motion"), "motion 1");
    assert.equal(talkingHeadRawOutput(node, "clip-1-voice"), "spoken 1");
    assert.equal(talkingHeadRawOutput(node, "clip-9-voice"), undefined);
  });

  it("needs a replan whenever any card parameter differs from plannedWith", () => {
    const base = director();
    const planned = director({ plan: makePlan(1, base) });
    assert.equal(talkingHeadNeedsReplan(planned), false);
    assert.equal(talkingHeadNeedsReplan(director({ plan: makePlan(1, base), framing: "handheld-selfie" })), true);
    assert.equal(talkingHeadNeedsReplan(director({ plan: makePlan(1, base), language: "en" })), true);
    assert.equal(talkingHeadNeedsReplan(director({ plan: makePlan(1, base), characterId: "char-2" })), true);
    assert.equal(talkingHeadNeedsReplan({ ...planned, data: { ...planned.data, aspectRatio: "16:9" } }), true);
    assert.equal(talkingHeadNeedsReplan({ ...planned, data: { ...planned.data, prompt: "New script" } }), true);
    assert.equal(talkingHeadNeedsReplan(director()), false);
  });

  it("lists only wired targets whose output text changed between two plans", () => {
    const base = director();
    const before = director({ plan: makePlan(2, base) });
    const afterPlan = makePlan(2, base, { framePrompt: "new still" });
    afterPlan.clips[1]!.spokenLine = "updated spoken 2";
    const after = director({ plan: afterPlan });
    const edges: CanvasEdge[] = [
      { id: "e1", source: "th-dir", sourceHandle: "opening-frame", target: "frame-1", targetHandle: "prompt" },
      { id: "e2", source: "th-dir", sourceHandle: "clip-1-voice", target: "voice-1", targetHandle: "prompt" },
      { id: "e3", source: "th-dir", sourceHandle: "clip-2-voice", target: "voice-2", targetHandle: "prompt" },
    ];
    assert.deepEqual(talkingHeadChangedTargets(before, after, edges), ["frame-1", "voice-2"]);
  });

  it("syncs aspectRatio, framing gradeLook, voice params, and ref images on same-count Replan", () => {
    const nodes: CanvasNode[] = [
      director(),
      { id: "th-ref-1", type: "media", position: { x: 100, y: 0 }, data: { label: "參考圖 1", mediaKind: "image", mediaUrl: "https://cdn/char1.png" } },
      { id: "th-frame-1", type: "model", position: { x: 400, y: 0 }, data: { modelId: "openrouter:bytedance-seed/seedream-5-0-pro", aspectRatio: "9:16", presetId: "9:16", prompt: "" } },
      { id: "th-voice-1", type: "model", position: { x: 400, y: 300 }, data: { modelId: "scro:tts", presetId: "natural", prompt: "", toolParams: { language: "yue", voicePreset: "alan", ttsConversational: true, characterId: "char-1" } } },
      { id: "th-video-1", type: "model", position: { x: 800, y: 0 }, data: { modelId: "openrouter:heygen/avatar-iv", aspectRatio: "9:16", presetId: "9:16", prompt: "" } },
      { id: "th-grade-1", type: "model", position: { x: 1200, y: 0 }, data: { modelId: "ffmpeg:color-grade", presetId: "talking-head", toolParams: { gradeLook: "talking-head" } } },
    ];
    const edges: CanvasEdge[] = [
      { id: "r1", source: "th-ref-1", sourceHandle: "output", target: "th-frame-1", targetHandle: "refImages" },
      { id: "f1", source: "th-dir", sourceHandle: "opening-frame", target: "th-frame-1", targetHandle: "prompt" },
    ];
    const group: CanvasGroup = {
      id: "th",
      title: "Talking Head",
      color: "sky",
      kind: "talking-head",
      memberIds: nodes.map((n) => n.id),
      params: { aspectRatio: "9:16", language: "yue", framing: "collarbone-close", characterId: "char-1" },
    };
    const nextPlan: TalkingHeadDirectorPlan = {
      plannerVideoId: "vid-2",
      plannedWith: {
        script: "Hello camera",
        characterId: "char-2",
        language: "en",
        framing: "handheld-selfie",
        aspectRatio: "16:9",
      },
      framePrompt: "selfie still",
      frameRefUrls: ["https://cdn/char2-a.png", "https://cdn/char2-b.png"],
      voicePreset: "bella",
      clips: [{ clipNumber: 1, spokenLine: "Hi", heygenPrompt: "smile", durationSeconds: 6 }],
    };

    const synced = syncTalkingHeadGroupNodes({ nodes, edges }, { group, plan: nextPlan });
    const frame = synced.nodes.find((n) => n.id === "th-frame-1")!;
    const video = synced.nodes.find((n) => n.id === "th-video-1")!;
    const voice = synced.nodes.find((n) => n.id === "th-voice-1")!;
    const grade = synced.nodes.find((n) => n.id === "th-grade-1")!;
    assert.equal(frame.data.aspectRatio, "16:9");
    assert.equal(video.data.aspectRatio, "16:9");
    assert.equal(grade.data.toolParams?.gradeLook, "talking-head-selfie");
    assert.equal(grade.data.presetId, "talking-head-selfie");
    assert.deepEqual(voice.data.toolParams, {
      language: "en",
      voicePreset: "bella",
      ttsConversational: true,
      characterId: "char-2",
    });
    const refEdges = synced.edges.filter((e) => e.target === "th-frame-1" && e.targetHandle === "refImages");
    assert.deepEqual(
      refEdges.map((e) => synced.nodes.find((n) => n.id === e.source)?.data.mediaUrl),
      ["https://cdn/char2-a.png", "https://cdn/char2-b.png"],
    );
    assert.ok(synced.changedIds.includes("th-frame-1"));
    assert.ok(synced.changedIds.includes("th-video-1"));
    assert.ok(synced.changedIds.includes("th-voice-1"));
    assert.ok(synced.changedIds.includes("th-grade-1"));
    assert.deepEqual(synced.group.params, {
      aspectRatio: "16:9",
      language: "en",
      framing: "handheld-selfie",
      characterId: "char-2",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/talking-head-director.test.ts`
Expected: FAIL with module not found (`talking-head-director`).

- [ ] **Step 3: Write minimal implementation**

Create `src/service/canvas/talking-head-director.ts`:

```ts
// Pure helpers for the persistent Talking Head Director node (scro:talking-head in planner mode).

import type { CanvasAspectRatio, CanvasEdge, CanvasGroup, CanvasNode, CanvasNodeData } from "@/model/canvas";
import { TALKING_HEAD_PLANNER_MODEL_ID } from "@/service/canvas/explainer-planner";

export const TALKING_HEAD_OPENING_FRAME_HANDLE = "opening-frame";
export type TalkingHeadClipOutputKind = "motion" | "voice";
const CLIP_OUTPUT_KINDS: readonly TalkingHeadClipOutputKind[] = ["motion", "voice"];
const CLIP_HANDLE = /^clip-(\d+)-(motion|voice)$/;

export type TalkingHeadLanguage = "yue" | "zh" | "en";
export type TalkingHeadFraming = "collarbone-close" | "waist-up" | "handheld-selfie" | "full-body";

export type TalkingHeadDirectorParams = {
  script: string;
  characterId?: string;
  language: TalkingHeadLanguage;
  framing: TalkingHeadFraming;
  aspectRatio: CanvasAspectRatio;
};

export type TalkingHeadDirectorClip = {
  clipNumber: number;
  spokenLine: string;
  heygenPrompt: string;
  durationSeconds: number;
};

export type TalkingHeadDirectorPlan = {
  plannerVideoId: string;
  plannedWith: TalkingHeadDirectorParams;
  framePrompt: string;
  frameRefUrls: string[];
  voicePreset: string;
  clips: TalkingHeadDirectorClip[];
};

type NodeLike = Pick<CanvasNode, "type" | "data">;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function readLanguage(v: unknown): TalkingHeadLanguage {
  return v === "zh" || v === "en" ? v : "yue";
}

function readFraming(v: unknown): TalkingHeadFraming {
  if (v === "waist-up" || v === "handheld-selfie" || v === "full-body") return v;
  return "collarbone-close";
}

export function talkingHeadGradeLook(framing: string): "talking-head-selfie" | "talking-head" {
  return framing === "handheld-selfie" ? "talking-head-selfie" : "talking-head";
}

export function isTalkingHeadDirectorNode(node: NodeLike): boolean {
  return (
    node.type === "model" &&
    node.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID &&
    node.data.toolParams?.plannerMode === true
  );
}

// Every parameter on the Talking Head card that changes the plan.
export function talkingHeadDirectorParams(node: NodeLike): TalkingHeadDirectorParams {
  const tp = node.data.toolParams ?? {};
  const characterId = str(tp.characterId);
  return {
    script: (node.data.prompt ?? "").trim(),
    ...(characterId ? { characterId } : {}),
    language: readLanguage(tp.language),
    framing: readFraming(tp.framing),
    aspectRatio: node.data.aspectRatio ?? "9:16",
  };
}

function readClip(raw: unknown): TalkingHeadDirectorClip | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  if (typeof c.clipNumber !== "number") return undefined;
  if (typeof c.spokenLine !== "string" || typeof c.heygenPrompt !== "string") return undefined;
  return {
    clipNumber: c.clipNumber,
    spokenLine: c.spokenLine,
    heygenPrompt: c.heygenPrompt,
    durationSeconds: typeof c.durationSeconds === "number" ? c.durationSeconds : 6,
  };
}

export function readTalkingHeadPlan(node: NodeLike): TalkingHeadDirectorPlan | undefined {
  const raw = node.data.toolParams?.plan;
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  if (
    typeof p.plannerVideoId !== "string" ||
    typeof p.framePrompt !== "string" ||
    !Array.isArray(p.clips) ||
    !p.plannedWith
  ) {
    return undefined;
  }
  const clips = p.clips.map(readClip);
  if (clips.length === 0 || clips.some((c) => !c)) return undefined;
  return {
    plannerVideoId: p.plannerVideoId,
    plannedWith: p.plannedWith as TalkingHeadDirectorParams,
    framePrompt: p.framePrompt,
    frameRefUrls: Array.isArray(p.frameRefUrls)
      ? p.frameRefUrls.filter((u): u is string => typeof u === "string")
      : [],
    voicePreset: str(p.voicePreset) ?? "cathy",
    clips: (clips as TalkingHeadDirectorClip[]).sort((a, b) => a.clipNumber - b.clipNumber),
  };
}

export function talkingHeadClipHandleId(clipNumber: number, kind: TalkingHeadClipOutputKind): string {
  return `clip-${clipNumber}-${kind}`;
}

export function parseTalkingHeadHandle(
  handle: string | null | undefined,
): { kind: "opening-frame" } | { kind: TalkingHeadClipOutputKind; clipNumber: number } | undefined {
  if (!handle) return undefined;
  if (handle === TALKING_HEAD_OPENING_FRAME_HANDLE) return { kind: "opening-frame" };
  const m = CLIP_HANDLE.exec(handle);
  return m ? { kind: m[2] as TalkingHeadClipOutputKind, clipNumber: Number(m[1]) } : undefined;
}

export function talkingHeadHandles(plan: TalkingHeadDirectorPlan): string[] {
  return [
    TALKING_HEAD_OPENING_FRAME_HANDLE,
    ...plan.clips.flatMap((c) => CLIP_OUTPUT_KINDS.map((k) => talkingHeadClipHandleId(c.clipNumber, k))),
  ];
}

export function talkingHeadNeedsReplan(node: NodeLike): boolean {
  const plan = readTalkingHeadPlan(node);
  if (!plan) return false;
  const now = talkingHeadDirectorParams(node) as Record<string, unknown>;
  const then = plan.plannedWith as Record<string, unknown>;
  const keys = new Set([...Object.keys(now), ...Object.keys(then)]);
  return [...keys].some((key) => (now[key] ?? null) !== (then[key] ?? null));
}

export function talkingHeadRawOutput(node: NodeLike, handle: string): string | undefined {
  const plan = readTalkingHeadPlan(node);
  const parsed = parseTalkingHeadHandle(handle);
  if (!plan || !parsed) return undefined;
  if (parsed.kind === "opening-frame") return plan.framePrompt;
  const clip = plan.clips.find((c) => c.clipNumber === parsed.clipNumber);
  if (!clip) return undefined;
  return parsed.kind === "motion" ? clip.heygenPrompt : clip.spokenLine;
}

function outputMap(node: NodeLike): Map<string, string> {
  const plan = readTalkingHeadPlan(node);
  const out = new Map<string, string>();
  for (const handle of plan ? talkingHeadHandles(plan) : []) {
    out.set(handle, talkingHeadRawOutput(node, handle) ?? "");
  }
  return out;
}

// Targets wired to an output whose text differs (or disappeared) between two Director states.
export function talkingHeadChangedTargets(
  before: NodeLike,
  after: NodeLike & { id: string },
  edges: readonly CanvasEdge[],
): string[] {
  const a = outputMap(before);
  const b = outputMap(after);
  const out: string[] = [];
  for (const e of edges) {
    const handle = e.sourceHandle;
    if (e.source !== after.id || !handle || !parseTalkingHeadHandle(handle)) continue;
    if (a.get(handle) !== b.get(handle) && !out.includes(e.target)) out.push(e.target);
  }
  return out;
}

type SyncNode = { id: string; type?: string; position: { x: number; y: number }; data: CanvasNodeData };
type SyncEdge = {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
};

// Syncs non-prompt Talking Head group settings (aspectRatio, framing gradeLook, voice params,
// and opening-still reference images) when Replan keeps the existing downstream nodes.
export function syncTalkingHeadGroupNodes<N extends SyncNode, E extends SyncEdge>(
  graph: { nodes: readonly N[]; edges: readonly E[] },
  input: {
    group: CanvasGroup;
    plan: TalkingHeadDirectorPlan;
    createMediaNode?: (node: CanvasNode) => N;
    createRefEdge?: (edge: CanvasEdge) => E;
  },
): { nodes: N[]; edges: E[]; group: CanvasGroup; changedIds: string[] } {
  const { plan, group } = input;
  const { aspectRatio, framing, language, characterId } = plan.plannedWith;
  const gradeLook = talkingHeadGradeLook(framing);
  const memberSet = new Set(group.memberIds);
  const changedIds: string[] = [];
  const markChanged = (id: string) => {
    if (!changedIds.includes(id)) changedIds.push(id);
  };

  let nodes = graph.nodes.map((node) => {
    if (!memberSet.has(node.id) || node.type !== "model") return node;
    const modelId = node.data.modelId;
    if (modelId === "openrouter:bytedance-seed/seedream-5-0-pro" || modelId === "openrouter:heygen/avatar-iv") {
      if (node.data.aspectRatio === aspectRatio && node.data.presetId === aspectRatio) return node;
      markChanged(node.id);
      return { ...node, data: { ...node.data, aspectRatio, presetId: aspectRatio } };
    }
    if (modelId === "ffmpeg:color-grade") {
      if (node.data.toolParams?.gradeLook === gradeLook && node.data.presetId === gradeLook) return node;
      markChanged(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          presetId: gradeLook,
          toolParams: { ...(node.data.toolParams ?? {}), gradeLook },
        },
      };
    }
    if (modelId === "scro:tts") {
      const tp = node.data.toolParams ?? {};
      const nextTp: Record<string, unknown> = {
        ...tp,
        language,
        voicePreset: plan.voicePreset,
        ttsConversational: true,
      };
      if (characterId) nextTp.characterId = characterId;
      else delete nextTp.characterId;
      if (
        tp.language === nextTp.language &&
        tp.voicePreset === nextTp.voicePreset &&
        tp.characterId === nextTp.characterId &&
        tp.ttsConversational === true
      ) {
        return node;
      }
      markChanged(node.id);
      return { ...node, data: { ...node.data, toolParams: nextTp } };
    }
    return node;
  });

  let edges = [...graph.edges];
  let memberIds = [...group.memberIds];

  // Sync reference image media nodes wired into the group's Seedream opening still.
  const frameNode = nodes.find(
    (n) => memberSet.has(n.id) && n.type === "model" && n.data.modelId === "openrouter:bytedance-seed/seedream-5-0-pro",
  );
  if (frameNode) {
    const desiredUrls = [...new Set(plan.frameRefUrls)].slice(0, 14);
    const refEdges = edges.filter((e) => e.target === frameNode.id && e.targetHandle === "refImages");
    const existingRefs = refEdges
      .map((e) => nodes.find((n) => n.id === e.source && n.type === "media" && memberSet.has(n.id)))
      .filter((n): n is N => Boolean(n));
    const currentUrls = existingRefs.map((n) => n.data.mediaUrl ?? "");
    const refsChanged =
      desiredUrls.length !== currentUrls.length ||
      desiredUrls.some((url, i) => currentUrls[i] !== url);

    if (refsChanged) {
      markChanged(frameNode.id);
      const removedRefIds = new Set(existingRefs.map((n) => n.id));
      const basePos = existingRefs[0]?.position ?? {
        x: frameNode.position.x - 320,
        y: frameNode.position.y,
      };
      nodes = nodes.filter((n) => !removedRefIds.has(n.id));
      edges = edges.filter((e) => !removedRefIds.has(e.source));
      memberIds = memberIds.filter((id) => !removedRefIds.has(id));

      const existingIds = new Set(nodes.map((n) => n.id));
      desiredUrls.forEach((url, i) => {
        let refId = `${group.id}-ref-${i + 1}`;
        let suffix = 1;
        while (existingIds.has(refId)) {
          refId = `${group.id}-ref-${i + 1}-${suffix++}`;
        }
        existingIds.add(refId);
        const name = `參考圖 ${i + 1}`;
        const domainMedia: CanvasNode = {
          id: refId,
          type: "media",
          position: { x: basePos.x, y: basePos.y + i * 320 },
          data: { label: name, fileName: name, mediaKind: "image", mediaUrl: url },
        };
        const domainEdge: CanvasEdge = {
          id: `${refId}->${frameNode.id}:refImages`,
          source: refId,
          sourceHandle: "output",
          target: frameNode.id,
          targetHandle: "refImages",
        };
        nodes.push(input.createMediaNode ? input.createMediaNode(domainMedia) : (domainMedia as unknown as N));
        edges.push(input.createRefEdge ? input.createRefEdge(domainEdge) : (domainEdge as unknown as E));
        memberIds.push(refId);
      });
    }
  }

  const nextGroup: CanvasGroup = {
    ...group,
    memberIds,
    params: {
      ...(group.params ?? {}),
      aspectRatio,
      language,
      framing,
      ...(characterId ? { characterId } : {}),
    },
  };

  return { nodes, edges, group: nextGroup, changedIds };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/canvas/talking-head-director.test.ts`
Expected: PASS (all 6 tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/talking-head-director.ts src/service/canvas/talking-head-director.test.ts
git commit -m "feat(canvas): add Talking Head Director domain helpers and group sync"
```

---

### Task 2: Shared persistent director dispatcher & graph/stale/settings integration

**Files:**
- Create: `src/service/canvas/director-node.ts`
- Create: `src/service/canvas/director-node.test.ts`
- Modify: `src/service/canvas/graph.ts`
- Modify: `src/service/canvas/stale-outputs.ts`
- Modify: `src/service/canvas/settings/apply.ts`
- Modify: `src/service/canvas/explainer-director-apply.ts`
- Modify: `src/service/canvas/graph.test.ts`
- Modify: `src/service/canvas/explainer-director-apply.test.ts`

**Interfaces:**
- Consumes: Task 1 exports from `@/service/canvas/talking-head-director` and existing exports from `@/service/canvas/explainer-director`.
- Produces (exported from `src/service/canvas/director-node.ts`):
  - `PersistentDirectorPlan = ExplainerDirectorPlan | TalkingHeadDirectorPlan`
  - `isPersistentDirectorNode(node): boolean`
  - `directorOutputHandles(node): string[]`
  - `isDirectorOutputHandle(node, handle: string | null | undefined): boolean`
  - `directorOutputRawText(node, handle: string): string | undefined`
  - `directorNodeBaseVars(node): Record<string, string>`
  - `directorNodeNeedsReplan(node): boolean`
  - `directorNodeChangedTargets(before, after, edges): string[]`
  - `directorNodeClipCount(node): number | undefined`
  - `planHandles(plan: PersistentDirectorPlan): string[]`

- [ ] **Step 1: Write the failing test for `director-node.ts`**

Create `src/service/canvas/director-node.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  directorNodeBaseVars,
  directorNodeChangedTargets,
  directorNodeClipCount,
  directorNodeNeedsReplan,
  directorOutputHandles,
  directorOutputRawText,
  isDirectorOutputHandle,
  isPersistentDirectorNode,
} from "@/service/canvas/director-node";
import { directorParams } from "@/service/canvas/explainer-director";
import { talkingHeadDirectorParams } from "@/service/canvas/talking-head-director";

const explainerBase: CanvasNode = {
  id: "exp",
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId: "scro:explainer", prompt: "Topic", aspectRatio: "9:16", toolParams: { plannerMode: true, textStyleId: "neon" } },
};

const talkingBase: CanvasNode = {
  id: "th",
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId: "scro:talking-head", prompt: "Script", aspectRatio: "9:16", toolParams: { plannerMode: true, characterId: "c1", language: "yue", framing: "collarbone-close" } },
};

describe("persistent director dispatcher", () => {
  it("dispatches outputs, dirty state, base vars, and changed targets for both director kinds", () => {
    const exp: CanvasNode = {
      ...explainerBase,
      data: {
        ...explainerBase.data,
        toolParams: {
          ...explainerBase.data.toolParams,
          plan: {
            plannerVideoId: "v1",
            plannedWith: directorParams(explainerBase),
            clips: [{ clipNumber: 1, framePrompt: "f {{text_style}}", videoPrompt: "m", spokenLine: "s", durationSeconds: 6, refUrls: [] }],
          },
        },
      },
    };
    const th: CanvasNode = {
      ...talkingBase,
      data: {
        ...talkingBase.data,
        toolParams: {
          ...talkingBase.data.toolParams,
          plan: {
            plannerVideoId: "v2",
            plannedWith: talkingHeadDirectorParams(talkingBase),
            framePrompt: "open {{tone}}",
            frameRefUrls: [],
            voicePreset: "alan",
            clips: [{ clipNumber: 1, spokenLine: "hi", heygenPrompt: "nod", durationSeconds: 5 }],
          },
        },
      },
    };

    assert.equal(isPersistentDirectorNode(exp), true);
    assert.equal(isPersistentDirectorNode(th), true);
    assert.deepEqual(directorOutputHandles(exp), ["clip-1-frame", "clip-1-motion", "clip-1-voice"]);
    assert.deepEqual(directorOutputHandles(th), ["opening-frame", "clip-1-motion", "clip-1-voice"]);
    assert.equal(isDirectorOutputHandle(th, "opening-frame"), true);
    assert.equal(isDirectorOutputHandle(th, "clip-1-frame"), false);
    assert.equal(isDirectorOutputHandle(exp, "opening-frame"), false);
    assert.equal(directorOutputRawText(th, "opening-frame"), "open {{tone}}");
    assert.equal(directorOutputRawText(th, "clip-1-voice"), "hi");
    assert.equal(directorNodeClipCount(th), 1);
    assert.ok("text_style" in directorNodeBaseVars(exp));
    assert.deepEqual(directorNodeBaseVars(th), {});
    assert.equal(directorNodeNeedsReplan(th), false);
    assert.equal(directorNodeNeedsReplan({ ...th, data: { ...th.data, prompt: "Changed" } }), true);

    const thUpdated: CanvasNode = {
      ...th,
      data: {
        ...th.data,
        toolParams: {
          ...th.data.toolParams,
          plan: {
            ...(th.data.toolParams!.plan as Record<string, unknown>),
            framePrompt: "changed still",
          },
        },
      },
    };
    const edges: CanvasEdge[] = [
      { id: "e1", source: "th", sourceHandle: "opening-frame", target: "f1", targetHandle: "prompt" },
      { id: "e2", source: "th", sourceHandle: "clip-1-voice", target: "v1", targetHandle: "prompt" },
    ];
    assert.deepEqual(directorNodeChangedTargets(th, thUpdated, edges), ["f1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/canvas/director-node.test.ts`
Expected: FAIL with module not found (`director-node`).

- [ ] **Step 3: Implement `src/service/canvas/director-node.ts` and update `graph.ts`, `stale-outputs.ts`, `settings/apply.ts`, `explainer-director-apply.ts`**

Create `src/service/canvas/director-node.ts`:

```ts
// Thin dispatcher unifying persistent Director nodes (Explainer Director & Talking Head Director).

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  directorBaseVars,
  directorChangedTargets,
  directorHandles,
  directorNeedsReplan,
  directorRawOutput,
  isExplainerDirectorNode,
  parseDirectorHandle,
  readDirectorPlan,
  type ExplainerDirectorPlan,
} from "@/service/canvas/explainer-director";
import {
  isTalkingHeadDirectorNode,
  parseTalkingHeadHandle,
  readTalkingHeadPlan,
  talkingHeadChangedTargets,
  talkingHeadHandles,
  talkingHeadNeedsReplan,
  talkingHeadRawOutput,
  type TalkingHeadDirectorPlan,
} from "@/service/canvas/talking-head-director";

export type PersistentDirectorPlan = ExplainerDirectorPlan | TalkingHeadDirectorPlan;
type NodeLike = Pick<CanvasNode, "type" | "data">;

export function isPersistentDirectorNode(node: NodeLike): boolean {
  return isExplainerDirectorNode(node) || isTalkingHeadDirectorNode(node);
}

export function isTalkingHeadPlan(plan: PersistentDirectorPlan): plan is TalkingHeadDirectorPlan {
  return "framePrompt" in plan;
}

export function planHandles(plan: PersistentDirectorPlan): string[] {
  return isTalkingHeadPlan(plan) ? talkingHeadHandles(plan) : directorHandles(plan);
}

export function directorOutputHandles(node: NodeLike): string[] {
  if (isExplainerDirectorNode(node)) {
    const plan = readDirectorPlan(node);
    return plan ? directorHandles(plan) : [];
  }
  if (isTalkingHeadDirectorNode(node)) {
    const plan = readTalkingHeadPlan(node);
    return plan ? talkingHeadHandles(plan) : [];
  }
  return [];
}

export function isDirectorOutputHandle(node: NodeLike, handle: string | null | undefined): boolean {
  if (isExplainerDirectorNode(node)) return Boolean(parseDirectorHandle(handle));
  if (isTalkingHeadDirectorNode(node)) return Boolean(parseTalkingHeadHandle(handle));
  return false;
}

export function directorOutputRawText(node: NodeLike, handle: string): string | undefined {
  if (isExplainerDirectorNode(node)) return directorRawOutput(node, handle);
  if (isTalkingHeadDirectorNode(node)) return talkingHeadRawOutput(node, handle);
  return undefined;
}

export function directorNodeBaseVars(node: NodeLike): Record<string, string> {
  if (isExplainerDirectorNode(node)) return directorBaseVars(node);
  return {};
}

export function directorNodeNeedsReplan(node: NodeLike): boolean {
  if (isExplainerDirectorNode(node)) return directorNeedsReplan(node);
  if (isTalkingHeadDirectorNode(node)) return talkingHeadNeedsReplan(node);
  return false;
}

export function directorNodeChangedTargets(
  before: NodeLike,
  after: NodeLike & { id: string },
  edges: readonly CanvasEdge[],
): string[] {
  if (isExplainerDirectorNode(after)) return directorChangedTargets(before, after, edges);
  if (isTalkingHeadDirectorNode(after)) return talkingHeadChangedTargets(before, after, edges);
  return [];
}

export function directorNodeClipCount(node: NodeLike): number | undefined {
  if (isExplainerDirectorNode(node)) return readDirectorPlan(node)?.clips.length;
  if (isTalkingHeadDirectorNode(node)) return readTalkingHeadPlan(node)?.clips.length;
  return undefined;
}
```

Update `src/service/canvas/graph.ts`:
- Replace imports of `directorBaseVars`, `directorHandles`, `directorRawOutput`, `isExplainerDirectorNode`, `parseDirectorHandle`, `readDirectorPlan` with `directorNodeBaseVars`, `directorOutputHandles`, `directorOutputRawText`, `isDirectorOutputHandle`, `isPersistentDirectorNode` from `@/service/canvas/director-node` (keep `DIRECTOR_CHARACTER_HANDLE` from `@/service/canvas/explainer-director`).
- In `getNodeOutputPortType`:
  ```ts
  if (isPersistentDirectorNode(node)) return isDirectorOutputHandle(node, sourceHandle) ? "text" : null;
  ```
- In `validateEdgeConnection` (non-`"output"` sourceHandle check):
  ```ts
  if (sourceHandle !== "output") {
    const handles = isPersistentDirectorNode(sourceNode) ? directorOutputHandles(sourceNode) : [];
    if (!handles.includes(sourceHandle)) {
      return {
        valid: false,
        reason: `Unsupported source handle "${sourceHandle}"`,
      };
    }
  }
  ```
- In `resolveNodeInputs`:
  ```ts
  if (source && edge.sourceHandle && isPersistentDirectorNode(source) && isDirectorOutputHandle(source, edge.sourceHandle)) {
    director = { node: source, handle: edge.sourceHandle };
    break;
  }
  ```
  and use `directorOutputRawText(director.node, director.handle)` and `directorNodeBaseVars(director.node)`.

Update `src/service/canvas/stale-outputs.ts`:
- Replace `directorNeedsReplan, isExplainerDirectorNode` import with `directorNodeNeedsReplan, isPersistentDirectorNode` from `@/service/canvas/director-node`.
- In `outdatedNodeReasons`:
  ```ts
  if (!isPersistentDirectorNode(director) || !directorNodeNeedsReplan(director)) continue;
  ```

Update `src/service/canvas/settings/apply.ts`:
- Replace Explainer-only imports with `directorOutputHandles`, `directorOutputRawText`, `isPersistentDirectorNode` from `@/service/canvas/director-node`.
- In `templateText`:
  ```ts
  if (isPersistentDirectorNode(target)) {
    return directorOutputHandles(target).map((h) => directorOutputRawText(target, h) ?? "").join("\n");
  }
  // ...
  if (source && promptWire?.sourceHandle && isPersistentDirectorNode(source)) {
    return directorOutputRawText(source, promptWire.sourceHandle) ?? "";
  }
  ```

Update `src/service/canvas/explainer-director-apply.ts`:
- Update `dropCutDirectorEdges` to accept `plan: PersistentDirectorPlan` and use `planHandles(plan)` plus `parseDirectorHandle(handle) || parseTalkingHeadHandle(handle)` so both Explainer and Talking Head dropped clip edges are cleanly cut!

```ts
export function dropCutDirectorEdges<E extends Pick<GraphEdge, "source" | "target" | "sourceHandle">>(
  edges: readonly E[],
  directorId: string,
  plan: PersistentDirectorPlan,
): { edges: E[]; cutTargets: string[] } {
  const live = new Set(planHandles(plan));
  const cutTargets: string[] = [];
  const kept = edges.filter((e) => {
    const handle = e.sourceHandle;
    const isDirectorHandle = Boolean(handle && (parseDirectorHandle(handle) || parseTalkingHeadHandle(handle)));
    const cut = e.source === directorId && isDirectorHandle && !live.has(handle!);
    if (cut && !cutTargets.includes(e.target)) cutTargets.push(e.target);
    return !cut;
  });
  return { edges: kept, cutTargets };
}
```

- [ ] **Step 4: Add Talking Head cases to `graph.test.ts` and `explainer-director-apply.test.ts` and run all tests**

Add unit tests covering:
- `validateEdgeConnection` accepts `opening-frame`, `clip-1-motion`, `clip-1-voice` from a planned Talking Head Director into `prompt` and rejects `output` or `clip-1-frame`.
- `resolveNodeInputs` resolves `opening-frame` with `{{key}}` from a Setting wired into the Talking Head Director (and receiver Setting overrides Director Setting).
- `dropCutDirectorEdges` keeps `opening-frame` and `clip-1-motion` while cutting `clip-2-voice` on a 1-clip Talking Head plan.

Run: `npx tsx --test src/service/canvas/director-node.test.ts src/service/canvas/graph.test.ts src/service/canvas/explainer-director-apply.test.ts src/service/canvas/stale-outputs.test.ts src/service/canvas/settings/apply.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/director-node.ts src/service/canvas/director-node.test.ts src/service/canvas/graph.ts src/service/canvas/graph.test.ts src/service/canvas/stale-outputs.ts src/service/canvas/settings/apply.ts src/service/canvas/explainer-director-apply.ts src/service/canvas/explainer-director-apply.test.ts
git commit -m "feat(canvas): unify persistent director graph, stale, and Setting support"
```

---

### Task 3: Talking Head expansion wiring & `explainer-plan.ts` persistent plan state

**Files:**
- Modify: `src/service/canvas/scro-groups/talking-head.ts`
- Modify: `src/service/canvas/scro-groups/talking-head.test.ts`
- Modify: `src/service/canvas/explainer-plan.ts`
- Modify: `src/service/canvas/explainer-plan.test.ts`

**Interfaces:**
- Consumes: `TALKING_HEAD_OPENING_FRAME_HANDLE`, `talkingHeadClipHandleId`, `talkingHeadDirectorParams`, `talkingHeadGradeLook`, `TalkingHeadDirectorPlan` from `@/service/canvas/talking-head-director`; `PersistentDirectorPlan` from `@/service/canvas/director-node`.
- Produces:
  - `TalkingHeadExpansionInput.directorId?: string`
  - `CanvasExplainerPlanState` (`status: "ready"`): `plan?: PersistentDirectorPlan`

- [ ] **Step 1: Update/add failing tests in `talking-head.test.ts` and `explainer-plan.test.ts`**

In `src/service/canvas/scro-groups/talking-head.test.ts`, add:

```ts
  it("wires opening-frame and per-clip motion/voice from a persistent Director and clears inline prompts", () => {
    const out = buildTalkingHeadExpansion({ ...input(2), directorId: "th-dir" });
    const frame = out.nodes.find((n) => n.id === "th-frame-1")!;
    const videos = byModel(out.nodes, "openrouter:heygen/avatar-iv");
    const voices = byModel(out.nodes, "scro:tts");
    assert.equal(frame.data.prompt, "");
    assert.deepEqual(videos.map((n) => n.data.prompt), ["", ""]);
    assert.deepEqual(voices.map((n) => n.data.prompt), ["", ""]);
    assert.ok(
      out.edges.some(
        (e) => e.source === "th-dir" && e.sourceHandle === "opening-frame" && e.target === "th-frame-1" && e.targetHandle === "prompt",
      ),
    );
    assert.ok(
      out.edges.some(
        (e) => e.source === "th-dir" && e.sourceHandle === "clip-2-motion" && e.target === "th-video-2" && e.targetHandle === "prompt",
      ),
    );
    assert.ok(
      out.edges.some(
        (e) => e.source === "th-dir" && e.sourceHandle === "clip-2-voice" && e.target === "th-voice-2" && e.targetHandle === "prompt",
      ),
    );
  });
```

In `src/service/canvas/explainer-plan.test.ts`, update the Talking Head test to assert:
- `ready.plan` is defined (`TalkingHeadDirectorPlan`) with `framePrompt === "open"`, `clips` containing `spokenLine` and `heygenPrompt`, `voicePreset === "alan"`, `plannedWith` matching `planningWith` snapshot.
- `frames.map((n) => n.data.prompt)` is `[""]`, `heygen.map((n) => n.data.prompt)` is `["", ""]`, `tts.map((n) => n.data.prompt)` is `["", ""]`.
- `ready.edges` wires `th:opening-frame -> p-frame-1:prompt`, `th:clip-1-motion -> p-video-1:prompt`, `th:clip-1-voice -> p-voice-1:prompt`.
- `ready.group.memberIds[0] === "th"` and `ready.nodes` does not contain `"th"`.
- Expanded node positions start at `origin.x + 360`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/canvas/scro-groups/talking-head.test.ts src/service/canvas/explainer-plan.test.ts`
Expected: FAIL on the new Talking Head Director assertions.

- [ ] **Step 3: Implement changes in `talking-head.ts` and `explainer-plan.ts`**

In `src/service/canvas/scro-groups/talking-head.ts`:
- Add `directorId?: string` to `TalkingHeadExpansionInput`.
- Use `talkingHeadGradeLook(input.framing)` for `gradeLook`.
- When `input.directorId` is set, set `prompt: ""` on `frame-1`, `voice-<n>`, `video-<n>`, and after `const group = b.finish(output)` append `directorEdges`:
  - `opening-frame` → `frame` (`prompt`)
  - per clip `clip-<n>-motion` → `video` (`prompt`) and `clip-<n>-voice` → `voice` (`prompt`)
- Return `{ nodes: group.nodes, edges: [...group.edges, ...directorEdges], expandedNodeIds: group.nodes.map((n) => n.id) }`.

In `src/service/canvas/explainer-plan.ts`:
- Change `plan?: ExplainerDirectorPlan` to `plan?: PersistentDirectorPlan`.
- In `startCanvasExplainerPlan`: persist `planningWith` for Talking Head as well:
  ```ts
  ...(director
    ? { "nodes.$[n].data.toolParams.planningWith": directorParams(plannerNode) }
    : talkingHead
      ? { "nodes.$[n].data.toolParams.planningWith": talkingHeadDirectorParams(plannerNode) }
      : {}),
  ```
- In `planStateFromVideo` (`TALKING_HEAD_PLANNER_MODEL_ID` branch):
  - Read `plannedWith` from `toolParams.planningWith` (fallback `talkingHeadDirectorParams(plannerNode)`).
  - Read `characterId` preferring `plannedWith.characterId` when `planningWith` snapshot exists (matching Explainer).
  - Build `TalkingHeadDirectorPlan` (`plannerVideoId`, `plannedWith`, `framePrompt`, `frameRefUrls`, `voicePreset`, `clips`).
  - Call `buildTalkingHeadExpansion` with `directorId: plannerNode.id` and `origin: { x: plannerNode.position.x + DIRECTOR_ROW_OFFSET_X, y: plannerNode.position.y }`.
  - Include `plannerNode.id` first in `group.memberIds`: `[plannerNode.id, ...expansion.nodes.map((n) => n.id)]`.
  - Return `{ status: "ready", ...expansion, summary, group, plan }`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/canvas/scro-groups/talking-head.test.ts src/service/canvas/explainer-plan.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas/scro-groups/talking-head.ts src/service/canvas/scro-groups/talking-head.test.ts src/service/canvas/explainer-plan.ts src/service/canvas/explainer-plan.test.ts
git commit -m "feat(canvas): emit persistent Talking Head plan and Director output edges"
```

---

### Task 4: Talking Head Director card UI, decision dialog, and workspace flow

**Files:**
- Modify: `src/app/app/canvas/nodes/talking-head-director-card.tsx`
- Modify: `src/app/app/canvas/nodes/model-node-card.tsx`
- Modify: `src/app/app/canvas/director-plan-decision-dialog.tsx`
- Modify: `src/app/app/canvas/canvas-workspace.tsx`

**Interfaces:**
- Consumes: `talkingHeadClipHandleId`, `TALKING_HEAD_OPENING_FRAME_HANDLE`, `talkingHeadNeedsReplan`, `readTalkingHeadPlan`, `isTalkingHeadDirectorNode`, `syncTalkingHeadGroupNodes` from `@/service/canvas/talking-head-director`; `directorNodeChangedTargets`, `directorNodeClipCount`, `isPersistentDirectorNode`, `isTalkingHeadPlan` from `@/service/canvas/director-node`.
- Produces: Persistent Talking Head Director UI card with `settings` handle + dynamic outputs (`opening-frame`, `clip-<n>-motion`, `clip-<n>-voice`), tailored `DirectorPlanDecisionDialog` copy, and unified `onDirectorPlanReady` / `resolveDirectorDecision` handling in `canvas-workspace.tsx`.

- [ ] **Step 1: Update `TalkingHeadDirectorCard` (`src/app/app/canvas/nodes/talking-head-director-card.tsx`) and `ModelNodeCard` (`src/app/app/canvas/nodes/model-node-card.tsx`)**

In `talking-head-director-card.tsx`:
- Add props `incomingHandles: readonly string[]` and `hasSetting: boolean`.
- Read `plan = readTalkingHeadPlan({ type: "model", data })` and `dirty = talkingHeadNeedsReplan({ type: "model", data })`.
- Render backward-compat hidden target handles for extra `incomingHandles`, plus top-left `SETTINGS_HANDLE` (`settings`, styled identically to `ExplainerDirectorCard`).
- Show amber dirty banner when `dirty && !planning`:
  `設定已改，請按 Replan。輸出暫時維持上次的規劃。` / `Settings changed. Press Replan; outputs keep the last plan until then.`
- Update planning copy to:
  `規劃中，約需 1–3 分鐘。輸出暫時維持上次的規劃。` / `Planning, about 1–3 minutes. Outputs keep the last plan meanwhile.`
- Update primary button to match `ExplainerDirectorCard`:
  - Idle (`!plan`): lime button with `Sparkles` + `"Plan"` (or `"重試"` / `"Retry"` if failed and `!plan`).
  - Planned (`plan`): `RefreshCw` + `"Replan"`, lime when `dirty`, subtle border when clean.
  - Planning: `Loader2` + `"規劃中…"` / `"Planning…"`.
- Render bottom output handles section:
  - When `plan` exists:
    1. Row `開場靜幀` / `Opening still` with right `Handle` (`id={TALKING_HEAD_OPENING_FRAME_HANDLE}`, `PORT_COLOR_MAP.text`).
    2. For each `clip` in `plan.clips`:
       - Row `Clip {clip.clipNumber} · 動作` / `Clip {clip.clipNumber} · Motion` (`id={talkingHeadClipHandleId(clip.clipNumber, "motion")}`).
       - Row `Clip {clip.clipNumber} · 旁白` / `Clip {clip.clipNumber} · Voiceover` (`id={talkingHeadClipHandleId(clip.clipNumber, "voice")}`).
  - When `!plan`: grey right-aligned `規劃後出現輸出` / `Outputs appear after planning`.

In `model-node-card.tsx`:
- Pass `incomingHandles={[...incomingByHandle.keys()]}` and `hasSetting={incomingByHandle.has(SETTINGS_HANDLE)}` into `<TalkingHeadDirectorCard ... />` (leave all pre-existing uncommitted changes in `model-node-card.tsx` untouched).

- [ ] **Step 2: Update `DirectorPlanDecisionDialog` (`src/app/app/canvas/director-plan-decision-dialog.tsx`)**

Extend `DirectorDecision`:
```ts
export type DirectorDecision =
  | { kind: "build"; directorKind: "explainer" | "talking-head"; nodeId: string; clipCount: number }
  | { kind: "count"; directorKind: "explainer" | "talking-head"; nodeId: string; oldCount: number; newCount: number };
```
For `kind === "build"` and `decision.directorKind === "talking-head"`, render Talking Head description:
- zh: `要不要自動建立開場靜幀與每段的配音、對嘴、去靜音、調色和拼接節點？它們的 prompt 會由口播導演的輸出口接過去。不建立的話，只會亮起輸出口，你可以自己接線。`
- en: `Build the opening still and each clip's voice, lip-sync, silence trim, color grade, and concat nodes, with prompts wired from the Director's outputs? Otherwise only the outputs appear and you wire them yourself.`

- [ ] **Step 3: Update `canvas-workspace.tsx` to route Talking Head Director through persistent Director flow**

In `src/app/app/canvas/canvas-workspace.tsx`:
- `onUpdateNodeData`: switch `isExplainerDirectorNode` check to `isPersistentDirectorNode` and `directorChangedTargets` to `directorNodeChangedTargets`.
- `onDirectorPlanReady`:
  - Determine `directorKind = isTalkingHeadPlan(state.plan) ? "talking-head" : "explainer"`.
  - Read `oldCount = directorNodeClipCount(before)`.
  - Compute `changed = directorNodeChangedTargets(before, after, toDomainEdges(edgesRef.current))`.
  - When `oldCount === undefined`: open `DirectorPlanDecisionDialog` with `{ kind: "build", directorKind, nodeId, clipCount: state.plan.clips.length }`.
  - When `oldCount === state.plan.clips.length`:
    - If `isTalkingHeadPlan(state.plan)`, find `oldGroup` containing `nodeId`; if found, run `syncTalkingHeadGroupNodes` with `createMediaNode: (n) => toFlowNodes([n])[0]!` and `createRefEdge: (e) => toFlowEdges([e], [...domain, ...], models)[0]!`, update nodes/edges/group in one update, and merge `synced.changedIds` into `markStale(...)`.
    - Otherwise (or in addition) `markStale(changed)` and toast success.
  - When `oldCount !== state.plan.clips.length`: open `DirectorPlanDecisionDialog` with `{ kind: "count", directorKind, nodeId, oldCount, newCount: state.plan.clips.length }`.
- `resolveDirectorDecision`:
  - On `build === true`: set `pendingGroupLayoutRef.current.layout = decision.directorKind === "talking-head" ? "depth" : "explainer"`.
  - On `build === false && decision.kind === "count"`: call `dropCutDirectorEdges(edgesRef.current, decision.nodeId, state.plan)`, and if `isTalkingHeadPlan(state.plan)` and `oldGroup` exists, also run `syncTalkingHeadGroupNodes` on the surviving group nodes/edges and merge `changedIds` into `markStale`.
- Polling effect (`planningNodeIdsKey`):
  - Replace `if (state.plan && isExplainerDirectorNode(...))` with `if (state.plan && isPersistentDirectorNode({ type: "model", data: planner.data })) { onDirectorPlanReady(nodeId, state); continue; }`.
- Agent op replay (`agentPlanners`):
  - Replace `isExplainerDirectorNode(n) && n.data.toolParams?.replanRequested === true` with `isPersistentDirectorNode(n) && n.data.toolParams?.replanRequested === true`.

- [ ] **Step 4: Typecheck and lint modified UI files**

Run: `npx tsc --noEmit && npx eslint src/app/app/canvas/nodes/talking-head-director-card.tsx src/app/app/canvas/director-plan-decision-dialog.tsx src/app/app/canvas/canvas-workspace.tsx`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/canvas/nodes/talking-head-director-card.tsx src/app/app/canvas/nodes/model-node-card.tsx src/app/app/canvas/director-plan-decision-dialog.tsx src/app/app/canvas/canvas-workspace.tsx
git commit -m "feat(canvas): persist Talking Head Director card with outputs and Replan flow"
```

---

### Task 5: Canvas AI Assistant integration, docs sync, and full verification

**Files:**
- Modify: `src/service/canvas-agent/tools.ts`
- Modify: `src/service/canvas-agent/group-tools.ts`
- Modify: `src/service/canvas-agent/prompt.ts`
- Modify: `src/service/canvas-agent/tools.test.ts`
- Modify: `src/service/canvas-agent/group-tools.test.ts`
- Modify: `AGENTS.md`
- Modify: `pipeline-models.md`

**Interfaces:**
- Consumes: `isTalkingHeadDirectorNode`, `talkingHeadDirectorParams`, `readTalkingHeadPlan`, `talkingHeadNeedsReplan`, `parseTalkingHeadHandle` from `@/service/canvas/talking-head-director`; `isPersistentDirectorNode`, `isDirectorOutputHandle` from `@/service/canvas/director-node`.

- [ ] **Step 1: Write failing tests in `tools.test.ts` and `group-tools.test.ts`**

In `src/service/canvas-agent/tools.test.ts`, add tests verifying:
- `get_canvas` includes a `director` summary block for a Talking Head Director node (`params`, `planStatus`, `clips`, `outputs: "opening-frame | clip-<n>-motion | clip-<n>-voice (text)"`, `needsReplan`).
- `connect` accepts `sourcePort: "opening-frame"`, `"clip-1-motion"`, and `"clip-1-voice"` from a planned Talking Head Director into a model's `prompt` port, and rejects missing/invalid `sourcePort` (such as `"clip-1-frame"`).

In `src/service/canvas-agent/group-tools.test.ts`, add a test verifying:
- When a Talking Head group (or standalone Talking Head Director card) contains a `TalkingHeadDirector` node, `replace_group` updates that Director in place (`prompt`, `aspectRatio`, `toolParams.characterId`, `toolParams.language`, `toolParams.framing`, `toolParams.replanRequested = true`), keeps all downstream nodes (`removedCount: 0`), and returns `nodeId: director.id`.
- Existing test for a legacy Talking Head group WITHOUT a Director node continues to pass (replaces with a new planning card).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/canvas-agent/tools.test.ts src/service/canvas-agent/group-tools.test.ts`
Expected: FAIL on the new Talking Head Director agent tests.

- [ ] **Step 3: Implement updates in `tools.ts`, `group-tools.ts`, `prompt.ts`, `AGENTS.md`, and `pipeline-models.md`**

In `src/service/canvas-agent/tools.ts`:
- `describeNode`: add `isTalkingHeadDirectorNode(node)` branch returning:
  ```ts
  director: {
    params: talkingHeadDirectorParams(node),
    planStatus: node.data.toolParams?.planStatus ?? "idle",
    clips: readTalkingHeadPlan(node)?.clips.length ?? 0,
    outputs: "opening-frame | clip-<n>-motion | clip-<n>-voice (text)",
    needsReplan: talkingHeadNeedsReplan(node),
  }
  ```
- `connect`:
  - Check `isPersistentDirectorNode(sourceNode)`. If Talking Head and `!parseTalkingHeadHandle(input.sourcePort)`, return error:
    `'A Talking Head Director only outputs text: pass sourcePort "opening-frame", "clip-<n>-motion", or "clip-<n>-voice" after it is planned.'`
  - If Explainer and `!parseDirectorHandle(input.sourcePort)`, keep existing Explainer error message.
  - Allow `sourceHandle` for any `isPersistentDirectorNode(sourceNode)`.
  - Update `connect` tool description and `sourcePort` schema description to mention Talking Head Director handles (`opening-frame` / `clip-<n>-motion` / `clip-<n>-voice`).

In `src/service/canvas-agent/group-tools.ts`:
- In `replaceGroup`, check `const talkingDirector = isTalking ? target.nodes.find(isTalkingHeadDirectorNode) : undefined;`.
- If `talkingDirector` exists:
  - Refuse if `talkingDirector.data.toolParams?.planStatus === "planning"`.
  - Build `nextTp` merging `characterId`, `language`, `framing` (preserving existing values when omitted), and setting `replanRequested: true`.
  - Emit `{ kind: "update_node", nodeId: talkingDirector.id, patch }` with `prompt`, `aspectRatio`, `toolParams: nextTp`.
  - Return `{ ok: true, directorId: talkingDirector.id, nodeId: talkingDirector.id, removedCount: 0, replan: true, ... }`.

In `src/service/canvas-agent/prompt.ts`:
- Update `tool "talking-head"`, `replace_group`, and `Prompt templates` lines to describe the persistent Talking Head Director card, its `opening-frame` / `clip-<n>-motion` / `clip-<n>-voice` outputs, `Setting` support, and in-place Replan via `replace_group`.

In `AGENTS.md` and `pipeline-models.md`:
- Update the Talking Head Director canvas description so both docs accurately state that Talking Head Director stays on the canvas after planning, exposes `opening-frame`, `clip-<n>-motion`, and `clip-<n>-voice` text outputs, asks Build / Outputs only on first plan and Rebuild / Keep on clip-count change, syncs non-prompt parameters on same-count Replan, accepts a `Setting` node, and replans in place via `replace_group`.

- [ ] **Step 4: Run full verification suite**

Run:
```bash
npx tsc --noEmit
npx eslint src/service/canvas/talking-head-director.ts src/service/canvas/director-node.ts src/service/canvas/graph.ts src/service/canvas/stale-outputs.ts src/service/canvas/settings/apply.ts src/service/canvas/explainer-director-apply.ts src/service/canvas/scro-groups/talking-head.ts src/service/canvas/explainer-plan.ts src/service/canvas-agent/tools.ts src/service/canvas-agent/group-tools.ts src/service/canvas-agent/prompt.ts src/app/app/canvas/nodes/talking-head-director-card.tsx src/app/app/canvas/director-plan-decision-dialog.tsx src/app/app/canvas/canvas-workspace.tsx
npx tsx --test 'src/service/canvas/**/*.test.ts' 'src/service/canvas-agent/**/*.test.ts'
```
Expected: All type checks, lint checks, and unit tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/canvas-agent/tools.ts src/service/canvas-agent/group-tools.ts src/service/canvas-agent/prompt.ts src/service/canvas-agent/tools.test.ts src/service/canvas-agent/group-tools.test.ts AGENTS.md pipeline-models.md
git commit -m "feat(canvas-agent): support persistent Talking Head Director outputs and in-place replan"
```
