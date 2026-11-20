// Pure, side-effect-free graph validation, input resolution, and Kahn topological
// wave planning for the Interactive Node Canvas Editor (/app/canvas).

import type {
  CanvasEdge,
  CanvasNode,
  CanvasOutputKind,
} from "@/model/canvas";
import {
  type CanvasModelSpec,
  type CanvasPortType,
  STATIC_CANVAS_MODELS,
  findCanvasModel,
} from "@/service/canvas/model-catalog";

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

export type ResolvedCanvasInputs = {
  prompt?: string;
  image?: string;
  startImage?: string;
  endImage?: string;
  refImages: string[];
  video?: string;
  videos: string[];
  refAudio?: string;
};

export type ResolveNodeInputsResult =
  | {
      ok: true;
      inputs: ResolvedCanvasInputs;
      promptFromNode: boolean;
    }
  | {
      ok: false;
      inputs: ResolvedCanvasInputs;
      promptFromNode: boolean;
      missingUpstreamNodeIds: string[];
      missingRequiredFields: string[];
      reason?: string;
    };

// Resolves the output port type exposed by a canvas node, or null if incomplete/unknown.
export function getNodeOutputPortType(
  node: CanvasNode,
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): CanvasPortType | null {
  if (node.type === "media") {
    return node.data.mediaKind ?? null;
  }
  if (node.type === "prompt") {
    return "text";
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

  if (targetNode.type !== "model") {
    return { valid: false, reason: "Target node does not accept inputs" };
  }

  const sourceHandle = candidate.sourceHandle || "output";
  if (sourceHandle !== "output") {
    return {
      valid: false,
      reason: `Unsupported source handle "${sourceHandle}"`,
    };
  }

  const sourcePortType = getNodeOutputPortType(sourceNode, catalog);
  if (!sourcePortType) {
    return {
      valid: false,
      reason: "Source node has no valid output port type",
    };
  }

  const targetSpec = targetNode.data.modelId
    ? findCanvasModel(targetNode.data.modelId, catalog)
    : undefined;
  if (!targetSpec) {
    return { valid: false, reason: "Target model specification not found" };
  }

  const targetHandle = candidate.targetHandle ?? "";
  const targetPort = targetSpec.inputs.find((port) => port.id === targetHandle);
  if (!targetPort) {
    return {
      valid: false,
      reason: `Target model "${targetSpec.name}" has no input port "${targetHandle}"`,
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

function addUnique(list: string[], value: string): void {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function extractMediaUrl(sourceNode: CanvasNode): string | undefined {
  if (sourceNode.type === "media") {
    const trimmed = sourceNode.data.mediaUrl?.trim();
    return trimmed ? trimmed : undefined;
  }
  if (sourceNode.type === "model") {
    const trimmed = sourceNode.data.outputUrl?.trim();
    return trimmed ? trimmed : undefined;
  }
  return undefined;
}

// Collects and validates all inputs for a target model node from incoming edges
// (preferring connected Prompt nodes over inline prompt text) and upstream outputs.
export function resolveNodeInputs(
  nodeId: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): ResolveNodeInputsResult {
  const emptyInputs: ResolvedCanvasInputs = { refImages: [], videos: [] };
  const nodeById = new Map<string, CanvasNode>();
  for (const node of nodes) {
    nodeById.set(node.id, node);
  }

  const targetNode = nodeById.get(nodeId);
  if (!targetNode || targetNode.type !== "model") {
    return {
      ok: false,
      inputs: emptyInputs,
      promptFromNode: false,
      missingUpstreamNodeIds: [],
      missingRequiredFields: [],
      reason: "Model node not found",
    };
  }

  const spec = targetNode.data.modelId
    ? findCanvasModel(targetNode.data.modelId, catalog)
    : undefined;
  if (!spec) {
    return {
      ok: false,
      inputs: emptyInputs,
      promptFromNode: false,
      missingUpstreamNodeIds: [],
      missingRequiredFields: [],
      reason: "Model specification not found",
    };
  }

  const edgesByHandle = new Map<string, CanvasEdge[]>();
  for (const edge of edges) {
    if (edge.target !== nodeId) continue;
    const list = edgesByHandle.get(edge.targetHandle);
    if (list) {
      list.push(edge);
    } else {
      edgesByHandle.set(edge.targetHandle, [edge]);
    }
  }

  const inputs: ResolvedCanvasInputs = { refImages: [], videos: [] };
  const missingUpstreamNodeIds: string[] = [];
  const missingRequiredFields: string[] = [];
  let promptFromNode = false;

  // Resolve prompt: connected Prompt node overrides inline node.data.prompt.
  const promptEdges = edgesByHandle.get("prompt") ?? [];
  const promptSource = promptEdges
    .map((edge) => nodeById.get(edge.source))
    .find((node): node is CanvasNode => node?.type === "prompt");

  if (promptSource) {
    promptFromNode = true;
    const connectedText = promptSource.data.text?.trim();
    if (connectedText) {
      inputs.prompt = connectedText;
    }
  } else {
    const inlinePrompt = targetNode.data.prompt?.trim();
    if (inlinePrompt) {
      inputs.prompt = inlinePrompt;
    }
  }

  // Helper to resolve a single-value media input handle.
  const resolveSingleMedia = (handle: string): string | undefined => {
    const incoming = edgesByHandle.get(handle) ?? [];
    for (const edge of incoming) {
      const sourceNode = nodeById.get(edge.source);
      if (!sourceNode) continue;
      const url = extractMediaUrl(sourceNode);
      if (url) {
        return url;
      }
      addUnique(missingUpstreamNodeIds, sourceNode.id);
    }
    return undefined;
  };

  inputs.image = resolveSingleMedia("image");
  inputs.startImage = resolveSingleMedia("startImage");
  inputs.endImage = resolveSingleMedia("endImage");
  inputs.video = resolveSingleMedia("video");
  inputs.refAudio = resolveSingleMedia("refAudio");

  // Resolve multi-value refImages preserving edge order up to model maxConnections.
  const refImagesSpec = spec.inputs.find((port) => port.id === "refImages");
  const refEdges = edgesByHandle.get("refImages") ?? [];
  const maxRefs = refImagesSpec?.maxConnections ?? refEdges.length;
  for (const edge of refEdges) {
    if (inputs.refImages.length >= maxRefs) break;
    const sourceNode = nodeById.get(edge.source);
    if (!sourceNode) continue;
    const url = extractMediaUrl(sourceNode);
    if (url) {
      inputs.refImages.push(url);
    } else {
      addUnique(missingUpstreamNodeIds, sourceNode.id);
    }
  }

  // Resolve multi-value videos preserving edge order up to model maxConnections.
  const videosSpec = spec.inputs.find((port) => port.id === "videos");
  const videoEdges = edgesByHandle.get("videos") ?? [];
  const maxVideos = videosSpec?.maxConnections ?? videoEdges.length;
  for (const edge of videoEdges) {
    if (inputs.videos.length >= maxVideos) break;
    const sourceNode = nodeById.get(edge.source);
    if (!sourceNode) continue;
    const url = extractMediaUrl(sourceNode);
    if (url) {
      inputs.videos.push(url);
    } else {
      addUnique(missingUpstreamNodeIds, sourceNode.id);
    }
  }

  // Verify every required port declared on the model spec has a value.
  for (const port of spec.inputs) {
    if (!port.required) continue;
    const satisfied =
      (port.id === "prompt" && Boolean(inputs.prompt)) ||
      (port.id === "image" && Boolean(inputs.image)) ||
      (port.id === "startImage" && Boolean(inputs.startImage)) ||
      (port.id === "endImage" && Boolean(inputs.endImage)) ||
      (port.id === "video" && Boolean(inputs.video)) ||
      (port.id === "videos" && inputs.videos.length > 0) ||
      (port.id === "refAudio" && Boolean(inputs.refAudio)) ||
      (port.id === "refImages" && inputs.refImages.length > 0);
    if (!satisfied) {
      addUnique(missingRequiredFields, port.id);
    }
  }

  if (missingUpstreamNodeIds.length > 0 || missingRequiredFields.length > 0) {
    return {
      ok: false,
      inputs,
      promptFromNode,
      missingUpstreamNodeIds,
      missingRequiredFields,
    };
  }

  return {
    ok: true,
    inputs,
    promptFromNode,
  };
}

export type CompletedCanvasOutput = {
  nodeId: string;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  updatedAt: Date;
};

// Keeps a finished model output when a stale client snapshot is saved before
// React has painted the completed job back onto the node.
export function mergeCanvasNodeSnapshots(
  existing: readonly CanvasNode[],
  incoming: readonly CanvasNode[],
): CanvasNode[] {
  const previousById = new Map(existing.map((node) => [node.id, node]));
  return incoming.map((node) => {
    const previous = previousById.get(node.id);
    if (!previous || previous.type !== "model" || node.type !== "model") {
      return node;
    }
    const previousUrl = previous.data.outputUrl?.trim();
    const incomingUrl = node.data.outputUrl?.trim();
    if (!previousUrl || incomingUrl) return node;
    return {
      ...node,
      data: {
        ...node.data,
        outputUrl: previousUrl,
        ...(previous.data.outputKind && !node.data.outputKind
          ? { outputKind: previous.data.outputKind }
          : {}),
      },
    };
  });
}

// Fills model nodes whose outputUrl was wiped, using the newest completed job.
export function applyCompletedJobOutputs(
  nodes: readonly CanvasNode[],
  jobs: readonly CompletedCanvasOutput[],
): CanvasNode[] {
  const latestByNodeId = new Map<string, CompletedCanvasOutput>();
  for (const job of jobs) {
    const url = job.outputUrl?.trim();
    if (!url) continue;
    const previous = latestByNodeId.get(job.nodeId);
    if (
      !previous ||
      job.updatedAt.getTime() >= previous.updatedAt.getTime()
    ) {
      latestByNodeId.set(job.nodeId, { ...job, outputUrl: url });
    }
  }

  let changed = false;
  const next = nodes.map((node): CanvasNode => {
    if (node.type !== "model" || node.data.outputUrl?.trim()) return node;
    const job = latestByNodeId.get(node.id);
    if (!job?.outputUrl) return node;
    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        outputUrl: job.outputUrl,
        ...(job.outputKind ? { outputKind: job.outputKind } : {}),
        status: "completed",
        lastError: undefined,
      },
    };
  });
  return changed ? next : [...nodes];
}

// Plans parallel execution waves across model nodes using Kahn's topological sort.
// When `targetModelNodeIds` is provided, restricts execution to those targets and
// all of their upstream model ancestors. Throws if a cycle exists.
export function computeExecutionWaves(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  targetModelNodeIds?: readonly string[],
): string[][] {
  const modelOrder = new Map<string, number>();
  const allModelIds: string[] = [];
  for (const node of nodes) {
    if (node.type === "model") {
      modelOrder.set(node.id, allModelIds.length);
      allModelIds.push(node.id);
    }
  }

  let selectedSet: Set<string>;
  if (targetModelNodeIds !== undefined) {
    // Walk upstream from requested targets to gather all ancestor model nodes.
    const reverseAdj = new Map<string, string[]>();
    for (const edge of edges) {
      if (!modelOrder.has(edge.source) || !modelOrder.has(edge.target)) continue;
      const parents = reverseAdj.get(edge.target);
      if (parents) {
        parents.push(edge.source);
      } else {
        reverseAdj.set(edge.target, [edge.source]);
      }
    }

    selectedSet = new Set<string>();
    const stack: string[] = [];
    for (const id of targetModelNodeIds) {
      if (modelOrder.has(id) && !selectedSet.has(id)) {
        selectedSet.add(id);
        stack.push(id);
      }
    }
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      for (const parent of reverseAdj.get(current) ?? []) {
        if (!selectedSet.has(parent)) {
          selectedSet.add(parent);
          stack.push(parent);
        }
      }
    }
  } else {
    selectedSet = new Set(allModelIds);
  }

  if (selectedSet.size === 0) {
    return [];
  }

  const selectedIds = allModelIds.filter((id) => selectedSet.has(id));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, Set<string>>();
  for (const id of selectedIds) {
    inDegree.set(id, 0);
    dependents.set(id, new Set<string>());
  }

  // Deduplicate parallel edges between the same pair of model nodes.
  for (const edge of edges) {
    if (!selectedSet.has(edge.source) || !selectedSet.has(edge.target)) {
      continue;
    }
    const deps = dependents.get(edge.source);
    if (!deps || deps.has(edge.target)) continue;
    deps.add(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const sortByNodeOrder = (ids: string[]) =>
    ids.sort((a, b) => (modelOrder.get(a) ?? 0) - (modelOrder.get(b) ?? 0));

  let currentWave = sortByNodeOrder(
    selectedIds.filter((id) => (inDegree.get(id) ?? 0) === 0),
  );

  const waves: string[][] = [];
  let processed = 0;

  while (currentWave.length > 0) {
    waves.push(currentWave);
    processed += currentWave.length;

    const nextWave: string[] = [];
    for (const id of currentWave) {
      for (const dependentId of dependents.get(id) ?? []) {
        const remaining = (inDegree.get(dependentId) ?? 0) - 1;
        inDegree.set(dependentId, remaining);
        if (remaining === 0) {
          nextWave.push(dependentId);
        }
      }
    }
    currentWave = sortByNodeOrder(nextWave);
  }

  if (processed !== selectedIds.length) {
    throw new Error(
      "Cannot compute execution waves: cycle detected in canvas graph",
    );
  }

  return waves;
}
