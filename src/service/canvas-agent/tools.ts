// Tool registry for the Scro canvas agent. Each handler edits an in-memory working
// graph and logs an op; errors go back to the model as { error } instead of throwing.
// No tool runs a node or spends USD Credit.

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type {
  CanvasAspectRatio,
  CanvasEdge,
  CanvasNode,
  CanvasNodeData,
} from "@/model/canvas";
import { canvasAspectRatioSchema } from "@/model/canvas";
import { computeExecutionWaves, validateEdgeConnection } from "@/service/canvas/graph";
import { type CanvasModelSpec, findCanvasModel } from "@/service/canvas/model-catalog";
import type { CanvasLibraryAsset } from "@/service/canvas/projects";
import type { CanvasAgentOp } from "@/service/canvas-agent/types";

export const CANVAS_AGENT_MAX_ADDED_NODES = 20;

const COLUMN_GAP = 400;
const ROW_GAP = 40;
// Rough card heights so arranged columns do not overlap.
const NODE_HEIGHT: Record<CanvasNode["type"], number> = { prompt: 190, media: 230, model: 430 };
const TEXT_PREVIEW = 240;

export type CanvasAgentWorkingGraph = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  catalog: readonly CanvasModelSpec[];
  assets: readonly CanvasLibraryAsset[];
  ops: CanvasAgentOp[];
  addedNodes: number;
  nextId: () => string;
};

export type CanvasAgentToolResult = Record<string, unknown>;

export function createWorkingGraph(input: {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  catalog: readonly CanvasModelSpec[];
  assets: readonly CanvasLibraryAsset[];
  nextId?: () => string;
}): CanvasAgentWorkingGraph {
  return {
    nodes: input.nodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: [...input.edges],
    catalog: input.catalog,
    assets: input.assets,
    ops: [],
    addedNodes: 0,
    nextId: input.nextId ?? (() => crypto.randomUUID().slice(0, 8)),
  };
}

function agentModels(g: CanvasAgentWorkingGraph): CanvasModelSpec[] {
  return g.catalog.filter((spec) => spec.provider === "openrouter" && spec.available !== false);
}

function clip(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text.length > TEXT_PREVIEW ? `${text.slice(0, TEXT_PREVIEW)}…` : text;
}

function clampDuration(spec: CanvasModelSpec, seconds?: number): number | undefined {
  if (spec.output.type !== "video") return undefined;
  const fallback = spec.defaultDurationSeconds ?? spec.minDurationSeconds;
  if (seconds === undefined || !Number.isFinite(seconds)) return fallback;
  const min = spec.minDurationSeconds ?? 1;
  const max = spec.maxDurationSeconds ?? min;
  return Math.min(max, Math.max(min, Math.round(seconds)));
}

// New nodes go to the right of everything already on the canvas.
function nextPosition(g: CanvasAgentWorkingGraph): { x: number; y: number } {
  if (g.nodes.length === 0) return { x: 0, y: 0 };
  const maxX = Math.max(...g.nodes.map((n) => n.position.x));
  const minY = Math.min(...g.nodes.map((n) => n.position.y));
  return { x: maxX + COLUMN_GAP, y: minY };
}

function addNode(
  g: CanvasAgentWorkingGraph,
  type: CanvasNode["type"],
  data: CanvasNodeData,
): CanvasAgentToolResult {
  if (g.addedNodes >= CANVAS_AGENT_MAX_ADDED_NODES) {
    return { error: `Node limit reached: at most ${CANVAS_AGENT_MAX_ADDED_NODES} new nodes per message.` };
  }
  const node: CanvasNode = {
    id: `${type}-${g.nextId()}`,
    type,
    position: nextPosition(g),
    data,
  };
  g.nodes.push(node);
  g.addedNodes += 1;
  g.ops.push({ kind: "add_node", node });
  return { ok: true, nodeId: node.id };
}

function describeNode(g: CanvasAgentWorkingGraph, node: CanvasNode) {
  const spec = node.data.modelId ? findCanvasModel(node.data.modelId, g.catalog) : undefined;
  return {
    id: node.id,
    type: node.type,
    ...(node.type === "prompt" ? { text: clip(node.data.text) } : {}),
    ...(node.type === "media"
      ? { mediaKind: node.data.mediaKind, name: node.data.fileName ?? node.data.label }
      : {}),
    ...(node.type === "model"
      ? {
          modelId: node.data.modelId,
          modelName: spec?.name,
          output: spec?.output.type,
          prompt: clip(node.data.prompt),
          aspectRatio: node.data.aspectRatio,
          durationSeconds: node.data.durationSeconds,
          status: node.data.status ?? "idle",
          hasOutput: Boolean(node.data.outputUrl),
        }
      : {}),
  };
}

export const CANVAS_AGENT_TOOL_HANDLERS = {
  get_canvas(g: CanvasAgentWorkingGraph): CanvasAgentToolResult {
    return {
      nodes: g.nodes.map((n) => describeNode(g, n)),
      edges: g.edges.map((e) => ({
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        targetPort: e.targetHandle,
      })),
    };
  },

  list_models(g: CanvasAgentWorkingGraph): CanvasAgentToolResult {
    return {
      models: agentModels(g).map((spec) => ({
        id: spec.id,
        name: spec.name,
        output: spec.output.type,
        inputs: spec.inputs.map((p) => ({
          port: p.id,
          type: p.type,
          required: p.required,
          maxConnections: p.multiple ? p.maxConnections : 1,
        })),
        supportsAspectRatio: Boolean(spec.supportsAspectRatio),
        ...(spec.output.type === "video"
          ? { minSeconds: spec.minDurationSeconds, maxSeconds: spec.maxDurationSeconds }
          : {}),
        basePriceUsd: spec.basePriceUsd,
      })),
    };
  },

  list_assets(g: CanvasAgentWorkingGraph): CanvasAgentToolResult {
    return {
      assets: g.assets.slice(0, 40).map((a) => ({
        id: a.id,
        name: a.name,
        mediaKind: a.mediaKind,
        source: a.source,
      })),
    };
  },

  add_prompt_node(g: CanvasAgentWorkingGraph, input: { text: string }): CanvasAgentToolResult {
    return addNode(g, "prompt", { label: "Prompt", text: input.text });
  },

  add_model_node(
    g: CanvasAgentWorkingGraph,
    input: { modelId: string; prompt?: string; aspectRatio?: CanvasAspectRatio; durationSeconds?: number },
  ): CanvasAgentToolResult {
    const spec = agentModels(g).find((s) => s.id === input.modelId);
    if (!spec) {
      return { error: `Unknown model "${input.modelId}". Call list_models and use an exact id.` };
    }
    return addNode(g, "model", {
      modelId: spec.id,
      presetId: spec.defaultPresetId,
      aspectRatio: spec.supportsAspectRatio ? (input.aspectRatio ?? "16:9") : undefined,
      resolution: spec.supportsResolution ? "2k" : undefined,
      durationSeconds: clampDuration(spec, input.durationSeconds),
      prompt: input.prompt ?? "",
      status: "idle",
    });
  },

  add_media_node(g: CanvasAgentWorkingGraph, input: { assetId: string }): CanvasAgentToolResult {
    const asset = g.assets.find((a) => a.id === input.assetId);
    if (!asset) return { error: `Unknown asset "${input.assetId}". Call list_assets first.` };
    return addNode(g, "media", {
      label: asset.name,
      fileName: asset.name,
      mediaKind: asset.mediaKind,
      mediaUrl: asset.url,
    });
  },

  update_node(
    g: CanvasAgentWorkingGraph,
    input: {
      nodeId: string;
      prompt?: string;
      text?: string;
      aspectRatio?: CanvasAspectRatio;
      durationSeconds?: number;
    },
  ): CanvasAgentToolResult {
    const node = g.nodes.find((n) => n.id === input.nodeId);
    if (!node) return { error: `Node "${input.nodeId}" does not exist.` };
    const patch: Partial<CanvasNodeData> = {};

    if (input.text !== undefined) {
      if (node.type !== "prompt") return { error: "Only prompt nodes have text. Use prompt for model nodes." };
      patch.text = input.text;
    }
    if (input.prompt !== undefined || input.aspectRatio !== undefined || input.durationSeconds !== undefined) {
      if (node.type !== "model") return { error: "prompt, aspectRatio and durationSeconds only apply to model nodes." };
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
    }
    if (Object.keys(patch).length === 0) return { error: "Nothing to update." };

    node.data = { ...node.data, ...patch };
    g.ops.push({ kind: "update_node", nodeId: node.id, patch });
    return { ok: true, nodeId: node.id };
  },

  connect(
    g: CanvasAgentWorkingGraph,
    input: { sourceId: string; targetId: string; targetPort: string },
  ): CanvasAgentToolResult {
    const candidate = {
      source: input.sourceId,
      sourceHandle: "output",
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
    if (port && !port.multiple) {
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
    return { ok: true, edgeId: edge.id };
  },

  disconnect(g: CanvasAgentWorkingGraph, input: { edgeId: string }): CanvasAgentToolResult {
    if (!g.edges.some((e) => e.id === input.edgeId)) {
      return { error: `Edge "${input.edgeId}" does not exist.` };
    }
    g.edges = g.edges.filter((e) => e.id !== input.edgeId);
    g.ops.push({ kind: "remove_edge", edgeId: input.edgeId });
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

// AI SDK tool set bound to one working graph.
export function buildCanvasAgentTools(g: CanvasAgentWorkingGraph): ToolSet {
  const H = CANVAS_AGENT_TOOL_HANDLERS;
  return {
    get_canvas: tool({
      description: "Read every node and edge currently on the canvas.",
      inputSchema: empty,
      execute: async () => H.get_canvas(g),
    }),
    list_models: tool({
      description: "List the models you may add, with their input ports, output type, and price.",
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
      description: "Add a model node. modelId must come from list_models.",
      inputSchema: z.object({
        modelId: z.string(),
        prompt: z.string().max(4000).optional().describe("Inline prompt, used when no prompt node is connected."),
        aspectRatio: aspectRatio.optional(),
        durationSeconds: z.number().optional().describe("Video length in seconds."),
      }),
      execute: async (input) => H.add_model_node(g, input),
    }),
    add_media_node: tool({
      description: "Add a media node from one of the user's assets (see list_assets).",
      inputSchema: z.object({ assetId: z.string() }),
      execute: async (input) => H.add_media_node(g, input),
    }),
    update_node: tool({
      description: "Change a node: text for prompt nodes; prompt, aspectRatio, durationSeconds for model nodes.",
      inputSchema: z.object({
        nodeId: z.string(),
        text: z.string().max(4000).optional(),
        prompt: z.string().max(4000).optional(),
        aspectRatio: aspectRatio.optional(),
        durationSeconds: z.number().optional(),
      }),
      execute: async (input) => H.update_node(g, input),
    }),
    connect: tool({
      description:
        "Connect a node's output to a model input port. Types must match (text→prompt, image→startImage/endImage/refImages). Connecting to a single-input port replaces its old edge.",
      inputSchema: z.object({ sourceId: z.string(), targetId: z.string(), targetPort: z.string() }),
      execute: async (input) => H.connect(g, input),
    }),
    disconnect: tool({
      description: "Remove an edge by id.",
      inputSchema: z.object({ edgeId: z.string() }),
      execute: async (input) => H.disconnect(g, input),
    }),
    delete_node: tool({
      description: "Delete a node and its edges. Nodes that are generating cannot be deleted.",
      inputSchema: z.object({ nodeId: z.string() }),
      execute: async (input) => H.delete_node(g, input),
    }),
    arrange_layout: tool({
      description: "Tidy the whole canvas left to right in run order. Call once after building.",
      inputSchema: empty,
      execute: async () => H.arrange_layout(g),
    }),
  };
}
