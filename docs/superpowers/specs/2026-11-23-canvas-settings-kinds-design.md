# Canvas Settings node kinds: Explainer, Swap, Teleport

Date: 2026-11-23
Status: approved in chat

## Problem

The canvas `settings` node only knows one shape, `data.explainerSettings`. Its card, the
`settings` target handle on Explainer frames, the old-version marking in `outdatedNodeReasons`,
and the assistant tools all read that one field. Swap and Teleport groups keep their look and
section parameters spread over the `toolParams` of three nodes (trim, render, grade), plus a
separate Mood prompt node for Teleport, so changing one setting means finding the right node.

## Goals

1. One `settings` node type whose data is a union keyed by `kind`: `explainer`, `swap`, `teleport`.
   Adding a kind later means one registry entry, one service file, and one card.
2. Swap and Teleport settings take effect at run time: the executor reads the wired settings
   node before validating, pricing, and submitting. There is no Apply step.
3. Explainer settings keep today's draft / Apply / Replan behavior unchanged.
4. Users can add a Swap or Teleport settings node from the sidebar and wire it by hand.
5. Existing Swap and Teleport groups get a settings node on load.

## Non-goals

- Settings nodes for Life, Poster, or Talking Head groups.
- Adding Explainer settings by hand. They only come from a plan.
- Changing any provider, model, or price.

## Data model

`CanvasNodeData.settings?: CanvasSettingsData` replaces `explainerSettings`.

```ts
type CanvasSettingsData =
  | ({ kind: "explainer" } & ExplainerSettingsNodeData) // plannerVideoId, topic, applied, pending?, draft?
  | { kind: "swap"; values: SwapSettings }
  | { kind: "teleport"; values: TeleportSettings };

type SwapSettings = {
  swapMode: "character" | "object" | "relight" | "colorfix";
  objectTarget?: string;
  objectEditMode?: "change" | "add" | "remove";
  lightLookId?: string;
  sectionStart: number;   // seconds, >= 0
  sectionLength: number;  // seconds, clamped to 2–15 by clampSectionLength
  aspectRatio: CanvasAspectRatio;
  gradeLook: string;      // an existing ffmpeg:color-grade look id, default "jutsu"
};

type TeleportSettings = {
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
  mood?: string;
  gradeLook: string;
};
```

- Zod schemas are a discriminated union on `kind`, so the canvas save path rejects unknown kinds.
- Loading a canvas converts a legacy `data.explainerSettings` into `settings: { kind: "explainer", ... }`
  before validation (`src/service/canvas/settings/legacy.ts`). Nothing writes the old field again.

## Registry

`src/service/canvas/settings/registry.ts` maps each kind to a `SettingsKindDef`:

| Member | Purpose |
| --- | --- |
| `label`, `color` | Card title and wire color |
| `accepts(target)` | Whether a model node may take this kind on its `settings` handle |
| `resolve(settings, target)` | Fields merged into the target before it runs |
| `defaults()` | Values for a node added from the sidebar (`undefined` for explainer) |
| `changed(a, b)` | Keys that differ, used for old-version marking |

One file per kind: `settings/explainer.ts`, `settings/swap.ts`, `settings/teleport.ts`.

`accepts`:
- explainer: Explainer start-still frames (current behavior).
- swap: `ffmpeg:trim-speed`, `scro:swap-render`, `ffmpeg:color-grade`.
- teleport: `ffmpeg:trim-speed`, `scro:teleport-render`, `ffmpeg:color-grade`.

`resolve`:
- explainer: `{}`. Its values are already baked into frame prompts on Apply / Replan.
- trim (swap and teleport): `toolParams.ffmpegStartSec`, `ffmpegEndSec = start + clamped length`, `ffmpegSpeed: 1`.
- swap render: `toolParams.swapMode`, `objectTarget`, `objectEditMode`, `lightLookId`, plus
  `aspectRatio`, `presetId = aspectRatio`, `durationSeconds = clamped length`.
- teleport render: `aspectRatio`, `presetId`, `durationSeconds`, and `mood` as the render prompt
  when the render has no wired `prompt` input.
- grade: `presetId = gradeLook`, `toolParams.gradeLook`.

## Run-time merge

- Pure `withWiredSettings(nodes, edges): CanvasNode[]` (`settings/apply.ts`) returns nodes where
  each target of a `settings` edge has `resolve()` merged over its own data. Settings values win;
  removing the wire falls back to the node's own values, which stay stored on the node.
- `submitCanvasNodeJob` runs it before `resolveNodeInputs`, Scro validation, pricing, and dispatch,
  so the charged duration and the submitted duration are the same.
- The model card uses the same function for its price estimate and the fields it shows.
- A target ignores a settings edge whose kind does not accept it.

## Wiring

- A model node shows a `settings` target handle when any kind accepts it, labeled with the wired
  kind's label (or "Settings" when unwired).
- `isValidConnection` allows `settings → settings handle` only when the source kind accepts the
  target. A target holds at most one settings edge; a new one replaces the old.
- A settings node never connects to prompt, media, or other input handles.
- Wire color comes from the registry.

## Old-version marking

- Swap / Teleport value edits go through the existing `markStale` path, limited to targets whose
  `resolve()` output changed, plus everything downstream of them. Changing only `gradeLook` marks
  only the grade node.
- Connecting or removing a settings edge counts as an input change on its target.
- Explainer keeps derived marking: a draft that differs from `applied` marks downstream previews.
- `OutdatedReason` stays `"inputs" | "settings"`; the banner text names the settings kind.

## Cards

`nodes/settings-node-card.tsx` dispatches on `kind`; each card is its own file:

- `explainer-settings-node-card.tsx`: unchanged.
- `swap-settings-node-card.tsx`: mode; object target and edit mode only for `object`; light look
  (with `CanvasPreviewSelect` previews) only for `relight`; section start and length; ratio; grade.
- `teleport-settings-node-card.tsx`: section start and length; ratio; mood; grade.

Swap and Teleport cards write values straight to the node (no draft, no Apply) and follow the
Explainer card's styling (`DIALOG_FIELD`, dark card, registry color).

Sidebar Tools gains "Swap Settings" and "Teleport Settings", created from `defaults()`.

## Groups and migration

- `buildSwapGroup` / `buildTeleportGroup` add `${groupId}-settings` wired to trim, render, and grade.
  The three nodes keep their own matching params as the unwired fallback. Teleport no longer adds
  a Mood prompt node. The Swap instruction stays a prompt node; it is content, not a setting.
- `ensureExplainerSettingsNodes` becomes `ensureSettingsNodes` (page load). For each `swap` or
  `teleport` group with no settings member, it reads values from the trim, render, and grade
  `toolParams`, adds the settings node and its edges, and for Teleport moves the Mood prompt text
  into `mood`, deleting that prompt node and its edge. Outputs are not marked old, because the
  resolved values equal what produced them. Running it twice changes nothing.

## Assistant

- `get_canvas` lists each settings node's `kind` and current values.
- New `update_settings` tool (`settings-tool.ts`) edits Swap or Teleport values by group id or node
  id, validates them with the kind's schema, and emits `mark_stale` for the affected targets.
- `update_explainer_settings` is unchanged and remains the only way to change Explainer settings.
- The prompt tells the agent to change Swap / Teleport section, ratio, grade, and mood through
  `update_settings`, not by patching trim or render nodes.

## Testing

`node:test` only, no paid provider calls:

- Registry: `accepts`, `resolve`, `changed` for each kind.
- `withWiredSettings`: settings win, unwired fallback, explainer no-op, rejected kinds ignored.
- Executor: price and submit use the merged `durationSeconds`.
- Legacy conversion of `explainerSettings`.
- Migration: adds the node and edges, moves Mood, idempotent.
- `markStale`: a grade-only change marks only the grade node.
- `update_settings` tool and the Swap / Teleport group builders' wiring.

`AGENTS.md` and `pipeline-models.md` canvas sections are updated in the same change.
