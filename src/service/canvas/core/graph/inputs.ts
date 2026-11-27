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
import { CHARACTER_OUTFIT_PORT_IDS, outfitRefMeta } from "@/service/canvas/core/character-blueprint";
import { getNodeOutputPortType } from "@/service/canvas/core/graph/ports";
import { extraOutputUrl } from "@/service/canvas/core/extra-outputs";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import {
  characterOutfitPendingMessage,
  isOutfitReferenceNode,
  pendingCharacterOutfitSources,
} from "@/service/canvas/core/character-wardrobe";

export type CanvasOutfitRef = {
  handle: string;
  url: string;
  name?: string;
  prompt?: string;
};

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
  // Outfit slots on the empty character node (hair, top, pants, shoes, accessory, looks).
  outfitRefs?: CanvasOutfitRef[];
  // 1-based places in refImages that came from a character node; image prompts lock their outfit.
  characterRefPositions?: number[];
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

// The user edited the prompt on the model card, so that text replaces the wired source.
function editedPrompt(node: CanvasNode): string | undefined {
  if (node.data.toolParams?.promptEdited !== true) return undefined;
  return typeof node.data.prompt === "string" ? node.data.prompt.trim() : "";
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

// Raw text of the prompt wire, before template fill. Undefined when nothing is connected.
export function readConnectedPromptText(
  nodeId: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): string | undefined {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    if (edge.target !== nodeId || edge.targetHandle !== "prompt") continue;
    const source = nodeById.get(edge.source);
    if (!source) continue;
    if (source.type === "prompt") return source.data.text ?? "";
    if (edge.sourceHandle && isPlanDirectorNode(source) && parseDirectorHandle(edge.sourceHandle)) {
      return directorRawOutput(source, edge.sourceHandle) ?? "";
    }
    if (source.type === "model" && getNodeOutputPortType(source, catalog) === "text") {
      return source.data.text ?? "";
    }
  }
  const connected = edges.some((edge) => edge.target === nodeId && edge.targetHandle === "prompt");
  return connected ? "" : undefined;
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

// {{key}} values for a model prompt.
// The Explainer Director fills text_style from its card, so a new director needs no Setting.
// A Setting overrides a key only when it is wired to the Prompt that feeds this node.
export function modelPromptVars(
  nodeId: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): SettingsVars {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  let director: CanvasNode | undefined;
  let promptSource: CanvasNode | undefined;
  for (const edge of edges) {
    if (edge.target !== nodeId || edge.targetHandle !== "prompt") continue;
    const source = nodeById.get(edge.source);
    if (!source) continue;
    if (source.type === "prompt") {
      promptSource = source;
      break;
    }
    if (edge.sourceHandle && isPlanDirectorNode(source) && parseDirectorHandle(edge.sourceHandle)) {
      director = source;
      break;
    }
    // Subtitle SRT is literal; do not treat a cue as a template key.
    if (source.type === "model" && getNodeOutputPortType(source, catalog) === "text") return {};
  }
  const settingVars = promptSource ? wiredSettingsVars(promptSource.id, nodes, edges) : {};
  return {
    ...(director ? directorBaseVars(director) : {}),
    ...settingVars,
  };
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

  // Resolve prompt: a connected Prompt node, Director output, or caption SRT overrides inline text
  // until the user edits that text on the model card.
  const promptEdges = edgesByHandle.get("prompt") ?? [];
  const takenPrompt = editedPrompt(targetNode);
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
      else if (takenPrompt === undefined) {
        waitingOnCaption = true;
        addUnique(missingUpstreamNodeIds, source.id);
      }
      break;
    }
  }

  if (takenPrompt !== undefined) {
    if (takenPrompt) inputs.prompt = takenPrompt;
  } else if (promptSource) {
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

  // `{{key}}`: the Director card's text style, then a Setting only if one is wired to the Prompt.
  // Subtitle SRT is literal; a cue must not be treated as a missing template key.
  if (inputs.prompt && !captionSource) {
    const rendered = renderPromptTemplate(inputs.prompt, modelPromptVars(nodeId, nodes, edges, catalog));
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
  const characterRefPositions: number[] = [];
  let outfitReferenceWired = false;
  for (const edge of refEdges) {
    if (inputs.refImages.length >= maxRefs) break;
    const sourceNode = nodeById.get(edge.source);
    if (!sourceNode) continue;
    const url = extractMediaUrl(sourceNode);
    if (url) {
      inputs.refImages.push(url);
      if (sourceNode.type === "character") characterRefPositions.push(inputs.refImages.length);
      if (isOutfitReferenceNode(sourceNode)) outfitReferenceWired = true;
    } else {
      addUnique(missingUpstreamNodeIds, sourceNode.id);
    }
  }
  if (characterRefPositions.length > 0 && !outfitReferenceWired) {
    inputs.characterRefPositions = characterRefPositions;
  }

  // Outfit slots used by the empty character node. Other models do not declare these ports.
  const outfitRefs: CanvasOutfitRef[] = [];
  for (const port of spec.inputs) {
    if (!CHARACTER_OUTFIT_PORT_IDS.has(port.id)) continue;
    const incoming = edgesByHandle.get(port.id) ?? [];
    const max = port.multiple ? Math.max(1, port.maxConnections) : 1;
    for (const edge of incoming) {
      if (outfitRefs.filter((ref) => ref.handle === port.id).length >= max) break;
      const sourceNode = nodeById.get(edge.source);
      if (!sourceNode) continue;
      const url = extractMediaUrl(sourceNode);
      if (!url) {
        addUnique(missingUpstreamNodeIds, sourceNode.id);
        continue;
      }
      outfitRefs.push({ handle: port.id, url, ...outfitRefMeta(sourceNode) });
    }
  }
  if (outfitRefs.length > 0) inputs.outfitRefs = outfitRefs;

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
      (port.id === "refImages" && inputs.refImages.length > 0) ||
      (CHARACTER_OUTFIT_PORT_IDS.has(port.id) &&
        (inputs.outfitRefs ?? []).some((ref) => ref.handle === port.id));
    if (!satisfied) {
      addUnique(missingRequiredFields, port.id);
    }
  }

  // A character with wired outfit pieces but no generated look would send its default outfit.
  const pendingOutfits = pendingCharacterOutfitSources(nodeId, nodes, edges);
  const outfitReason = pendingOutfits.length > 0 ? characterOutfitPendingMessage(pendingOutfits) : undefined;

  if (missingUpstreamNodeIds.length > 0 || missingRequiredFields.length > 0 || outfitReason) {
    return {
      ok: false,
      inputs,
      promptFromNode,
      missingUpstreamNodeIds,
      missingRequiredFields,
      ...(outfitReason ? { reason: outfitReason } : {}),
    };
  }

  return {
    ok: true,
    inputs,
    promptFromNode,
  };
}
