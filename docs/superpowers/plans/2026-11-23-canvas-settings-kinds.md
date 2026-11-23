# Canvas Settings Node Kinds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Explainer-only `settings` node into one node type with `kind: "explainer" | "swap" | "teleport"`, where Swap and Teleport settings are merged into their wired trim / render / grade nodes at run time.

**Architecture:** `CanvasNodeData.settings` becomes a union keyed by `kind`. A registry (`src/service/canvas/settings/`) gives each kind `accepts`, `resolve`, `defaults`, `changed`. A pure `withWiredSettings(nodes, edges)` merges resolved values into targets; the executor, the model card, and stale marking all use it. Explainer keeps its draft / Apply / Replan flow; its `resolve` is empty.

**Tech Stack:** Next.js 16 (webpack), React Flow (`@xyflow/react`), Zod 4, MongoDB, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-23-canvas-settings-kinds-design.md`

## Global Constraints

- Reply and UI copy: Traditional Chinese first (`isZh`), English fallback; keep identifiers in English.
- No live paid provider calls and no Higgsfield calls in tests or verification. Tests use pure functions or injected deps.
- New UI components go in their own file next to the canvas page (`src/app/app/canvas/nodes/`), with `"use client"` when they use hooks.
- Add short comments only for constraints the code cannot show.
- Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`. Tests: `npx tsx --test <file>`.
- `AGENTS.md` and `pipeline-models.md` canvas sections are updated in the last task.
- The settings target handle id stays `"settings"`.
- Sections clamp to 2–15 s (`clampSectionLength`). Grade looks are `"jutsu" | "talking-head" | "talking-head-selfie"`, default `"jutsu"`.

## File Structure

Create:
- `src/model/canvas-settings.ts` — Swap / Teleport value types, `CanvasSettingsData` union, Zod schemas.
- `src/service/canvas/settings/section.ts` — `clampSectionLength`, `trimToolParams` (moved from `scro-groups/swap.ts`).
- `src/service/canvas/settings/types.ts` — `SettingsKindDef`, `SettingsPatch`, `SETTINGS_HANDLE`.
- `src/service/canvas/settings/explainer.ts`, `swap.ts`, `teleport.ts` — one kind each.
- `src/service/canvas/settings/registry.ts` — kind lookup, `settingsAccepts`, `acceptsAnySettings`, `explainerSettingsOf`, `explainerSettingsPatch`.
- `src/service/canvas/settings/apply.ts` — `withWiredSettings`, `settingsOverridesById`, `settingsStaleTargets`.
- `src/service/canvas/settings/migrate.ts` — legacy `explainerSettings` conversion and Swap / Teleport settings backfill.
- `src/service/canvas-agent/settings-tool.ts` — `update_settings`.
- `src/app/app/canvas/nodes/settings-node-card.tsx`, `swap-settings-node-card.tsx`, `teleport-settings-node-card.tsx`, `canvas-settings-tool.tsx`.
- Tests next to each service file.

Modify: `src/model/canvas.ts`, `src/service/canvas/explainer-settings.ts`, `explainer-settings-migrate.ts`, `stale-outputs.ts`, `graph.ts`, `executor.ts`, `scro-groups/swap.ts`, `scro-groups/teleport.ts`, `src/service/canvas-agent/tools.ts`, `explainer-settings-tool.ts`, `group-tools.ts`, `prompt.ts`, `src/app/app/canvas/canvas-workspace.tsx`, `page.tsx`, `canvas-sidebar.tsx`, `nodes/explainer-settings-node-card.tsx`, `nodes/model-node-card.tsx`, `nodes/port-colors.ts`, `nodes/outdated-notice.tsx`, `AGENTS.md`, `pipeline-models.md`.

---

### Task 1: Settings union and legacy rename

Moves `data.explainerSettings` to `data.settings` with `kind: "explainer"` everywhere, with no behavior change.

**Files:**
- Create: `src/model/canvas-settings.ts`, `src/service/canvas/settings/registry.ts` (helpers only in this task), `src/service/canvas/settings/migrate.ts`, `src/service/canvas/settings/migrate.test.ts`
- Modify: `src/model/canvas.ts:6-9,53-59,253`, every reader listed by `rg -n "explainerSettings" src scripts` except the pure helper names in `explainer-settings.ts` (`explainerSettingsChanges`, `explainerSettingsToolParams`, `explainerSettingsFromVideo`, `explainerSettingsEdges`, `explainerSettingsNodeId`, `explainerSettingsFromToolParams`), plus their tests.

**Interfaces:**
- Produces:
  - `type SwapSettings`, `type TeleportSettings`, `type CanvasSettingsData`, `type CanvasSettingsKind`, `canvasSettingsDataSchema`, `SWAP_SETTINGS_MODES`, `SWAP_OBJECT_EDIT_MODES`, `CANVAS_GRADE_LOOKS` from `@/model/canvas-settings`.
  - `explainerSettingsOf(data: CanvasNodeData): ExplainerSettingsNodeData | undefined` and `explainerSettingsPatch(next: ExplainerSettingsNodeData): Pick<CanvasNodeData, "settings">` from `@/service/canvas/settings/registry`.
  - `upgradeLegacySettingsNodes(nodes: readonly CanvasNode[]): { nodes: CanvasNode[]; changed: boolean }` from `@/service/canvas/settings/migrate`.

- [ ] **Step 1: Write the model file**

`src/model/canvas-settings.ts`:

```ts
import { z } from "zod";
import type { CanvasAspectRatio } from "@/model/canvas";
import {
  explainerSettingsSchema,
  type ExplainerSettingsNodeData,
} from "@/model/explainer-settings";

export const SWAP_SETTINGS_MODES = ["character", "object", "relight", "colorfix"] as const;
export const SWAP_OBJECT_EDIT_MODES = ["change", "add", "remove"] as const;
export const CANVAS_GRADE_LOOKS = ["jutsu", "talking-head", "talking-head-selfie"] as const;
export type CanvasGradeLook = (typeof CANVAS_GRADE_LOOKS)[number];

export type SwapSettings = {
  swapMode: (typeof SWAP_SETTINGS_MODES)[number];
  objectTarget?: string;
  objectEditMode?: (typeof SWAP_OBJECT_EDIT_MODES)[number];
  lightLookId?: string;
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
  gradeLook: CanvasGradeLook;
};

export type TeleportSettings = {
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
  mood?: string;
  gradeLook: CanvasGradeLook;
};

// One settings node; `kind` picks the card, the targets it accepts, and how it applies.
export type CanvasSettingsData =
  | ({ kind: "explainer" } & ExplainerSettingsNodeData)
  | { kind: "swap"; values: SwapSettings }
  | { kind: "teleport"; values: TeleportSettings };
export type CanvasSettingsKind = CanvasSettingsData["kind"];

const aspectRatioSchema = z.enum(["16:9", "9:16", "1:1", "4:3", "3:4"]);
const sectionStart = z.number().finite().min(0);
const sectionLength = z.number().finite().min(2).max(15);

export const swapSettingsSchema = z.object({
  swapMode: z.enum(SWAP_SETTINGS_MODES),
  objectTarget: z.string().max(200).optional(),
  objectEditMode: z.enum(SWAP_OBJECT_EDIT_MODES).optional(),
  lightLookId: z.string().max(80).optional(),
  sectionStart,
  sectionLength,
  aspectRatio: aspectRatioSchema,
  gradeLook: z.enum(CANVAS_GRADE_LOOKS),
});

export const teleportSettingsSchema = z.object({
  sectionStart,
  sectionLength,
  aspectRatio: aspectRatioSchema,
  mood: z.string().max(400).optional(),
  gradeLook: z.enum(CANVAS_GRADE_LOOKS),
});

export const canvasSettingsDataSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("explainer"),
    plannerVideoId: z.string().min(1),
    topic: z.string(),
    applied: explainerSettingsSchema,
    pending: explainerSettingsSchema.optional(),
    draft: explainerSettingsSchema.optional(),
  }),
  z.object({ kind: z.literal("swap"), values: swapSettingsSchema }),
  z.object({ kind: z.literal("teleport"), values: teleportSettingsSchema }),
]) as unknown as z.ZodType<CanvasSettingsData>;
```

`explainerSettingsSchema` in `src/model/explainer-settings.ts` is typed `z.ZodType<ExplainerSettings>`; that is fine inside `z.object`.

- [ ] **Step 2: Switch `CanvasNodeData` to `settings`**

In `src/model/canvas.ts`, replace the `explainer-settings` import with:

```ts
import { type CanvasSettingsData, canvasSettingsDataSchema } from "@/model/canvas-settings";
```

Replace the `explainerSettings?: ExplainerSettingsNodeData;` field and its comment with:

```ts
  // Settings node fields (`type: "settings"`); `kind` says which tool the settings are for.
  settings?: CanvasSettingsData;
```

Replace `explainerSettings: explainerSettingsNodeDataSchema.optional(),` with `settings: canvasSettingsDataSchema.optional(),`. Update the `CanvasNodeType` comment to `// "settings" holds a tool's settings (Explainer, Swap, Teleport); it never runs.`

`canvas-settings.ts` imports `CanvasAspectRatio` from `canvas.ts` as a type only, so the import cycle is type-only and safe.

- [ ] **Step 3: Write the explainer helpers**

`src/service/canvas/settings/registry.ts` (this task only adds the two helpers; Task 2 adds the registry):

```ts
// Settings node kinds and helpers to read or write each kind's data.

import type { CanvasNodeData } from "@/model/canvas";
import type { ExplainerSettingsNodeData } from "@/model/explainer-settings";

export function explainerSettingsOf(data: CanvasNodeData): ExplainerSettingsNodeData | undefined {
  if (data.settings?.kind !== "explainer") return undefined;
  const { kind: _kind, ...rest } = data.settings;
  return rest;
}

export function explainerSettingsPatch(next: ExplainerSettingsNodeData): Pick<CanvasNodeData, "settings"> {
  return { settings: { kind: "explainer", ...next } };
}
```

If ESLint flags `_kind` as unused, use `// eslint-disable-next-line @typescript-eslint/no-unused-vars` on that line.

- [ ] **Step 4: Write the failing legacy conversion test**

`src/service/canvas/settings/migrate.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasNode } from "@/model/canvas";
import { upgradeLegacySettingsNodes } from "@/service/canvas/settings/migrate";

const applied = {
  skillSlug: "paper-cutout-explainer-video-director",
  backgroundId: "wood-cardboard",
  textStyleId: "handwritten",
  sceneTextLanguage: "zh-Hant",
  presenterPosition: "auto",
} as const;

describe("upgradeLegacySettingsNodes", () => {
  it("moves explainerSettings into settings with kind explainer", () => {
    const legacy = {
      id: "exp-abc123-settings",
      type: "settings",
      position: { x: 0, y: 0 },
      data: { label: "解說設定", explainerSettings: { plannerVideoId: "v1", topic: "t", applied } },
    } as unknown as CanvasNode;
    const res = upgradeLegacySettingsNodes([legacy]);
    assert.equal(res.changed, true);
    assert.deepEqual(res.nodes[0]!.data, {
      label: "解說設定",
      settings: { kind: "explainer", plannerVideoId: "v1", topic: "t", applied },
    });
    assert.equal(upgradeLegacySettingsNodes(res.nodes).changed, false);
  });
});
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `npx tsx --test src/service/canvas/settings/migrate.test.ts`
Expected: FAIL, cannot find module `@/service/canvas/settings/migrate`.

- [ ] **Step 6: Implement the conversion**

`src/service/canvas/settings/migrate.ts`:

```ts
// Brings canvases saved before settings kinds up to date when they load.

import type { CanvasNode } from "@/model/canvas";
import type { ExplainerSettingsNodeData } from "@/model/explainer-settings";

type LegacyData = CanvasNode["data"] & { explainerSettings?: ExplainerSettingsNodeData };

// Older Explainer Settings nodes stored their data under `explainerSettings`.
export function upgradeLegacySettingsNodes(nodes: readonly CanvasNode[]): { nodes: CanvasNode[]; changed: boolean } {
  let changed = false;
  const next = nodes.map((node) => {
    const data = node.data as LegacyData;
    if (!data.explainerSettings) return node;
    changed = true;
    const { explainerSettings, ...rest } = data;
    return { ...node, data: { ...rest, settings: { kind: "explainer" as const, ...explainerSettings } } };
  });
  return { nodes: next, changed };
}
```

- [ ] **Step 7: Run the test and confirm it passes**

Run: `npx tsx --test src/service/canvas/settings/migrate.test.ts`
Expected: PASS.

- [ ] **Step 8: Run the conversion on page load**

In `src/service/canvas/explainer-settings-migrate.ts`, at the top of `ensureExplainerSettingsNodes`:

```ts
  const upgraded = upgradeLegacySettingsNodes(project.nodes);
  project = upgraded.changed ? { ...project, nodes: upgraded.nodes } : project;
```

Make the parameter `let`-assignable by renaming it: `export async function ensureExplainerSettingsNodes(loaded: CanvasProject)` and `let project = loaded;` before those lines. At the end, when `!next.changed` but `upgraded.changed`, still persist the nodes:

```ts
  if (!next.changed) {
    if (!upgraded.changed) return project;
    const updatedAt = new Date();
    await (await canvasProjectsCollection()).updateOne(
      { _id: project._id, clerkUserId: project.clerkUserId },
      { $set: { nodes: project.nodes, updatedAt } },
    );
    return { ...project, updatedAt };
  }
```

Also run the conversion before the early `if (suffixes.size === 0) return project;` by moving that return into the same "persist if upgraded" branch: replace `if (suffixes.size === 0) return project;` with `if (suffixes.size === 0) return persistUpgrade();`, where `persistUpgrade` is a local `async () => { ... }` holding the block above (returns `project` unchanged when `!upgraded.changed`).

- [ ] **Step 9: Rename every reader and writer**

Run `rg -n "explainerSettings[^A-Z(]" src scripts` (this skips the helper functions named `explainerSettingsChanges(` etc.). For each hit:
- Read `node.data.explainerSettings` → `explainerSettingsOf(node.data)`.
- Filter `n.type === "settings" && n.data.explainerSettings` → `n.type === "settings" && explainerSettingsOf(n.data)`.
- Write `{ explainerSettings: X }` → `explainerSettingsPatch(X)`.
- In `buildExplainerSettingsNode` (`explainer-settings.ts:210`): `data: { label: "解說設定", ...explainerSettingsPatch(input.data) }`.
- In `canvas-workspace.tsx:1140`: `data: { ...n.data, ...explainerSettingsPatch({ ...data, applied, pending: undefined, draft: undefined }) }`.
- In `explainer-settings-node-card.tsx`: `const settings = explainerSettingsOf(data);` and `onUpdateNodeData(id, explainerSettingsPatch({ ...settings, draft }))`.
- In `canvas-agent/tools.ts:300`: compute `const explainer = explainerSettingsOf(node.data);` and keep the same output keys (`explainerSettings`, `pendingSettings`).
- In `explainer-settings-tool.ts:87`: `const patch = explainerSettingsPatch({ ...data, pending: next });`.
- In tests, replace fixtures `data: { explainerSettings: X }` with `data: { settings: { kind: "explainer", ...X } }` and reads with `explainerSettingsOf(...)`.

Import both helpers from `@/service/canvas/settings/registry`.

- [ ] **Step 10: Typecheck and run the affected tests**

Run: `npx tsc --noEmit`
Expected: no errors. Any remaining error points at a missed `explainerSettings` site; fix it the same way.

Run: `npx tsx --test 'src/service/canvas/**/*.test.ts' 'src/service/canvas-agent/**/*.test.ts'`
Expected: all pass.

- [ ] **Step 11: Commit**

```bash
git add src/model src/service/canvas src/service/canvas-agent src/app/app/canvas scripts
git commit -m "refactor(canvas): store settings node data as a kind union"
```

---

### Task 2: Settings registry for Explainer, Swap, Teleport

**Files:**
- Create: `src/service/canvas/settings/section.ts`, `types.ts`, `explainer.ts`, `swap.ts`, `teleport.ts`, `registry.test.ts`
- Modify: `src/service/canvas/settings/registry.ts`, `src/service/canvas/scro-groups/swap.ts:26-38`

**Interfaces:**
- Consumes: `CanvasSettingsData`, `SwapSettings`, `TeleportSettings` (Task 1).
- Produces:
  - `SETTINGS_HANDLE = "settings"`.
  - `type SettingsPatch = Partial<Pick<CanvasNodeData, "aspectRatio" | "presetId" | "durationSeconds" | "prompt">> & { toolParams?: Record<string, unknown> }`.
  - `type SettingsResolveContext = { hasPromptWire: boolean }`.
  - `settingsKindDef(kind: CanvasSettingsKind): SettingsKindDef`.
  - `settingsAccepts(settings: CanvasSettingsData, target: SettingsTarget): boolean`.
  - `acceptsAnySettings(target: SettingsTarget): boolean`.
  - `resolveSettings(settings: CanvasSettingsData, target: SettingsTarget, ctx: SettingsResolveContext): SettingsPatch`.
  - `settingsChangedKeys(a: CanvasSettingsData, b: CanvasSettingsData): string[]`.
  - `defaultSettings(kind: "swap" | "teleport"): CanvasSettingsData`.
  - `clampSectionLength(seconds: number): number`, `trimToolParams(start: number, length: number)` from `section.ts`.

- [ ] **Step 1: Move the section helpers**

`src/service/canvas/settings/section.ts`:

```ts
// Section math shared by Swap / Teleport groups and their settings. Comfy renders 2–15s per job.

export function clampSectionLength(seconds: number): number {
  return Math.min(15, Math.max(2, Math.round(Number.isFinite(seconds) ? seconds : 6)));
}

export function trimToolParams(start: number, length: number) {
  const from = Math.max(0, Number.isFinite(start) ? start : 0);
  return { ffmpegStartSec: from, ffmpegEndSec: from + clampSectionLength(length), ffmpegSpeed: 1 };
}
```

In `src/service/canvas/scro-groups/swap.ts`, delete the local `clampSectionLength`, re-export it, and build `buildTrimNode` from `trimToolParams`:

```ts
import { clampSectionLength, trimToolParams } from "@/service/canvas/settings/section";

export { clampSectionLength };

export function buildTrimNode(start: number, length: number) {
  return { modelId: "ffmpeg:trim-speed", presetId: "1.0x", toolParams: trimToolParams(start, length) };
}
```

Callers already pass a clamped length, so `ffmpegEndSec` is unchanged. Run `npx tsx --test src/service/canvas/scro-groups/swap-teleport.test.ts` and expect PASS.

- [ ] **Step 2: Write the types**

`src/service/canvas/settings/types.ts`:

```ts
import type { CanvasNode, CanvasNodeData } from "@/model/canvas";
import type { CanvasSettingsData, CanvasSettingsKind } from "@/model/canvas-settings";

// Target handle that settings edges land on. It is not a model input port.
export const SETTINGS_HANDLE = "settings";

export type SettingsTarget = { id: string; type: CanvasNode["type"]; data: CanvasNodeData };

// Fields a settings node writes over its target before the target runs.
export type SettingsPatch = Partial<Pick<CanvasNodeData, "aspectRatio" | "presetId" | "durationSeconds" | "prompt">> & {
  toolParams?: Record<string, unknown>;
};

export type SettingsResolveContext = { hasPromptWire: boolean };

export type SettingsKindDef<K extends CanvasSettingsKind = CanvasSettingsKind> = {
  kind: K;
  label: { zh: string; en: string };
  color: string;
  accepts(target: SettingsTarget): boolean;
  resolve(
    settings: Extract<CanvasSettingsData, { kind: K }>,
    target: SettingsTarget,
    ctx: SettingsResolveContext,
  ): SettingsPatch;
  changed(a: Extract<CanvasSettingsData, { kind: K }>, b: Extract<CanvasSettingsData, { kind: K }>): string[];
  defaults?(): Extract<CanvasSettingsData, { kind: K }>;
};
```

- [ ] **Step 3: Write the failing registry test**

`src/service/canvas/settings/registry.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasSettingsData } from "@/model/canvas-settings";
import {
  acceptsAnySettings,
  defaultSettings,
  resolveSettings,
  settingsAccepts,
  settingsChangedKeys,
} from "@/service/canvas/settings/registry";
import type { SettingsTarget } from "@/service/canvas/settings/types";

const model = (id: string, modelId: string): SettingsTarget => ({ id, type: "model", data: { modelId } });
const trim = model("swap-abc123-trim", "ffmpeg:trim-speed");
const swapRender = model("swap-abc123-render", "scro:swap-render");
const teleportRender = model("teleport-abc123-render", "scro:teleport-render");
const grade = model("swap-abc123-grade", "ffmpeg:color-grade");
const frame = model("exp-abc123-frame-1", "google:gemini-nano-banana-2.1");
const tts = model("x-voice-1", "scro:tts");

const swap: CanvasSettingsData = {
  kind: "swap",
  values: {
    swapMode: "relight",
    lightLookId: "golden_halo",
    sectionStart: 2,
    sectionLength: 40,
    aspectRatio: "9:16",
    gradeLook: "jutsu",
  },
};
const teleport: CanvasSettingsData = {
  kind: "teleport",
  values: { sectionStart: 0, sectionLength: 5, aspectRatio: "16:9", mood: "neon rain", gradeLook: "talking-head" },
};
const explainer: CanvasSettingsData = {
  kind: "explainer",
  plannerVideoId: "v1",
  topic: "t",
  applied: {
    skillSlug: "paper-cutout-explainer-video-director",
    textStyleId: "handwritten",
    sceneTextLanguage: "zh-Hant",
    presenterPosition: "auto",
  },
};
const noWire = { hasPromptWire: false };

describe("settings registry", () => {
  it("accepts only the targets of each kind", () => {
    assert.equal(settingsAccepts(swap, trim), true);
    assert.equal(settingsAccepts(swap, swapRender), true);
    assert.equal(settingsAccepts(swap, teleportRender), false);
    assert.equal(settingsAccepts(teleport, teleportRender), true);
    assert.equal(settingsAccepts(explainer, frame), true);
    assert.equal(settingsAccepts(explainer, trim), false);
    assert.equal(acceptsAnySettings(tts), false);
    assert.equal(acceptsAnySettings(grade), true);
  });

  it("resolves trim, render, and grade fields from Swap values", () => {
    assert.deepEqual(resolveSettings(swap, trim, noWire), {
      presetId: "1.0x",
      toolParams: { ffmpegStartSec: 2, ffmpegEndSec: 17, ffmpegSpeed: 1 },
    });
    assert.deepEqual(resolveSettings(swap, swapRender, noWire), {
      aspectRatio: "9:16",
      presetId: "9:16",
      durationSeconds: 15,
      toolParams: { swapMode: "relight", lightLookId: "golden_halo" },
    });
    assert.deepEqual(resolveSettings(swap, grade, noWire), { presetId: "jutsu", toolParams: { gradeLook: "jutsu" } });
  });

  it("uses Teleport mood as the render prompt only when no prompt is wired", () => {
    assert.equal(resolveSettings(teleport, teleportRender, noWire).prompt, "neon rain");
    assert.equal(resolveSettings(teleport, teleportRender, { hasPromptWire: true }).prompt, undefined);
    assert.equal(resolveSettings(teleport, teleportRender, noWire).durationSeconds, 5);
  });

  it("resolves nothing for Explainer, whose values live in the frame prompts", () => {
    assert.deepEqual(resolveSettings(explainer, frame, noWire), {});
  });

  it("lists changed keys and gives defaults for hand-added nodes", () => {
    const next: CanvasSettingsData = { kind: "swap", values: { ...(swap.kind === "swap" ? swap.values : ({} as never)), gradeLook: "talking-head" } };
    assert.deepEqual(settingsChangedKeys(swap, next), ["gradeLook"]);
    assert.equal(defaultSettings("swap").kind, "swap");
    assert.equal(defaultSettings("teleport").kind, "teleport");
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `npx tsx --test src/service/canvas/settings/registry.test.ts`
Expected: FAIL, `acceptsAnySettings` is not exported.

- [ ] **Step 5: Write the three kinds**

`src/service/canvas/settings/explainer.ts`:

```ts
// Explainer settings: applied by Apply / Replan into the frame prompts, so nothing merges at run time.

import { explainerSettingsChanges } from "@/service/canvas/explainer-settings";
import type { SettingsKindDef } from "@/service/canvas/settings/types";

const FRAME_ID = /-frame-\d+$/;

export const explainerSettingsKind: SettingsKindDef<"explainer"> = {
  kind: "explainer",
  label: { zh: "解說設定", en: "Explainer Settings" },
  color: "#f472b6",
  accepts: (target) => target.type === "model" && FRAME_ID.test(target.id),
  resolve: () => ({}),
  changed: (a, b) => explainerSettingsChanges(a.applied, b.applied).changed,
};
```

`src/service/canvas/settings/swap.ts`:

```ts
// Swap settings: section, mode, light, ratio, and grade, merged into trim / render / grade at run time.

import { clampSectionLength, trimToolParams } from "@/service/canvas/settings/section";
import type { SettingsKindDef } from "@/service/canvas/settings/types";

export const swapSettingsKind: SettingsKindDef<"swap"> = {
  kind: "swap",
  label: { zh: "Swap 設定", en: "Swap Settings" },
  color: "#a78bfa",
  accepts: (target) =>
    target.type === "model" &&
    ["ffmpeg:trim-speed", "scro:swap-render", "ffmpeg:color-grade"].includes(target.data.modelId ?? ""),
  resolve: ({ values }, target) => {
    switch (target.data.modelId) {
      case "ffmpeg:trim-speed":
        return { presetId: "1.0x", toolParams: trimToolParams(values.sectionStart, values.sectionLength) };
      case "scro:swap-render":
        return {
          aspectRatio: values.aspectRatio,
          presetId: values.aspectRatio,
          durationSeconds: clampSectionLength(values.sectionLength),
          toolParams: {
            swapMode: values.swapMode,
            ...(values.objectTarget ? { objectTarget: values.objectTarget } : {}),
            ...(values.objectEditMode ? { objectEditMode: values.objectEditMode } : {}),
            ...(values.lightLookId ? { lightLookId: values.lightLookId } : {}),
          },
        };
      case "ffmpeg:color-grade":
        return { presetId: values.gradeLook, toolParams: { gradeLook: values.gradeLook } };
      default:
        return {};
    }
  },
  changed: (a, b) =>
    (Object.keys({ ...a.values, ...b.values }) as (keyof typeof a.values)[]).filter(
      (key) => JSON.stringify(a.values[key]) !== JSON.stringify(b.values[key]),
    ),
  defaults: () => ({
    kind: "swap",
    values: { swapMode: "character", sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
  }),
};
```

`src/service/canvas/settings/teleport.ts`:

```ts
// Teleport settings: section, ratio, mood, and grade, merged into trim / render / grade at run time.

import { clampSectionLength, trimToolParams } from "@/service/canvas/settings/section";
import type { SettingsKindDef } from "@/service/canvas/settings/types";

export const teleportSettingsKind: SettingsKindDef<"teleport"> = {
  kind: "teleport",
  label: { zh: "Teleport 設定", en: "Teleport Settings" },
  color: "#38bdf8",
  accepts: (target) =>
    target.type === "model" &&
    ["ffmpeg:trim-speed", "scro:teleport-render", "ffmpeg:color-grade"].includes(target.data.modelId ?? ""),
  resolve: ({ values }, target, ctx) => {
    switch (target.data.modelId) {
      case "ffmpeg:trim-speed":
        return { presetId: "1.0x", toolParams: trimToolParams(values.sectionStart, values.sectionLength) };
      case "scro:teleport-render": {
        const mood = values.mood?.trim();
        return {
          aspectRatio: values.aspectRatio,
          presetId: values.aspectRatio,
          durationSeconds: clampSectionLength(values.sectionLength),
          // A wired Mood prompt node still wins over the settings mood.
          ...(mood && !ctx.hasPromptWire ? { prompt: mood } : {}),
        };
      }
      case "ffmpeg:color-grade":
        return { presetId: values.gradeLook, toolParams: { gradeLook: values.gradeLook } };
      default:
        return {};
    }
  },
  changed: (a, b) =>
    (Object.keys({ ...a.values, ...b.values }) as (keyof typeof a.values)[]).filter(
      (key) => JSON.stringify(a.values[key]) !== JSON.stringify(b.values[key]),
    ),
  defaults: () => ({
    kind: "teleport",
    values: { sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
  }),
};
```

- [ ] **Step 6: Add the registry functions**

Append to `src/service/canvas/settings/registry.ts`:

```ts
import type { CanvasSettingsData, CanvasSettingsKind } from "@/model/canvas-settings";
import { explainerSettingsKind } from "@/service/canvas/settings/explainer";
import { swapSettingsKind } from "@/service/canvas/settings/swap";
import { teleportSettingsKind } from "@/service/canvas/settings/teleport";
import type {
  SettingsKindDef,
  SettingsPatch,
  SettingsResolveContext,
  SettingsTarget,
} from "@/service/canvas/settings/types";

const KINDS = {
  explainer: explainerSettingsKind,
  swap: swapSettingsKind,
  teleport: teleportSettingsKind,
} as const;

export const SETTINGS_KINDS = Object.values(KINDS) as readonly SettingsKindDef[];

export function settingsKindDef(kind: CanvasSettingsKind): SettingsKindDef {
  return KINDS[kind] as unknown as SettingsKindDef;
}

export function settingsAccepts(settings: CanvasSettingsData, target: SettingsTarget): boolean {
  return settingsKindDef(settings.kind).accepts(target);
}

// Whether a model node shows a settings handle at all.
export function acceptsAnySettings(target: SettingsTarget): boolean {
  return SETTINGS_KINDS.some((def) => def.accepts(target));
}

export function resolveSettings(
  settings: CanvasSettingsData,
  target: SettingsTarget,
  ctx: SettingsResolveContext,
): SettingsPatch {
  const def = settingsKindDef(settings.kind);
  return def.accepts(target) ? def.resolve(settings as never, target, ctx) : {};
}

export function settingsChangedKeys(a: CanvasSettingsData, b: CanvasSettingsData): string[] {
  if (a.kind !== b.kind) return ["kind"];
  return settingsKindDef(a.kind).changed(a as never, b as never);
}

export function defaultSettings(kind: "swap" | "teleport"): CanvasSettingsData {
  return KINDS[kind].defaults!();
}
```

Move the imports to the top of the file alongside the Task 1 imports.

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `npx tsx --test src/service/canvas/settings/registry.test.ts src/service/canvas/scro-groups/swap-teleport.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/service/canvas/settings src/service/canvas/scro-groups/swap.ts
git commit -m "feat(canvas): settings kind registry for Explainer, Swap, Teleport"
```

---

### Task 3: Run-time merge in the executor

**Files:**
- Create: `src/service/canvas/settings/apply.ts`, `src/service/canvas/settings/apply.test.ts`
- Modify: `src/service/canvas/executor.ts` (`submitCanvasNodeJob` after `findCanvasProject`, `dispatchQueuedCanvasJobById:923-924`), `src/service/canvas/executor.test.ts`

**Interfaces:**
- Consumes: `resolveSettings`, `SETTINGS_HANDLE` (Task 2).
- Produces:
  - `withWiredSettings<N extends CanvasNode>(nodes: readonly N[], edges: readonly CanvasEdge[]): N[]`.
  - `settingsOverridesById(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[]): Map<string, SettingsPatch>`.
  - `settingsStaleTargets(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[], settingsNodeId: string, next: CanvasSettingsData): string[]`.

- [ ] **Step 1: Write the failing merge tests**

`src/service/canvas/settings/apply.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { CanvasSettingsData } from "@/model/canvas-settings";
import { settingsStaleTargets, withWiredSettings } from "@/service/canvas/settings/apply";

const swap: CanvasSettingsData = {
  kind: "swap",
  values: { swapMode: "character", sectionStart: 1, sectionLength: 8, aspectRatio: "16:9", gradeLook: "jutsu" },
};
const settings: CanvasNode = { id: "s", type: "settings", position: { x: 0, y: 0 }, data: { settings: swap } };
const render: CanvasNode = {
  id: "r",
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId: "scro:swap-render", durationSeconds: 6, aspectRatio: "9:16", toolParams: { swapMode: "object", keep: 1 } },
};
const grade: CanvasNode = {
  id: "g",
  type: "model",
  position: { x: 0, y: 0 },
  data: { modelId: "ffmpeg:color-grade", toolParams: { gradeLook: "jutsu" } },
};
const edge = (source: string, target: string, targetHandle = "settings"): CanvasEdge => ({
  id: `${source}->${target}:${targetHandle}`,
  source,
  sourceHandle: "output",
  target,
  targetHandle,
});

describe("withWiredSettings", () => {
  it("writes the settings values over the wired target and keeps other tool params", () => {
    const out = withWiredSettings([settings, render], [edge("s", "r")]);
    const r = out.find((n) => n.id === "r")!;
    assert.equal(r.data.durationSeconds, 8);
    assert.equal(r.data.aspectRatio, "16:9");
    assert.deepEqual(r.data.toolParams, { swapMode: "character", keep: 1 });
  });

  it("leaves an unwired target as it is", () => {
    const out = withWiredSettings([settings, render], []);
    assert.deepEqual(out.find((n) => n.id === "r")!.data, render.data);
  });

  it("ignores a settings edge whose kind does not accept the target", () => {
    const tts: CanvasNode = { id: "t", type: "model", position: { x: 0, y: 0 }, data: { modelId: "scro:tts", prompt: "hi" } };
    const out = withWiredSettings([settings, tts], [edge("s", "t")]);
    assert.deepEqual(out.find((n) => n.id === "t")!.data, tts.data);
  });
});

describe("settingsStaleTargets", () => {
  it("returns only targets whose resolved values change", () => {
    const next: CanvasSettingsData = { kind: "swap", values: { ...(swap as { values: object }).values, gradeLook: "talking-head" } } as CanvasSettingsData;
    const edges = [edge("s", "r"), edge("s", "g")];
    assert.deepEqual(settingsStaleTargets([settings, render, grade], edges, "s", next), ["g"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx tsx --test src/service/canvas/settings/apply.test.ts`
Expected: FAIL, cannot find module `@/service/canvas/settings/apply`.

- [ ] **Step 3: Implement the merge**

`src/service/canvas/settings/apply.ts`:

```ts
// Pure: merges each wired settings node into its targets. Settings values win over the
// target's own values, which stay stored on the node as the fallback when unwired.

import type { CanvasEdge, CanvasNode, CanvasNodeData } from "@/model/canvas";
import type { CanvasSettingsData } from "@/model/canvas-settings";
import { resolveSettings } from "@/service/canvas/settings/registry";
import { SETTINGS_HANDLE, type SettingsPatch } from "@/service/canvas/settings/types";

function mergePatch(data: CanvasNodeData, patch: SettingsPatch): CanvasNodeData {
  const { toolParams, ...rest } = patch;
  return {
    ...data,
    ...rest,
    ...(toolParams ? { toolParams: { ...(data.toolParams ?? {}), ...toolParams } } : {}),
  };
}

function patchFor(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  target: CanvasNode,
  override?: { nodeId: string; settings: CanvasSettingsData },
): SettingsPatch | undefined {
  const wire = edges.find((e) => e.target === target.id && e.targetHandle === SETTINGS_HANDLE);
  if (!wire) return undefined;
  const source = nodes.find((n) => n.id === wire.source);
  const settings = override?.nodeId === wire.source ? override.settings : source?.data.settings;
  if (source?.type !== "settings" || !settings) return undefined;
  const hasPromptWire = edges.some((e) => e.target === target.id && e.targetHandle === "prompt");
  return resolveSettings(settings, target, { hasPromptWire });
}

export function settingsOverridesById(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
): Map<string, SettingsPatch> {
  const out = new Map<string, SettingsPatch>();
  for (const node of nodes) {
    if (node.type !== "model") continue;
    const patch = patchFor(nodes, edges, node);
    if (patch && Object.keys(patch).length > 0) out.set(node.id, patch);
  }
  return out;
}

export function withWiredSettings<N extends CanvasNode>(nodes: readonly N[], edges: readonly CanvasEdge[]): N[] {
  const overrides = settingsOverridesById(nodes, edges);
  if (overrides.size === 0) return [...nodes];
  return nodes.map((n) => {
    const patch = overrides.get(n.id);
    return patch ? { ...n, data: mergePatch(n.data, patch) } : n;
  });
}

// Targets whose merged values differ after this settings node changes to `next`.
export function settingsStaleTargets(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  settingsNodeId: string,
  next: CanvasSettingsData,
): string[] {
  const targets = edges
    .filter((e) => e.source === settingsNodeId && e.targetHandle === SETTINGS_HANDLE)
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n): n is CanvasNode => Boolean(n));
  return targets
    .filter((target) => {
      const before = patchFor(nodes, edges, target);
      const after = patchFor(nodes, edges, target, { nodeId: settingsNodeId, settings: next });
      return JSON.stringify(before ?? {}) !== JSON.stringify(after ?? {});
    })
    .map((n) => n.id);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx tsx --test src/service/canvas/settings/apply.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing executor test**

Add to `src/service/canvas/executor.test.ts`, inside `describe("canvas executor", ...)`:

```ts
  it("prices and submits a swap render with the wired settings length", async () => {
    const harness = createHarness({
      initialCreditUsd: 100,
      nodes: [
        { id: "src", type: "media", position: { x: 0, y: 0 }, data: { mediaKind: "video", mediaUrl: "https://x/v.mp4" } },
        {
          id: "s",
          type: "settings",
          position: { x: 0, y: 0 },
          data: {
            settings: {
              kind: "swap",
              values: { swapMode: "character", sectionStart: 0, sectionLength: 10, aspectRatio: "9:16", gradeLook: "jutsu" },
            },
          },
        },
        {
          id: "r",
          type: "model",
          position: { x: 0, y: 0 },
          data: { modelId: "scro:swap-render", durationSeconds: 4, aspectRatio: "9:16", prompt: "", toolParams: { swapMode: "character" } },
        },
      ],
      edges: [
        { id: "e1", source: "src", sourceHandle: "output", target: "r", targetHandle: "video" },
        { id: "e2", source: "s", sourceHandle: "output", target: "r", targetHandle: "settings" },
      ],
    });
    const result = await submitCanvasNodeJob(
      { clerkUserId: "user_1", canvasId: harness.project._id.toHexString(), nodeId: "r", queueToWorker: true },
      harness.deps,
    );
    assert.equal(result.ok, true);
    const job = [...harness.jobs.values()][0]!;
    assert.equal(job.inputSnapshot.durationSeconds, 10);
    const unwired = estimateCanvasModelCostUsd(findCanvasModel("scro:swap-render")!, { durationSeconds: 4 });
    assert.notEqual(job.chargedUsd, unwired);
    assert.equal(
      job.chargedUsd,
      estimateCanvasModelCostUsd(findCanvasModel("scro:swap-render")!, { durationSeconds: 10 }),
    );
  });
```

Add imports at the top: `import { findCanvasModel } from "@/service/canvas/model-catalog";` (merge with the existing `STATIC_CANVAS_MODELS` import) and `import { estimateCanvasModelCostUsd } from "@/service/canvas/pricing";`. If `queueToWorker` needs `enqueueCanvasNodeWorkerTask`, add `overrides: { enqueueCanvasNodeWorkerTask: async () => {} }` to the harness options.

- [ ] **Step 6: Run it and confirm it fails**

Run: `npx tsx --test src/service/canvas/executor.test.ts`
Expected: the new test FAILS with `durationSeconds` 4 instead of 10. If it fails earlier with an input or validation error, fix the fixture (for example a missing required port of `scro:swap-render` from its catalog entry) until the only failure is the duration.

- [ ] **Step 7: Merge in the executor**

In `submitCanvasNodeJob`, right after the `if (!project) return ...` block, change `const project = await resolved.findCanvasProject(...)` to `const loadedProject = ...`, keep the not-found check on `loadedProject`, then:

```ts
  // Wired settings nodes write their values over their targets before validation, pricing, and submit.
  const project = { ...loadedProject, nodes: withWiredSettings(loadedProject.nodes, loadedProject.edges) };
```

In `dispatchQueuedCanvasJobById`, replace `const node = project?.nodes.find((n) => n.id === job.nodeId);` with:

```ts
  const node = project
    ? withWiredSettings(project.nodes, project.edges).find((n) => n.id === job.nodeId)
    : undefined;
```

`hydrateMissingModelOutputs` only writes `outputUrl`, `outputKind`, `status`, and `lastError` back, so merged values are never persisted onto the nodes.

Import `withWiredSettings` from `@/service/canvas/settings/apply`.

- [ ] **Step 8: Run the executor tests and confirm they pass**

Run: `npx tsx --test src/service/canvas/executor.test.ts src/service/canvas/settings/apply.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/service/canvas/settings src/service/canvas/executor.ts src/service/canvas/executor.test.ts
git commit -m "feat(canvas): merge wired settings into targets before pricing and submit"
```

---

### Task 4: Settings wiring validation and old-version reasons

**Files:**
- Modify: `src/service/canvas/graph.ts:121-200` (`validateEdgeConnection`), `src/service/canvas/graph.test.ts`, `src/service/canvas/stale-outputs.ts:98-119`, `src/service/canvas/stale-outputs.test.ts`, `src/service/canvas/explainer-settings.ts:26-27`

**Interfaces:**
- Consumes: `settingsAccepts`, `explainerSettingsOf`, `SETTINGS_HANDLE`.
- Produces: `validateEdgeConnection` accepts `settings → settings handle` edges; `OutdatedReason` unchanged.

- [ ] **Step 1: Write the failing graph tests**

Add to `src/service/canvas/graph.test.ts`:

```ts
describe("canvas graph — settings edges", () => {
  const settingsNode: CanvasNode = {
    id: "s",
    type: "settings",
    position: { x: 0, y: 0 },
    data: {
      settings: {
        kind: "swap",
        values: { swapMode: "character", sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
      },
    },
  };
  const grade: CanvasNode = { id: "g", type: "model", position: { x: 0, y: 0 }, data: { modelId: "ffmpeg:color-grade" } };
  const tts: CanvasNode = { id: "t", type: "model", position: { x: 0, y: 0 }, data: { modelId: "scro:tts" } };
  const candidate = (target: string, targetHandle = "settings") => ({
    source: "s",
    sourceHandle: "output",
    target,
    targetHandle,
  });

  it("allows a settings node onto an accepted target's settings handle", () => {
    assert.deepEqual(validateEdgeConnection([settingsNode, grade], [], candidate("g")), { valid: true });
  });

  it("rejects targets the kind does not accept and non-settings handles", () => {
    assert.equal(validateEdgeConnection([settingsNode, tts], [], candidate("t")).valid, false);
    assert.equal(validateEdgeConnection([settingsNode, grade], [], candidate("g", "video")).valid, false);
  });

  it("rejects a second settings wire unless replacing", () => {
    const existing = [{ id: "e", source: "s2", sourceHandle: "output", target: "g", targetHandle: "settings" }];
    const other = { ...settingsNode, id: "s2" };
    assert.equal(validateEdgeConnection([settingsNode, other, grade], existing, candidate("g")).valid, false);
    assert.deepEqual(
      validateEdgeConnection([settingsNode, other, grade], existing, candidate("g"), undefined, { allowReplaceSingle: true }),
      { valid: true },
    );
  });

  it("rejects a normal output onto a settings handle", () => {
    const prompt: CanvasNode = { id: "p", type: "prompt", position: { x: 0, y: 0 }, data: { text: "x" } };
    assert.equal(
      validateEdgeConnection([prompt, grade], [], { source: "p", sourceHandle: "output", target: "g", targetHandle: "settings" }).valid,
      false,
    );
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx tsx --test src/service/canvas/graph.test.ts`
Expected: the first new test FAILS with "Source node has no valid output port type".

- [ ] **Step 3: Add the settings branch**

In `validateEdgeConnection`, right after the `sourceHandle !== "output"` check and before `getNodeOutputPortType`:

```ts
  const targetHandleId = candidate.targetHandle ?? "";
  // Settings edges carry no port value; the kind decides which targets may take them.
  if (sourceNode.type === "settings" || targetHandleId === SETTINGS_HANDLE) {
    const settings = sourceNode.type === "settings" ? sourceNode.data.settings : undefined;
    if (!settings || targetHandleId !== SETTINGS_HANDLE || !settingsAccepts(settings, targetNode)) {
      return { valid: false, reason: "This settings node cannot connect to that input" };
    }
    const taken = edges.some((e) => e.target === targetNode.id && e.targetHandle === SETTINGS_HANDLE);
    if (taken && !options?.allowReplaceSingle) {
      return { valid: false, reason: "This node already has a settings node" };
    }
    return { valid: true };
  }
```

Import `settingsAccepts` from `@/service/canvas/settings/registry` and `SETTINGS_HANDLE` from `@/service/canvas/settings/types`. In `explainer-settings.ts`, replace `export const EXPLAINER_SETTINGS_HANDLE = "settings";` with `export { SETTINGS_HANDLE as EXPLAINER_SETTINGS_HANDLE } from "@/service/canvas/settings/types";` and keep the comment.

If `graph.ts` importing the registry creates a cycle through `explainer-settings.ts` → `graph.ts`, break it by moving the `FRAME_ID` frame check into `settings/explainer.ts` (already there) and making sure `settings/explainer.ts` imports only `explainerSettingsChanges`. Verify with `npx tsc --noEmit` and by running the test file.

- [ ] **Step 4: Run the graph tests and confirm they pass**

Run: `npx tsx --test src/service/canvas/graph.test.ts`
Expected: PASS.

- [ ] **Step 5: Make `outdatedNodeReasons` read the kind union**

The Task 1 rename already changed `node.data.explainerSettings` to `explainerSettingsOf(node.data)` here. Update the comment above `OutdatedReason` to: `// Why a node's preview is an old version: its inputs changed, or an unapplied Explainer Settings draft.` Swap and Teleport edits are stored as `staleOutputUrl`, so they already report `"inputs"`.

Add a test to `src/service/canvas/stale-outputs.test.ts`:

```ts
  it("does not derive old versions from Swap settings, which mark stale on edit", () => {
    const swapSettings: CanvasNode = {
      id: "s",
      type: "settings",
      position: { x: 0, y: 0 },
      data: {
        settings: {
          kind: "swap",
          values: { swapMode: "character", sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
        },
      },
    };
    assert.equal(outdatedNodeReasons([swapSettings, model("g")], [edge("s", "g")]).size, 0);
  });
```

Run: `npx tsx --test src/service/canvas/stale-outputs.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/service/canvas/graph.ts src/service/canvas/graph.test.ts src/service/canvas/stale-outputs.ts src/service/canvas/stale-outputs.test.ts src/service/canvas/explainer-settings.ts
git commit -m "feat(canvas): validate settings wires by kind"
```

---

### Task 5: Swap and Teleport groups get a settings node

**Files:**
- Modify: `src/service/canvas/scro-groups/builder.ts`, `swap.ts`, `teleport.ts`, `swap-teleport.test.ts`

**Interfaces:**
- Consumes: `SETTINGS_HANDLE`, `settingsKindDef`, `CanvasSettingsData`.
- Produces:
  - Builder method `settings(suffix: string, data: CanvasSettingsData): string`.
  - Group node ids `${prefix}-settings`.
  - `swapSettingsValues(input: SwapGroupInput): SwapSettings` and `teleportSettingsValues(input: TeleportGroupInput): TeleportSettings`.

- [ ] **Step 1: Update the group tests first**

In `swap-teleport.test.ts`:

Colorfix test: expect 3 nodes and wires `["g-settings>g-grade:settings", "g-video>g-grade:video"]`, and add:

```ts
    assert.deepEqual(node(g, "g-settings").data.settings, {
      kind: "swap",
      values: { swapMode: "colorfix", sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
    });
```

Character swap test: add `"g-settings>g-grade:settings"`, `"g-settings>g-render:settings"`, `"g-settings>g-trim:settings"` to the expected sorted wires. The full sorted list becomes:

```ts
    assert.deepEqual(wires(g), [
      "existing-video>g-trim:video",
      "g-instruction>g-render:prompt",
      "g-reference>g-render:refImages",
      "g-render>g-grade:video",
      "g-settings>g-grade:settings",
      "g-settings>g-render:settings",
      "g-settings>g-trim:settings",
      "g-trim>g-render:video",
    ]);
```

Teleport scene photo test, expected wires:

```ts
    assert.deepEqual(wires(g), [
      "g-render>g-grade:video",
      "g-scene>g-render:image",
      "g-settings>g-grade:settings",
      "g-settings>g-render:settings",
      "g-settings>g-trim:settings",
      "g-trim>g-render:video",
      "g-video>g-trim:video",
    ]);
```

Teleport text scene test: replace `assert.ok(wires(g).includes("g-mood>g-render:prompt"));` with:

```ts
    assert.ok(!g.nodes.some((n) => n.id === "g-mood"));
    assert.equal(
      (node(g, "g-settings").data.settings as { values: { mood?: string } }).values.mood,
      "neon rain",
    );
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx tsx --test src/service/canvas/scro-groups/swap-teleport.test.ts`
Expected: FAIL, missing `g-settings`.

- [ ] **Step 3: Add the builder method**

In `builder.ts`, import `type { CanvasSettingsData } from "@/model/canvas-settings"` and `settingsKindDef` from `@/service/canvas/settings/registry`, then add to the returned object:

```ts
    settings(suffix: string, data: CanvasSettingsData): string {
      const def = settingsKindDef(data.kind);
      return add(suffix, "settings", { label: def.label.zh, settings: data });
    },
```

- [ ] **Step 4: Wire Swap settings**

In `scro-groups/swap.ts`, add:

```ts
import type { SwapSettings } from "@/model/canvas-settings";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";

export function swapSettingsValues(input: SwapGroupInput): SwapSettings {
  return {
    swapMode: input.mode,
    ...(input.objectTarget ? { objectTarget: input.objectTarget } : {}),
    ...(input.objectEditMode ? { objectEditMode: input.objectEditMode } : {}),
    ...(input.lightLookId ? { lightLookId: input.lightLookId } : {}),
    sectionStart: Math.max(0, input.sectionStart),
    sectionLength: clampSectionLength(input.sectionLength),
    aspectRatio: input.aspectRatio,
    gradeLook: "jutsu",
  };
}
```

In `buildSwapGroup`, right after `const video = b.media(...)`:

```ts
  const settings = b.settings("settings", { kind: "swap", values: swapSettingsValues(input) });
```

In the colorfix branch, add `b.wire(settings, grade, SETTINGS_HANDLE);` before `return`. In the main branch, add before `return b.finish(grade);`:

```ts
  for (const target of [trim, render, grade]) b.wire(settings, target, SETTINGS_HANDLE);
```

- [ ] **Step 5: Wire Teleport settings**

In `scro-groups/teleport.ts`, add:

```ts
import type { TeleportSettings } from "@/model/canvas-settings";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";

export function teleportSettingsValues(input: TeleportGroupInput): TeleportSettings {
  const mood = input.mood?.trim();
  return {
    sectionStart: Math.max(0, input.sectionStart),
    sectionLength: clampSectionLength(input.sectionLength),
    aspectRatio: input.aspectRatio,
    ...(mood ? { mood } : {}),
    gradeLook: "jutsu",
  };
}
```

In `buildTeleportGroup`, add after `const video = b.media(...)`:

```ts
  const settings = b.settings("settings", { kind: "teleport", values: teleportSettingsValues(input) });
```

Delete the two `mood` lines (`const mood = ...` and `if (mood) b.wire(b.prompt("mood", ...` ) and add before `return b.finish(grade);`:

```ts
  for (const target of [trim, render, grade]) b.wire(settings, target, SETTINGS_HANDLE);
```

Update the top comment to `// Pure: Teleport as visible nodes — settings + source → trim → teleport render ← scene → H3 Soft grade.` and the Swap one to `// Pure: Scro Swap as visible nodes — settings + source → trim → swap render → H3 Soft grade.`

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npx tsx --test src/service/canvas/scro-groups/*.test.ts src/service/canvas-agent/*.test.ts`
Expected: PASS. If a canvas-agent test counts Swap / Teleport group nodes (the 20-node limit or `add_scro_group` results), update its expected count by +1 for the settings node and −1 for a Teleport mood node.

- [ ] **Step 7: Commit**

```bash
git add src/service/canvas/scro-groups src/service/canvas-agent
git commit -m "feat(canvas): Swap and Teleport groups carry a settings node"
```

---

### Task 6: Backfill settings nodes on older Swap and Teleport groups

**Files:**
- Modify: `src/service/canvas/settings/migrate.ts`, `src/service/canvas/settings/migrate.test.ts`, `src/service/canvas/explainer-settings-migrate.ts` (`ensureExplainerSettingsNodes` → `ensureSettingsNodes`), `src/app/app/canvas/page.tsx:61-62`

**Interfaces:**
- Consumes: `canvasGroupsForProject`, `SETTINGS_HANDLE`, `clampSectionLength`.
- Produces:
  - `withToolSettingsNodes(graph: { nodes; edges; groups }): { nodes; edges; groups; changed: boolean }` from `settings/migrate.ts`.
  - `ensureSettingsNodes(project: CanvasProject): Promise<CanvasProject>` (renamed export; `ensureExplainerSettingsNodes` is removed).

- [ ] **Step 1: Write the failing backfill tests**

Append to `src/service/canvas/settings/migrate.test.ts`:

```ts
import type { CanvasEdge, CanvasGroup } from "@/model/canvas";
import { withToolSettingsNodes } from "@/service/canvas/settings/migrate";

const at = { x: 400, y: 100 };
const teleportNodes: CanvasNode[] = [
  { id: "teleport-abc123-trim", type: "model", position: at, data: { modelId: "ffmpeg:trim-speed", toolParams: { ffmpegStartSec: 2, ffmpegEndSec: 8, ffmpegSpeed: 1 } } },
  { id: "teleport-abc123-render", type: "model", position: at, data: { modelId: "scro:teleport-render", aspectRatio: "16:9", durationSeconds: 6, outputUrl: "https://x/out.mp4" } },
  { id: "teleport-abc123-grade", type: "model", position: at, data: { modelId: "ffmpeg:color-grade", toolParams: { gradeLook: "jutsu" } } },
  { id: "teleport-abc123-mood", type: "prompt", position: at, data: { text: "neon rain" } },
];
const teleportEdges: CanvasEdge[] = [
  { id: "m", source: "teleport-abc123-mood", sourceHandle: "output", target: "teleport-abc123-render", targetHandle: "prompt" },
  { id: "rg", source: "teleport-abc123-render", sourceHandle: "output", target: "teleport-abc123-grade", targetHandle: "video" },
];
const teleportGroup: CanvasGroup = {
  id: "teleport-abc123",
  title: "Teleport",
  color: "sky",
  kind: "teleport",
  memberIds: teleportNodes.map((n) => n.id),
};

describe("withToolSettingsNodes", () => {
  it("adds a Teleport settings node from the existing nodes and moves the mood into it", () => {
    const res = withToolSettingsNodes({ nodes: teleportNodes, edges: teleportEdges, groups: [teleportGroup] });
    assert.equal(res.changed, true);
    const settings = res.nodes.find((n) => n.id === "teleport-abc123-settings")!;
    assert.deepEqual(settings.data.settings, {
      kind: "teleport",
      values: { sectionStart: 2, sectionLength: 6, aspectRatio: "16:9", mood: "neon rain", gradeLook: "jutsu" },
    });
    assert.ok(!res.nodes.some((n) => n.id === "teleport-abc123-mood"));
    assert.ok(!res.edges.some((e) => e.id === "m"));
    assert.deepEqual(
      res.edges.filter((e) => e.targetHandle === "settings").map((e) => e.target).sort(),
      ["teleport-abc123-grade", "teleport-abc123-render", "teleport-abc123-trim"],
    );
    assert.equal(res.groups[0]!.memberIds[0], "teleport-abc123-settings");
    assert.ok(!res.groups[0]!.memberIds.includes("teleport-abc123-mood"));
    assert.equal(res.nodes.find((n) => n.id === "teleport-abc123-render")!.data.staleOutputUrl, undefined);
  });

  it("reads Swap values from the render tool params and leaves a group that has settings alone", () => {
    const swapNodes: CanvasNode[] = [
      { id: "swap-def456-grade", type: "model", position: at, data: { modelId: "ffmpeg:color-grade", toolParams: { gradeLook: "jutsu" } } },
      { id: "swap-def456-render", type: "model", position: at, data: { modelId: "scro:swap-render", aspectRatio: "9:16", durationSeconds: 8, toolParams: { swapMode: "relight", lightLookId: "golden_halo" } } },
    ];
    const group: CanvasGroup = { id: "swap-def456", title: "Swap", color: "violet", kind: "swap", memberIds: swapNodes.map((n) => n.id) };
    const res = withToolSettingsNodes({ nodes: swapNodes, edges: [], groups: [group] });
    assert.deepEqual(res.nodes.find((n) => n.id === "swap-def456-settings")!.data.settings, {
      kind: "swap",
      values: { swapMode: "relight", lightLookId: "golden_halo", sectionStart: 0, sectionLength: 8, aspectRatio: "9:16", gradeLook: "jutsu" },
    });
    assert.equal(withToolSettingsNodes(res).changed, false);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx tsx --test src/service/canvas/settings/migrate.test.ts`
Expected: FAIL, `withToolSettingsNodes` is not exported.

- [ ] **Step 3: Implement the backfill**

Append to `src/service/canvas/settings/migrate.ts`:

```ts
import type { CanvasAspectRatio, CanvasEdge, CanvasGroup } from "@/model/canvas";
import {
  CANVAS_GRADE_LOOKS,
  SWAP_OBJECT_EDIT_MODES,
  SWAP_SETTINGS_MODES,
  type CanvasGradeLook,
  type CanvasSettingsData,
} from "@/model/canvas-settings";
import { clampSectionLength } from "@/service/canvas/settings/section";
import { settingsKindDef } from "@/service/canvas/settings/registry";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";

type Graph = { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[]; groups: readonly CanvasGroup[] };
const SETTINGS_GAP = 90;
const SETTINGS_WIDTH = 280;

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const pick = <T extends string>(allowed: readonly T[], v: unknown, fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

function valuesFromMembers(kind: "swap" | "teleport", members: CanvasNode[], mood: string | undefined): CanvasSettingsData {
  const byModel = (id: string) => members.find((n) => n.data.modelId === id);
  const trim = byModel("ffmpeg:trim-speed");
  const render = byModel(kind === "swap" ? "scro:swap-render" : "scro:teleport-render");
  const grade = byModel("ffmpeg:color-grade");
  const start = num(trim?.data.toolParams?.ffmpegStartSec, 0);
  const end = num(trim?.data.toolParams?.ffmpegEndSec, NaN);
  const length = clampSectionLength(Number.isFinite(end) ? end - start : num(render?.data.durationSeconds, 6));
  const aspectRatio: CanvasAspectRatio = render?.data.aspectRatio ?? "9:16";
  const gradeLook: CanvasGradeLook = pick(CANVAS_GRADE_LOOKS, grade?.data.toolParams?.gradeLook, "jutsu");
  if (kind === "teleport") {
    return { kind, values: { sectionStart: start, sectionLength: length, aspectRatio, ...(mood ? { mood } : {}), gradeLook } };
  }
  const tp = render?.data.toolParams ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const objectTarget = str(tp.objectTarget);
  const lightLookId = str(tp.lightLookId);
  return {
    kind,
    values: {
      swapMode: render ? pick(SWAP_SETTINGS_MODES, tp.swapMode, "character") : "colorfix",
      ...(objectTarget ? { objectTarget } : {}),
      ...(tp.objectEditMode ? { objectEditMode: pick(SWAP_OBJECT_EDIT_MODES, tp.objectEditMode, "change") } : {}),
      ...(lightLookId ? { lightLookId } : {}),
      sectionStart: start,
      sectionLength: length,
      aspectRatio,
      gradeLook,
    },
  };
}

// Swap / Teleport groups made before settings nodes get one, read from their current nodes.
export function withToolSettingsNodes(graph: Graph): { nodes: CanvasNode[]; edges: CanvasEdge[]; groups: CanvasGroup[]; changed: boolean } {
  let nodes = [...graph.nodes];
  let edges = [...graph.edges];
  let changed = false;
  const groups = graph.groups.map((group) => {
    if (group.kind !== "swap" && group.kind !== "teleport") return group;
    const members = nodes.filter((n) => group.memberIds.includes(n.id));
    if (members.length === 0 || members.some((n) => n.type === "settings")) return group;
    const kind = group.kind;
    const targets = members.filter((n) => settingsKindDef(kind).accepts(n));
    if (targets.length === 0) return group;

    // A Teleport Mood prompt wired into the render moves into the settings.
    const render = targets.find((n) => n.data.modelId === "scro:teleport-render");
    const moodEdge = render
      ? edges.find((e) => e.target === render.id && e.targetHandle === "prompt" && /-mood$/.test(e.source))
      : undefined;
    const moodNode = moodEdge ? nodes.find((n) => n.id === moodEdge.source) : undefined;
    const mood = moodNode?.data.text?.trim() || undefined;

    const settingsId = `${group.id}-settings`;
    const settings: CanvasNode = {
      id: settingsId,
      type: "settings",
      position: {
        x: Math.min(...members.map((n) => n.position.x)) - SETTINGS_WIDTH - SETTINGS_GAP,
        y: Math.min(...members.map((n) => n.position.y)),
      },
      data: { label: settingsKindDef(kind).label.zh, settings: valuesFromMembers(kind, members, mood) },
    };
    if (moodNode) {
      nodes = nodes.filter((n) => n.id !== moodNode.id);
      edges = edges.filter((e) => e.source !== moodNode.id && e.target !== moodNode.id);
    }
    nodes.push(settings);
    edges.push(
      ...targets.map((t) => ({
        id: `${settingsId}->${t.id}:${SETTINGS_HANDLE}`,
        source: settingsId,
        sourceHandle: "output",
        target: t.id,
        targetHandle: SETTINGS_HANDLE,
      })),
    );
    changed = true;
    return { ...group, memberIds: [settingsId, ...group.memberIds.filter((id) => id !== moodNode?.id)] };
  });
  return { nodes, edges, groups, changed };
}
```

Merge these imports with the existing ones at the top of the file.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx tsx --test src/service/canvas/settings/migrate.test.ts`
Expected: PASS.

- [ ] **Step 5: Rename and extend the page-load migration**

In `src/service/canvas/explainer-settings-migrate.ts`:
- Rename `ensureExplainerSettingsNodes` to `ensureSettingsNodes`. Update the file's top comment to `// On load, older canvases get their settings nodes: Explainer (from the backing video) and Swap / Teleport (from their nodes).`
- After the legacy upgrade and before computing `missing`, run:

```ts
  const groupsBefore = canvasGroupsForProject(project.nodes, project.groups);
  const tool = withToolSettingsNodes({ nodes: project.nodes, edges: project.edges, groups: groupsBefore });
  if (tool.changed) project = { ...project, nodes: tool.nodes, edges: tool.edges, groups: tool.groups };
```

- Use `canvasGroupsForProject(project.nodes, project.groups)` (now including the Swap / Teleport changes) for `groups`, and treat the project as dirty when `upgraded.changed || tool.changed || next.changed`. Persist `nodes`, `edges`, and `groups` together in the one `updateOne`, and return the updated project.

In `src/app/app/canvas/page.tsx`, rename the import and call to `ensureSettingsNodes` and change the comment to `// Older groups get their settings nodes before the editor opens.`

Run `rg -n "ensureExplainerSettingsNodes" src scripts` and rename any remaining callers.

- [ ] **Step 6: Typecheck and run the tests**

Run: `npx tsc --noEmit && npx tsx --test 'src/service/canvas/**/*.test.ts'`
Expected: no type errors, all pass.

- [ ] **Step 7: Commit**

```bash
git add src/service/canvas src/app/app/canvas/page.tsx
git commit -m "feat(canvas): backfill settings nodes on older Swap and Teleport groups"
```

---

### Task 7: Assistant support for Swap and Teleport settings

**Files:**
- Create: `src/service/canvas-agent/settings-tool.ts`, `src/service/canvas-agent/settings-tool.test.ts`
- Modify: `src/service/canvas-agent/tools.ts` (`describeNode:299-305`, handlers near `update_explainer_settings:708`, tools near `:908`), `src/service/canvas-agent/prompt.ts:75`

**Interfaces:**
- Consumes: `settingsStaleTargets`, `markStaleOutputs`, `swapSettingsSchema`, `teleportSettingsSchema`, `CanvasAgentWorkingGraph`.
- Produces: `updateSettingsSchema`, `type UpdateSettingsInput`, `updateSettings(g, input): Record<string, unknown>`; agent tool name `update_settings`.

- [ ] **Step 1: Write the failing tool test**

`src/service/canvas-agent/settings-tool.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import { updateSettings } from "@/service/canvas-agent/settings-tool";
import { createWorkingGraph } from "@/service/canvas-agent/tools";

function canvas() {
  const nodes: CanvasNode[] = [
    {
      id: "swap-abc123-settings",
      type: "settings",
      position: { x: 0, y: 0 },
      data: {
        settings: {
          kind: "swap",
          values: { swapMode: "character", sectionStart: 0, sectionLength: 6, aspectRatio: "9:16", gradeLook: "jutsu" },
        },
      },
    },
    { id: "swap-abc123-render", type: "model", position: { x: 300, y: 0 }, data: { modelId: "scro:swap-render", outputUrl: "https://x/r.mp4", status: "completed" } },
    { id: "swap-abc123-grade", type: "model", position: { x: 600, y: 0 }, data: { modelId: "ffmpeg:color-grade", outputUrl: "https://x/g.mp4", status: "completed", toolParams: { gradeLook: "jutsu" } } },
  ];
  const edges = ["swap-abc123-render", "swap-abc123-grade"].map((target) => ({
    id: `s->${target}`,
    source: "swap-abc123-settings",
    sourceHandle: "output",
    target,
    targetHandle: "settings",
  }));
  edges.push({ id: "rg", source: "swap-abc123-render", sourceHandle: "output", target: "swap-abc123-grade", targetHandle: "video" });
  const group: CanvasGroup = { id: "swap-abc123", title: "Swap", color: "violet", kind: "swap", memberIds: nodes.map((n) => n.id) };
  let n = 0;
  return createWorkingGraph({
    nodes,
    edges,
    groups: [group],
    catalog: STATIC_CANVAS_MODELS,
    assets: [],
    characters: [],
    nextId: () => `id${++n}`,
  });
}

describe("update_settings", () => {
  it("changes Swap values and marks only the affected previews old", () => {
    const g = canvas();
    const res = updateSettings(g, { groupId: "swap-abc123", values: { gradeLook: "talking-head" } }) as { ok: boolean; changed: string[] };
    assert.equal(res.ok, true);
    assert.deepEqual(res.changed, ["gradeLook"]);
    const settings = g.nodes.find((x) => x.id === "swap-abc123-settings")!.data.settings!;
    assert.equal(settings.kind === "swap" && settings.values.gradeLook, "talking-head");
    const stale = g.ops.find((op) => op.kind === "mark_stale");
    assert.deepEqual(stale && "nodeIds" in stale ? stale.nodeIds : [], ["swap-abc123-grade"]);
  });

  it("rejects bad values and Explainer settings", () => {
    const g = canvas();
    assert.ok("error" in updateSettings(g, { groupId: "swap-abc123", values: { sectionLength: 40 } }));
    assert.ok("error" in updateSettings(g, { groupId: "missing", values: {} }));
  });
});
```

If `createWorkingGraph` requires other fields (check its signature in `tools.ts`, for example `userMessage`), add them with neutral values.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx tsx --test src/service/canvas-agent/settings-tool.test.ts`
Expected: FAIL, cannot find module `settings-tool`.

- [ ] **Step 3: Implement the tool**

`src/service/canvas-agent/settings-tool.ts`:

```ts
// Canvas agent tool: change a Swap or Teleport group's settings node. The new values apply
// at run time, so this only writes the node and marks the affected previews as old versions.

import { z } from "zod";
import type { CanvasNode } from "@/model/canvas";
import {
  type CanvasSettingsData,
  swapSettingsSchema,
  teleportSettingsSchema,
} from "@/model/canvas-settings";
import { settingsStaleTargets } from "@/service/canvas/settings/apply";
import { settingsChangedKeys } from "@/service/canvas/settings/registry";
import { markStaleOutputs } from "@/service/canvas/stale-outputs";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/tools";

export const updateSettingsSchema = z.object({
  groupId: z.string().optional().describe("Swap or Teleport group id from get_canvas."),
  nodeId: z.string().optional().describe("Settings node id; use when it has no group."),
  values: z
    .record(z.string(), z.unknown())
    .describe(
      "Only the keys to change. Swap: swapMode (character|object|relight|colorfix), objectTarget, objectEditMode (change|add|remove), lightLookId, sectionStart, sectionLength (2-15), aspectRatio, gradeLook (jutsu|talking-head|talking-head-selfie). Teleport: sectionStart, sectionLength, aspectRatio, mood, gradeLook.",
    ),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

function pickNode(g: CanvasAgentWorkingGraph, input: UpdateSettingsInput): CanvasNode | { error: string } {
  const isTool = (n: CanvasNode) => n.type === "settings" && (n.data.settings?.kind === "swap" || n.data.settings?.kind === "teleport");
  if (input.nodeId) {
    const node = g.nodes.find((n) => n.id === input.nodeId);
    return node && isTool(node) ? node : { error: `"${input.nodeId}" is not a Swap or Teleport settings node.` };
  }
  const group = g.groups.find((gr) => gr.id === input.groupId);
  const node = g.nodes.find((n) => group?.memberIds.includes(n.id) && isTool(n));
  return node ?? { error: `Group "${input.groupId}" has no Swap or Teleport settings node. Explainer looks use update_explainer_settings.` };
}

export function updateSettings(g: CanvasAgentWorkingGraph, input: UpdateSettingsInput): Record<string, unknown> {
  const picked = pickNode(g, input);
  if ("error" in picked) return picked;
  const current = picked.data.settings!;
  if (current.kind === "explainer") return { error: "Use update_explainer_settings for Explainer settings." };

  const schema = current.kind === "swap" ? swapSettingsSchema : teleportSettingsSchema;
  const parsed = schema.safeParse({ ...current.values, ...input.values });
  if (!parsed.success) return { error: `Invalid settings: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` };
  const next = { kind: current.kind, values: parsed.data } as CanvasSettingsData;
  const changed = settingsChangedKeys(current, next);
  if (changed.length === 0) return { error: "These are already the settings; nothing changes." };

  const targets = settingsStaleTargets(g.nodes, g.edges, picked.id, next);
  const patch = { settings: next };
  picked.data = { ...picked.data, ...patch };
  g.ops.push({ kind: "update_node", nodeId: picked.id, patch });
  const { nodes, staleIds } = markStaleOutputs(g.nodes, g.edges, targets);
  if (staleIds.length > 0) {
    g.nodes.splice(0, g.nodes.length, ...nodes);
    g.ops.push({ kind: "mark_stale", nodeIds: staleIds });
  }
  return {
    ok: true,
    settingsNodeId: picked.id,
    changed,
    note: "The new settings apply when those nodes run. Tell the user to press Run group to regenerate the previews marked as old versions.",
  };
}
```

Check `g.nodes` is a mutable array in `CanvasAgentWorkingGraph`. If the existing `markStale` helper in `tools.ts` already wraps `markStaleOutputs` plus the `mark_stale` op, call it instead of the last block so the op shape stays identical.

- [ ] **Step 4: Register the tool and describe settings nodes**

In `tools.ts`:
- Import `updateSettings`, `updateSettingsSchema`, `type UpdateSettingsInput` from `@/service/canvas-agent/settings-tool`.
- Add the handler next to `update_explainer_settings`:

```ts
  update_settings(g: CanvasAgentWorkingGraph, input: UpdateSettingsInput): CanvasAgentToolResult {
    return updateSettings(g, input);
  },
```

- Add the tool next to `update_explainer_settings`:

```ts
    update_settings: tool({
      description:
        "Change a Swap or Teleport group's settings node: section start / length, ratio, swap mode, object, light look, mood, or final grade. The values apply when those nodes run. Never patch the trim, render, or grade nodes for these.",
      inputSchema: updateSettingsSchema,
      execute: async (input) => H.update_settings(g, input),
    }),
```

- In `describeNode`, after the Explainer block, add:

```ts
    // Swap / Teleport settings: change these only through update_settings.
    ...(node.type === "settings" && node.data.settings && node.data.settings.kind !== "explainer"
      ? { settingsKind: node.data.settings.kind, settings: node.data.settings.values }
      : {}),
```

- [ ] **Step 5: Teach the prompt**

In `prompt.ts`, after the Explainer look line (`:75`), add:

```
  - Swap / Teleport section, ratio, swap mode, object, light look, mood, or final grade: call update_settings on that group's settings node ("-settings"). Never patch its trim, render, or grade nodes for these; the settings node overrides them when they run.
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npx tsx --test 'src/service/canvas-agent/**/*.test.ts'`
Expected: PASS. If a prompt snapshot test exists, update it to include the new line.

- [ ] **Step 7: Commit**

```bash
git add src/service/canvas-agent
git commit -m "feat(canvas-agent): update_settings for Swap and Teleport settings nodes"
```

---

### Task 8: Settings cards, handles, and sidebar tiles

**Files:**
- Create: `src/app/app/canvas/nodes/settings-node-card.tsx`, `swap-settings-node-card.tsx`, `teleport-settings-node-card.tsx`, `src/app/app/canvas/canvas-settings-tool.tsx`
- Modify: `src/app/app/canvas/canvas-workspace.tsx` (`NODE_TYPES:183-190`, `toFlowEdges:260-261`, `onUpdateNodeData:622-635`, `handleConnect:694-728`, `handlePaneDrop:1866-1903`, node context value), `src/app/app/canvas/nodes/port-colors.ts`, `src/app/app/canvas/nodes/model-node-card.tsx` (`:118-160`, `:333-355`), `src/app/app/canvas/nodes/outdated-notice.tsx`, `src/app/app/canvas/canvas-sidebar.tsx:316-322`

**Interfaces:**
- Consumes: `settingsKindDef`, `acceptsAnySettings`, `defaultSettings`, `settingsOverridesById`, `settingsStaleTargets`, `SETTINGS_HANDLE`.
- Produces: context field `settingsOverrides: ReadonlyMap<string, SettingsPatch>`; drag MIME `CANVAS_DRAG_SETTINGS_MIME = "application/x-scro-canvas-settings"`; workspace `addSettingsNode(kind: "swap" | "teleport", position?)`.

- [ ] **Step 1: Card dispatcher**

`src/app/app/canvas/nodes/settings-node-card.tsx`:

```tsx
"use client";

// Settings node: picks the card for its kind (Explainer, Swap, Teleport).

import type { NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import { ExplainerSettingsNodeCard } from "@/app/app/canvas/nodes/explainer-settings-node-card";
import { SwapSettingsNodeCard } from "@/app/app/canvas/nodes/swap-settings-node-card";
import { TeleportSettingsNodeCard } from "@/app/app/canvas/nodes/teleport-settings-node-card";

export function SettingsNodeCard(props: NodeProps & { data: CanvasNodeData }) {
  switch (props.data.settings?.kind) {
    case "swap":
      return <SwapSettingsNodeCard {...props} />;
    case "teleport":
      return <TeleportSettingsNodeCard {...props} />;
    default:
      return <ExplainerSettingsNodeCard {...props} />;
  }
}
```

- [ ] **Step 2: Swap card**

`src/app/app/canvas/nodes/swap-settings-node-card.tsx`:

```tsx
"use client";

// Swap Settings node: section, mode, light look, ratio, and grade for a Swap group.
// Edits save straight to the node and apply when the wired nodes run.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { SlidersHorizontal } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import {
  CANVAS_GRADE_LOOKS,
  SWAP_OBJECT_EDIT_MODES,
  SWAP_SETTINGS_MODES,
  type SwapSettings,
} from "@/model/canvas-settings";
import { JUTSU_LIGHT_LOOKS } from "@/service/jutsu/light-looks";
import { settingsKindDef } from "@/service/canvas/settings/registry";
import { AspectRatioField } from "@/app/app/canvas/aspect-ratio-field";
import { SectionFields } from "@/app/app/canvas/section-fields";
import { DIALOG_FIELD, DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";

const MODE_LABELS: Record<SwapSettings["swapMode"], { zh: string; en: string }> = {
  character: { zh: "換人物", en: "Character" },
  object: { zh: "換物件", en: "Object" },
  relight: { zh: "重新打光", en: "Relight" },
  colorfix: { zh: "只調色", en: "Color fix" },
};
const EDIT_LABELS: Record<NonNullable<SwapSettings["objectEditMode"]>, { zh: string; en: string }> = {
  change: { zh: "換成", en: "Change to" },
  add: { zh: "加入", en: "Add" },
  remove: { zh: "移除", en: "Remove" },
};
export const GRADE_LABELS: Record<SwapSettings["gradeLook"], { zh: string; en: string }> = {
  jutsu: { zh: "H3 柔和", en: "H3 Soft" },
  "talking-head": { zh: "對鏡講話", en: "Talking head" },
  "talking-head-selfie": { zh: "手持自拍", en: "Handheld selfie" },
};

export function SwapSettingsNodeCard({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const { locale, onUpdateNodeData } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  if (data.settings?.kind !== "swap") return null;
  const values = data.settings.values;
  const def = settingsKindDef("swap");
  const pick = (l: { zh: string; en: string }) => (isZh ? l.zh : l.en);
  const update = (patch: Partial<SwapSettings>) =>
    onUpdateNodeData(id, { settings: { kind: "swap", values: { ...values, ...patch } } });

  return (
    <div
      className={`relative w-[280px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/6 px-3 py-2">
        <span className="grid h-5 w-5 place-items-center rounded-md" style={{ backgroundColor: `${def.color}22`, color: def.color }}>
          <SlidersHorizontal className="h-3 w-3" />
        </span>
        <span className="text-[11.5px] font-semibold text-white/90">{pick(def.label)}</span>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        <label className={DIALOG_LABEL}>
          {isZh ? "模式" : "Mode"}
          <select
            value={values.swapMode}
            onChange={(e) => update({ swapMode: e.target.value as SwapSettings["swapMode"] })}
            className={DIALOG_FIELD}
          >
            {SWAP_SETTINGS_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {pick(MODE_LABELS[mode])}
              </option>
            ))}
          </select>
        </label>

        {values.swapMode === "object" ? (
          <div className="grid grid-cols-[1fr_1.4fr] gap-2">
            <label className={DIALOG_LABEL}>
              {isZh ? "方式" : "Edit"}
              <select
                value={values.objectEditMode ?? "change"}
                onChange={(e) => update({ objectEditMode: e.target.value as SwapSettings["objectEditMode"] })}
                className={DIALOG_FIELD}
              >
                {SWAP_OBJECT_EDIT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {pick(EDIT_LABELS[mode])}
                  </option>
                ))}
              </select>
            </label>
            <label className={DIALOG_LABEL}>
              {isZh ? "物件" : "Object"}
              <input
                value={values.objectTarget ?? ""}
                onChange={(e) => update({ objectTarget: e.target.value })}
                className={`nodrag ${DIALOG_FIELD}`}
              />
            </label>
          </div>
        ) : null}

        {values.swapMode === "relight" ? (
          <div className={DIALOG_LABEL}>
            {isZh ? "打光風格" : "Light look"}
            <CanvasPreviewSelect
              value={values.lightLookId ?? JUTSU_LIGHT_LOOKS[0]?.id ?? ""}
              ariaLabel={isZh ? "打光風格" : "Light look"}
              options={JUTSU_LIGHT_LOOKS.map((look) => ({
                value: look.id,
                label: isZh ? look.nameZhHant : look.nameEn,
                previewUrl: look.image,
              }))}
              onChange={(lightLookId) => update({ lightLookId })}
            />
          </div>
        ) : null}

        {values.swapMode !== "colorfix" ? (
          <>
            <SectionFields
              isZh={isZh}
              start={values.sectionStart}
              length={values.sectionLength}
              onChange={({ start, length }) => update({ sectionStart: start, sectionLength: length })}
            />
            <AspectRatioField isZh={isZh} value={values.aspectRatio} onChange={(aspectRatio) => update({ aspectRatio })} />
          </>
        ) : null}

        <label className={DIALOG_LABEL}>
          {isZh ? "最後調色" : "Final grade"}
          <select
            value={values.gradeLook}
            onChange={(e) => update({ gradeLook: e.target.value as SwapSettings["gradeLook"] })}
            className={DIALOG_FIELD}
          >
            {CANVAS_GRADE_LOOKS.map((look) => (
              <option key={look} value={look}>
                {pick(GRADE_LABELS[look])}
              </option>
            ))}
          </select>
        </label>

        <p className="text-[10.5px] leading-relaxed text-white/45">
          {isZh ? "改動在已連接的節點執行時生效，已生成的預覽會標示為舊版本。" : "Changes apply when the wired nodes run; existing previews show as old versions."}
        </p>
      </div>

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ width: 12, height: 12, backgroundColor: def.color, border: "2px solid #0b0e13" }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Teleport card**

`src/app/app/canvas/nodes/teleport-settings-node-card.tsx`:

```tsx
"use client";

// Teleport Settings node: section, ratio, mood, and grade for a Teleport group.
// Edits save straight to the node and apply when the wired nodes run.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { SlidersHorizontal } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { CANVAS_GRADE_LOOKS, type TeleportSettings } from "@/model/canvas-settings";
import { settingsKindDef } from "@/service/canvas/settings/registry";
import { AspectRatioField } from "@/app/app/canvas/aspect-ratio-field";
import { SectionFields } from "@/app/app/canvas/section-fields";
import { DIALOG_FIELD, DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";
import { GRADE_LABELS } from "@/app/app/canvas/nodes/swap-settings-node-card";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";

export function TeleportSettingsNodeCard({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const { locale, onUpdateNodeData } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  if (data.settings?.kind !== "teleport") return null;
  const values = data.settings.values;
  const def = settingsKindDef("teleport");
  const pick = (l: { zh: string; en: string }) => (isZh ? l.zh : l.en);
  const update = (patch: Partial<TeleportSettings>) =>
    onUpdateNodeData(id, { settings: { kind: "teleport", values: { ...values, ...patch } } });

  return (
    <div
      className={`relative w-[280px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/6 px-3 py-2">
        <span className="grid h-5 w-5 place-items-center rounded-md" style={{ backgroundColor: `${def.color}22`, color: def.color }}>
          <SlidersHorizontal className="h-3 w-3" />
        </span>
        <span className="text-[11.5px] font-semibold text-white/90">{pick(def.label)}</span>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        <SectionFields
          isZh={isZh}
          start={values.sectionStart}
          length={values.sectionLength}
          onChange={({ start, length }) => update({ sectionStart: start, sectionLength: length })}
        />
        <AspectRatioField isZh={isZh} value={values.aspectRatio} onChange={(aspectRatio) => update({ aspectRatio })} />
        <label className={DIALOG_LABEL}>
          {isZh ? "氛圍（可留空）" : "Mood (optional)"}
          <textarea
            rows={2}
            value={values.mood ?? ""}
            onChange={(e) => update({ mood: e.target.value })}
            className={`nodrag nowheel resize-none ${DIALOG_FIELD}`}
          />
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "最後調色" : "Final grade"}
          <select
            value={values.gradeLook}
            onChange={(e) => update({ gradeLook: e.target.value as TeleportSettings["gradeLook"] })}
            className={DIALOG_FIELD}
          >
            {CANVAS_GRADE_LOOKS.map((look) => (
              <option key={look} value={look}>
                {pick(GRADE_LABELS[look])}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[10.5px] leading-relaxed text-white/45">
          {isZh ? "改動在已連接的節點執行時生效，已生成的預覽會標示為舊版本。" : "Changes apply when the wired nodes run; existing previews show as old versions."}
        </p>
      </div>

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ width: 12, height: 12, backgroundColor: def.color, border: "2px solid #0b0e13" }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Sidebar tiles**

`src/app/app/canvas/canvas-settings-tool.tsx`:

```tsx
"use client";

// Swap / Teleport Settings tiles in the canvas Tools tab. Click or drag to add a settings node.

import { SlidersHorizontal } from "lucide-react";
import { settingsKindDef } from "@/service/canvas/settings/registry";

export const CANVAS_DRAG_SETTINGS_MIME = "application/x-scro-canvas-settings";
export const HAND_ADDED_SETTINGS_KINDS = ["swap", "teleport"] as const;
export type HandAddedSettingsKind = (typeof HAND_ADDED_SETTINGS_KINDS)[number];

export function CanvasSettingsTool({
  isZh,
  kind,
  onAdd,
}: {
  isZh: boolean;
  kind: HandAddedSettingsKind;
  onAdd: (kind: HandAddedSettingsKind) => void;
}) {
  const def = settingsKindDef(kind);
  const label = isZh ? def.label.zh : def.label.en;
  return (
    <div
      draggable
      title={label}
      onDragStart={(event) => {
        event.dataTransfer.setData(CANVAS_DRAG_SETTINGS_MIME, kind);
        event.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onAdd(kind)}
      className="group flex cursor-grab flex-col items-center gap-1.5 rounded-[10px] border border-white/8 bg-[#131823]/90 px-1 py-2 text-center transition hover:border-[#c6f24b]/50 hover:bg-[#171d2a] active:cursor-grabbing"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ backgroundColor: `${def.color}1f`, color: def.color }}>
        <SlidersHorizontal className="h-4 w-4" />
      </span>
      <span className="line-clamp-2 w-full text-[10px] leading-3 font-semibold text-white/90">{label}</span>
    </div>
  );
}
```

In `canvas-sidebar.tsx`, add the prop `onAddSettingsNode: (kind: HandAddedSettingsKind) => void;` and render the tiles inside the existing Prompt tile grid (`:318-322`):

```tsx
                <CanvasPromptTool isZh={isZh} onAdd={onAddPromptNode} />
                {HAND_ADDED_SETTINGS_KINDS.map((kind) => (
                  <CanvasSettingsTool key={kind} isZh={isZh} kind={kind} onAdd={onAddSettingsNode} />
                ))}
```

- [ ] **Step 5: Workspace wiring**

In `canvas-workspace.tsx`:

1. `NODE_TYPES.settings = SettingsNodeCard`.
2. In `toFlowEdges` and `handleConnect`, the settings stroke:

```ts
const settingsStroke = (node?: CanvasNode) =>
  node?.type === "settings" && node.data.settings ? settingsKindDef(node.data.settings.kind).color : undefined;
```

Define it as a module-level function. Use `settingsStroke(src) ?? (portType ? PORT_COLOR_MAP[portType] : "#c6f24b")` in `toFlowEdges`, and `settingsStroke(srcNode) ?? (portType ? PORT_COLOR_MAP[portType] : "#c6f24b")` in `handleConnect`. Remove the `EXPLAINER_SETTINGS_COLOR` import if unused.

3. In `handleConnect`, treat the settings handle as single-value:

```ts
      const replaceSingle =
        connection.targetHandle === SETTINGS_HANDLE || (tgtPort && !tgtPort.multiple) || (outfitPort && !outfitPort.multiple);
```

4. In `onUpdateNodeData`, mark only the affected targets for Swap / Teleport edits:

```ts
      const settingsTargets =
        current?.type === "settings" && patch.settings && patch.settings.kind !== "explainer"
          ? settingsStaleTargets(toDomainNodes(nodesRef.current), toDomainEdges(edgesRef.current), nodeId, patch.settings)
          : [];
```

Compute this before `setNodes`, then after the existing `if (stale) markStale([nodeId]);` add `if (settingsTargets.length > 0) markStale(settingsTargets);`.

5. `addSettingsNode`:

```ts
  const addSettingsNode = useCallback(
    (kind: HandAddedSettingsKind, position?: { x: number; y: number }) => {
      const settings = defaultSettings(kind);
      const newNode: FlowNode = {
        id: `settings-${crypto.randomUUID().slice(0, 8)}`,
        type: "settings",
        position: position ?? getCenterPosition(),
        data: { label: settingsKindDef(kind).label.zh, settings },
      };
      setNodes((prev) => [...prev, newNode]);
      scheduleAutosave();
    },
    [getCenterPosition, setNodes, scheduleAutosave],
  );
```

Pass `onAddSettingsNode={(kind) => addSettingsNode(kind)}` to `CanvasSidebar`. In `handlePaneDrop`, after the prompt branch:

```ts
      const settingsKind = event.dataTransfer.getData(CANVAS_DRAG_SETTINGS_MIME);
      if (HAND_ADDED_SETTINGS_KINDS.includes(settingsKind as HandAddedSettingsKind)) {
        addSettingsNode(settingsKind as HandAddedSettingsKind, position);
        return;
      }
```

and add `addSettingsNode` to its dependency list.

6. Context value: `const settingsOverrides = useMemo(() => settingsOverridesById(domainNodes, domainEdges), [domainNodes, domainEdges]);` next to `outdatedNodes`, and add `settingsOverrides` to the context object and its deps.

In `port-colors.ts`, add to the context type:

```ts
  // Values each wired settings node writes over its target at run time.
  settingsOverrides: ReadonlyMap<string, SettingsPatch>;
```

and to the default context value `settingsOverrides: new Map()` if a default object exists.

- [ ] **Step 6: Model card handle and effective values**

In `model-node-card.tsx`:

1. Read `settingsOverrides` from `useCanvasNodeActions()` and build the effective data right after `spec` is known:

```ts
  const override = settingsOverrides.get(id);
  // What the node will actually run with: its own values with the wired settings on top.
  const effective: CanvasNodeData = override
    ? {
        ...data,
        ...override,
        ...(override.toolParams ? { toolParams: { ...(data.toolParams ?? {}), ...override.toolParams } } : {}),
      }
    : data;
```

2. Use `effective` (not `data`) for `toolParams` (`:118`), `durationSeconds` (`:143`), `estimateCanvasModelCostUsd` resolution, and `activePreset` (`:157`). Leave every `onUpdateNodeData` call writing to `data` as today.

3. Replace the Explainer-only handle block (`:333-355`) with a generic one:

```tsx
        {/* Settings wire: which settings node controls this node's settings. */}
        {acceptsAnySettings({ id, type: "model", data }) ? (
          <div className="relative flex items-center justify-between px-3.5 py-0.5 text-[11px]">
            <Handle
              type="target"
              id={SETTINGS_HANDLE}
              position={Position.Left}
              style={{
                width: 11,
                height: 11,
                backgroundColor: wiredSettingsColor ?? "#64748b",
                border: "2px solid #0b0e13",
                left: -6,
              }}
            />
            <span className="flex items-center gap-1.5 text-white/80">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: wiredSettingsColor ?? "#64748b" }} />
              <span>{wiredSettingsLabel ?? (isZh ? "設定" : "Settings")}</span>
            </span>
            <span className="text-[10px] text-white/45">
              {wiredSettingsLabel ? (isZh ? "已連" : "Wired") : isZh ? "可接設定節點" : "Optional"}
            </span>
          </div>
        ) : null}
```

with, near `incomingByHandle`:

```ts
  const { nodes: graphNodes } = useCanvasNodeActions();
  const settingsEdge = edges.find((e) => e.target === id && e.targetHandle === SETTINGS_HANDLE);
  const wiredSettings = settingsEdge ? graphNodes.find((n) => n.id === settingsEdge.source)?.data.settings : undefined;
  const wiredDef = wiredSettings ? settingsKindDef(wiredSettings.kind) : undefined;
  const wiredSettingsColor = wiredDef?.color;
  const wiredSettingsLabel = wiredDef ? (isZh ? wiredDef.label.zh : wiredDef.label.en) : undefined;
```

Copy the existing block's `style` values (`left`, sizes) from the current lines `:336-347` so the handle sits where it does today. `CanvasNodeActionsContextValue` already exposes `nodes` and `edges`; merge the extra `useCanvasNodeActions()` destructure into the existing one at the top of the component.

4. When a field is controlled by settings, show it read-only: for the aspect, duration, and grade selects, add `disabled={Boolean(override?.aspectRatio)}` (etc. per field) and a `title` of `isZh ? "由設定節點控制" : "Controlled by the settings node"`.

- [ ] **Step 7: Banner wording**

In `outdated-notice.tsx`, the `"settings"` reason stays Explainer-specific (only Explainer drafts produce it). Leave the text as is.

- [ ] **Step 8: Typecheck, lint, test**

Run: `npx tsc --noEmit`
Run: `npx eslint src/app/app/canvas/ src/service/canvas/ src/service/canvas-agent/ src/model/`
Run: `npx tsx --test 'src/service/canvas/**/*.test.ts' 'src/service/canvas-agent/**/*.test.ts'`
Expected: no errors, all pass.

- [ ] **Step 9: Check in the browser**

With `npm run dev` running, open `http://localhost:3000/app/canvas` on a scratch canvas:
- The Tools tab shows "Swap 設定" and "Teleport 設定" tiles; clicking one adds the card.
- Dragging the Swap settings output onto a `ffmpeg:color-grade` node's settings handle connects; onto a TTS node it is refused.
- Changing the grade on a wired Swap settings card marks only the grade node (and its downstream) 舊版本.
- A wired render shows the settings length and price.

Do not press Run on any paid node.

- [ ] **Step 10: Commit**

```bash
git add src/app/app/canvas
git commit -m "feat(canvas): Swap and Teleport settings cards, handles, and sidebar tiles"
```

---

### Task 9: Docs and final verification

**Files:**
- Modify: `AGENTS.md` (Interactive Node Canvas and Canvas AI Assistant bullets), `pipeline-models.md` (canvas section)

- [ ] **Step 1: Update `AGENTS.md`**

In the Interactive Node Canvas bullet, after the Explainer Settings sentence, add:

```
Settings nodes are one type with a `kind` (`explainer`, `swap`, `teleport`; `src/service/canvas/settings/`). Swap and Teleport groups get a `${groupId}-settings` node (section start / length, ratio, swap mode, object, light look, Teleport mood, final grade) wired into their trim, render, and grade nodes; `withWiredSettings` merges those values over the targets before validation, pricing, and submit, so editing them needs no Apply and only marks the affected previews as old versions. Swap / Teleport Settings can also be dragged from the Tools tab and wired by hand onto any accepted node; older Swap / Teleport groups get one on load, and a Teleport Mood prompt node moves into it.
```

In the Canvas AI Assistant bullet, after the `update_explainer_settings` sentence, add:

```
`update_settings` (`settings-tool.ts`) changes a Swap or Teleport settings node and marks only the affected previews old; `get_canvas` lists each settings node's `settingsKind` and values.
```

- [ ] **Step 2: Update `pipeline-models.md`**

In its canvas section, add the same two facts in that file's style: Swap / Teleport settings nodes merge into `scro:swap-render`, `scro:teleport-render`, `ffmpeg:trim-speed`, and `ffmpeg:color-grade` at run time; no model, price, or resolution changes.

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit`
Run: `npx eslint src/app/app/canvas/ src/service/canvas/ src/service/canvas-agent/ src/model/`
Run: `npx tsx --test 'src/service/canvas/**/*.test.ts' 'src/service/canvas-agent/**/*.test.ts'`
Expected: clean, all pass.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md pipeline-models.md
git commit -m "docs(canvas): settings node kinds in AGENTS.md and pipeline-models.md"
```
