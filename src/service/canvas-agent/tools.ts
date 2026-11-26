// Tool registry for the Scro canvas agent. Each handler edits an in-memory working
// graph and logs an op; errors go back to the model as { error } instead of throwing.
// No tool runs a node or spends USD Credit.

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type {
  CanvasAspectRatio,
  CanvasEdge,
  CanvasGroupColor,
  CanvasNodeData,
} from "@/model/canvas";
import { canvasAspectRatioSchema } from "@/model/canvas";
import { computeExecutionWaves, validateEdgeConnection } from "@/service/canvas/core/graph";
import { characterOutfitPort, libraryAssetNodeDraft } from "@/service/canvas/core/character-node";
import { isExplainerPlannerNode } from "@/service/canvas/directors/explainer-planner";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { isGenerationInputPatch } from "@/service/canvas/core/stale-outputs";
import {
  updateSettings,
  updateSettingsSchema,
  type UpdateSettingsInput,
} from "@/service/canvas-agent/settings-tool";
import {
  type BatchAddNodeItem,
  type BatchUpdateNodeItem,
  batchDeleteNodesSchema,
  batchUpdateNodesSchema,
  createBatchAddNodesSchema,
  runBatchAddNodes,
  runBatchDeleteNodes,
  runBatchUpdateNodes,
} from "@/service/canvas-agent/batch-tools";
import {
  type UpdateExplainerSettingsInput,
  updateExplainerDirector,
  updateExplainerSettingsSchema,
} from "@/service/canvas-agent/explainer-director-tool";
import {
  DIRECTOR_CHARACTER_HANDLE,
  isPlanDirectorNode,
  parseDirectorHandle,
} from "@/service/canvas/directors/explainer-director";
import {
  deleteGroup,
  describeGroups,
  groupIdSchema,
  groupNodes,
  groupNodesSchema,
  type ReplaceGroupInput,
  replaceGroup,
  replaceGroupSchema,
  type UpdateGroupNodesInput,
  ungroup,
  updateGroup,
  updateGroupNodes,
  updateGroupNodesSchema,
  updateGroupSchema,
} from "@/service/canvas-agent/group-tools";
import { SCRO_GROUP_TOOLS, type ScroGroupToolInput } from "@/service/canvas-agent/scro-group-tool";
import { addModelNode, type AddModelNodeInput } from "@/service/canvas-agent/model-node-tool";
import { EDIT_TOOL_DESCRIPTIONS, EDIT_TOOL_HANDLERS, EDIT_TOOL_SCHEMAS } from "@/service/canvas-agent/edit-tools";
import { SEQUENCE_TOOL_DESCRIPTIONS, SEQUENCE_TOOL_HANDLERS, SEQUENCE_TOOL_SCHEMAS } from "@/service/canvas-agent/sequence-tools";
import {
  SMART_EDIT_TOOL_DESCRIPTIONS,
  SMART_EDIT_TOOL_HANDLERS,
  SMART_EDIT_TOOL_SCHEMAS,
} from "@/service/canvas-agent/smart-edit-tools";
import { addScroGroup } from "@/service/canvas-agent/scro-group-handler";
import {
  addNode,
  CANVAS_AGENT_MAX_ADDED_NODES,
  CANVAS_AGENT_MAX_QUESTION_OPTIONS,
  clampDuration,
  COLUMN_GAP,
  describeNode,
  EXPLAINER_REQUEST,
  agentModels,
  canvasAgentModelLine,
  markStale,
  NODE_HEIGHT,
  ROW_GAP,
  TALKING_HEAD_WORDS,
  validateToolParamsForModel,
  type CanvasAgentToolResult,
  type CanvasAgentWorkingGraph,
} from "@/service/canvas-agent/working-graph";

export const CANVAS_AGENT_TOOL_HANDLERS = {
  get_canvas(g: CanvasAgentWorkingGraph): CanvasAgentToolResult {
    return {
      groups: describeGroups(g),
      nodes: g.nodes.map((n) => describeNode(g, n)),
      edges: g.edges.map((e) => ({
        id: e.id,
        sourceId: e.source,
        ...(e.sourceHandle && e.sourceHandle !== "output" ? { sourcePort: e.sourceHandle } : {}),
        targetId: e.target,
        targetPort: e.targetHandle,
      })),
    };
  },

  list_models(g: CanvasAgentWorkingGraph): CanvasAgentToolResult {
    // id | name | output | ports (* required, xN max) | price
    return { models: agentModels(g).map(canvasAgentModelLine) };
  },

  list_assets(g: CanvasAgentWorkingGraph): CanvasAgentToolResult {
    return {
      assets: g.assets.slice(0, 40).map((a) => ({
        id: a.id,
        name: a.name,
        mediaKind: a.mediaKind,
        source: a.source,
      })),
      characters: g.characters.slice(0, 40).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    };
  },

  add_prompt_node(g: CanvasAgentWorkingGraph, input: { text: string }): CanvasAgentToolResult {
    return addNode(g, "prompt", { label: "Prompt", text: input.text });
  },

  add_model_node(g: CanvasAgentWorkingGraph, input: AddModelNodeInput): CanvasAgentToolResult {
    return addModelNode(g, CANVAS_AGENT_TOOL_HANDLERS, input);
  },

  add_media_node(g: CanvasAgentWorkingGraph, input: { assetId: string }): CanvasAgentToolResult {
    const asset = g.assets.find((a) => a.id === input.assetId);
    if (!asset) return { error: `Unknown asset "${input.assetId}". Call list_assets first.` };
    const draft = libraryAssetNodeDraft(asset);
    return addNode(g, draft.type, draft.data);
  },

  add_scro_group(g: CanvasAgentWorkingGraph, input: ScroGroupToolInput): CanvasAgentToolResult {
    return addScroGroup(g, CANVAS_AGENT_TOOL_HANDLERS, input);
  },

  update_node(
    g: CanvasAgentWorkingGraph,
    input: {
      nodeId: string;
      prompt?: string;
      text?: string;
      aspectRatio?: CanvasAspectRatio;
      durationSeconds?: number;
      toolParams?: Record<string, unknown>;
    },
  ): CanvasAgentToolResult {
    const node = g.nodes.find((n) => n.id === input.nodeId);
    if (!node) return { error: `Node "${input.nodeId}" does not exist.` };
    const patch: Partial<CanvasNodeData> = {};

    if (input.text !== undefined) {
      if (node.type !== "prompt") return { error: "Only prompt nodes have text. Use prompt for model nodes." };
      patch.text = input.text;
    }
    if (
      input.prompt !== undefined ||
      input.aspectRatio !== undefined ||
      input.durationSeconds !== undefined ||
      input.toolParams !== undefined
    ) {
      if (node.type !== "model") return { error: "prompt, aspectRatio, durationSeconds and toolParams only apply to model nodes." };
      const spec = node.data.modelId ? findCanvasModel(node.data.modelId, g.catalog) : undefined;
      if (input.prompt !== undefined) patch.prompt = input.prompt;
      if (input.aspectRatio !== undefined) {
        if (!spec?.supportsAspectRatio) return { error: "This model does not take an aspect ratio." };
        patch.aspectRatio = input.aspectRatio;
      }
      if (input.durationSeconds !== undefined) {
        if (!spec || spec.output.type !== "video") return { error: "Only video models have a duration." };
        patch.durationSeconds = clampDuration(spec, input.durationSeconds);
      }
      if (input.toolParams !== undefined) {
        const paramError = validateToolParamsForModel(
          g,
          spec?.id ?? node.data.modelId ?? "",
          input.toolParams,
        );
        if (paramError) return { error: paramError };
        patch.toolParams = { ...(node.data.toolParams ?? {}), ...input.toolParams };
      }
    }
    if (Object.keys(patch).length === 0) return { error: "Nothing to update." };

    const changed = isGenerationInputPatch(node.data, patch);
    node.data = { ...node.data, ...patch };
    g.ops.push({ kind: "update_node", nodeId: node.id, patch });
    if (changed) markStale(g, [node.id]);
    return { ok: true, nodeId: node.id };
  },

  connect(
    g: CanvasAgentWorkingGraph,
    input: { sourceId: string; sourcePort?: string; targetId: string; targetPort: string },
  ): CanvasAgentToolResult {
    const sourceNode = g.nodes.find((n) => n.id === input.sourceId);
    const directorSource = sourceNode && isPlanDirectorNode(sourceNode);
    if (directorSource && !parseDirectorHandle(input.sourcePort)) {
      return {
        error: 'A Director only outputs clip text: pass sourcePort "clip-<n>-frame", "clip-<n>-motion", or "clip-<n>-voice" after it is planned (a Talking Head has only "clip-1-frame").',
      };
    }
    if (sourceNode && !directorSource && isExplainerPlannerNode(sourceNode)) {
      return {
        error: "An Explainer planning card has no output. Its expanded FFmpeg Concat node carries the final video.",
      };
    }
    const targetNode = g.nodes.find((n) => n.id === input.targetId);
    if (targetNode && isPlanDirectorNode(targetNode) && input.targetPort === DIRECTOR_CHARACTER_HANDLE) {
      return {
        error: "A Director has no character input. Set the character on the card with toolParams.characterId.",
      };
    }
    if (targetNode && isExplainerPlannerNode(targetNode)) {
      return {
        error: "An Explainer planning card takes no wires. Put the topic in its prompt; {{key}} values belong on a Prompt node.",
      };
    }
    const candidate = {
      source: input.sourceId,
      // Directors name clip outputs; some edit nodes have extra outputs (Split's "video-b").
      sourceHandle: input.sourcePort || "output",
      target: input.targetId,
      targetHandle: input.targetPort,
    };
    const check = validateEdgeConnection(g.nodes, g.edges, candidate, g.catalog, {
      allowReplaceSingle: true,
    });
    if (!check.valid) return { error: check.reason };

    // A single-input port holds one edge, so the old one is removed first.
    const target = g.nodes.find((n) => n.id === input.targetId);
    const spec = target?.data.modelId ? findCanvasModel(target.data.modelId, g.catalog) : undefined;
    const port = spec?.inputs.find((p) => p.id === input.targetPort);
    const outfitPort = target?.type === "character" ? characterOutfitPort(input.targetPort) : undefined;
    if ((port && !port.multiple) || (outfitPort && !outfitPort.multiple)) {
      for (const old of g.edges.filter(
        (e) => e.target === input.targetId && e.targetHandle === input.targetPort,
      )) {
        g.edges = g.edges.filter((e) => e.id !== old.id);
        g.ops.push({ kind: "remove_edge", edgeId: old.id });
      }
    }

    const edge: CanvasEdge = { id: `e-${g.nextId()}`, ...candidate };
    g.edges.push(edge);
    g.ops.push({ kind: "add_edge", edge });
    markStale(g, [edge.target]);
    return { ok: true, edgeId: edge.id };
  },

  disconnect(g: CanvasAgentWorkingGraph, input: { edgeId: string }): CanvasAgentToolResult {
    const removed = g.edges.find((e) => e.id === input.edgeId);
    if (!removed) {
      return { error: `Edge "${input.edgeId}" does not exist.` };
    }
    g.edges = g.edges.filter((e) => e.id !== input.edgeId);
    g.ops.push({ kind: "remove_edge", edgeId: input.edgeId });
    markStale(g, [removed.target]);
    return { ok: true };
  },

  delete_node(g: CanvasAgentWorkingGraph, input: { nodeId: string }): CanvasAgentToolResult {
    const node = g.nodes.find((n) => n.id === input.nodeId);
    if (!node) return { error: `Node "${input.nodeId}" does not exist.` };
    if (node.data.status === "queued" || node.data.status === "running") {
      return { error: "This node is generating right now and cannot be deleted." };
    }
    g.nodes = g.nodes.filter((n) => n.id !== node.id);
    g.edges = g.edges.filter((e) => e.source !== node.id && e.target !== node.id);
    g.ops.push({ kind: "remove_node", nodeId: node.id });
    return { ok: true };
  },

  replace_group(g: CanvasAgentWorkingGraph, input: ReplaceGroupInput): CanvasAgentToolResult {
    return replaceGroup(g, input, CANVAS_AGENT_MAX_ADDED_NODES);
  },

  update_group_nodes(g: CanvasAgentWorkingGraph, input: UpdateGroupNodesInput): CanvasAgentToolResult {
    return updateGroupNodes(g, CANVAS_AGENT_TOOL_HANDLERS, input);
  },

  group_nodes(
    g: CanvasAgentWorkingGraph,
    input: { nodeIds: string[]; title?: string; color?: CanvasGroupColor },
  ): CanvasAgentToolResult {
    return groupNodes(g, input);
  },

  update_group(
    g: CanvasAgentWorkingGraph,
    input: {
      groupId: string;
      title?: string;
      color?: CanvasGroupColor;
      collapsed?: boolean;
      memberIds?: string[];
    },
  ): CanvasAgentToolResult {
    return updateGroup(g, input);
  },

  ungroup(g: CanvasAgentWorkingGraph, input: { groupId: string }): CanvasAgentToolResult {
    return ungroup(g, input);
  },

  delete_group(g: CanvasAgentWorkingGraph, input: { groupId: string }): CanvasAgentToolResult {
    return deleteGroup(g, CANVAS_AGENT_TOOL_HANDLERS, input);
  },

  batch_delete_nodes(
    g: CanvasAgentWorkingGraph,
    input: { nodeIds: string[] },
  ): CanvasAgentToolResult {
    return runBatchDeleteNodes(g, CANVAS_AGENT_TOOL_HANDLERS, input);
  },

  batch_update_nodes(
    g: CanvasAgentWorkingGraph,
    input: { updates: BatchUpdateNodeItem[] },
  ): CanvasAgentToolResult {
    return runBatchUpdateNodes(g, CANVAS_AGENT_TOOL_HANDLERS, input);
  },

  batch_add_nodes(
    g: CanvasAgentWorkingGraph,
    input: { nodes: BatchAddNodeItem[] },
  ): CanvasAgentToolResult {
    return runBatchAddNodes(g, CANVAS_AGENT_TOOL_HANDLERS, input);
  },

  update_explainer_settings(g: CanvasAgentWorkingGraph, input: UpdateExplainerSettingsInput): CanvasAgentToolResult {
    return updateExplainerDirector(g, input);
  },

  update_settings(g: CanvasAgentWorkingGraph, input: UpdateSettingsInput): CanvasAgentToolResult {
    return updateSettings(g, input);
  },

  ask_user(
    g: CanvasAgentWorkingGraph,
    input: { question: string; options: string[]; allowMultiple?: boolean; allowOther?: boolean },
  ): CanvasAgentToolResult {
    if (g.question) return { error: "You already asked a question this turn. Stop and reply." };
    const question = input.question.trim();
    const labels = [...new Set(input.options.map((o) => o.trim()).filter(Boolean))].slice(
      0,
      CANVAS_AGENT_MAX_QUESTION_OPTIONS,
    );
    if (!question) return { error: "question is empty." };
    if (labels.length < 2) return { error: "Give at least 2 different options." };
    // An explainer request already picks the tool; scro:explainer can feature the named character.
    if (
      EXPLAINER_REQUEST.test(g.userMessage) &&
      !TALKING_HEAD_WORDS.test(g.userMessage) &&
      labels.some((label) => TALKING_HEAD_WORDS.test(label))
    ) {
      return {
        error:
          'Do not ask: the user asked for an explainer. Add "scro:explainer" with the topic in "prompt" and, if they named a character, "toolParams.characterId" from list_assets().characters, then reply.',
      };
    }
    g.question = {
      question,
      options: labels.map((label, i) => ({ id: `opt-${i + 1}`, label })),
      allowMultiple: input.allowMultiple ?? false,
      allowOther: input.allowOther ?? true,
    };
    return { ok: true, note: "The question is shown to the user. End your turn now with one short sentence." };
  },

  arrange_layout(g: CanvasAgentWorkingGraph): CanvasAgentToolResult {
    if (g.nodes.length === 0) return { ok: true, moved: 0 };
    let waves: string[][];
    try {
      waves = computeExecutionWaves(g.nodes, g.edges);
    } catch {
      return { error: "The graph has a cycle and cannot be arranged." };
    }

    // Model wave i sits in column i + 1; inputs sit one column left of their first consumer.
    const column = new Map<string, number>();
    waves.forEach((wave, i) => wave.forEach((id) => column.set(id, i + 1)));
    for (const node of g.nodes) {
      if (node.type === "model") continue;
      const targets = g.edges
        .filter((e) => e.source === node.id)
        .map((e) => column.get(e.target))
        .filter((c): c is number => c !== undefined);
      column.set(node.id, targets.length > 0 ? Math.max(0, Math.min(...targets) - 1) : 0);
    }

    const originX = Math.min(...g.nodes.map((n) => n.position.x));
    const originY = Math.min(...g.nodes.map((n) => n.position.y));
    const columnHeight = new Map<number, number>();
    let moved = 0;
    for (const node of g.nodes) {
      const col = column.get(node.id) ?? 0;
      const y = originY + (columnHeight.get(col) ?? 0);
      columnHeight.set(col, (columnHeight.get(col) ?? 0) + NODE_HEIGHT[node.type] + ROW_GAP);
      const position = { x: originX + col * COLUMN_GAP, y };
      if (position.x === node.position.x && position.y === node.position.y) continue;
      node.position = position;
      g.ops.push({ kind: "move_node", nodeId: node.id, position });
      moved += 1;
    }
    return { ok: true, moved };
  },
};

const empty = z.object({});
const aspectRatio = canvasAspectRatioSchema.describe("Frame shape, e.g. 9:16 for vertical video.");

// Edit tools (trim_clip, split_clip, add_bgm, ...) bound to one working graph.
function buildEditTools(g: CanvasAgentWorkingGraph): ToolSet {
  const schemas: Record<string, z.ZodType> = { ...EDIT_TOOL_SCHEMAS, ...SEQUENCE_TOOL_SCHEMAS, ...SMART_EDIT_TOOL_SCHEMAS };
  const descriptions: Record<string, string> = {
    ...EDIT_TOOL_DESCRIPTIONS,
    ...SEQUENCE_TOOL_DESCRIPTIONS,
    ...SMART_EDIT_TOOL_DESCRIPTIONS,
  };
  const handlers: Record<string, unknown> = { ...EDIT_TOOL_HANDLERS, ...SEQUENCE_TOOL_HANDLERS, ...SMART_EDIT_TOOL_HANDLERS };
  const entries = Object.keys(schemas).map((name) => [
    name,
    tool({
      description: descriptions[name],
      inputSchema: schemas[name] as z.ZodType<Record<string, unknown>>,
      execute: async (input: Record<string, unknown>) =>
        (handlers[name] as (g: CanvasAgentWorkingGraph, h: typeof CANVAS_AGENT_TOOL_HANDLERS, i: unknown) => CanvasAgentToolResult)(
          g,
          CANVAS_AGENT_TOOL_HANDLERS,
          input,
        ),
    }),
  ]);
  return Object.fromEntries(entries) as ToolSet;
}

// AI SDK tool set bound to one working graph.
export function buildCanvasAgentTools(g: CanvasAgentWorkingGraph): ToolSet {
  const H = CANVAS_AGENT_TOOL_HANDLERS;
  return {
    ...buildEditTools(g),
    get_canvas: tool({
      description: "Read every group, node, and edge currently on the canvas. Nodes in a group carry its groupId.",
      inputSchema: empty,
      execute: async () => H.get_canvas(g),
    }),
    list_models: tool({
      description:
        "The system prompt already lists every model. Call this only when an add_model_node error says the id is unknown.",
      inputSchema: empty,
      execute: async () => H.list_models(g),
    }),
    list_assets: tool({
      description: "List the user's saved characters, products, and recent outputs that can become media nodes.",
      inputSchema: empty,
      execute: async () => H.list_assets(g),
    }),
    add_prompt_node: tool({
      description: "Add a prompt (text) node. Connect it to a model's prompt port.",
      inputSchema: z.object({ text: z.string().min(1).max(4000) }),
      execute: async (input) => H.add_prompt_node(g, input),
    }),
    add_model_node: tool({
      description:
        "Add one model, Scro tool, or FFmpeg node and wire it in the same call. modelId must be an exact id from the system prompt.",
      inputSchema: z.object({
        modelId: z.string(),
        prompt: z.string().max(4000).optional().describe("Inline prompt, only when you are not passing promptText."),
        promptText: z
          .string()
          .max(4000)
          .optional()
          .describe("English prompt. Creates a prompt node and connects it to this model's prompt port."),
        wires: z
          .array(z.object({ sourceId: z.string(), sourcePort: z.string().optional(), targetPort: z.string() }))
          .max(8)
          .optional()
          .describe(
            'Connections onto this new node. Example: [{ sourceId: "media-1", targetPort: "refImages" }].',
          ),
        aspectRatio: aspectRatio.optional(),
        durationSeconds: z.number().optional().describe("Video length in seconds."),
        toolParams: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Tool-specific parameters such as characterId, language, skillSlug, swapMode, ffmpegTransition, ffmpegMixMode."),
      }),
      execute: async (input) => H.add_model_node(g, input),
    }),
    add_scro_group: tool({
      description:
        "Build a Scro tool (life, poster, swap, teleport, talking-head). Life and Poster land as wired groups. Swap, Teleport, and Talking Head land as director cards; tell the user to press Build or Plan, then Run.",
      inputSchema: z.object({
        tool: z.enum(SCRO_GROUP_TOOLS),
        characterId: z.string().optional().describe("From list_assets().characters."),
        productId: z.string().optional().describe("Product asset id from list_assets() (poster)."),
        videoNodeId: z.string().optional().describe("Canvas node whose output is the source video (swap, teleport)."),
        videoAssetId: z.string().optional().describe("Video asset id when the source is not on the canvas yet."),
        sceneNodeId: z.string().optional().describe("Canvas image node for the teleport scene."),
        sceneAssetId: z.string().optional().describe("Image asset id for the teleport scene."),
        sceneText: z.string().max(1000).optional().describe("Teleport scene described in words when no photo."),
        referenceAssetId: z.string().optional().describe("Swap reference image asset id (instead of characterId)."),
        prompt: z
          .string()
          .max(4000)
          .optional()
          .describe("life: scene. poster: design prompt. swap: edit / change-to / light prompt. teleport: mood. talking-head: script."),
        mode: z.enum(["character", "object", "relight", "colorfix"]).optional().describe("swap only. Default character."),
        objectTarget: z.string().optional(),
        objectEditMode: z.enum(["change", "add", "remove"]).optional(),
        lightLookId: z.string().optional(),
        sectionStart: z.number().optional().describe("Seconds into the source video (swap, teleport)."),
        sectionLength: z.number().optional().describe("2–15 seconds rendered (swap, teleport). Default 6."),
        language: z.enum(["yue", "zh", "en"]).optional().describe("talking-head only."),
        framing: z.enum(["collarbone-close", "waist-up", "handheld-selfie", "full-body"]).optional(),
        aspectRatio: aspectRatio.optional(),
      }),
      execute: async (input) => H.add_scro_group(g, input),
    }),
    add_media_node: tool({
      description:
        "Add one asset from list_assets. A character asset becomes a character node. An outfit or any other file becomes a media node.",
      inputSchema: z.object({ assetId: z.string() }),
      execute: async (input) => H.add_media_node(g, input),
    }),
    update_node: tool({
      description: "Change a node: text for prompt nodes; prompt, aspectRatio, durationSeconds, toolParams for model/tool nodes.",
      inputSchema: z.object({
        nodeId: z.string(),
        text: z.string().max(4000).optional(),
        prompt: z.string().max(4000).optional(),
        aspectRatio: aspectRatio.optional(),
        durationSeconds: z.number().optional(),
        toolParams: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async (input) => H.update_node(g, input),
    }),
    connect: tool({
      description:
        "Connect a node's output to an input port. Types must match (text→prompt, image→startImage/endImage/refImages/image, audio→refAudio, video→video/videos). Multi-input ports (refImages, videos) append edges in order. A planned Explainer Director needs sourcePort clip-<n>-frame / clip-<n>-motion / clip-<n>-voice (text).",
      inputSchema: z.object({
        sourceId: z.string(),
        sourcePort: z
          .string()
          .optional()
          .describe('An Explainer Director\'s clip outputs, or a named extra output such as an ffmpeg:split\'s "video-b".'),
        targetId: z.string(),
        targetPort: z.string(),
      }),
      execute: async (input) => H.connect(g, input),
    }),
    disconnect: tool({
      description: "Remove an edge by id.",
      inputSchema: z.object({ edgeId: z.string() }),
      execute: async (input) => H.disconnect(g, input),
    }),
    delete_node: tool({
      description: "Delete one node and its edges. Prefer batch_delete_nodes when removing 2+ nodes.",
      inputSchema: z.object({ nodeId: z.string() }),
      execute: async (input) => H.delete_node(g, input),
    }),
    replace_group: tool({
      description:
        "Replace an Explainer or Talking Head group (or a lone planning card) with a new topic or full script in ONE step. An Explainer Director or Talking Head Director takes the new content and replans in place, keeping its rows; an older group without a Director is removed and a new free planning card takes its place. Character (e.g. Jim), language, director style, framing, and frame shape are kept unless you override them.",
      inputSchema: replaceGroupSchema,
      execute: async (input) => H.replace_group(g, input),
    }),
    update_explainer_settings: tool({
      description:
        "Change an Explainer Director's topic, art style, background, on-screen text language, presenter position, or on-screen text style. Text style alone applies without a replan; anything else replans for free after your reply, keeping the voiceover word for word unless the topic changes. Never edit frame prompts for these.",
      inputSchema: updateExplainerSettingsSchema,
      execute: async (input) => H.update_explainer_settings(g, input),
    }),
    update_settings: tool({
      description:
        "Change a Setting node's vars: the key-value pairs that fill {{key}} placeholders in the Prompt node it is wired to. Model nodes have no Setting input. They apply when those nodes run. Swap / Teleport section, mode, light look, mood, and grade live on their trim, render, and grade nodes; change those with update_group_nodes.",
      inputSchema: updateSettingsSchema,
      execute: async (input) => H.update_settings(g, input),
    }),
    update_group_nodes: tool({
      description:
        "Apply the same change to every model node of one group in one atomic step, optionally only members with an id role (voice, video, frame, mux, grade) or one modelId. Example: all clip videos to 6 seconds, or every voice to language yue.",
      inputSchema: updateGroupNodesSchema,
      execute: async (input) => H.update_group_nodes(g, input),
    }),
    group_nodes: tool({
      description: "Draw a titled frame around existing nodes. A node already in another group moves into the new one.",
      inputSchema: groupNodesSchema,
      execute: async (input) => H.group_nodes(g, input),
    }),
    update_group: tool({
      description:
        "Rename a group, change its frame color, collapse / expand it, or replace its memberIds after swapping a node for a new one.",
      inputSchema: updateGroupSchema,
      execute: async (input) => H.update_group(g, input),
    }),
    ungroup: tool({
      description: "Remove a group's frame and keep its nodes.",
      inputSchema: groupIdSchema,
      execute: async (input) => H.ungroup(g, input),
    }),
    delete_group: tool({
      description: "Delete a group and every node in it in one atomic step. Refuses while a member is generating.",
      inputSchema: groupIdSchema,
      execute: async (input) => H.delete_group(g, input),
    }),
    batch_delete_nodes: tool({
      description:
        "Delete multiple nodes and their edges in one atomic step (e.g. an entire expanded exp-<prefix>-* or th-<prefix>-* group before replacing it). Rolls back if any id is unknown or running.",
      inputSchema: batchDeleteNodesSchema,
      execute: async (input) => H.batch_delete_nodes(g, input),
    }),
    batch_update_nodes: tool({
      description:
        "Update multiple nodes in one atomic step (prompts, prompt-node text, aspectRatio, durationSeconds, toolParams across clips). Rolls back if any item fails.",
      inputSchema: batchUpdateNodesSchema,
      execute: async (input) => H.batch_update_nodes(g, input),
    }),
    batch_add_nodes: tool({
      description:
        "Add and wire multiple model, media, or prompt nodes in one atomic step. Give earlier items a key so later items in the same call can reference them in wires[].sourceId. Rolls back if any item or wire fails.",
      inputSchema: createBatchAddNodesSchema(CANVAS_AGENT_MAX_ADDED_NODES),
      execute: async (input) => H.batch_add_nodes(g, input),
    }),
    arrange_layout: tool({
      description: "Tidy the whole canvas left to right in run order. Call once after building.",
      inputSchema: empty,
      execute: async () => H.arrange_layout(g),
    }),
    ask_user: tool({
      description:
        "Ask the user one multiple-choice question when you cannot build a working graph without their answer (missing product photo, which character, very different approaches). Ends your turn. Write the question and options in the chat language.",
      inputSchema: z.object({
        question: z.string().min(1).max(300),
        options: z.array(z.string().min(1).max(80)).min(2).max(CANVAS_AGENT_MAX_QUESTION_OPTIONS),
        allowMultiple: z.boolean().optional().describe("true when the user may pick more than one option."),
        allowOther: z
          .boolean()
          .optional()
          .describe("Show a free-text box for extra details. Defaults to true."),
      }),
      execute: async (input) => H.ask_user(g, input),
    }),
  };
}
