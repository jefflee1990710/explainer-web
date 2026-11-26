// Pure helper shared by every Scro tool group: creates nodes and wires, then lays out the new nodes.

import type { CanvasEdge, CanvasMediaKind, CanvasNode, CanvasNodeData } from "@/model/canvas";
import { GROUP_ESTIMATED_SIZE, layoutGroupByDepth } from "@/service/canvas/core/group-layout";
import { OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL } from "@/service/openrouter/generate";

export const SEEDREAM_MODEL_ID = `openrouter:${OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL}`;

// Either an existing canvas node (wired as-is) or media to place as a new node.
export type GroupMediaRef =
  | { nodeId: string }
  | { url: string; name: string; mediaKind: CanvasMediaKind };

// groupId is the id prefix; the canvas frame around these nodes uses it as its id.
export type ScroGroup = { groupId: string; nodes: CanvasNode[]; edges: CanvasEdge[]; outputNodeId: string };

export type GroupContext = { idPrefix: string; origin: { x: number; y: number } };

export function createGroupBuilder(ctx: GroupContext) {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const id = (suffix: string) => `${ctx.idPrefix}-${suffix}`;
  const add = (suffix: string, type: CanvasNode["type"], data: CanvasNodeData) => {
    const nodeId = id(suffix);
    nodes.push({ id: nodeId, type, position: { ...ctx.origin }, data });
    return nodeId;
  };

  return {
    media(suffix: string, ref: GroupMediaRef): string {
      if ("nodeId" in ref) return ref.nodeId;
      return add(suffix, "media", {
        label: ref.name,
        fileName: ref.name,
        mediaKind: ref.mediaKind,
        mediaUrl: ref.url,
      });
    },
    prompt(suffix: string, text: string, label = "Prompt"): string {
      return add(suffix, "prompt", { label, text });
    },
    model(suffix: string, data: CanvasNodeData): string {
      return add(suffix, "model", { status: "idle", ...data });
    },
    wire(source: string, target: string, targetHandle: string) {
      edges.push({
        id: `${source}->${target}:${targetHandle}`,
        source,
        sourceHandle: "output",
        target,
        targetHandle,
      });
    },
    finish(outputNodeId: string): ScroGroup {
      const typeById = new Map(nodes.map((n) => [n.id, n.type]));
      const positions = layoutGroupByDepth({
        nodeIds: nodes.map((n) => n.id),
        edges,
        origin: ctx.origin,
        sizeOf: (nodeId) => GROUP_ESTIMATED_SIZE[typeById.get(nodeId) ?? "model"],
      });
      for (const node of nodes) node.position = positions.get(node.id) ?? node.position;
      return { groupId: ctx.idPrefix, nodes, edges, outputNodeId };
    },
  };
}
