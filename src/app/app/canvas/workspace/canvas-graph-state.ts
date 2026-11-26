// React Flow <-> saved canvas graph conversions shared by the workspace and its hooks.

import type { Edge } from "@xyflow/react";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasNodeStatus,
  CanvasNodeType,
  CanvasOutputKind,
} from "@/model/canvas";
import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import { getNodeOutputPortType } from "@/service/canvas/graph";
import { applyRememberedJobOutput } from "@/service/canvas/stale-outputs";
import { SETTING_COLOR } from "@/app/app/canvas/nodes/settings-node-card";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";
import type { CanvasFlowNode } from "@/app/app/canvas/groups/group-frames";

export type FlowNode = CanvasFlowNode;

// Job results remembered before React paints, so the next flow wave can save them.
export type RememberedJobOutput = {
  status: CanvasNodeStatus;
  lastJobId: string;
  lastCostUsd?: number;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  lastError?: string;
};

export function settingsStroke(node: CanvasNode | undefined): string | undefined {
  return node?.type === "settings" ? SETTING_COLOR : undefined;
}

export function withRememberedJobOutputs(
  nodes: readonly FlowNode[],
  remembered: ReadonlyMap<string, RememberedJobOutput>,
): FlowNode[] {
  if (remembered.size === 0) return [...nodes];
  return nodes.map((node) => {
    const job = remembered.get(node.id);
    if (!job) return node;
    return { ...node, data: applyRememberedJobOutput(node.data, job) };
  });
}

export function toFlowNodes(nodes: readonly CanvasNode[]): FlowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x, y: n.position.y },
    data: { ...n.data },
  }));
}

export function toDomainNodes(nodes: readonly FlowNode[]): CanvasNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.type ?? "model") as CanvasNodeType,
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    data: { ...n.data },
  }));
}

export function toFlowEdges(
  edges: readonly CanvasEdge[],
  nodes: readonly CanvasNode[],
  catalog: readonly CanvasModelSpec[],
): Edge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((e) => {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    const portType = src ? getNodeOutputPortType(src, catalog, e.sourceHandle) : null;
    const stroke = settingsStroke(src) ?? (portType ? PORT_COLOR_MAP[portType] : "#c6f24b");
    const isTargetRunning =
      tgt?.type === "model" &&
      (tgt.data.status === "queued" || tgt.data.status === "running");

    return {
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle,
      animated: isTargetRunning,
      style: { stroke, strokeWidth: 2 },
    };
  });
}

export function toDomainEdges(edges: readonly Edge[]): CanvasEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle || "output",
    target: e.target,
    targetHandle: e.targetHandle || "prompt",
  }));
}
