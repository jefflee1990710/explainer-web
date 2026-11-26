// Resolves a model node's wired prompt, media, and settings into execution inputs.
// Callers keep importing these from "@/service/canvas/core/graph".

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { SettingsVars } from "@/model/canvas-settings";
import {
  type CanvasModelSpec,
  STATIC_CANVAS_MODELS,
  findCanvasModel,
} from "@/service/canvas/catalog/model-catalog";
import {
  directorBaseVars,
  directorRawOutput,
  isPlanDirectorNode,
  parseDirectorHandle,
} from "@/service/canvas/directors/explainer-director";
import { settingsVars } from "@/service/canvas/core/settings/registry";
import { promptPlaceholder, renderPromptTemplate } from "@/service/canvas/core/settings/template";
import { SETTINGS_HANDLE } from "@/service/canvas/core/settings/types";
import { getNodeOutputPortType } from "@/service/canvas/core/graph/ports";
import { extraOutputUrl } from "@/service/canvas/core/extra-outputs";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";

export type ResolvedCanvasInputs = {
  prompt?: string;
  image?: string;
  startImage?: string;
  endImage?: string;
  refImages: string[];
  video?: string;
  videos: string[];
  refAudio?: string;
  overlayVideo?: string;
  audios?: string[];
  // ffmpeg:sequence only: each wired edge's media URL, keyed by edge id (timeline refs).
  sequenceSources?: Record<string, string>;
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

function addUnique(list: string[], value: string): void {
  if (!list.includes(value)) {
    list.push(value);
  }
}

export function extractMediaUrl(sourceNode: CanvasNode, sourceHandle?: string | null): string | undefined {
  // A named extra output (FFmpeg Split part B) sits next to the main file.
  if (sourceNode.type === "model" && sourceHandle && sourceHandle !== "output") {
    const main = sourceNode.data.outputUrl?.trim();
    return main ? extraOutputUrl(main, sourceHandle) : undefined;
  }
  if (sourceNode.type === "media") {
    const trimmed = sourceNode.data.mediaUrl?.trim();
    return trimmed ? trimmed : undefined;
  }
  if (sourceNode.type === "model") {
    const trimmed = sourceNode.data.outputUrl?.trim();
    return trimmed ? trimmed : undefined;
  }
  if (sourceNode.type === "character") {
    const generated = sourceNode.data.outputUrl?.trim();
    if (generated) return generated;
    const preview = sourceNode.data.mediaUrl?.trim();
    return preview ? preview : undefined;
  }
  return undefined;
}

// Vars of the Setting node wired into `nodeId`, or none.
export function wiredSettingsVars(
  nodeId: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
): SettingsVars {
  const wire = edges.find((e) => e.target === nodeId && e.targetHandle === SETTINGS_HANDLE);
  const source = wire ? nodes.find((n) => n.id === wire.source) : undefined;
  return source?.type === "settings" && source.data.settings ? settingsVars(source.data.settings) : {};
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

  // Resolve prompt: a connected Prompt node, Director output, or caption SRT overrides inline text.
  const promptEdges = edgesByHandle.get("prompt") ?? [];
  let promptSource: CanvasNode | undefined;
  let director: { node: CanvasNode; handle: string } | undefined;
  let captionSource: CanvasNode | undefined;
  let waitingOnCaption = false;
  for (const edge of promptEdges) {
    const source = nodeById.get(edge.source);
    if (source?.type === "prompt") {
      promptSource = source;
      break;
    }
    if (source && edge.sourceHandle && isPlanDirectorNode(source) && parseDirectorHandle(edge.sourceHandle)) {
      director = { node: source, handle: edge.sourceHandle };
      break;
    }
    if (source?.type === "model" && getNodeOutputPortType(source, catalog) === "text") {
      if (source.data.text?.trim()) captionSource = source;
      else {
        waitingOnCaption = true;
        addUnique(missingUpstreamNodeIds, source.id);
      }
      break;
    }
  }

  if (promptSource) {
    promptFromNode = true;
    const connectedText = promptSource.data.text?.trim();
    if (connectedText) {
      inputs.prompt = connectedText;
    }
  } else if (director) {
    promptFromNode = true;
    const text = directorRawOutput(director.node, director.handle)?.trim();
    if (text) inputs.prompt = text;
    else addUnique(missingUpstreamNodeIds, director.node.id);
  } else if (captionSource?.data.text) {
    promptFromNode = true;
    inputs.prompt = captionSource.data.text.trim();
  } else if (!waitingOnCaption) {
    const inlinePrompt = targetNode.data.prompt?.trim();
    if (inlinePrompt) {
      inputs.prompt = inlinePrompt;
    }
  }

  // `{{key}}`: the Director card's text style, then the Setting wired to the Prompt node.
  // Subtitle SRT is literal; a cue must not be treated as a missing template key.
  if (inputs.prompt && !captionSource) {
    const vars = {
      ...(director ? directorBaseVars(director.node) : {}),
      ...(promptSource ? wiredSettingsVars(promptSource.id, nodes, edges) : {}),
    };
    const rendered = renderPromptTemplate(inputs.prompt, vars);
    inputs.prompt = rendered.text.trim() || undefined;
    for (const key of rendered.missing) addUnique(missingRequiredFields, promptPlaceholder(key));
  }

  // Helper to resolve a single-value media input handle.
  const resolveSingleMedia = (handle: string): string | undefined => {
    const incoming = edgesByHandle.get(handle) ?? [];
    for (const edge of incoming) {
      const sourceNode = nodeById.get(edge.source);
      if (!sourceNode) continue;
      const url = extractMediaUrl(sourceNode, edge.sourceHandle);
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
  inputs.overlayVideo = resolveSingleMedia("overlayVideo");

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
    const url = extractMediaUrl(sourceNode, edge.sourceHandle);
    if (url) {
      inputs.videos.push(url);
    } else {
      addUnique(missingUpstreamNodeIds, sourceNode.id);
    }
  }

  // Multi-value audios (FFmpeg Audio Join), in edge order.
  const audiosSpec = spec.inputs.find((port) => port.id === "audios");
  const audioEdges = edgesByHandle.get("audios") ?? [];
  const maxAudios = audiosSpec?.maxConnections ?? audioEdges.length;
  for (const edge of audioEdges) {
    if ((inputs.audios?.length ?? 0) >= maxAudios) break;
    const sourceNode = nodeById.get(edge.source);
    if (!sourceNode) continue;
    const url = extractMediaUrl(sourceNode, edge.sourceHandle);
    if (url) (inputs.audios ??= []).push(url);
    else addUnique(missingUpstreamNodeIds, sourceNode.id);
  }

  if (spec.id === SEQUENCE_MODEL_ID) {
    const sources: Record<string, string> = {};
    for (const port of ["videos", "audios", "refImages"]) {
      for (const edge of edgesByHandle.get(port) ?? []) {
        const sourceNode = nodeById.get(edge.source);
        const url = sourceNode ? extractMediaUrl(sourceNode, edge.sourceHandle) : undefined;
        if (url) sources[edge.id] = url;
      }
    }
    inputs.sequenceSources = sources;
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
      (port.id === "audios" && (inputs.audios?.length ?? 0) > 0) ||
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
