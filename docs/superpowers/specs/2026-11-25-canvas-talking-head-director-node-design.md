# Canvas Talking Head Director persistent node and outputs

Date: 2026-11-25
Status: approved in chat (three sections), spec awaiting review

## Problem

When a Talking Head Director node (`scro:talking-head` with `toolParams.plannerMode: true`)
finishes free planning today, `canvas-workspace.tsx` removes the card via
`replacePlannerWithExpansion` and bakes the opening still prompt, each clip's spoken line, and
each clip's HeyGen prompt inline onto the expanded nodes.

Unlike the Explainer Director node, users cannot see where the prompts came from, cannot edit
the script / framing / character / language / ratio on the Director card and Replan in place,
cannot wire a `Setting` node (`{{key}}`) into the Director, and cannot let the Canvas AI
Assistant replan a Talking Head group without deleting and recreating every node.

## Goals

1. Keep the **Talking Head Director** node on the canvas after planning and generation, storing
   its plan at `toolParams.plan` and exposing text outputs wired to the corresponding downstream
   nodes.
2. Mirror the Explainer Director workflow: after the first plan ask whether to auto-build the
   downstream nodes or keep outputs only; on Replan, update in place when clip count matches
   (including syncing downstream non-prompt parameters), and ask Rebuild vs Keep when clip count
   changes.
3. Introduce a thin shared dispatcher (`src/service/canvas/director-node.ts`) over the separate
   Explainer and Talking Head director domain modules so graph validation, input resolution,
   stale marking, Setting resolution, workspace handling, and agent tools stay unified without
   conflating the two models.
4. Support wiring a `Setting` node (`{{key}}` placeholders) into Talking Head Director.
5. Update Canvas AI Assistant (`get_canvas`, `connect`, `replace_group`, system prompt) so
   Talking Head Director replans in place.

## Non-goals

- Backfilling an idle Talking Head Director card onto legacy expanded Talking Head groups that
  already exist on older canvases (they keep their inline prompts and continue to work as-is).
- Changing any video/image/TTS model, provider, resolution, or unit price.
- Adding a separate `update_talking_head_settings` agent tool (`replace_group` already takes
  `prompt`, `characterId`, `language`, `framing`, and `aspectRatio`).

## Talking Head Director node

### Identity

Reuses the existing node shape: `type: "model"`, `modelId: "scro:talking-head"`,
`toolParams.plannerMode: true`. Checked via `isTalkingHeadDirectorNode(node)` in
`src/service/canvas/talking-head-director.ts`. It is no longer removed after planning.

### Parameters (all on the card)

```ts
export type TalkingHeadDirectorParams = {
  script: string;       // trimmed node.data.prompt
  characterId?: string; // wired character node wins over dropdown
  language: "yue" | "zh" | "en";
  framing: "collarbone-close" | "waist-up" | "handheld-selfie" | "full-body";
  aspectRatio: CanvasAspectRatio;
};
```

The card keeps its existing `character` optional input handle and adds the top-left `settings`
(`SETTINGS_HANDLE`) input handle so a `Setting` node can fill `{{key}}` placeholders.

### State

`toolParams.planStatus`: `undefined` (idle / not yet planned), `"planning"`, `"planned"`,
`"failed"`. The legacy `"expanded"` status continues to be dropped on load by
`dropExpandedPlanners`.

### Stored plan

```ts
export type TalkingHeadDirectorClip = {
  clipNumber: number;
  spokenLine: string;
  heygenPrompt: string;
  durationSeconds: number;
};

export type TalkingHeadDirectorPlan = {
  plannerVideoId: string;
  plannedWith: TalkingHeadDirectorParams; // snapshot from toolParams.planningWith
  framePrompt: string;                    // shared opening still prompt (Seedream 5.0 Pro)
  frameRefUrls: string[];                 // character locks in prompt order
  voicePreset: string;                    // resolved TTS preset for language + voiceGender
  clips: TalkingHeadDirectorClip[];
};
```

Stored at `toolParams.plan`. Pure helpers in `src/service/canvas/talking-head-director.ts` read
and validate it (`readTalkingHeadPlan`).

### Outputs

- **Planned**: text source handles (`PORT_COLOR_MAP.text`):
  - One shared opening still output: `opening-frame` (labeled `開場靜幀` / `Opening still`) →
    wires to `frame-1.prompt`.
  - Per clip (`1..N`):
    - `clip-<n>-motion` (labeled `Clip n · 動作` / `Clip n · Motion`) → wires to
      `video-<n>.prompt`.
    - `clip-<n>-voice` (labeled `Clip n · 旁白` / `Clip n · Voiceover`) → wires to
      `voice-<n>.prompt`.
- **Not planned**: one grey right-aligned row (`規劃後出現輸出` / `Outputs appear after planning`)
  with no connectable handles.
- Reference images (`frameRefUrls`) are not output handles; auto-build creates visible `media`
  nodes wired into `frame-1.refImages`, matching Explainer Director.

### Dirty state

`talkingHeadNeedsReplan(node)` compares `talkingHeadDirectorParams(node)` against
`plan.plannedWith` across all 5 fields (`script`, `characterId`, `language`, `framing`,
`aspectRatio`).

- When dirty and not planning: card shows amber notice (`設定已改，請按 Replan。輸出暫時維持上次的規劃。`)
  and highlights the `Replan` button.
- Outputs keep serving the last stored plan until Replan completes.
- Downstream nodes with existing previews show the amber outdated badge (`reason: "settings"`).

## Shared persistent director dispatcher

`src/service/canvas/director-node.ts` provides a thin pure dispatch layer over
`explainer-director.ts` and `talking-head-director.ts`:

- `isPersistentDirectorNode(node)`
- `directorOutputHandles(node): string[]`
- `isDirectorOutputHandle(node, handle): boolean`
- `directorOutputRawText(node, handle): string | undefined`
- `directorNodeBaseVars(node): Record<string, string>` (`{ text_style }` for Explainer, `{}` for
  Talking Head)
- `directorNodeNeedsReplan(node): boolean`
- `directorNodeChangedTargets(before, after, edges): string[]`
- `directorNodeClipCount(node): number | undefined`

Graph consumers (`graph.ts`, `stale-outputs.ts`, `settings/apply.ts`,
`explainer-director-apply.ts`, `canvas-workspace.tsx`, `canvas-agent/tools.ts`) call this
dispatcher instead of branching on Explainer-only helpers.

## Plan, expand, Replan, and parameter sync

### Start plan (`startCanvasExplainerPlan`)

When starting a Talking Head plan, persist `"nodes.$[n].data.toolParams.planningWith":
talkingHeadDirectorParams(plannerNode)` alongside `plannerVideoId` and `planStatus: "planning"`,
matching Explainer Director so edits made mid-plan do not skew `plan.plannedWith`.

### Read plan (`planStateFromVideo`)

For `TALKING_HEAD_PLANNER_MODEL_ID`:
- Build `TalkingHeadDirectorPlan` using `planningWith` (fallback
  `talkingHeadDirectorParams(plannerNode)`).
- Call `buildTalkingHeadExpansion` with `directorId: plannerNode.id` and
  `origin: { x: plannerNode.position.x + DIRECTOR_ROW_OFFSET_X, y: plannerNode.position.y }`.
- Include the Director in the group: `memberIds: [plannerNode.id, ...expansion.nodes.map((n) => n.id)]`.
- Return `{ status: "ready", ...expansion, summary, group, plan }`.

### Expansion wiring (`buildTalkingHeadExpansion`)

`TalkingHeadExpansionInput` gains optional `directorId?: string`:
- When `directorId` is set:
  - `frame-1`, `video-<n>`, and `voice-<n>` hold `prompt: ""` (inline prompt cleared).
  - After `b.finish(output)` computes the depth layout for internal nodes, append the Director
    edges so they do not perturb the group layout:
    - `${directorId}:opening-frame->${frame}:prompt` (`sourceHandle: "opening-frame"`)
    - `${directorId}:clip-${n}-motion->${video}:prompt` (`sourceHandle: "clip-${n}-motion"`)
    - `${directorId}:clip-${n}-voice->${voice}:prompt` (`sourceHandle: "clip-${n}-voice"`)
- When `directorId` is omitted: existing inline-prompt behavior is preserved for backward
  compatibility.

### Decision dialog and workspace flow (`canvas-workspace.tsx` & `director-plan-decision-dialog.tsx`)

Polling in `canvas-workspace.tsx` routes both Explainer and Talking Head ready plans with
`state.plan` through `onDirectorPlanReady`:

1. **First plan (`!oldPlan`)**:
   - Store `toolParams.plan`, set `planStatus: "planned"`, clear `planningWith`.
   - Open `DirectorPlanDecisionDialog` (`kind: "build"`, carrying `directorKind: "explainer" | "talking-head"`
     for tailored copy).
   - **Auto-build**: `applyDirectorBuild` adds the expanded nodes and edges, attaches the group
     (including the Director), and schedules measured layout (`layout: "depth"` for Talking Head,
     filtering out edges whose `source === directorId`).
   - **Outputs only**: only the stored plan and output handles remain.
2. **Replan with same clip count (`oldCount === newCount`)**:
   - Update `toolParams.plan` in place.
   - Mark wired downstream nodes whose output text changed as stale (`markStale`).
   - For Talking Head, when the Director belongs to a group, also run a pure sync helper
     (`syncTalkingHeadGroupNodes` in `src/service/canvas/talking-head-director.ts`) across the
     Director's group to keep non-prompt node settings aligned with `plan.plannedWith` and `plan`
     (a no-op when the user chose "Outputs only" and no group exists):
     - `aspectRatio` changed → update `aspectRatio` & `presetId` on `frame-1` and `video-<n>`,
       mark them stale.
     - `framing` changed → update `gradeLook` & `presetId` (`talking-head-selfie` vs
       `talking-head`) on `grade-<n>`, mark them stale.
     - `language` / `characterId` / `voicePreset` changed → update `toolParams` on `voice-<n>`,
       mark them stale.
     - `frameRefUrls` changed (e.g. character changed) → update or replace the `ref-*` media
       nodes wired into `frame-1.refImages` (updating group `memberIds` if ref node count
       changed) and mark `frame-1` stale.
     - Update `group.params` (`aspectRatio`, `language`, `framing`, `characterId`).
   - Show success toast (`已更新規劃，按 Run group 重新生成`).
3. **Replan with different clip count (`oldCount !== newCount`)**:
   - Open `DirectorPlanDecisionDialog` (`kind: "count"`).
   - **Rebuild**: `applyDirectorBuild` with `replaceGroup: oldGroup` removes old group members
     except the Director, inserts the new expanded nodes/edges, replaces the group, and runs
     measured `"depth"` layout.
   - **Keep**: `dropCutDirectorEdges` removes edges from handles that no longer exist on the new
     plan, warns via toast which nodes lost their prompt, marks surviving changed targets stale,
     and applies `syncTalkingHeadGroupNodes` to surviving group nodes.

## Graph, Setting (`{{key}}`), and runtime

- `getNodeOutputPortType`: returns `"text"` for any persistent director when
  `isDirectorOutputHandle(node, sourceHandle)` is true, and `null` otherwise.
- `validateEdgeConnection`: allows non-`"output"` source handles only when the source is a
  planned persistent director and `directorOutputHandles(sourceNode).includes(sourceHandle)`.
- `resolveNodeInputs`: resolves wired persistent director prompt handles with `{{key}}` variable
  precedence (last wins):
  1. `directorNodeBaseVars(director.node)` (`{}` for Talking Head)
  2. `Setting` wired into the Director
  3. `Setting` wired into a Prompt node in between, if any
  4. `Setting` wired into the receiving node
  Missing plan or missing handle text reports the Director in `missingUpstreamNodeIds`.
- `outdatedNodeReasons`: marks downstream preview nodes of any dirty persistent director as
  `reason: "settings"`.
- `settingsStaleTargets` / `templateText`: reads every output of a wired Talking Head Director so
  editing a `Setting` var marks only affected downstream nodes as stale.
- `computeExecutionWaves`, pricing, and gaps continue to treat Talking Head Director as a
  non-runnable planner source (`isDirectorPlannerNode`) that never bills.

## Canvas AI Assistant integration

- `get_canvas` (`src/service/canvas-agent/tools.ts`): for `isTalkingHeadDirectorNode`, include
  `director: { params, planStatus, clips, outputs: "opening-frame | clip-<n>-motion | clip-<n>-voice (text)", needsReplan }`.
- `connect` (`src/service/canvas-agent/tools.ts`):
  - When source is a persistent director, validate `sourcePort` against that director's handle
    format (`opening-frame` / `clip-<n>-motion` / `clip-<n>-voice` for Talking Head) and return
    an actionable error if invalid or missing.
  - When target is a persistent director, allow `character` and `settings` ports cleanly.
- `replace_group` (`src/service/canvas-agent/group-tools.ts`):
  - When a Talking Head target contains a `TalkingHeadDirector` node (inside a group or as a
    standalone card), update that Director in place (`prompt`, `aspectRatio`, `toolParams`:
    `characterId`, `language`, `framing`, `replanRequested: true`), returning
    `nodeId: director.id, removedCount: 0`.
  - Legacy Talking Head groups with no Director node keep the existing replace-with-new-card
    fallback.
- Client agent op replay (`canvas-workspace.tsx`): trigger `startDirectorPlan` for any
  `isPersistentDirectorNode(n) && n.data.toolParams?.replanRequested === true`.
- System prompt (`src/service/canvas-agent/prompt.ts`): document that Talking Head Director stays
  on the canvas, exposes `opening-frame`, `clip-<n>-motion`, and `clip-<n>-voice`, accepts
  `Setting` (`{{key}}`), and replans in place via `replace_group`.

## Error handling

- Planning failure keeps any previous `toolParams.plan` intact, sets `planStatus: "failed"` and
  `planError`, and offers Retry / Replan without breaking existing outputs or wires.
- Unfilled `{{key}}` blocks execution on both client and server with the missing placeholder named.
- Rebuild, Keep, and same-count sync each apply in one state update batch so Undo restores the
  prior graph cleanly.

## Testing

Pure unit tests only (no live or paid provider calls):
- `src/service/canvas/talking-head-director.test.ts`: params extraction, plan parsing, output
  handles (`opening-frame`, `clip-<n>-motion`, `clip-<n>-voice`), `talkingHeadNeedsReplan`,
  `talkingHeadRawOutput`, `talkingHeadChangedTargets`, and `syncTalkingHeadGroupNodes`
  (`aspectRatio`, `framing` → `gradeLook`, `language` / `characterId`, `frameRefUrls` add/remove/replace).
- `src/service/canvas/director-node.test.ts`: unified dispatcher across both Explainer and Talking
  Head directors.
- `src/service/canvas/scro-groups/talking-head.test.ts`: expansion with `directorId` wires
  `opening-frame`, `clip-<n>-motion`, `clip-<n>-voice`, clears inline prompts, and excludes
  director edges from layout; omitting `directorId` preserves legacy inline prompts.
- `src/service/canvas/explainer-plan.test.ts`: Talking Head `planStateFromVideo` emits
  `TalkingHeadDirectorPlan`, offsets rows by `DIRECTOR_ROW_OFFSET_X`, includes Director in
  `group.memberIds`, and honors `planningWith`.
- `src/service/canvas/graph.test.ts`, `stale-outputs.test.ts`, `settings/apply.test.ts`,
  `explainer-director-apply.test.ts`: Talking Head handle validation, `{{key}}` resolution order,
  stale `reason: "settings"`, and `dropCutDirectorEdges`.
- `src/service/canvas-agent/tools.test.ts` & `group-tools.test.ts`: `get_canvas` director block,
  `connect` with Talking Head handles, `replace_group` in-place replan vs legacy group fallback.

## Docs

Update `AGENTS.md` (canvas and assistant descriptions) and verify `pipeline-models.md` stays in
sync with the persistent Talking Head Director behavior.
