// Port types, connection rules, and multi-edge order for the canvas graph.
// Callers keep importing these from "@/service/canvas/core/graph".

import { isUnsettledMediaUpload, type CanvasEdge, type CanvasNode } from "@/model/canvas";
import {
  type CanvasModelSpec,
  type CanvasPortType,
  STATIC_CANVAS_MODELS,
  findCanvasModel,
} from "@/service/canvas/catalog/model-catalog";
import { characterOutfitPort } from "@/service/canvas/core/character-node";
import {
  DIRECTOR_CHARACTER_HANDLE,
  directorHandles,
  isPlanDirectorNode,
  parseDirectorHandle,
  readDirectorPlan,
} from "@/service/canvas/directors/explainer-director";
import { canWireSettings } from "@/service/canvas/core/settings/registry";
import { SETTINGS_HANDLE } from "@/service/canvas/core/settings/types";

export type CanvasEdgeCandidate = {
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
};

export type ValidateEdgeConnectionOptions = {
  // When true, connecting a different source to an occupied single-value target
  // handle (maxConnections === 1) is permitted so callers can replace the edge.
  // Default is false (rejects occupied single-value handles cleanly for React Flow isValidConnection).
  allowReplaceSingle?: boolean;
};

export type EdgeValidationResult =
  | { valid: true }
  | { valid: false; reason: string };


// Resolves the output port type exposed by a canvas node, or null if incomplete/unknown.
export function getNodeOutputPortType(
  node: CanvasNode,
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
  sourceHandle?: string | null,
): CanvasPortType | null {
  // Director outputs are text; the Director has no plain output.
  if (isPlanDirectorNode(node)) return parseDirectorHandle(sourceHandle) ? "text" : null;
  if (node.type === "media") {
    // A file that is still uploading has nothing to wire yet.
    if (isUnsettledMediaUpload(node.data)) return null;
    return node.data.mediaKind ?? null;
  }
  if (node.type === "prompt") {
    return "text";
  }
  if (node.type === "character") {
    return "image";
  }
  if (node.type === "model") {
    if (!node.data.modelId) return null;
    const spec = findCanvasModel(node.data.modelId, catalog);
    return spec?.output.type ?? null;
  }
  return null;
}

// DFS reachability check: returns true if `goal` is reachable from `start` via `edges`.
function isReachable(
  start: string,
  goal: string,
  edges: readonly CanvasEdge[],
): boolean {
  if (start === goal) return true;
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const next = adjacency.get(edge.source);
    if (next) {
      next.push(edge.target);
    } else {
      adjacency.set(edge.source, [edge.target]);
    }
  }

  const visited = new Set<string>([start]);
  const stack: string[] = [start];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const neighbors = adjacency.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (neighbor === goal) return true;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }
  return false;
}

// Validates whether a candidate edge can be added to the graph without violating
// port types, cardinality / maxConnections, self-loop rules, or acyclicity.
export function validateEdgeConnection(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  candidate: CanvasEdgeCandidate,
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
  options?: ValidateEdgeConnectionOptions,
): EdgeValidationResult {
  const sourceNode = nodes.find((node) => node.id === candidate.source);
  const targetNode = nodes.find((node) => node.id === candidate.target);

  if (!sourceNode || !targetNode) {
    return { valid: false, reason: "Source or target node does not exist" };
  }

  if (candidate.source === candidate.target) {
    return { valid: false, reason: "Cannot connect a node to itself" };
  }

  const sourceHandle = candidate.sourceHandle || "output";
  if (sourceHandle !== "output") {
    // Only a planned Director has named outputs, one per clip text.
    const plan = isPlanDirectorNode(sourceNode) ? readDirectorPlan(sourceNode) : undefined;
    if (!plan || !directorHandles(plan).includes(sourceHandle)) {
      return {
        valid: false,
        reason: `Unsupported source handle "${sourceHandle}"`,
      };
    }
  }

  // A Setting fills `{{key}}` on a Prompt node. Model nodes do not take one.
  const settingsHandle = candidate.targetHandle ?? "";
  if (sourceNode.type === "settings" || settingsHandle === SETTINGS_HANDLE) {
    const settings = sourceNode.type === "settings" ? sourceNode.data.settings : undefined;
    if (!settings || settingsHandle !== SETTINGS_HANDLE || !canWireSettings(targetNode)) {
      return { valid: false, reason: "This settings node cannot connect to that input" };
    }
    const existing = edges.filter((e) => e.target === targetNode.id && e.targetHandle === SETTINGS_HANDLE);
    if (existing.some((e) => e.source === sourceNode.id)) {
      return { valid: false, reason: "These nodes are already connected" };
    }
    if (existing.length > 0 && !options?.allowReplaceSingle) {
      return { valid: false, reason: "This node already has a settings node" };
    }
    return { valid: true };
  }

  const sourcePortType = getNodeOutputPortType(sourceNode, catalog, sourceHandle);
  if (!sourcePortType) {
    return {
      valid: false,
      reason: "Source node has no valid output port type",
    };
  }

  const targetHandle = candidate.targetHandle ?? "";
  let targetPort: { id: string; type: CanvasPortType; multiple?: boolean; maxConnections: number } | undefined;
  let targetLabel = "node";

  if (targetNode.type === "character") {
    const outfit = characterOutfitPort(targetHandle);
    if (!outfit) {
      return {
        valid: false,
        reason: `Character node has no outfit input "${targetHandle}"`,
      };
    }
    targetPort = {
      id: outfit.id,
      type: "image",
      multiple: outfit.multiple,
      maxConnections: outfit.maxConnections,
    };
    targetLabel = "character";
  } else if (targetNode.type !== "model") {
    return { valid: false, reason: "Target node does not accept inputs" };
  } else {
    const targetSpec = targetNode.data.modelId
      ? findCanvasModel(targetNode.data.modelId, catalog)
      : undefined;
    if (!targetSpec) {
      return { valid: false, reason: "Target model specification not found" };
    }
    targetLabel = targetSpec.name;
    targetPort = targetSpec.inputs.find((port) => port.id === targetHandle);
  }

  if (!targetPort) {
    return {
      valid: false,
      reason: `Target ${targetLabel} has no input port "${targetHandle}"`,
    };
  }

  if (targetPort.id === DIRECTOR_CHARACTER_HANDLE && sourceNode.type !== "character") {
    return {
      valid: false,
      reason: "Character input only accepts a character node",
    };
  }

  if (sourcePortType !== targetPort.type) {
    return {
      valid: false,
      reason: `Port type mismatch: cannot connect ${sourcePortType} output to ${targetPort.type} input "${targetPort.id}"`,
    };
  }

  const existingToPort = edges.filter(
    (edge) =>
      edge.target === candidate.target && edge.targetHandle === targetHandle,
  );

  const isExactDuplicate = existingToPort.some(
    (edge) =>
      edge.source === candidate.source &&
      (edge.sourceHandle || "output") === sourceHandle,
  );
  if (isExactDuplicate) {
    return { valid: false, reason: "Duplicate connection already exists" };
  }

  const maxConnections = targetPort.multiple
    ? Math.max(1, targetPort.maxConnections)
    : 1;

  if (maxConnections === 1) {
    if (existingToPort.length >= 1 && !options?.allowReplaceSingle) {
      return {
        valid: false,
        reason: `Input port "${targetPort.id}" accepts at most 1 connection`,
      };
    }
  } else if (existingToPort.length >= maxConnections) {
    return {
      valid: false,
      reason: `Input port "${targetPort.id}" accepts at most ${maxConnections} connections`,
    };
  }

  // Adding source -> target introduces a cycle iff source is already reachable from target.
  if (isReachable(candidate.target, candidate.source, edges)) {
    return {
      valid: false,
      reason: "Connection would create a cycle in the workflow graph",
    };
  }

  return { valid: true };
}

// Moves one edge on a multi-input handle, keeping every other edge in place.
// FFmpeg Concat reads `videos` in this edge order, so the node list and the render stay aligned.
export function reorderTargetHandleEdges<
  T extends { target: string; targetHandle?: string | null },
>(
  edges: readonly T[],
  targetId: string,
  targetHandle: string,
  fromIndex: number,
  toIndex: number,
): T[] {
  if (fromIndex === toIndex) return [...edges];
  const matching: T[] = [];
  const positions: number[] = [];
  edges.forEach((edge, index) => {
    if (edge.target === targetId && edge.targetHandle === targetHandle) {
      matching.push(edge);
      positions.push(index);
    }
  });
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= matching.length ||
    toIndex >= matching.length
  ) {
    return [...edges];
  }
  const reordered = [...matching];
  const [moved] = reordered.splice(fromIndex, 1);
  if (!moved) return [...edges];
  reordered.splice(toIndex, 0, moved);
  const next = [...edges];
  positions.forEach((position, index) => {
    const edge = reordered[index];
    if (edge) next[position] = edge;
  });
  return next;
}
