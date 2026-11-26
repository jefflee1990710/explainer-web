// Pure: swap a model node to another model of the same kind, keeping every wire the new model accepts.

import type { CanvasEdge, CanvasNode, CanvasNodeData } from "@/model/canvas";
import { validateEdgeConnection } from "@/service/canvas/core/graph";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";

// Scro tools and FFmpeg nodes each do one fixed job, so they have nothing to swap to.
export function canSwapModel(spec: CanvasModelSpec): boolean {
  return spec.provider !== "scro" && spec.provider !== "ffmpeg";
}

// Same category and output type (video for video, image for image), excluding hidden or unavailable models.
export function swapCandidates(current: CanvasModelSpec, catalog: readonly CanvasModelSpec[]): CanvasModelSpec[] {
  if (!canSwapModel(current)) return [];
  return catalog.filter(
    (spec) =>
      spec.id !== current.id &&
      canSwapModel(spec) &&
      spec.available !== false &&
      !spec.hiddenInSidebar &&
      spec.category === current.category &&
      spec.output.type === current.output.type,
  );
}

// New node data: model fields the next model does not support fall back to its defaults; a failure is cleared.
export function swappedNodeData(data: CanvasNodeData, next: CanvasModelSpec): CanvasNodeData {
  const out: CanvasNodeData = {
    ...data,
    modelId: next.id,
    presetId: data.presetId && next.presets.includes(data.presetId) ? data.presetId : next.defaultPresetId,
  };
  if (!next.supportsAspectRatio) delete out.aspectRatio;
  if (!next.supportsResolution) delete out.resolution;
  if (out.durationSeconds !== undefined) {
    const min = next.minDurationSeconds ?? out.durationSeconds;
    const max = next.maxDurationSeconds ?? out.durationSeconds;
    out.durationSeconds = Math.min(max, Math.max(min, out.durationSeconds));
  }
  if (out.status === "failed") {
    out.status = "idle";
    delete out.lastError;
  }
  return out;
}

// Re-adds each incoming wire in order and drops the ones the next model has no matching input for.
export function swapNodeModel(input: {
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
  nodeId: string;
  next: CanvasModelSpec;
  catalog: readonly CanvasModelSpec[];
}): { data: CanvasNodeData; edges: CanvasEdge[]; droppedEdgeIds: string[] } | null {
  const node = input.nodes.find((n) => n.id === input.nodeId);
  if (!node || node.type !== "model") return null;
  const data = swappedNodeData(node.data, input.next);
  const nodes = input.nodes.map((n) => (n.id === node.id ? { ...n, data } : n));
  const kept: CanvasEdge[] = input.edges.filter((e) => e.target !== node.id);
  const droppedEdgeIds: string[] = [];
  for (const edge of input.edges) {
    if (edge.target !== node.id) continue;
    const verdict = validateEdgeConnection(nodes, kept, edge, input.catalog);
    if (verdict.valid) kept.push(edge);
    else droppedEdgeIds.push(edge.id);
  }
  const keptIds = new Set(kept.map((e) => e.id));
  return { data, edges: input.edges.filter((e) => keptIds.has(e.id)), droppedEdgeIds };
}
