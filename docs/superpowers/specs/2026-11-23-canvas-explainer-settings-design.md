# Canvas Explainer: clear stale previews and an Explainer Settings node

Date: 2026-11-23
Status: approved in chat

## Problem

On canvas `6b014ba55ed17c0a56d71ff8` the user asked the assistant to turn the paper-cutout
wooden background blue. The assistant prepended "blue background, absolutely NO wood" to each
frame prompt, but the director's own `Paper-cutout collage lock ... dark warm-brown wooden craft
board` sentence stayed in the same prompt, so the prompt contradicts itself.

The frames also kept `status: completed` and their old `outputUrl`. A flow run skips any node that
is completed with an output (`worker-runner.ts`), so Run group regenerated nothing and the old
preview stayed on screen. The video, mux, and concat nodes downstream were stale too.

## Goals

1. Any change to a node's generation inputs clears that node's preview and every downstream
   preview, whether the assistant made the change or the user did. Run group then regenerates them.
2. Each Explainer group gets one **Explainer Settings** node (`type: "settings"`) holding background,
   on-screen text style, on-screen text language, presenter position, and art style. Frame prompts
   keep being built by the director (`buildFramePrompt`); the settings node never parses or
   patches prompt strings.
3. The assistant changes those settings through the settings node, never by editing frame prompts.
4. Older Explainer groups get a settings node on load. This canvas's stale previews are cleared once.

## Non-goals

- Custom background text. Only the director's preset backgrounds are offered (paper-cutout has 6,
  including blueprint paper and blue sky; papercraft has 6; the cartoon whiteboard has none).
- User-made text styles. Only the system looks in `SYSTEM_TEXT_STYLE_ORDER` are offered.
- Talking Head groups.

## Stale previews

- `CanvasNodeData.outputClearedAt?: string` (ISO time) marks a deliberate clear.
- `clearNodeOutput(data, clearedAt)` returns data with `status: "idle"`, no `outputUrl`,
  `outputKind`, `lastJobId`, `lastError`, or `lastCostUsd`, and `outputClearedAt` set.
- `clearStaleOutputs(nodes, edges, changedIds, clearedAt)` walks edges downstream from the changed
  nodes (inclusive) and clears every model or character node that has an output or a final status.
  Queued and running nodes are left alone.
- `isGenerationInputPatch(data, patch)` is true when the patch changes any of `prompt`, `text`,
  `negativePrompt`, `modelId`, `presetId`, `aspectRatio`, `resolution`, `durationSeconds`, `seed`,
  `toolParams`, `mediaUrl`, or `characterId`.
- Server protections must not undo a clear:
  - `mergeCanvasNodeSnapshots` does not restore a stored `outputUrl` when the incoming node has an
    `outputClearedAt` that differs from the stored node's.
  - `applyCompletedJobOutputs` ignores jobs that finished at or before the node's `outputClearedAt`.
- Assistant: a new op `{ kind: "clear_output"; nodeIds; clearedAt }`. `update_node` (and so
  `batch_update_nodes` and `update_group_nodes`), `connect`, and `disconnect` emit it for the
  changed node and its downstream nodes.
- Client: `onUpdateNodeData` (input patches only), `handleConnect`, edge removal, and node deletion
  clear the affected targets and their downstream nodes.

## Explainer Settings node

Data lives in `CanvasNodeData.explainerSettings`:

```ts
type ExplainerSettings = {
  skillSlug: "cartoon-explainer-video-director" | "paper-cutout-explainer-video-director" | "papercraft-diorama-director";
  backgroundId?: string;            // a preset id of skillSlug's director
  textStyleId: SubtitleLook;        // system look
  sceneTextLanguage: SceneTextChoice; // "zh-Hant" | "zh-Hans" | "en" | "ja" | "ko" | "none"
  presenterPosition: "auto" | "lower-left" | "lower-right";
};
type ExplainerSettingsNodeData = {
  plannerVideoId: string;           // the canvasPlanOnly backing video
  topic: string;                    // the plan topic without appended blocks
  applied: ExplainerSettings;
  pending?: ExplainerSettings;      // set by the assistant; the client applies it after replay
};
```

- The node id is `<groupId>-settings`. It sits left of the group and has an edge to every
  `<groupId>-frame-N` on target handle `settings`. The edge only shows the dependency and carries
  stale clearing; `resolveNodeInputs` ignores it, flow waves skip non-model nodes, and users cannot
  draw new edges from it (`getNodeOutputPortType` returns null).
- Applying settings:
  - **Text style only**: server action `restyleCanvasExplainerAction` sets `subtitleLook`,
    `textStyleId`, and `onScreenTextStyleId` on the backing video, rebuilds every start-still prompt
    with `buildCanvasPlanFramePrompts`, and returns them. The client writes them into the frame
    nodes and clears those frames and everything downstream. Free.
  - **Anything else** (background, text language, presenter, art style): Phase A wrote these into
    each scene, so the group is re-planned. The client replaces the group with a planning card whose
    prompt is `composeExplainerPlanSource({ topic, presenterPosition, narration })` (narration is
    the group's voice node lines in clip order, to be kept word for word) and whose `toolParams`
    carry the settings, then starts planning. Free, about 1–2 minutes.
- `createCanvasDirectorVideo` reads `directorBackgroundId` (validated for the skill),
  `textStyleId`, and `sceneTextLanguage` (`"none"` turns scene text off) from the planner card.
- `planStateFromVideo` adds the settings node and edges when it expands an Explainer plan.

## Assistant

- New tool `update_explainer_settings({ groupId?, artStyle?, background?, textStyle?, textLanguage?, presenter? })`
  validates the values and writes `explainerSettings.pending`. The client applies it after replay
  through the same path as the Apply button.
- `replace_group` keeps the old group's settings when it re-plans an Explainer.
- Prompt rule: background, on-screen text style or language, presenter position, and art style
  changes go through `update_explainer_settings`; never edit frame prompts for them.
- `get_canvas` describes settings nodes.

## Migration

- On `/app/canvas` load, every Explainer group without a settings member gets one. Its backing
  video is found among the user's `canvasPlanOnly` videos whose id ends with the group id suffix
  (`exp-<last 6 hex>`). Groups whose video cannot be found are left as they are.
- A one-off script clears the previews of the Explainer group on canvas `6b014ba55ed17c0a56d71ff8`.

## Testing

Unit tests only, no paid provider calls: stale clearing and input-patch detection, snapshot merge
and job hydration with `outputClearedAt`, `clear_output` replay, settings diff / plan source /
tool params, expansion with the settings node, migration graph edit, assistant tools.

## Docs

Update the canvas sections of `AGENTS.md` and `pipeline-models.md`.
