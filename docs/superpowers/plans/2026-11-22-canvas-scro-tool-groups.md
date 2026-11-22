# Canvas Scro tool groups — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to work through this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dropping Talking Head, Swap, Teleport, Life Photo, or Poster on `/app/canvas` (sidebar, template, or assistant) opens a setup dialog and lands as a group of connected nodes that build the same feature, instead of one black-box Scro node.

**Architecture:** Pure group builders in `src/service/canvas/scro-groups/` return `{ nodes, edges, outputNodeId }` laid out by a generic depth layout. The client inserts them after a dialog; the assistant inserts them through a new `add_scro_group` tool. Talking Head reuses the Explainer planner flow (`plannerMode` card → `canvasPlanOnly` video → expansion). Two new FFmpeg post nodes and three hidden Scro step nodes supply the pieces the groups need.

**Tech Stack:** Next.js 16 (webpack), React Flow `@xyflow/react`, MongoDB, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-22-canvas-scro-tool-groups-design.md`

**Global constraints**

- Reply and UI copy in Traditional Chinese where the canvas already does; keep English fallbacks (`isZh`).
- No live paid provider calls and no Higgsfield calls in tests; use injected deps.
- `canvas_jobs` stays the only charge point; backing jobs use `skipBilling: true`.
- New UI components: one file each, `"use client"` when they use hooks, placed in `src/app/app/canvas/`.
- Short comments only where the code cannot say it.
- Update `pipeline-models.md` and `AGENTS.md` in the last task.
- After every task: `npx tsc --noEmit`, `npx eslint <touched files>`, and the task's tests must pass before the commit.

**Spec adjustments made while planning**

- `swap-render` / `teleport-render` do not probe and reject long inputs. They use the node's `durationSeconds` (set from the dialog's trim length, clamped 2–15s) as the section length from 0s, so a longer input is cut to that length.
- Talking Head uses the generic depth layout (`group-layout.ts`) instead of a separate `talking-head-layout.ts`.

---

## Task 1: `ffmpeg:color-grade` and `ffmpeg:smooth-silence`

**Files**

- Modify: `src/service/canvas/model-catalog.ts` (two `FFMPEG_STATIC_MODELS` entries)
- Modify: `src/service/canvas/model-names.ts` (localized names)
- Modify: `src/service/canvas/ffmpeg-ops.ts` (args + post step + deps)
- Modify: `src/service/canvas-agent/tools.ts` (`TOOL_PARAMS_ALLOWED_KEYS`, `TOOL_PARAM_ENUMS`)
- Test: `src/service/canvas/ffmpeg-ops.test.ts`, `src/service/canvas/model-catalog.test.ts`

**Interfaces**

- `toolParams.gradeLook: "jutsu" | "talking-head" | "talking-head-selfie"` (default `jutsu`; also mirrored by `presetId`).
- `CanvasFfmpegDeps` gains `gradeTalkingHead(buffer, { handheldSelfie }) => Promise<Buffer>`.

- [ ] **Step 1: failing tests.** In `ffmpeg-ops.test.ts` add:

```ts
it("copies the input for post-only ops", () => {
  for (const id of ["ffmpeg:color-grade", "ffmpeg:smooth-silence"]) {
    const args = buildCanvasFfmpegArgs(id, {}, { videoFiles: ["in.mp4"], hasAudioByVideo: [true] }, "out.mp4");
    assert.deepEqual(args, ["-i", "in.mp4", "-c", "copy", "-y", "out.mp4"]);
  }
});

it("runs the talking-head selfie grade on ffmpeg:color-grade", async () => {
  const jobId = new ObjectId();
  let graded: { handheldSelfie?: boolean } | undefined;
  const res = await executeCanvasFfmpegJob(jobId, {
    findCanvasJob: async () => ({
      _id: jobId, clerkUserId: "u", canvasId: new ObjectId(), nodeId: "n", provider: "ffmpeg",
      modelId: "ffmpeg:color-grade", providerModelId: "color-grade", status: "queued",
      domainKind: "worker_ffmpeg", chargedUsd: 0, outputKind: "video",
      inputSnapshot: { video: "https://blob.example/in.mp4", toolParams: { gradeLook: "talking-head-selfie" } },
      createdAt: new Date(), updatedAt: new Date(),
    }),
    downloadToFile: async (_url, dest) => writeFile(dest, Buffer.from("in")),
    probeStderr: async () => "Stream #0:0: Video: h264\nStream #0:1: Audio: aac",
    runFfmpeg: async (dir, args) => writeFile(join(dir, args[args.length - 1]), Buffer.from("copy")),
    gradeTalkingHead: async (buf, opts) => { graded = opts; return buf; },
    applyColorGrade: async () => { throw new Error("wrong grade"); },
    persistBuffer: async () => "https://blob.example/out.mp4",
    updateCanvasJob: async () => {},
    updateCanvasNodeState: async () => {},
  });
  assert.equal(res.outcome, "completed");
  assert.deepEqual(graded, { handheldSelfie: true });
});
```

Check how `inputSnapshot` stores `toolParams` (read `strParam` in `ffmpeg-ops.ts`) and match the fixture to it. Run `npx tsx --test src/service/canvas/ffmpeg-ops.test.ts` and confirm both fail.

- [ ] **Step 2: catalog.** Add after `ffmpeg:extract-audio`:

```ts
{
  id: "ffmpeg:color-grade",
  provider: "ffmpeg",
  providerModelId: "color-grade",
  name: "FFmpeg Color Grade",
  category: "ffmpeg",
  inputs: [videoPort(true)],
  output: videoOutput(),
  presets: ["jutsu", "talking-head", "talking-head-selfie"],
  defaultPresetId: "jutsu",
  basePriceUsd: 0,
  supportsAspectRatio: false,
  available: true,
},
{
  id: "ffmpeg:smooth-silence",
  provider: "ffmpeg",
  providerModelId: "smooth-silence",
  name: "FFmpeg Smooth Silence",
  category: "ffmpeg",
  inputs: [videoPort(true)],
  output: videoOutput(),
  presets: ["smooth"],
  defaultPresetId: "smooth",
  basePriceUsd: 0,
  supportsAspectRatio: false,
  available: true,
},
```

Localized names: `ffmpeg:color-grade` → zh-Hant「FFmpeg 調色」, zh-Hans「FFmpeg 调色」, ja「FFmpeg カラーグレード」, ko「FFmpeg 색보정」; `ffmpeg:smooth-silence` → zh-Hant「FFmpeg 靜音修剪」, zh-Hans「FFmpeg 静音修剪」, ja「FFmpeg 無音カット」, ko「FFmpeg 무음 다듬기」. Update the count in `model-catalog.test.ts` (`ffmpeg.length` 5 → 7, total `+ 5` → `+ 7`).

- [ ] **Step 3: ffmpeg-ops.** In `buildCanvasFfmpegArgs` add before the final throw:

```ts
if (modelId === "ffmpeg:color-grade" || modelId === "ffmpeg:smooth-silence") {
  const videoFile = localInputs.videoFiles[0];
  if (!videoFile) throw new Error("需要輸入影片");
  // Post-only ops: copy the input, then the worker applies the grade / trim on the buffer.
  return ["-i", videoFile, "-c", "copy", "-y", outputFile];
}
```

Add `gradeTalkingHead` to `CanvasFfmpegDeps` and defaults (`gradeTalkingHeadSensorTextureBuffer` from `@/service/style/realistic-grade`). After the existing post steps:

```ts
if (job.modelId === "ffmpeg:smooth-silence") {
  outBuf = Buffer.from(await resolved.trimSilence(outBuf));
}
if (job.modelId === "ffmpeg:color-grade") {
  const look = strParam(snapshot, "gradeLook", strParam(snapshot, "presetId", "jutsu"));
  outBuf = Buffer.from(
    look === "jutsu"
      ? await resolved.applyColorGrade(outBuf)
      : await resolved.gradeTalkingHead(outBuf, { handheldSelfie: look === "talking-head-selfie" }),
  );
}
```

Agent allowlist: `"ffmpeg:color-grade": ["gradeLook"]`, `"ffmpeg:smooth-silence": []`, enum `gradeLook: ["jutsu", "talking-head", "talking-head-selfie"]`. Add `gradeLook?: string` to `CanvasNodeData["toolParams"]` in `src/model/canvas.ts` if the type is closed.

- [ ] **Step 4:** run the ffmpeg-ops, model-catalog, model-names, and tools tests; `npx tsc --noEmit`; eslint on touched files.
- [ ] **Step 5: commit** `feat(canvas): add FFmpeg color grade and smooth silence nodes`.

---

## Task 2: Generic group layout and group builder helper

**Files**

- Create: `src/service/canvas/group-layout.ts`, `src/service/canvas/group-layout.test.ts`
- Create: `src/service/canvas/scro-groups/builder.ts`, `src/service/canvas/scro-groups/builder.test.ts`

**Interfaces**

```ts
// group-layout.ts
export type LayoutSize = { width: number; height: number };
export const GROUP_ESTIMATED_SIZE: Record<"prompt" | "media" | "model", LayoutSize> = {
  prompt: { width: 280, height: 220 },
  media: { width: 260, height: 280 },
  model: { width: 312, height: 480 },
};
export function layoutGroupByDepth(input: {
  nodeIds: readonly string[];
  edges: readonly { source: string; target: string }[];
  origin: { x: number; y: number };
  sizeOf: (id: string) => LayoutSize;
}): Map<string, { x: number; y: number }>;

// scro-groups/builder.ts
export type GroupMediaRef =
  | { nodeId: string }
  | { url: string; name: string; mediaKind: "image" | "video" | "audio" };
export type ScroGroup = { nodes: CanvasNode[]; edges: CanvasEdge[]; outputNodeId: string };
export type GroupContext = { idPrefix: string; origin: { x: number; y: number } };
export function createGroupBuilder(ctx: GroupContext): {
  media(suffix: string, ref: GroupMediaRef): string;   // returns ref.nodeId for existing nodes
  prompt(suffix: string, text: string, label?: string): string;
  model(suffix: string, data: CanvasNodeData): string;
  wire(source: string, target: string, targetHandle: string): void;
  finish(outputNodeId: string): ScroGroup;              // lays out only the new nodes
};
```

Layout rules: depth = longest path from a group source, counting only edges between new nodes; column x = previous column x + its widest node + `GAP_X` (90); nodes in a column stack from `origin.y` with `GAP_Y` (60); columns after the first are sorted by the average stack index of their parents so wires stay short.

- [ ] **Step 1: failing tests.** `group-layout.test.ts`: a chain `a→b→c` gets strictly increasing x; two sources `a`,`b` into `c` stack without vertical overlap; no two rectangles in a 10-node fan-in overlap (use `GROUP_ESTIMATED_SIZE.model`). `builder.test.ts`: `media("v", { nodeId: "existing" })` returns `"existing"` and adds no node; `wire` builds `{ id: "s->t:h", source, sourceHandle: "output", target, targetHandle }`; `finish` gives every new node a position and ignores existing ids.
- [ ] **Step 2: implement** `layoutGroupByDepth`:

```ts
const GAP_X = 90;
const GAP_Y = 60;

export function layoutGroupByDepth(input: {...}) {
  const ids = new Set(input.nodeIds);
  const inner = input.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  const depth = new Map<string, number>(input.nodeIds.map((id) => [id, 0]));
  // Longest-path depth; groups are small DAGs so repeated relaxation is enough.
  for (let pass = 0; pass < input.nodeIds.length; pass += 1) {
    let changed = false;
    for (const e of inner) {
      const next = (depth.get(e.source) ?? 0) + 1;
      if (next > (depth.get(e.target) ?? 0)) { depth.set(e.target, next); changed = true; }
    }
    if (!changed) break;
  }
  const columns: string[][] = [];
  for (const id of input.nodeIds) (columns[depth.get(id)!] ??= []).push(id);
  const row = new Map<string, number>();
  const positions = new Map<string, { x: number; y: number }>();
  let x = input.origin.x;
  for (const column of columns.filter(Boolean)) {
    const parentRow = (id: string) => {
      const rows = inner.filter((e) => e.target === id).map((e) => row.get(e.source) ?? 0);
      return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : 0;
    };
    const ordered = positions.size === 0 ? column : [...column].sort((a, b) => parentRow(a) - parentRow(b));
    let y = input.origin.y;
    ordered.forEach((id, index) => {
      row.set(id, index);
      positions.set(id, { x, y });
      y += input.sizeOf(id).height + GAP_Y;
    });
    x += Math.max(...column.map((id) => input.sizeOf(id).width)) + GAP_X;
  }
  return positions;
}
```

Builder: node ids are `${idPrefix}-${suffix}`; `media` creates `{ type: "media", data: { label: name, fileName: name, mediaKind, mediaUrl: url } }`; `prompt` creates `{ type: "prompt", data: { label: label ?? "Prompt", text } }`; `model` creates `{ type: "model", data: { status: "idle", ...data } }`; `finish` calls `layoutGroupByDepth` with `GROUP_ESTIMATED_SIZE[node.type]`.

- [ ] **Step 3:** tests pass, tsc, eslint.
- [ ] **Step 4: commit** `feat(canvas): add generic group layout and builder`.

---

## Task 3: Life Photo and Poster groups

**Files**

- Create: `src/service/canvas/scro-groups/life.ts`, `poster.ts`, and tests `life.test.ts`, `poster.test.ts`
- Modify: `src/service/canvas/scro-dispatch.ts` (use the shared life prompt)

**Interfaces**

```ts
export const SEEDREAM_MODEL_ID = `openrouter:${OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL}`; // in builder.ts
export function buildLifePhotoPrompt(scene: string): string;
export function buildLifeGroup(ctx: GroupContext, input: {
  character: GroupMediaRef; scene: string; aspectRatio: CanvasAspectRatio;
}): ScroGroup;
export function buildPosterGroup(ctx: GroupContext, input: {
  prompt: string; character?: GroupMediaRef; product?: GroupMediaRef & { productName?: string };
  aspectRatio: CanvasAspectRatio;
}): ScroGroup;
```

- [ ] **Step 1: failing tests.** Life: 3 nodes (media, prompt, Seedream), edges `character→seedream:refImages` and `prompt→seedream:prompt`, prompt text contains `Scene and mood: <scene>`, Seedream `aspectRatio` / `presetId` equal the input, `outputNodeId` is Seedream. Empty scene falls back to `Candid natural daylight lifestyle portrait`. Poster: with neither character nor product there are 2 nodes and the prompt equals `buildPostCreatePrompt({ prompt, products: [], hasReferenceImage: false })`; with both there are 4 nodes and 2 `refImages` edges and `products: [{ name }]`.
- [ ] **Step 2: implement.**

```ts
export function buildLifePhotoPrompt(scene: string) {
  const text = scene.trim() || "Candid natural daylight lifestyle portrait";
  return (
    `Candid lifestyle photograph of the reference character. Scene and mood: ${text}. ` +
    `Natural candid framing, authentic textures, soft realistic lighting.`
  );
}

export function buildLifeGroup(ctx, input) {
  const b = createGroupBuilder(ctx);
  const character = b.media("character", input.character);
  const prompt = b.prompt("prompt", buildLifePhotoPrompt(input.scene), "Life prompt");
  const image = b.model("image", {
    modelId: SEEDREAM_MODEL_ID,
    presetId: input.aspectRatio,
    aspectRatio: input.aspectRatio,
    prompt: "",
  });
  b.wire(character, image, "refImages");
  b.wire(prompt, image, "prompt");
  return b.finish(image);
}
```

Check the Seedream canvas spec's preset ids (`findCanvasModel(SEEDREAM_MODEL_ID).presets`) and whether it has a `resolution` field on node data; set `2k` the same way `scro:life` submits today if the node supports it. In `scro-dispatch.ts`, replace the inline life prompt with `buildLifePhotoPrompt(params.inputs.prompt ?? "")`.

- [ ] **Step 3:** tests, tsc, eslint (including `scro-dispatch.test.ts`).
- [ ] **Step 4: commit** `feat(canvas): build Life and Poster node groups`.

---

## Task 4: `scro:swap-render` and `scro:teleport-render`

**Files**

- Modify: `src/service/canvas/model-catalog.ts`, `model-names.ts`, `pricing.ts`, `scro-dispatch.ts`
- Test: `scro-dispatch.test.ts`, `pricing.test.ts`, `model-catalog.test.ts`

**Interfaces**

- `scro:swap-render`: inputs `[videoPort(true), refImagesPort(6), promptPort(false)]`, output video, presets `["9:16","16:9","1:1"]`, `defaultDurationSeconds: 6`, min 2, max 15, `basePriceUsd: 0.75`, `supportsAspectRatio: false`, `hiddenInSidebar: true`. `toolParams.swapMode`: `character | object | relight` (no `colorfix`).
- `scro:teleport-render`: inputs `[videoPort(true), imagePort(true), promptPort(false)]`, same duration fields, `basePriceUsd: 0.6`, `supportsAspectRatio: true`, `hiddenInSidebar: true`.
- Pricing: swap-render = `scroSwapCostUsd({ durationSeconds })`; teleport-render = `mulUsd(VIDEO_COST_PER_SECOND_USD, clamp(round(d), 2, 15))`.

- [ ] **Step 1: failing tests.** `scro-dispatch.test.ts`: `submitScroAsyncNode` for `scro:swap-render` with `durationSeconds: 9` calls a mocked `startSwapForUser` with `sectionStart: 0`, `sectionLength: 9`, `applyColorFix: false`, `mode: "object_swap"` for `swapMode: "object"`; `scro:teleport-render` passes `sceneImageUrl`, `scenePrompt`, `applyColorFix: false`, and throws without `inputs.image`. `pricing.test.ts`: swap-render 6s = 0.75, teleport-render 6s = 0.6 and 20s clamps to 1.5. Catalog test: scro count 8 → 10, hidden list `["scro:explainer-frame", "scro:swap-render", "scro:teleport-render"]`.
- [ ] **Step 2: implement dispatch.** Extract the existing swap body into `submitSwap(params, startSwapForUser, { applyColorFix })` and call it from both ids:

```ts
if (modelId === "scro:swap" || modelId === "scro:swap-render") {
  return submitSwap(params, startSwapForUser, { applyColorFix: modelId === "scro:swap" });
}
if (modelId === "scro:teleport" || modelId === "scro:teleport-render") {
  if (modelId === "scro:teleport-render" && !inputs.image) throw new Error("Teleport 需要連接場景圖");
  return submitTeleport(params, startTeleportForUser, { applyColorFix: modelId === "scro:teleport" });
}
```

Both helpers keep today's `sectionLength: Math.min(15, Math.max(2, Math.round(node.data.durationSeconds ?? 6)))` and `sectionStart: 0`. Add both ids to the `pricing.ts` scro switch and localized names (swap-render zh-Hant「Scro Swap 換角渲染」, teleport-render zh-Hant「Teleport 換場渲染」, with zh-Hans / ja / ko). Confirm in `executor.ts` that non-sync scro ids fall through to `submitScroAsyncNode` (they do) and that `validateScroToolInputs` (if any) accepts the new ids.

- [ ] **Step 3:** tests, tsc, eslint.
- [ ] **Step 4: commit** `feat(canvas): add Swap and Teleport render step nodes`.

---

## Task 5: Swap and Teleport groups

**Files**

- Create: `src/service/canvas/scro-groups/swap.ts`, `teleport.ts`, tests
- Uses: `buildTeleportScenePlatePrompt` (find with `rg -n "export function buildTeleportScenePlatePrompt" src`)

**Interfaces**

```ts
export type SwapGroupInput = {
  video: GroupMediaRef;
  mode: "character" | "object" | "relight" | "colorfix";
  reference?: GroupMediaRef;          // character blueprint or uploaded reference
  instruction?: string;               // custom edit / relight prompt / object change-to
  objectTarget?: string;
  objectEditMode?: "change" | "add" | "remove";
  lightLookId?: string;
  sectionStart: number;               // seconds
  sectionLength: number;              // 2..15
  aspectRatio: CanvasAspectRatio;
};
export function buildSwapGroup(ctx: GroupContext, input: SwapGroupInput): ScroGroup;

export type TeleportGroupInput = {
  video: GroupMediaRef;
  scene: { kind: "image"; ref: GroupMediaRef } | { kind: "text"; text: string };
  mood?: string;
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
};
export function buildTeleportGroup(ctx: GroupContext, input: TeleportGroupInput): ScroGroup;
```

- [ ] **Step 1: failing tests.** Swap colorfix: 2 nodes (video media → `ffmpeg:color-grade` with `gradeLook: "jutsu"`). Swap character with reference and instruction: media video → `ffmpeg:trim-speed` (`ffmpegStartSec: 2`, `ffmpegEndSec: 8`, `ffmpegSpeed: 1`) → `scro:swap-render` (`durationSeconds: 6`, `toolParams.swapMode: "character"`) → color-grade; reference → `refImages`; prompt → `prompt`. Length is clamped to 2–15. Teleport with a photo: video → trim → teleport-render ← scene media on `image` → color-grade. Teleport with text: a prompt node with `buildTeleportScenePlatePrompt(text, aspect)` → Seedream (same aspect) → `image`. Mood adds a prompt node on `prompt`.
- [ ] **Step 2: implement** with `createGroupBuilder`. Swap-render node data:

```ts
b.model("render", {
  modelId: "scro:swap-render",
  presetId: input.aspectRatio,
  aspectRatio: input.aspectRatio,
  durationSeconds: length,
  prompt: "",
  toolParams: {
    swapMode: input.mode,
    ...(input.objectTarget ? { objectTarget: input.objectTarget } : {}),
    ...(input.objectEditMode ? { objectEditMode: input.objectEditMode } : {}),
    ...(input.lightLookId ? { lightLookId: input.lightLookId } : {}),
  },
});
```

Trim node: `{ modelId: "ffmpeg:trim-speed", presetId: "1x", toolParams: { ffmpegStartSec: start, ffmpegEndSec: start + length, ffmpegSpeed: 1 } }` — check the trim spec's preset ids in `model-catalog.ts` and use its default.

- [ ] **Step 3:** tests, tsc, eslint.
- [ ] **Step 4: commit** `feat(canvas): build Swap and Teleport node groups`.

---

## Task 6: Dialogs and workspace wiring for Life, Poster, Swap, Teleport

**Files**

- Create: `src/app/app/canvas/scro-dialog-shell.tsx` (portal, Esc, title, description, footer, exported `DIALOG_FIELD` class)
- Create: `src/app/app/canvas/media-pick-field.tsx` (pick a canvas media node or library asset of a kind, or upload via `uploadCanvasMediaAction`; returns a `GroupMediaRef`)
- Create: `src/app/app/canvas/life-dialog.tsx`, `poster-dialog.tsx`, `swap-dialog.tsx`, `teleport-dialog.tsx`
- Create: `src/app/app/canvas/scro-group-dialogs.tsx` (renders the open dialog, calls the builder, returns a `ScroGroup`)
- Modify: `src/app/app/canvas/canvas-workspace.tsx`, `src/app/app/canvas/explainer-plan-dialog.tsx` (move to the shell)

**Interfaces**

```ts
// scro-group-dialogs.tsx
export type ScroDialogTool = "life" | "poster" | "swap" | "teleport" | "talking-head";
export type ScroDialogState = { tool: ScroDialogTool; position: { x: number; y: number }; defaultText?: string } | null;
type Props = {
  state: ScroDialogState;
  isZh: boolean;
  assets: readonly CanvasLibraryAsset[];          // characters, products, recent outputs
  characterOptions: readonly CanvasLibraryCharacterOption[];
  canvasMedia: readonly { id: string; name: string; mediaKind: "image" | "video" | "audio"; url: string }[];
  onCancel: () => void;
  onGroup: (group: ScroGroup) => void;            // Life, Poster, Swap, Teleport
  onTalkingHead: (values: TalkingHeadDialogValues, position: { x: number; y: number }) => void;
};
```

Dialog fields (spec Section 2): Life = character (required) + scene + ratio. Poster = prompt (required) + optional character + optional product + ratio. Swap = source video (required) + mode + reference (character/object) or light look (relight) + instruction + start and length (number inputs, length 2–15, default 0 and 6) + ratio; colorfix hides the rest. Teleport = source video + scene photo or scene text (one required) + mood + start/length + ratio. Character refs come from `assets` with `source: "character"` (blueprint `url`); products from `source: "product"`.

- [ ] **Step 1:** create the shell and move `ExplainerPlanDialog` onto it without changing behaviour; check the Explainer dialog still opens from the sidebar in the dev server.
- [ ] **Step 2:** create `media-pick-field.tsx` and the four dialogs. Submit stays disabled until required fields are set.
- [ ] **Step 3: workspace.** Replace `explainerDialog` with a `scroDialog` state used by both the Explainer dialog and `ScroGroupDialogs`. In `addModelNodeAt`, open the matching dialog for `scro:life`, `scro:poster`, `scro:swap`, `scro:teleport`. In `handleApplyTemplate`, open the dialog for `scro-swap` and `teleport` (and keep `explainer`). `scro:talking-head` and the `talking-head` template keep today's behaviour until Task 8 adds that dialog. `onGroup`:

```ts
const insertScroGroup = useCallback((group: ScroGroup) => {
  setNodes((prev) => [...prev, ...group.nodes.map(toFlowNode)]);
  setEdges((prev) => [...prev, ...group.edges.map(toFlowEdge)]);
  pendingGroupLayoutRef.current = { nodeIds: group.nodes.map((n) => n.id), layout: "depth" };
  scheduleSave();
}, [...]);
```

Generalize `pendingExplainerLayoutRef` / `applyPendingExplainerLayout` to `{ nodeIds, layout: "explainer" | "depth" }`: `explainer` keeps `layoutExplainerGroup`; `depth` calls `layoutGroupByDepth` with measured sizes. Both then run `shiftGroupClearOf` against the other nodes and `fitView` on the group. Use the existing helpers for flow node/edge conversion and saving (read how `submitExplainerDialog` does it and follow it).

- [ ] **Step 4:** `npx tsc --noEmit`, eslint on the new files and the workspace. Manual check in the dev server: drag Life, Poster, Swap, Teleport; each opens its dialog, and submit lands a laid-out group with no overlap. Running nodes is not needed.
- [ ] **Step 5: commit** `feat(canvas): open setup dialogs and insert Scro tool groups`.

---

## Task 7: Talking Head planning on the server

**Files**

- Modify: `src/service/canvas/explainer-planner.ts` (planner ids), `explainer-plan.ts` (start/read for both tools), `explainer-plan-phase-b.ts` (`planCanvasTalkingHead`), `src/service/director/jobs.ts` (branch), `scro-dispatch.ts` (`framing` → `talkingHeadPoseId`, `scro:director-frame`, `ttsConversational`), `model-catalog.ts`, `model-names.ts`, `pricing.ts`, `executor.ts`
- Test: `explainer-planner.test.ts`, `explainer-plan.test.ts`, `scro-dispatch.test.ts`, `pricing.test.ts`, `executor.test.ts`

**Interfaces**

```ts
// explainer-planner.ts
export const PLANNER_MODEL_IDS = ["scro:explainer", "scro:talking-head"] as const;
export function isDirectorPlannerNode(node): boolean;   // plannerMode on either id
export const isExplainerPlannerNode = isDirectorPlannerNode; // existing callers keep working

// explainer-plan-phase-b.ts
export async function planCanvasTalkingHead(project: Project): Promise<{
  prompts: PhaseBPrompt[];           // prompt = HeyGen motion prompt per clip
  framePrompts: { clipNumber: number; prompt: string }[]; // Clip 1 only
}>;
export function talkingHeadPlanPrompts(project: Project): PhaseBPrompt[]; // pure
```

- [ ] **Step 1: failing tests.**
  - `isDirectorPlannerNode` is true for `scro:talking-head` with `plannerMode`, false without it.
  - `talkingHeadPlanPrompts` on a fixture with two clips returns `heyGenAvatarIvMotionPrompt(pose, { spokenScript: clip.englishVo, directorMotionNote: clip.motionCamera, motionPrompt: clip.motionPrompt, language })` per clip, with each clip's `durationSeconds`.
  - `createCanvasDirectorVideo` (mock the insert) sets `talkingHeadPoseId` from `toolParams.framing`.
  - `submitScroAsyncNode("scro:director-frame")` calls `submitExplainerFrame` (mocked).
  - `executeScroSyncNode("scro:tts")` with `ttsConversational: true` calls the injected `synthesizeConversational` with `{ conversational: true, language }`.
  - Pricing: `openrouter:heygen/avatar-iv` at 90s = 90 × 0.18 (cap 120).
  - Executor: HeyGen node duration follows the probed `refAudio` length (mock `probeAudioSeconds` the way the `scro:talking-head` branch already does).
- [ ] **Step 2: planner ids.** Implement `isDirectorPlannerNode`; keep the old name as an alias. In `explainer-plan.ts`, pass `modelId: loaded.node.data.modelId` to `createCanvasDirectorVideo`, and in `planStateFromVideo` branch on the planner's `modelId` (Talking Head expansion is Task 8; until then return `{ status: "failed", error: "Talking Head 展開尚未支援" }` for it).
- [ ] **Step 3: phase A branch.** In `jobs.ts` where `canvasPlanOnly` stores the plan:

```ts
const planCanvas = isTalkingHeadSkill(planned.skillSlug) ? planCanvasTalkingHead : planCanvasExplainer;
```

`planCanvasTalkingHead` returns `{ prompts: talkingHeadPlanPrompts(project), framePrompts: (await buildCanvasPlanFramePrompts(project)).filter((f) => f.clipNumber === 1) }`.

- [ ] **Step 4: dispatch.**
  - `createCanvasDirectorVideo`: when `modelId === "scro:talking-head"`, set `talkingHeadPoseId: readToolParamStr(node, "framing") ?? "collarbone-close"` (check the field name on `Project`).
  - Treat `scro:director-frame` the same as `scro:explainer-frame` in `submitScroAsyncNode`, `pricing.ts`, and the poll branch. Add the catalog entry (copy of `scro:explainer-frame`, name `Director Frame`, hidden) and localized names (zh-Hant「分鏡靜幀」).
  - `scro:tts`: when `toolParams.ttsConversational` is true, call `synthesizeSpeechWithTimestamps(voiceId, text, { conversational: true, language })` and use `.audio`. Add the dep `synthesizeConversational` for the test. Allow `ttsConversational` in the agent allowlist.
- [ ] **Step 5: HeyGen duration.** Set `CANVAS_HEYGEN_MAX_VIDEO_SECONDS = 120`. In `executor.ts`, extend the `refAudio` probe (today only for `scro:talking-head`) to `openrouter:heygen/avatar-iv`. Use the resolved duration for both the price and the OpenRouter submit (replace `node.data.durationSeconds` at the submit with the resolved value).
- [ ] **Step 6:** tests, tsc, eslint.
- [ ] **Step 7: commit** `feat(canvas): plan Talking Head on canvas without spending credit`.

---

## Task 8: Talking Head expansion, dialog, and planning card

**Files**

- Create: `src/service/canvas/scro-groups/talking-head.ts`, `talking-head.test.ts`
- Create: `src/app/app/canvas/talking-head-dialog.tsx`
- Modify: `explainer-plan.ts` (`planStateFromVideo` Talking Head branch), `nodes/explainer-planning-card.tsx` (title by tool), `nodes/model-node-card.tsx`, `canvas-workspace.tsx`, `scro-group-dialogs.tsx`

**Interfaces**

```ts
export type TalkingHeadExpansionInput = {
  idPrefix: string;
  origin: { x: number; y: number };
  plannerVideoId: string;
  aspectRatio: CanvasAspectRatio;
  language: "yue" | "zh" | "en";
  characterId?: string;
  voicePreset: string;
  framing: string;
  framePrompt: string;                                   // Clip 1 start still
  clips: { clipNumber: number; spokenLine: string; heygenPrompt: string }[];
};
export function buildTalkingHeadExpansion(input): { nodes: CanvasNode[]; edges: CanvasEdge[]; expandedNodeIds: string[] };

export type TalkingHeadDialogValues = {
  script: string; characterId: string; language: "yue" | "zh" | "en";
  framing: "collarbone-close" | "waist-up" | "handheld-selfie" | "full-body";
  aspectRatio: CanvasAspectRatio;
};
```

Node ids: `frame-1`, `voice-N`, `video-N`, `silence-N`, `grade-N`, `concat-K`.

- [ ] **Step 1: failing tests.** Two clips: 1 `scro:director-frame` (`toolParams: { plannerVideoId, clipNumber: 1 }`), 2 `scro:tts` (`ttsConversational: true`, `characterId`, `language`, `voicePreset`), 2 `openrouter:heygen/avatar-iv` (inline `prompt` = heygenPrompt), 2 `ffmpeg:smooth-silence`, 2 `ffmpeg:color-grade` (`gradeLook: "talking-head-selfie"` when framing is `handheld-selfie`, else `talking-head`), 1 concat. Edges: frame → each video `startImage`; voice N → video N `refAudio`; video → silence → grade (`video`); grades → concat `videos` in clip order. One clip: no concat. Ten clips: two chained concats. Layout: no overlapping rectangles with `GROUP_ESTIMATED_SIZE.model`.
- [ ] **Step 2: implement** with `createGroupBuilder` (ids without an extra prefix collision: use `ctx.idPrefix = input.idPrefix`) and the same concat chaining as `buildExplainerExpansion` (extract the chaining into `scro-groups/concat-chain.ts` and use it from both builders).
- [ ] **Step 3: plan state.** In `planStateFromVideo`, when the planner is `scro:talking-head`, build with `buildTalkingHeadExpansion`. `framePrompt` comes from `canvasPlan.framePrompts` clip 1, falling back to `buildFramePrompt(video, 1)`; `heygenPrompt` from `canvasPlan.prompts`; `voicePreset` from `explainerVoicePreset(language, gender)`; `framing` from `video.talkingHeadPoseId`. `idPrefix: th-<last6>`.
- [ ] **Step 4: UI.** `talking-head-dialog.tsx` on `ScroDialogShell` (script required, character required). Route `scro:talking-head` drops and the `talking-head` template to it. `onTalkingHead` in the workspace creates a planner card like `submitExplainerDialog` (`modelId: "scro:talking-head"`, `prompt: script`, `toolParams: { plannerMode: true, characterId, language, framing }`), then calls the existing `startExplainerPlan` (rename to `startDirectorPlan`). The planning card shows「Talking Head 規劃中」for `scro:talking-head`. The ready branch sets the pending layout to `depth` for Talking Head and `explainer` for Explainer.
- [ ] **Step 5:** tests, tsc, eslint. Manual check: dialog opens, card appears, and the card's poll handles `planning` (no need to wait for Gemini).
- [ ] **Step 6: commit** `feat(canvas): expand Talking Head plans into visible nodes`.

---

## Task 9: Canvas assistant `add_scro_group`

**Files**

- Modify: `src/service/canvas-agent/tools.ts`, `prompt.ts`, the tool registration (where `ask_user` and `add_model_node` are declared with `tool()`), `gaps.ts` if it inspects new nodes
- Test: `tools.test.ts`, `prompt.test.ts`

**Interfaces**

```ts
add_scro_group(g, input: {
  tool: "life" | "poster" | "swap" | "teleport" | "talking-head";
  characterId?: string; productId?: string;
  videoNodeId?: string; videoAssetId?: string;      // swap / teleport source
  sceneNodeId?: string; sceneAssetId?: string; sceneText?: string;
  referenceAssetId?: string;
  prompt?: string;                                   // scene, design prompt, instruction, mood, or script
  mode?: "character" | "object" | "relight" | "colorfix";
  objectTarget?: string; objectEditMode?: "change" | "add" | "remove"; lightLookId?: string;
  sectionStart?: number; sectionLength?: number;
  language?: "yue" | "zh" | "en"; framing?: string; aspectRatio?: CanvasAspectRatio;
}): CanvasAgentToolResult;   // { ok, nodeIds, outputNodeId } or { error }
```

- [ ] **Step 1: failing tests.** Life with a character asset: adds 3 nodes and 2 edges as ops. Swap with `videoNodeId` of an existing media node: wires from it and adds no new video node. Missing required fields return an `error` naming the field. Talking Head adds one planner card (`plannerMode`, no wires). `add_model_node` for `scro:life` / `poster` / `swap` / `teleport` / `talking-head` returns an error that mentions `add_scro_group`. Adding a group past `CANVAS_AGENT_MAX_ADDED_NODES` fails without partial ops.
- [ ] **Step 2: implement.** Resolve assets from `g.assets` (`source: "character"` by character id; product by id; any asset by id for video/scene/reference) and nodes from `g.nodes`. Build with the Task 3/5 builders using `ctx = { idPrefix: \`grp-${g.nextId()}\`, origin: nextPosition(g) }`. Push every node as `add_node` and every edge as `add_edge` (check the existing op shape for edges) and count them in `g.addedNodes`. Talking Head reuses the `scro:explainer` planner path in `add_model_node` with `modelId: "scro:talking-head"` and `toolParams: { plannerMode: true, characterId, language, framing }`; `applyAgentOps` in the workspace already starts plans for planner nodes once Task 7 widens `isDirectorPlannerNode`.
- [ ] **Step 3: prompt.** Replace the per-tool lines for these five tools with `add_scro_group` usage and the fields above; keep the Explainer and ask_user guard text. Update `prompt.test.ts` expectations.
- [ ] **Step 4:** tests, tsc, eslint.
- [ ] **Step 5: commit** `feat(canvas-agent): build Scro tool groups with add_scro_group`.

---

## Task 10: Docs and final verification

**Files**

- Modify: `pipeline-models.md`, `AGENTS.md` (canvas bullet), spec status line

- [ ] **Step 1:** document the new FFmpeg nodes, hidden step nodes, dialogs, groups, Talking Head planning and expansion, HeyGen 120s refAudio duration, `ttsConversational`, and `add_scro_group`. Mark the spec as implemented and record the two planning adjustments.
- [ ] **Step 2:** `npx tsc --noEmit`, `npx eslint src/service/canvas src/service/canvas-agent src/app/app/canvas`, `npx tsx --test 'src/service/**/*.test.ts'`.
- [ ] **Step 3: commit** `docs: canvas Scro tool groups`, then push `main`.
