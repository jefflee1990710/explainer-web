// Canvas agent tools that act on whole groups: replace a director group with a new
// planning card, edit many members at once, and create, rename, ungroup, or delete groups.

import { z } from "zod";
import {
  type CanvasAspectRatio,
  type CanvasGroup,
  type CanvasGroupColor,
  type CanvasNode,
  canvasAspectRatioSchema,
  canvasGroupColorSchema,
} from "@/model/canvas";
import {
  EXPLAINER_PLANNER_MODEL_ID,
  isDirectorPlannerNode,
  TALKING_HEAD_PLANNER_MODEL_ID,
} from "@/service/canvas/directors/explainer-planner";
import { EXPLAINER_SKILL_SLUGS, type ExplainerSkillSlug } from "@/model/explainer-settings";
import { isExplainerDirectorNode } from "@/service/canvas/directors/explainer-director";
import { isTalkingHeadDirectorNode } from "@/service/canvas/directors/talking-head-director";
import { updateExplainerDirector } from "@/service/canvas-agent/explainer-director-tool";
import { renderDurationForTrim } from "@/service/canvas/scro-groups/section-sync";
import {
  defaultGroupColor,
  defaultGroupTitle,
  isDirectorGroupKind,
  readGroupParams,
  withGroup,
} from "@/service/canvas/core/groups";
import {
  type BatchSingleNodeHandlers,
  type BatchUpdateNodeItem,
  runBatchDeleteNodes,
  runBatchUpdateNodes,
} from "@/service/canvas-agent/batch-tools";
import { soleCanvasCharacterId } from "@/service/canvas-agent/canvas-characters";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/working-graph";

type Result = Record<string, unknown>;
type Handlers = Pick<BatchSingleNodeHandlers<CanvasAgentWorkingGraph>, "delete_node" | "update_node">;

const MAX_GROUP_MEMBERS = 120;

function isExplainerSkillSlug(value: string): value is ExplainerSkillSlug {
  return (EXPLAINER_SKILL_SLUGS as readonly string[]).includes(value);
}

export type ReplaceGroupInput = {
  prompt: string;
  groupId?: string;
  // Any node of the group (or a lone planning card); used when groupId is not given.
  nodeId?: string;
  characterId?: string;
  language?: "yue" | "zh" | "en";
  skillSlug?: string;
  durationPreset?: string;
  aspectRatio?: CanvasAspectRatio;
  framing?: "collarbone-close" | "waist-up" | "handheld-selfie" | "full-body";
};

type DirectorTarget = {
  kind: "explainer" | "talking-head";
  nodes: CanvasNode[];
  group?: CanvasGroup;
};

function plannerKind(node: CanvasNode): DirectorTarget["kind"] | undefined {
  if (!isDirectorPlannerNode(node)) return undefined;
  if (node.data.modelId === EXPLAINER_PLANNER_MODEL_ID) return "explainer";
  if (node.data.modelId === TALKING_HEAD_PLANNER_MODEL_ID) return "talking-head";
  return undefined;
}

function membersOf(g: CanvasAgentWorkingGraph, group: CanvasGroup): CanvasNode[] {
  const ids = new Set(group.memberIds);
  return g.nodes.filter((n) => ids.has(n.id));
}

function groupTarget(g: CanvasAgentWorkingGraph, group: CanvasGroup): DirectorTarget | { error: string } {
  if (!isDirectorGroupKind(group.kind)) {
    return {
      error: `Group "${group.id}" is a ${group.kind} group. replace_group only re-plans Explainer and Talking Head groups; use update_group_nodes or delete_group for others.`,
    };
  }
  return { kind: group.kind, nodes: membersOf(g, group), group };
}

// Director groups plus planning cards that are not in any group.
function directorTargets(g: CanvasAgentWorkingGraph): DirectorTarget[] {
  const grouped = new Set(g.groups.flatMap((gr) => gr.memberIds));
  const out: DirectorTarget[] = [];
  for (const group of g.groups) {
    if (isDirectorGroupKind(group.kind)) out.push({ kind: group.kind, nodes: membersOf(g, group), group });
  }
  for (const node of g.nodes) {
    const kind = plannerKind(node);
    if (kind && !grouped.has(node.id)) out.push({ kind, nodes: [node] });
  }
  return out;
}

function pickDirectorTarget(
  g: CanvasAgentWorkingGraph,
  input: Pick<ReplaceGroupInput, "groupId" | "nodeId">,
): DirectorTarget | { error: string } {
  if (input.groupId) {
    const group = g.groups.find((gr) => gr.id === input.groupId);
    if (!group) return { error: `Group "${input.groupId}" does not exist. Read groups from get_canvas.` };
    return groupTarget(g, group);
  }
  if (input.nodeId) {
    const node = g.nodes.find((n) => n.id === input.nodeId);
    if (!node) return { error: `Node "${input.nodeId}" does not exist.` };
    const group = g.groups.find((gr) => gr.memberIds.includes(node.id));
    if (group) return groupTarget(g, group);
    const kind = plannerKind(node);
    if (kind) return { kind, nodes: [node] };
    return { error: `Node "${input.nodeId}" is not in an Explainer or Talking Head group.` };
  }
  const targets = directorTargets(g);
  if (targets.length === 0) {
    return {
      error:
        "No Explainer or Talking Head on the canvas. Add scro:explainer with add_model_node or add_scro_group tool \"talking-head\" instead.",
    };
  }
  if (targets.length > 1) {
    const names = targets.map((t) => (t.group ? `${t.group.id} "${t.group.title}"` : t.nodes[0]!.id));
    return { error: `Several director groups are on the canvas (${names.join(", ")}). Pass groupId of the one to replace.` };
  }
  return targets[0]!;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function removeNodes(g: CanvasAgentWorkingGraph, ids: ReadonlySet<string>) {
  g.nodes = g.nodes.filter((n) => !ids.has(n.id));
  g.edges = g.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target));
  for (const id of ids) g.ops.push({ kind: "remove_node", nodeId: id });
}

function removeGroup(g: CanvasAgentWorkingGraph, groupId: string) {
  g.groups = g.groups.filter((gr) => gr.id !== groupId);
  g.ops.push({ kind: "remove_group", groupId });
}

function busyIds(nodes: readonly CanvasNode[]): string[] {
  return nodes.filter((n) => n.data.status === "queued" || n.data.status === "running").map((n) => n.id);
}

export function replaceGroup(
  g: CanvasAgentWorkingGraph,
  input: ReplaceGroupInput,
  maxAddedNodes: number,
): Result {
  const prompt = input.prompt.trim();
  if (!prompt) return { error: "replace_group needs the new topic or full script in \"prompt\"." };

  const target = pickDirectorTarget(g, input);
  if ("error" in target) return target;
  const busy = busyIds(target.nodes);
  if (busy.length > 0) {
    return { error: `Node(s) ${busy.join(", ")} are generating right now; wait until they finish.` };
  }
  if (g.addedNodes >= maxAddedNodes) {
    return { error: `Node limit reached: at most ${maxAddedNodes} new nodes per message.` };
  }

  // Settings the old group used, unless the user asked for something else.
  const old = { ...readGroupParams(target.nodes), ...(target.group?.params ?? {}) };
  const characterId =
    str(input.characterId) ??
    str(old.characterId) ??
    soleCanvasCharacterId(g, target.nodes) ??
    soleCanvasCharacterId(g, g.nodes);
  if (characterId && !g.characters.some((c) => c.id === characterId)) {
    return { error: `Unknown characterId "${characterId}". Use an exact id from list_assets().characters.` };
  }
  const aspectRatio = input.aspectRatio ?? old.aspectRatio ?? "9:16";
  const isTalking = target.kind === "talking-head";
  if (isTalking && !characterId) {
    return { error: "A Talking Head needs a character. Pass characterId from list_assets().characters." };
  }
  const language = input.language ?? str(old.language) ?? (isTalking ? "yue" : undefined);
  const skillSlug = str(input.skillSlug) ?? str(old.skillSlug);
  const durationPreset = str(input.durationPreset) ?? str(old.durationPreset);

  // An Explainer with a Director keeps its nodes: the Director takes the new topic and replans.
  const director = isTalking ? undefined : target.nodes.find(isExplainerDirectorNode);
  if (director) {
    const res = updateExplainerDirector(
      g,
      { topic: prompt, ...(input.skillSlug && isExplainerSkillSlug(input.skillSlug) ? { artStyle: input.skillSlug } : {}) },
      {
        directorId: director.id,
        characterId,
        language: input.language,
        durationPreset: str(input.durationPreset),
        aspectRatio: input.aspectRatio,
        forceReplan: true,
      },
    );
    return "error" in res ? res : { ...res, nodeId: director.id, removedCount: 0 };
  }

  // A Talking Head Director keeps its rows too: it takes the new script and replans (free).
  const talkingDirector = isTalking ? target.nodes.find(isTalkingHeadDirectorNode) : undefined;
  if (talkingDirector) {
    const patch = {
      prompt,
      ...(input.aspectRatio ? { aspectRatio: input.aspectRatio } : {}),
      toolParams: {
        ...talkingDirector.data.toolParams,
        characterId,
        language,
        framing: input.framing ?? str(talkingDirector.data.toolParams?.framing) ?? str(old.framing) ?? "collarbone-close",
        replanRequested: true,
      },
    };
    talkingDirector.data = { ...talkingDirector.data, ...patch };
    g.ops.push({ kind: "update_node", nodeId: talkingDirector.id, patch });
    return {
      ok: true,
      nodeId: talkingDirector.id,
      removedCount: 0,
      note: "The Talking Head Director took the new script and replans for free. Its wired rows keep their place; rows whose text changed become old versions. Tell the user to press Run group afterwards. Do not add image or video nodes for it yourself.",
    };
  }

  const toolParams: Record<string, unknown> = isTalking
    ? {
        plannerMode: true,
        characterId,
        language,
        framing: input.framing ?? str(old.framing) ?? "collarbone-close",
      }
    : {
        ...(characterId ? { characterId } : {}),
        ...(language ? { language } : {}),
        ...(skillSlug ? { skillSlug } : {}),
        ...(durationPreset ? { durationPreset } : {}),
        plannerMode: true,
      };

  const position = target.nodes.length
    ? {
        x: Math.min(...target.nodes.map((n) => n.position.x)),
        y: Math.min(...target.nodes.map((n) => n.position.y)),
      }
    : { x: 0, y: 0 };
  removeNodes(g, new Set(target.nodes.map((n) => n.id)));
  if (target.group) removeGroup(g, target.group.id);

  const card: CanvasNode = {
    id: `model-${g.nextId()}`,
    type: "model",
    position,
    data: {
      modelId: isTalking ? TALKING_HEAD_PLANNER_MODEL_ID : EXPLAINER_PLANNER_MODEL_ID,
      aspectRatio,
      prompt,
      toolParams,
      status: "idle",
    },
  };
  g.nodes.push(card);
  g.addedNodes += 1;
  g.ops.push({ kind: "add_node", node: card });

  const characterName = g.characters.find((c) => c.id === characterId)?.name;
  return {
    ok: true,
    nodeId: card.id,
    removedCount: target.nodes.length,
    ...(characterId ? { characterId, characterName } : {}),
    note: `The old ${isTalking ? "Talking Head Director" : "Explainer"} is gone and a new planning card plans the new script for free; it becomes a new framed group when the rows appear. Tell the user to press Run group or Run Flow then. Do not add image or video nodes for it yourself.`,
  };
}

export type UpdateGroupNodesInput = {
  groupId: string;
  // Only members whose id contains "-<role>" (e.g. voice, video, frame, mux, concat, grade, silence, ref).
  role?: string;
  modelId?: string;
  prompt?: string;
  aspectRatio?: CanvasAspectRatio;
  durationSeconds?: number;
  toolParams?: Record<string, unknown>;
};

export function updateGroupNodes(
  g: CanvasAgentWorkingGraph,
  handlers: Handlers,
  input: UpdateGroupNodesInput,
): Result {
  const group = g.groups.find((gr) => gr.id === input.groupId);
  if (!group) return { error: `Group "${input.groupId}" does not exist. Read groups from get_canvas.` };
  const role = input.role?.trim().toLowerCase();
  const members = membersOf(g, group).filter(
    (n) =>
      (!role || n.id.toLowerCase().includes(`-${role}`)) &&
      (!input.modelId || n.data.modelId === input.modelId) &&
      // Planning cards and media have nothing these fields change.
      n.type === "model" &&
      !isDirectorPlannerNode(n),
  );
  if (members.length === 0) {
    return { error: `No model node in group "${group.id}" matches${role ? ` role "${role}"` : ""}${input.modelId ? ` model "${input.modelId}"` : ""}.` };
  }
  const updates: BatchUpdateNodeItem[] = members.map((n) => ({
    nodeId: n.id,
    ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
    ...(input.aspectRatio !== undefined ? { aspectRatio: input.aspectRatio } : {}),
    ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
    ...(input.toolParams !== undefined ? { toolParams: input.toolParams } : {}),
  }));
  if (Object.keys(updates[0]!).length === 1) return { error: "Nothing to update." };
  // A Swap / Teleport trim edit also sets the render length to the trimmed section.
  const trim = input.toolParams ? members.find((n) => n.data.modelId === "ffmpeg:trim-speed") : undefined;
  const sync = trim
    ? renderDurationForTrim(g.nodes, group, { ...trim.data.toolParams, ...input.toolParams })
    : undefined;
  if (sync && input.durationSeconds === undefined) {
    const existing = updates.find((u) => u.nodeId === sync.renderId);
    if (existing) existing.durationSeconds = sync.durationSeconds;
    else updates.push({ nodeId: sync.renderId, durationSeconds: sync.durationSeconds });
  }
  return runBatchUpdateNodes(g, handlers, { updates });
}

export function groupNodes(
  g: CanvasAgentWorkingGraph,
  input: { nodeIds: string[]; title?: string; color?: CanvasGroupColor },
): Result {
  const ids = [...new Set(input.nodeIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return { error: "Pass at least one nodeId." };
  const missing = ids.filter((id) => !g.nodes.some((n) => n.id === id));
  if (missing.length > 0) return { error: `Unknown node id(s): ${missing.join(", ")}.` };
  const group: CanvasGroup = {
    id: `grp-${g.nextId()}`,
    title: input.title?.trim().slice(0, 120) || defaultGroupTitle("custom"),
    color: input.color ?? defaultGroupColor("custom"),
    kind: "custom",
    memberIds: ids,
  };
  g.groups = withGroup(g.groups, group);
  g.ops.push({ kind: "add_group", group });
  return { ok: true, groupId: group.id };
}

export function updateGroup(
  g: CanvasAgentWorkingGraph,
  input: {
    groupId: string;
    title?: string;
    color?: CanvasGroupColor;
    collapsed?: boolean;
    // Full member list. Used when a member was replaced (for example a cheaper frame model).
    memberIds?: string[];
  },
): Result {
  const group = g.groups.find((gr) => gr.id === input.groupId);
  if (!group) return { error: `Group "${input.groupId}" does not exist.` };
  const memberIds = input.memberIds
    ? [...new Set(input.memberIds.map((id) => id.trim()).filter(Boolean))]
    : undefined;
  if (memberIds && memberIds.length === 0) return { error: "A group needs at least one node." };
  const unknown = memberIds?.filter((id) => !g.nodes.some((n) => n.id === id)) ?? [];
  if (unknown.length > 0) return { error: `Unknown node id(s): ${unknown.join(", ")}.` };
  const patch = {
    ...(input.title?.trim() ? { title: input.title.trim().slice(0, 120) } : {}),
    ...(input.color ? { color: input.color } : {}),
    ...(input.collapsed !== undefined ? { collapsed: input.collapsed } : {}),
    ...(memberIds ? { memberIds } : {}),
  };
  if (Object.keys(patch).length === 0) return { error: "Nothing to update." };
  const next = { ...group, ...patch };
  // memberIds can pull a node out of another group, so reuse the same rule as adding a group.
  g.groups = memberIds ? withGroup(g.groups, next) : g.groups.map((gr) => (gr.id === group.id ? next : gr));
  g.ops.push({ kind: "update_group", groupId: group.id, patch });
  return { ok: true, groupId: group.id, ...(memberIds ? { memberIds } : {}) };
}

export function ungroup(g: CanvasAgentWorkingGraph, input: { groupId: string }): Result {
  if (!g.groups.some((gr) => gr.id === input.groupId)) {
    return { error: `Group "${input.groupId}" does not exist.` };
  }
  removeGroup(g, input.groupId);
  return { ok: true, note: "The frame is gone; its nodes stay on the canvas." };
}

export function deleteGroup(g: CanvasAgentWorkingGraph, handlers: Handlers, input: { groupId: string }): Result {
  const group = g.groups.find((gr) => gr.id === input.groupId);
  if (!group) return { error: `Group "${input.groupId}" does not exist.` };
  const ids = membersOf(g, group).map((n) => n.id);
  if (ids.length > 0) {
    const res = runBatchDeleteNodes(g, handlers, { nodeIds: ids });
    if (typeof res.error === "string") return res;
  }
  removeGroup(g, group.id);
  return { ok: true, removedCount: ids.length };
}

// Compact group list for get_canvas and the system prompt.
export function describeGroups(g: CanvasAgentWorkingGraph) {
  return g.groups.map((group) => {
    const characterId = group.params?.characterId;
    return {
      id: group.id,
      title: group.title,
      kind: group.kind,
      color: group.color,
      ...(group.collapsed ? { collapsed: true } : {}),
      memberIds: group.memberIds.slice(0, MAX_GROUP_MEMBERS),
      ...(group.params ? { params: group.params } : {}),
      ...(characterId
        ? { characterName: g.characters.find((c) => c.id === characterId)?.name }
        : {}),
    };
  });
}

const aspectRatio = canvasAspectRatioSchema.describe("Frame shape, e.g. 9:16 for vertical video.");

export const replaceGroupSchema = z.object({
  prompt: z.string().min(1).max(4000).describe("New topic or the user's full script, copied as given."),
  groupId: z.string().optional().describe("Group to replace (from get_canvas groups). Needed when there are several."),
  nodeId: z.string().optional().describe("Any node of the group, or a lone planning card, instead of groupId."),
  characterId: z.string().optional().describe("Only when the user asks for a different character."),
  language: z.enum(["yue", "zh", "en"]).optional(),
  skillSlug: z
    .enum([
      "cartoon-explainer-video-director",
      "paper-cutout-explainer-video-director",
      "papercraft-diorama-director",
    ])
    .optional()
    .describe("Explainer only."),
  durationPreset: z.enum(["15s", "30s", "45s", "60s"]).optional().describe("Explainer only."),
  aspectRatio: aspectRatio.optional(),
  framing: z
    .enum(["collarbone-close", "waist-up", "handheld-selfie", "full-body"])
    .optional()
    .describe("Talking Head only."),
});

export const updateGroupNodesSchema = z.object({
  groupId: z.string(),
  role: z
    .string()
    .optional()
    .describe('Only members whose id contains "-<role>", e.g. "voice", "video", "frame", "mux", "grade".'),
  modelId: z.string().optional().describe("Only members running this exact model id."),
  prompt: z.string().max(4000).optional(),
  aspectRatio: aspectRatio.optional(),
  durationSeconds: z.number().optional(),
  toolParams: z.record(z.string(), z.unknown()).optional(),
});

export const groupNodesSchema = z.object({
  nodeIds: z.array(z.string()).min(1).max(MAX_GROUP_MEMBERS),
  title: z.string().max(120).optional(),
  color: canvasGroupColorSchema.optional(),
});

export const updateGroupSchema = z.object({
  groupId: z.string(),
  title: z.string().max(120).optional(),
  color: canvasGroupColorSchema.optional(),
  collapsed: z.boolean().optional(),
  memberIds: z
    .array(z.string())
    .min(1)
    .max(MAX_GROUP_MEMBERS)
    .optional()
    .describe("Replace the member list, keeping this same group. Swap in a node that replaced an old member."),
});

export const groupIdSchema = z.object({ groupId: z.string() });
