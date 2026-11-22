// Deterministic "update the explainer" for the canvas agent: removes one expanded
// Explainer group (or its planning card) in a single step and drops a new planning
// card in the same place, keeping the character, language, and frame shape.

import type { CanvasAspectRatio, CanvasNode } from "@/model/canvas";
import {
  EXPLAINER_PLANNER_MODEL_ID,
  isDirectorPlannerNode,
} from "@/service/canvas/explainer-planner";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/tools";

const EXPANDED_ID = /^(exp-[A-Za-z0-9]{6})-/;
const CHARACTER_URL = /\/characters\/([a-f0-9]{24})\//i;

export type ReplaceExplainerInput = {
  prompt: string;
  // Any node of the group to replace; optional when the canvas has only one Explainer.
  nodeId?: string;
  characterId?: string;
  language?: "yue" | "zh" | "en";
  skillSlug?: string;
  durationPreset?: string;
  aspectRatio?: CanvasAspectRatio;
};

// Groups an Explainer on the canvas: expanded "exp-<prefix>-*" nodes, or a lone planning card.
function explainerGroupKey(node: CanvasNode): string | undefined {
  const expanded = EXPANDED_ID.exec(node.id)?.[1];
  if (expanded) return expanded;
  if (isDirectorPlannerNode(node) && node.data.modelId === EXPLAINER_PLANNER_MODEL_ID) return node.id;
  return undefined;
}

export function listExplainerGroups(nodes: readonly CanvasNode[]): Map<string, CanvasNode[]> {
  const groups = new Map<string, CanvasNode[]>();
  for (const node of nodes) {
    const key = explainerGroupKey(node);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }
  return groups;
}

// Character ids shown on the canvas: a cast character's photo or a lock image under /characters/<id>/.
export function canvasCharacterIds(
  g: Pick<CanvasAgentWorkingGraph, "characters">,
  nodes: readonly CanvasNode[],
): string[] {
  const known = new Set(g.characters.map((c) => c.id));
  const found = new Set<string>();
  for (const node of nodes) {
    const fromParams = node.data.toolParams?.characterId;
    if (typeof fromParams === "string" && known.has(fromParams)) found.add(fromParams);
    const url = node.data.mediaUrl;
    if (!url) continue;
    const byPreview = g.characters.find((c) => c.previewUrl && c.previewUrl === url)?.id;
    if (byPreview) found.add(byPreview);
    const byPath = CHARACTER_URL.exec(url)?.[1];
    if (byPath && known.has(byPath)) found.add(byPath);
  }
  return [...found];
}

// The one character on the canvas, or undefined when there are none or several.
export function soleCanvasCharacterId(
  g: Pick<CanvasAgentWorkingGraph, "characters">,
  nodes: readonly CanvasNode[],
): string | undefined {
  const ids = canvasCharacterIds(g, nodes);
  return ids.length === 1 ? ids[0] : undefined;
}

function pickGroup(
  g: CanvasAgentWorkingGraph,
  nodeId: string | undefined,
): { key: string; nodes: CanvasNode[] } | { error: string } {
  const groups = listExplainerGroups(g.nodes);
  if (nodeId) {
    const node = g.nodes.find((n) => n.id === nodeId);
    if (!node) return { error: `Node "${nodeId}" does not exist.` };
    const key = explainerGroupKey(node);
    if (!key) return { error: `Node "${nodeId}" is not part of an Explainer group.` };
    return { key, nodes: groups.get(key) ?? [node] };
  }
  if (groups.size === 0) {
    return { error: "No Explainer on the canvas. Add a new scro:explainer card with add_model_node instead." };
  }
  if (groups.size > 1) {
    return {
      error: `Several Explainers are on the canvas (${[...groups.keys()].join(", ")}). Pass nodeId of the one to replace.`,
    };
  }
  const [key, nodes] = [...groups.entries()][0]!;
  return { key, nodes };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function replaceExplainer(
  g: CanvasAgentWorkingGraph,
  input: ReplaceExplainerInput,
  maxAddedNodes: number,
): Record<string, unknown> {
  const prompt = input.prompt.trim();
  if (!prompt) return { error: "replace_explainer needs the new topic or full script in \"prompt\"." };

  const picked = pickGroup(g, input.nodeId);
  if ("error" in picked) return picked;
  const group = picked.nodes;

  const busy = group.filter((n) => n.data.status === "queued" || n.data.status === "running");
  if (busy.length > 0) {
    return { error: `Node(s) ${busy.map((n) => n.id).join(", ")} are generating right now; wait until they finish.` };
  }
  if (g.addedNodes >= maxAddedNodes) {
    return { error: `Node limit reached: at most ${maxAddedNodes} new nodes per message.` };
  }

  // Settings the old group already used, unless the user asked for something else.
  const oldParams = group.map((n) => n.data.toolParams ?? {});
  const characterId =
    str(input.characterId) ??
    oldParams.map((p) => str(p.characterId)).find(Boolean) ??
    soleCanvasCharacterId(g, group) ??
    soleCanvasCharacterId(g, g.nodes);
  if (characterId && !g.characters.some((c) => c.id === characterId)) {
    return { error: `Unknown characterId "${characterId}". Use an exact id from list_assets().characters.` };
  }
  const language = input.language ?? oldParams.map((p) => str(p.language)).find(Boolean);
  const skillSlug = str(input.skillSlug) ?? oldParams.map((p) => str(p.skillSlug)).find(Boolean);
  const durationPreset = str(input.durationPreset) ?? oldParams.map((p) => str(p.durationPreset)).find(Boolean);
  const aspectRatio =
    input.aspectRatio ??
    group.map((n) => n.data.aspectRatio).find((r): r is CanvasAspectRatio => Boolean(r)) ??
    "9:16";

  const removedIds = new Set(group.map((n) => n.id));
  g.nodes = g.nodes.filter((n) => !removedIds.has(n.id));
  g.edges = g.edges.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target));
  for (const id of removedIds) g.ops.push({ kind: "remove_node", nodeId: id });

  const card: CanvasNode = {
    id: `model-${g.nextId()}`,
    type: "model",
    position: {
      x: Math.min(...group.map((n) => n.position.x)),
      y: Math.min(...group.map((n) => n.position.y)),
    },
    data: {
      modelId: EXPLAINER_PLANNER_MODEL_ID,
      aspectRatio,
      prompt,
      toolParams: {
        ...(characterId ? { characterId } : {}),
        ...(language ? { language } : {}),
        ...(skillSlug ? { skillSlug } : {}),
        ...(durationPreset ? { durationPreset } : {}),
        plannerMode: true,
      },
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
    removedCount: removedIds.size,
    ...(characterId ? { characterId, characterName } : {}),
    note: "The old Explainer group is gone and a new planning card plans the new script for free. Tell the user to press Run Flow once the new rows appear. Do not add image or video nodes for this Explainer yourself.",
  };
}
