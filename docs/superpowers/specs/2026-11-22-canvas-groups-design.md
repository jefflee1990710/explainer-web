# Canvas groups

Date: 2026-11-22. Status: approved in chat.

## Goal

Draw a titled boundary around related canvas nodes (an Explainer, a Talking Head, a Scro tool group, or any nodes the user picks), and give the canvas assistant a stable handle for that set so "update the explainer" targets the right nodes in one step.

## Scope

- Groups are created automatically when an Explainer or Talking Head plan expands and when a Life, Poster, Swap, or Teleport group lands (dialog or assistant). Users can also group selected nodes and ungroup.
- Frame features: editable title, color, collapse to a compact card, Run group, drag the title bar to move every member.
- Assistant: sees groups in its canvas summary; can replace a director group's content, edit members of a group in one step, and create, rename, recolor, collapse, ungroup, and delete groups.

Out of scope: nested groups, a node in two groups, resizing a frame by hand.

## Data model

`CanvasProject.groups?: CanvasGroup[]` next to `nodes` and `edges` (`src/model/canvas.ts`).

```ts
type CanvasGroup = {
  id: string;            // auto groups reuse the node id prefix: exp-xxxxxx, th-xxxxxx, life-xxxxxx, grp-…
  title: string;
  color: CanvasGroupColor; // lime | sky | violet | amber | rose | slate
  kind: CanvasGroupKind;   // explainer | talking-head | life | poster | swap | teleport | custom
  memberIds: string[];
  collapsed?: boolean;
  params?: { characterId?; language?; skillSlug?; durationPreset?; aspectRatio?; framing? };
};
```

Rules (pure helpers in `src/service/canvas/groups.ts`):

- A node belongs to at most one group; the first group listing it wins.
- Member ids that no longer exist are dropped; a group with no members is dropped. This runs on every save, load, and assistant turn, so node deletion from any path keeps groups valid.
- Canvases saved before groups (`groups` field missing) get groups inferred once from id prefixes (`exp-`, `th-`, `life-`, `poster-`, `swap-`, `teleport-`, `grp-`). Once the field exists (even as `[]`), nothing is inferred again, so an ungrouped Explainer stays ungrouped.

Node positions stay absolute. Execution, billing, edges, and flow waves ignore groups.

## Storage

`saveCanvasProject` accepts `groups`; `serializeCanvasProject` returns normalized groups (inferred for legacy canvases). Autosave, the assistant action, and undo snapshots carry groups with nodes and edges.

## Frame UI (`src/app/app/canvas/groups/`)

- Each group renders as a React Flow node of type `groupFrame`, derived from the group and its members' measured sizes, listed before regular nodes so it draws underneath. It is not stored in `nodes`.
- The frame body ignores pointer events so clicks and pans pass through; only the title bar is interactive and is the drag handle. Dragging it moves every member by the same delta.
- Title bar: color dot (opens six swatches), editable title, kind badge, Run group, collapse, ungroup.
- Collapsed: members are hidden (React Flow `hidden`), and the frame shows a compact card with the title, kind, and node count.
- Selecting two or more nodes shows a "Group" pill (also Cmd/Ctrl+G). Shift+Cmd/Ctrl+G ungroups the selected node's group.

## Run group

`runCanvasFlowAction` and `startCanvasFlowRun` accept optional `nodeIds`; waves are filtered to those ids and empty waves are dropped. Upstream nodes outside the group are expected to already have outputs (existing executor checks apply).

## Assistant

- `CanvasAgentOp` gains `add_group`, `update_group`, `remove_group`; `applyCanvasAgentOp` replays them and prunes membership on `remove_node`.
- `get_canvas` lists groups (id, title, kind, members, params, character name) and each node's `groupId`.
- Tools: `replace_group` (replaces `replace_explainer`; Explainer and Talking Head groups or a lone planning card), `update_group_nodes` (same patch to members filtered by role suffix or model id, atomic), `group_nodes`, `update_group` (title, color, collapsed), `ungroup`, `delete_group` (group and its nodes, atomic, refuses running nodes).
- `add_scro_group` also adds the group. Planning cards are grouped when they expand.

## Testing

Unit tests for the pure group helpers, apply-ops group ops, each new tool, and filtered flow waves. Browser check: frame draws around an Explainer, title edit, color, collapse/expand, drag-to-move, group/ungroup selection, Run group request.
