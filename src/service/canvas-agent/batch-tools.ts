// Atomic batch tools for the Scro canvas agent so multi-node builds, edits, and
// group replacements finish in 1–2 tool steps without partial mutations on error.

import { z } from "zod";
import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import { canvasAspectRatioSchema } from "@/model/canvas";
import type { CanvasAgentOp } from "@/model/canvas-agent";

export const CANVAS_AGENT_MAX_BATCH_DELETE = 60;
export const CANVAS_AGENT_MAX_BATCH_UPDATE = 40;

export type BatchGraphSlice = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  ops: CanvasAgentOp[];
  addedNodes: number;
};

export type BatchToolResult = Record<string, unknown>;

export type BatchSingleNodeHandlers<G extends BatchGraphSlice> = {
  add_prompt_node: (g: G, input: { text: string }) => BatchToolResult;
  add_media_node: (g: G, input: { assetId: string }) => BatchToolResult;
  add_model_node: (
    g: G,
    input: {
      modelId: string;
      prompt?: string;
      promptText?: string;
      wires?: Array<{ sourceId: string; sourcePort?: string; targetPort: string }>;
      aspectRatio?: CanvasAspectRatio;
      durationSeconds?: number;
      toolParams?: Record<string, unknown>;
    },
  ) => BatchToolResult;
  update_node: (
    g: G,
    input: {
      nodeId: string;
      text?: string;
      prompt?: string;
      aspectRatio?: CanvasAspectRatio;
      durationSeconds?: number;
      toolParams?: Record<string, unknown>;
    },
  ) => BatchToolResult;
  delete_node: (g: G, input: { nodeId: string }) => BatchToolResult;
};

export type BatchUpdateNodeItem = {
  nodeId: string;
  text?: string;
  prompt?: string;
  aspectRatio?: CanvasAspectRatio;
  durationSeconds?: number;
  toolParams?: Record<string, unknown>;
};

export type BatchAddNodeItem = {
  key?: string;
  modelId?: string;
  assetId?: string;
  text?: string;
  prompt?: string;
  promptText?: string;
  wires?: Array<{ sourceId: string; sourcePort?: string; targetPort: string }>;
  aspectRatio?: CanvasAspectRatio;
  durationSeconds?: number;
  toolParams?: Record<string, unknown>;
};

// Snapshots the working graph before a batch and rolls everything back if any item fails.
function withAtomicBatch<G extends BatchGraphSlice>(g: G, run: () => BatchToolResult): BatchToolResult {
  const savedNodes = g.nodes.map((n) => ({
    ...n,
    position: { ...n.position },
    data: {
      ...n.data,
      ...(n.data.toolParams ? { toolParams: { ...n.data.toolParams } } : {}),
    },
  }));
  const savedEdges = g.edges.map((e) => ({ ...e }));
  const savedOpsLength = g.ops.length;
  const savedAddedNodes = g.addedNodes;

  const result = run();
  if (typeof result.error === "string") {
    g.nodes = savedNodes;
    g.edges = savedEdges;
    g.ops.splice(savedOpsLength);
    g.addedNodes = savedAddedNodes;
  }
  return result;
}

export function runBatchDeleteNodes<G extends BatchGraphSlice>(
  g: G,
  handlers: Pick<BatchSingleNodeHandlers<G>, "delete_node">,
  input: { nodeIds: string[] },
): BatchToolResult {
  const ids = [...new Set(input.nodeIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return { error: "Pass at least one nodeId in nodeIds." };

  const missing = ids.filter((id) => !g.nodes.some((n) => n.id === id));
  if (missing.length > 0) {
    return {
      error: `Unknown nodeId(s): ${missing.join(", ")}. Use exact ids from # Current canvas.`,
    };
  }
  const busy = ids.filter((id) => {
    const status = g.nodes.find((n) => n.id === id)?.data.status;
    return status === "queued" || status === "running";
  });
  if (busy.length > 0) {
    return {
      error: `Node(s) ${busy.join(", ")} are generating right now and cannot be deleted.`,
    };
  }

  return withAtomicBatch(g, () => {
    for (const nodeId of ids) {
      const res = handlers.delete_node(g, { nodeId });
      if (typeof res.error === "string") {
        return { error: `Batch rolled back deleting "${nodeId}": ${res.error}` };
      }
    }
    return { ok: true, deletedIds: ids, deletedCount: ids.length };
  });
}

export function runBatchUpdateNodes<G extends BatchGraphSlice>(
  g: G,
  handlers: Pick<BatchSingleNodeHandlers<G>, "update_node">,
  input: { updates: BatchUpdateNodeItem[] },
): BatchToolResult {
  if (input.updates.length === 0) return { error: "Pass at least one item in updates." };

  return withAtomicBatch(g, () => {
    const updatedIds: string[] = [];
    for (let i = 0; i < input.updates.length; i += 1) {
      const item = input.updates[i]!;
      const res = handlers.update_node(g, item);
      if (typeof res.error === "string") {
        return {
          error: `Batch rolled back at updates[${i}] ("${item.nodeId}"): ${res.error}`,
        };
      }
      updatedIds.push(item.nodeId);
    }
    return { ok: true, updatedIds, updatedCount: updatedIds.length };
  });
}

export function runBatchAddNodes<G extends BatchGraphSlice>(
  g: G,
  handlers: Pick<BatchSingleNodeHandlers<G>, "add_prompt_node" | "add_media_node" | "add_model_node">,
  input: { nodes: BatchAddNodeItem[] },
): BatchToolResult {
  if (input.nodes.length === 0) return { error: "Pass at least one item in nodes." };
  const beforeAdded = g.addedNodes;

  return withAtomicBatch(g, () => {
    const keyMap = new Map<string, string>();
    const created: Array<{ key?: string; nodeId: string; promptNodeId?: string }> = [];

    for (let i = 0; i < input.nodes.length; i += 1) {
      const item = input.nodes[i]!;
      const key = item.key?.trim();
      const tag = key ? `nodes[${i}] ("${key}")` : `nodes[${i}]`;

      if (key) {
        if (keyMap.has(key) || g.nodes.some((n) => n.id === key)) {
          return { error: `Batch rolled back at ${tag}: duplicate key "${key}".` };
        }
      }

      const hasModel = Boolean(item.modelId?.trim());
      const hasAsset = Boolean(item.assetId?.trim());
      const hasStandaloneText = item.text !== undefined;
      if (Number(hasModel) + Number(hasAsset) + Number(hasStandaloneText) !== 1) {
        return {
          error: `Batch rolled back at ${tag}: set exactly one of modelId (use prompt or promptText for its prompt), assetId (media node), or text (standalone prompt node).`,
        };
      }

      let nodeId: string;
      let promptNodeId: string | undefined;

      if (hasAsset) {
        const res = handlers.add_media_node(g, { assetId: item.assetId!.trim() });
        if (typeof res.error === "string" || typeof res.nodeId !== "string") {
          return {
            error: `Batch rolled back at ${tag}: ${String(res.error ?? "Could not add media node.")}`,
          };
        }
        nodeId = res.nodeId;
      } else if (hasStandaloneText) {
        if (!item.text!.trim()) {
          return { error: `Batch rolled back at ${tag}: text cannot be empty.` };
        }
        const res = handlers.add_prompt_node(g, { text: item.text! });
        if (typeof res.error === "string" || typeof res.nodeId !== "string") {
          return {
            error: `Batch rolled back at ${tag}: ${String(res.error ?? "Could not add prompt node.")}`,
          };
        }
        nodeId = res.nodeId;
      } else {
        const resolvedWires = item.wires?.map((wire) => ({
          sourceId: keyMap.get(wire.sourceId) ?? wire.sourceId,
          ...(wire.sourcePort ? { sourcePort: wire.sourcePort } : {}),
          targetPort: wire.targetPort,
        }));
        const res = handlers.add_model_node(g, {
          modelId: item.modelId!.trim(),
          prompt: item.prompt,
          promptText: item.promptText,
          wires: resolvedWires,
          aspectRatio: item.aspectRatio,
          durationSeconds: item.durationSeconds,
          toolParams: item.toolParams,
        });
        if (typeof res.error === "string" || typeof res.nodeId !== "string") {
          const cleanError = String(res.error ?? "Could not add model node.")
            .replace(/^Node \S+ exists\.\s*/, "")
            .replace(/\s*Use connect to fix those wires\. Do not add this node again\.$/, "");
          return { error: `Batch rolled back at ${tag}: ${cleanError}` };
        }
        nodeId = res.nodeId;
        if (typeof res.promptNodeId === "string") promptNodeId = res.promptNodeId;
      }

      if (key) keyMap.set(key, nodeId);
      created.push({
        ...(key ? { key } : {}),
        nodeId,
        ...(promptNodeId ? { promptNodeId } : {}),
      });
    }

    return { ok: true, created, addedCount: g.addedNodes - beforeAdded };
  });
}

export const batchDeleteNodesSchema = z.object({
  nodeIds: z
    .array(z.string().min(1))
    .min(1)
    .max(CANVAS_AGENT_MAX_BATCH_DELETE)
    .describe("Exact node ids from # Current canvas to remove together in one step."),
});

export const batchUpdateNodesSchema = z.object({
  updates: z
    .array(
      z.object({
        nodeId: z.string().min(1),
        text: z.string().max(4000).optional(),
        prompt: z.string().max(4000).optional(),
        aspectRatio: canvasAspectRatioSchema.optional(),
        durationSeconds: z.number().optional(),
        toolParams: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(CANVAS_AGENT_MAX_BATCH_UPDATE)
    .describe("Edits applied together; rolled back if any item fails."),
});

export function createBatchAddNodesSchema(maxNodes: number) {
  return z.object({
    nodes: z
      .array(
        z.object({
          key: z
            .string()
            .min(1)
            .max(40)
            .optional()
            .describe(
              'Optional local alias (e.g. "img1", "vid1") so later items in this batch can wire from it via wires[].sourceId.',
            ),
          modelId: z
            .string()
            .optional()
            .describe("Model, Scro tool, or FFmpeg id (omit when setting assetId or text)."),
          assetId: z
            .string()
            .optional()
            .describe("Asset id from list_assets() to place a media node."),
          text: z
            .string()
            .max(4000)
            .optional()
            .describe("Text for a standalone prompt node (omit when setting modelId)."),
          prompt: z
            .string()
            .max(4000)
            .optional()
            .describe("Inline prompt on a model/tool node, or full topic/script for scro:explainer."),
          promptText: z
            .string()
            .max(4000)
            .optional()
            .describe("English prompt. Creates a prompt node and wires it to this model's prompt port."),
          wires: z
            .array(z.object({ sourceId: z.string(), sourcePort: z.string().optional(), targetPort: z.string() }))
            .max(8)
            .optional()
            .describe(
              "Connections onto this model node. sourceId may be an existing canvas node id or an earlier item's key.",
            ),
          aspectRatio: canvasAspectRatioSchema.optional(),
          durationSeconds: z.number().optional().describe("Video length in seconds."),
          toolParams: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .min(1)
      .max(maxNodes)
      .describe("Nodes to add and wire in order; rolled back if any item or wire fails."),
  });
}
