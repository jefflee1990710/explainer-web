// add_scro_group: Talking Head, Swap, and Teleport land as director cards (wired to their sources);
// Life and Poster land as a visible wired group with its frame.

import type { CanvasGroup } from "@/model/canvas";
import { defaultGroupColor, defaultGroupTitle, withGroup } from "@/service/canvas/core/groups";
import { buildAgentScroGroup, type ScroGroupToolInput } from "@/service/canvas-agent/scro-group-tool";
import {
  addNode,
  CANVAS_AGENT_MAX_ADDED_NODES,
  type CanvasAgentLinkHandlers,
  type CanvasAgentToolResult,
  type CanvasAgentWorkingGraph,
} from "@/service/canvas-agent/working-graph";

export function addScroGroup(
  g: CanvasAgentWorkingGraph,
  handlers: CanvasAgentLinkHandlers,
  input: ScroGroupToolInput,
): CanvasAgentToolResult {
  const aspect = input.aspectRatio ?? "9:16";
  const text = input.prompt?.trim() ?? "";

  if (input.tool === "talking-head") {
    if (!text) return { error: "talking-head needs the script in \"prompt\"." };
    if (!input.characterId) return { error: "talking-head needs characterId from list_assets().characters." };
    if (!g.characters.some((c) => c.id === input.characterId)) {
      return { error: `Unknown characterId "${input.characterId}". Call list_assets() and use an exact id.` };
    }
    // Planning card: the canvas plans it for free right after this turn, then expands it.
    const created = addNode(g, "model", {
      modelId: "scro:talking-head",
      aspectRatio: aspect,
      prompt: text,
      toolParams: {
        plannerMode: true,
        characterId: input.characterId,
        language: input.language ?? "yue",
        framing: input.framing ?? "collarbone-close",
      },
      status: "idle",
    });
    return created;
  }

  if (input.tool === "swap" || input.tool === "teleport") {
    // Director card: the user presses Build on the canvas to expand trim → render → grade.
    if (!input.videoNodeId && !input.videoAssetId) {
      return { error: `${input.tool} needs videoNodeId or videoAssetId.` };
    }
    for (const assetId of [input.videoAssetId, input.referenceAssetId, input.sceneAssetId]) {
      if (assetId && !g.assets.some((asset) => asset.id === assetId)) {
        return { error: `Unknown asset "${assetId}".` };
      }
    }
    const mode = input.mode ?? "character";
    if (input.tool === "swap" && mode === "character" && !input.characterId && !input.referenceAssetId) {
      return { error: "swap in character mode needs characterId or referenceAssetId." };
    }
    if (input.tool === "swap" && mode === "object" && !text) {
      return { error: 'swap in object mode needs what to change into in "prompt".' };
    }
    if (input.tool === "teleport" && !input.sceneNodeId && !input.sceneAssetId && !input.sceneText?.trim()) {
      return { error: "teleport needs sceneNodeId, sceneAssetId, or sceneText." };
    }
    if (input.characterId && !g.characters.some((c) => c.id === input.characterId)) {
      return { error: `Unknown characterId "${input.characterId}". Call list_assets() and use an exact id.` };
    }
    const created = addNode(g, "model", {
      modelId: input.tool === "swap" ? "scro:swap" : "scro:teleport",
      aspectRatio: aspect,
      prompt: text,
      status: "idle",
      toolParams: {
        directorMode: true,
        sectionStart: input.sectionStart ?? 0,
        sectionLength: input.sectionLength ?? 6,
        ...(input.tool === "swap"
          ? {
              swapMode: mode,
              ...(input.characterId ? { characterId: input.characterId } : {}),
              ...(input.objectTarget ? { objectTarget: input.objectTarget } : {}),
              ...(input.objectEditMode ? { objectEditMode: input.objectEditMode } : {}),
              ...(input.lightLookId ? { lightLookId: input.lightLookId } : {}),
            }
          : { sceneText: input.sceneText?.trim() ?? "" }),
      },
    });
    if (created.error || typeof created.nodeId !== "string") return created;
    const targetId = created.nodeId;
    const wireErrors: string[] = [];
    const connectTo = (sourceId: string, targetPort: string) => {
      const linked = handlers.connect(g, { sourceId, targetId, targetPort });
      if (linked.error) wireErrors.push(String(linked.error));
    };
    const connectAsset = (assetId: string, targetPort: string) => {
      const existing = g.nodes.find((n) => n.type === "character" && n.data.characterId === assetId);
      if (existing) {
        connectTo(existing.id, targetPort);
        return;
      }
      const media = handlers.add_media_node(g, { assetId });
      if (media.error || typeof media.nodeId !== "string") {
        wireErrors.push(String(media.error ?? `Could not add asset "${assetId}"`));
        return;
      }
      connectTo(media.nodeId, targetPort);
    };
    if (input.videoNodeId) connectTo(input.videoNodeId, "video");
    else if (input.videoAssetId) connectAsset(input.videoAssetId, "video");
    if (input.tool === "swap") {
      if (input.referenceAssetId) connectAsset(input.referenceAssetId, "refImages");
      else if (input.characterId) connectAsset(input.characterId, "refImages");
    } else if (input.sceneNodeId) connectTo(input.sceneNodeId, "image");
    else if (input.sceneAssetId) connectAsset(input.sceneAssetId, "image");
    if (wireErrors.length > 0) {
      return { ...created, error: `Node ${targetId} exists. Wires failed: ${wireErrors.join(" | ")}` };
    }
    return created;
  }

  const built = buildAgentScroGroup(g, input, aspect, text);
  if ("error" in built) return { error: built.error };
  const group = built.group;
  if (g.addedNodes + group.nodes.length > CANVAS_AGENT_MAX_ADDED_NODES) {
    return {
      error: `This group adds ${group.nodes.length} nodes, over the limit of ${CANVAS_AGENT_MAX_ADDED_NODES} new nodes per message.`,
    };
  }
  for (const node of group.nodes) {
    g.nodes.push(node);
    g.ops.push({ kind: "add_node", node });
  }
  g.addedNodes += group.nodes.length;
  for (const edge of group.edges) {
    g.edges.push(edge);
    g.ops.push({ kind: "add_edge", edge });
  }
  const frame: CanvasGroup = {
    id: group.groupId,
    title: defaultGroupTitle(input.tool),
    color: defaultGroupColor(input.tool),
    kind: input.tool,
    memberIds: group.nodes.map((n) => n.id),
    params: { aspectRatio: aspect, ...(input.characterId ? { characterId: input.characterId } : {}) },
  };
  g.groups = withGroup(g.groups, frame);
  g.ops.push({ kind: "add_group", group: frame });
  return {
    ok: true,
    groupId: frame.id,
    nodeIds: group.nodes.map((n) => n.id),
    outputNodeId: group.outputNodeId,
  };}
