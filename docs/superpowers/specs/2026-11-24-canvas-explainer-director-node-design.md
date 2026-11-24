# Canvas Explainer Director node and key-value Setting

Date: 2026-11-24
Status: approved in chat (three sections), spec awaiting review

## Problem

An expanded Explainer group bakes every clip's still prompt, motion prompt, and voiceover into
the model nodes. Its Explainer Settings node only takes effect through Apply or Replan, and
Replan deletes the whole group and replaces it with a planning card. The wire from that node to
each frame carries nothing at run time, so users cannot tell what it does.

Swap and Teleport groups have their own settings cards with fixed fields. The Setting node is
three unrelated cards that share a name.

## Goals

1. A persistent **Explainer Director** node holds every Explainer parameter and the plan. It has
   three text outputs per clip that wire into model or Prompt node prompt inputs.
2. Replanning updates those outputs in place. Wired downstream nodes stay and are marked as old
   versions. Changing the clip count asks before rebuilding.
3. **Setting** is one plain key-value map. It fills `{{key}}` placeholders in prompts when a
   model runs. It has no kind and no fixed fields.
4. Swap and Teleport parameters move back onto their trim, render, and grade node cards.
5. Older canvases keep working after load.

## Non-goals

- A Director node for Talking Head, Life, Poster, Swap, or Teleport.
- Making art style or on-screen language swappable without a replan. Both decide how the plan is
  written, so a placeholder cannot change them.
- Any provider, model, resolution, or price change.

## Explainer Director node

### Identity

The Director reuses the existing planner node: `type: "model"`, `modelId: "scro:explainer"`,
`toolParams.plannerMode: true`. It is no longer removed after planning. `isDirectorPlannerNode`
stays the single check for it.

### Parameters (all on the card)

Topic, character, length preset, aspect ratio, art style (`skillSlug`), voice language
(`yue | zh | en`), on-screen text language (`zh-Hant | zh-Hans | en | ja | ko | none`),
background, presenter position, text style.

The current Explainer setup dialog still opens when the tool is dropped or the template is
applied, and it now creates a Director card with these values.

### State

`toolParams.planStatus`: `idle` (not planned), `planning`, `planned`, `failed`. The old
`expanded` value is read as `planned` by the migration below.

### Stored plan

```ts
type ExplainerDirectorPlan = {
  plannerVideoId: string;
  plannedWith: ExplainerDirectorParams; // snapshot of the card parameters used
  clips: {
    clipNumber: number;
    framePrompt: string;   // keeps {{text_style}} where the lettering line goes
    videoPrompt: string;
    spokenLine: string;
    durationSeconds: number;
    refUrls: string[];     // character / prop / set locks, in prompt order
  }[];
};
```

Stored at `toolParams.plan`. Pure helpers read and validate it.

### Outputs

- Planned: three text source handles per clip, `clip-<n>-frame`, `clip-<n>-motion`,
  `clip-<n>-voice`, labeled "Clip n 靜幀 / 動作 / 旁白".
- Not planned: one grey row, "規劃後出現輸出", with no connectable handles.
- Reference images are not outputs. Auto-build creates reference `media` nodes wired into the
  still's Ref Images, as expansion does today.

### Output text

For a wired handle, the text is the stored clip field, rendered once with these vars merged
(later sources win on the same key):

1. `text_style` from the Director's own text style
   (`lookLineForOnScreenVideo(subtitleLookLine(look))`).
2. The Setting wired into the Director.
3. The Setting wired into a Prompt node in between, if any.
4. The Setting wired into the receiving node.

### Dirty state

`directorNeedsReplan(params, plan)` compares the card parameters with `plan.plannedWith`,
ignoring the text style.

- Text style changed: no replan. Outputs change at once and wired downstream nodes are marked
  as old versions.
- Any other parameter changed: the card shows "設定已改，請 Replan". Outputs keep the last plan
  until Replan finishes.

## Plan, Replan, and auto-build

### Plan

"Plan（免費）" uses the current free flow: `startCanvasExplainerPlanAction`, Phase A plus every
clip's Phase B on a `canvasPlanOnly` video, and polling through `readCanvasExplainerPlan`. When
it finishes, the client writes `toolParams.plan` and `planStatus: "planned"` instead of replacing
the card.

Start-still prompts are built with `{{text_style}}` in place of the lettering line. Shortening
reserves room for the longest style line and re-adds the placeholder if it is dropped (already
in `explainer-text-style.ts`).

After the first plan, a prompt asks: "已規劃 N 段，要不要自動建立下游節點？"

- Yes: build today's rows (reference media → Nano Banana 2.1 still → MiniMax H3 → TTS (1.25x) →
  audio mux → concat chain). The still, video, and TTS nodes take their prompt from the
  Director's handles and hold no inline prompt. The Director and the built nodes form one
  Explainer group.
- No: only the outputs appear.

### Replan

"Replan（免費）" lights up when `directorNeedsReplan` is true, and is always available. When the
topic is unchanged it keeps every clip's voiceover word for word, as today's replan does. A new
topic plans new voiceover.

- Same clip count: update the stored plan in place. Mark the downstream nodes of each changed
  output as old versions.
- Different clip count: ask.
  - Rebuild: delete this group's downstream nodes and build them again for the new count.
  - Keep: extra clips get unwired outputs. Removed clips lose their outputs, their wires are
    removed, and a toast names the nodes that lost a prompt.

### Assistant

`update_explainer_settings` and `replace_group` for Explainer groups write the Director's
parameters and start a Replan. The assistant still never runs nodes or spends USD Credit.

## Setting (key-value map)

```ts
type CanvasSettingsData = { vars: Record<string, string> };
```

- Card title is always "Setting". The sidebar has one Setting tile.
- Keys match `^[A-Za-z_][A-Za-z0-9_]{0,39}$`. Values are up to 4000 characters.
- Wires into the `settings` handle of a Director, model, or Prompt node.
- `resolveNodeInputs` fills `{{key}}`. An unfilled key adds `{{key}}` to
  `missingRequiredFields`, which blocks the run.
- Editing a value marks old only the nodes whose prompt uses that key, plus their downstream
  nodes.
- The assistant changes values with `update_settings` `vars`. `get_canvas` lists each Setting's
  vars.

The `explainer`, `swap`, `teleport`, and `custom` kinds, their registry, `resolveSettings`,
`withWiredSettings`, and the preset keys added on 2026-11-24 are removed.

## Swap and Teleport

Parameters return to the node cards:

| Field | Node |
| --- | --- |
| Section start, section length | `ffmpeg:trim-speed` (`toolParams`) |
| Ratio, swap mode, object, object edit mode, light look | `scro:swap-render` |
| Ratio, mood (as prompt) | `scro:teleport-render` |
| Final grade | `ffmpeg:color-grade` |

Changing the section length on a group's trim node also sets the render node's
`durationSeconds`, so they stay equal. Group dialogs no longer create a settings node. The
assistant edits these fields with `update_group_nodes` or `update_node`. The guard that blocked
edits to settings-controlled fields is removed.

## Graph and runtime

- `validateEdgeConnection` accepts a source handle matching `clip-\d+-(frame|motion|voice)` from
  a planned Director, only into a `text` input (`prompt`). Other nodes still use `output` only.
- `resolveNodeInputs`: a prompt wire from a Director resolves to that clip's text. A missing plan
  or a missing clip reports the Director in `missingUpstreamNodeIds`.
- Run Flow waves, pricing, gaps, and stale marking treat the Director as a non-runnable source.
  It never bills.
- When an output's resolved text changes, the nodes wired to it and everything downstream are
  marked as old versions.

## Migration on load (pure)

- Swap or Teleport settings node: write its values onto the nodes it is wired to, using today's
  resolve logic. Then remove the node and its edges, or turn it into a plain Setting if it has
  `vars`.
- Explainer settings node: replace it with a Director card in the `idle` state. Prefill the
  topic and the applied settings, and take character, language, length, and ratio from the group
  params. Remove its edges to frames. The frames keep their inline prompts and still run. On
  Plan, the clip-count prompt offers Rebuild.
- `explainer` / `swap` / `teleport` / `custom` Setting data with `vars` becomes `{ vars }`.
- A planner with `planStatus: "expanded"` (already dropped today) keeps being dropped.

## Error handling

- Planning failure: the card shows `failed` with the error and a Retry.
- Unfilled `{{key}}`: the run is blocked, with the key named, on both the client and the server.
- A rebuild or keep choice is applied in one state update, so Undo restores it.

## Testing

Pure unit tests only, with no paid or live provider calls:

- Handle validation and Director prompt resolution, including placeholder order.
- `directorNeedsReplan`.
- Plan to auto-build nodes and wires.
- Replan with the same count (in-place update, stale ids) and a different count (rebuild and
  keep).
- Every migration case.
- Setting vars rendering, missing keys, and stale targets.
- Swap / Teleport trim length syncing to render duration.

The planning worker is not run live.

## Docs

Update `AGENTS.md` (canvas section and assistant tools) and `pipeline-models.md` (canvas Explainer
pipeline) in the same change.
