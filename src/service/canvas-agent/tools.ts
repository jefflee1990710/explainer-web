// Tool registry for the Scro canvas agent. Each handler edits an in-memory working
// graph and logs an op; errors go back to the model as { error } instead of throwing.
// No tool runs a node or spends USD Credit.

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type {
  CanvasAspectRatio,
  CanvasEdge,
  CanvasGroup,
  CanvasGroupColor,
  CanvasNode,
  CanvasNodeData,
} from "@/model/canvas";
import { canvasAspectRatioSchema } from "@/model/canvas";
import { computeExecutionWaves, validateEdgeConnection } from "@/service/canvas/graph";
import { characterOutfitPort, libraryAssetNodeDraft } from "@/service/canvas/character-node";
import { isExplainerPlannerNode } from "@/service/canvas/explainer-planner";
import {
  canvasGroupsForProject,
  defaultGroupColor,
  defaultGroupTitle,
  withGroup,
} from "@/service/canvas/groups";
import { type CanvasModelSpec, findCanvasModel } from "@/service/canvas/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/pricing";
import { isGenerationInputPatch, isOutputStale, markStaleOutputs } from "@/service/canvas/stale-outputs";
import { settingsVars } from "@/service/canvas/settings/registry";
import {
  updateSettings,
  updateSettingsSchema,
  type UpdateSettingsInput,
} from "@/service/canvas-agent/settings-tool";
import type {
  CanvasLibraryAsset,
  CanvasLibraryCharacterOption,
} from "@/model/canvas-dto";
import type { CanvasAgentOp, CanvasAgentQuestion } from "@/model/canvas-agent";
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
import { soleCanvasCharacterId } from "@/service/canvas-agent/canvas-characters";
import {
  type UpdateExplainerSettingsInput,
  updateExplainerDirector,
  updateExplainerSettingsSchema,
} from "@/service/canvas-agent/explainer-director-tool";
import {
  DIRECTOR_CHARACTER_HANDLE,
  directorNeedsReplan,
  directorParams,
  directorTextStyle,
  isExplainerDirectorNode,
  isPlanDirectorNode,
  isTalkingHeadDirectorNode,
  parseDirectorHandle,
  readDirectorPlan,
  talkingHeadDirectorParams,
} from "@/service/canvas/explainer-director";
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
import {
  buildAgentScroGroup,
  SCRO_GROUP_MODEL_IDS,
  SCRO_GROUP_TOOLS,
  type ScroGroupToolInput,
} from "@/service/canvas-agent/scro-group-tool";

export const CANVAS_AGENT_MAX_ADDED_NODES = 20;
export const CANVAS_AGENT_MAX_QUESTION_OPTIONS = 6;

const COLUMN_GAP = 400;
const ROW_GAP = 40;
// Rough card heights so arranged columns do not overlap.
const NODE_HEIGHT: Record<CanvasNode["type"], number> = {
  prompt: 190,
  media: 230,
  model: 430,
  character: 520,
  settings: 460,
};
const TEXT_PREVIEW = 240;

export type CanvasAgentWorkingGraph = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups: CanvasGroup[];
  catalog: readonly CanvasModelSpec[];
  assets: readonly CanvasLibraryAsset[];
  characters: readonly CanvasLibraryCharacterOption[];
  userMessage: string;
  ops: CanvasAgentOp[];
  addedNodes: number;
  // Set by ask_user; the turn stops and the dock shows it as clickable options.
  question?: CanvasAgentQuestion;
  nextId: () => string;
};

export type CanvasAgentToolResult = Record<string, unknown>;

export function createWorkingGraph(input: {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  // Missing on older canvases; groups are then inferred from node id prefixes.
  groups?: CanvasGroup[];
  catalog: readonly CanvasModelSpec[];
  assets: readonly CanvasLibraryAsset[];
  characters?: readonly CanvasLibraryCharacterOption[];
  // This turn's user message; ask_user uses it to block questions the request already answers.
  message?: string;
  nextId?: () => string;
}): CanvasAgentWorkingGraph {
  const characters =
    input.characters ??
    input.assets
      .filter((a) => a.source === "character")
      .map((a) => ({ id: a.id, name: a.name, previewUrl: a.url }));
  return {
    nodes: input.nodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: [...input.edges],
    groups: canvasGroupsForProject(input.nodes, input.groups),
    catalog: input.catalog,
    assets: input.assets,
    characters,
    userMessage: input.message ?? "",
    ops: [],
    addedNodes: 0,
    nextId: input.nextId ?? (() => crypto.randomUUID().slice(0, 8)),
  };
}

// Marks the changed nodes' previews and everything downstream as old versions, logged as one op.
export function markStale(g: CanvasAgentWorkingGraph, changedIds: readonly string[]): void {
  const res = markStaleOutputs(g.nodes, g.edges, changedIds);
  if (res.staleIds.length === 0) return;
  g.nodes = res.nodes;
  g.ops.push({ kind: "mark_stale", nodeIds: res.staleIds });
}

const EXPLAINER_REQUEST = /explainer|解說|講解|解释|讲解/i;
const TALKING_HEAD_WORDS = /talking[\s-]?head|口播|對鏡頭|对镜头|on[\s-]camera/i;

const TOOL_PARAMS_ALLOWED_KEYS: Record<string, readonly string[]> = {
  "scro:talking-head": ["characterId", "language", "framing", "styleId"],
  "scro:explainer": ["characterId", "language", "skillSlug", "durationPreset", "styleId", "productId"],
  "scro:swap": ["characterId", "swapMode", "lightLookId", "objectTarget", "objectEditMode", "sectionStart", "sectionLength"],
  "scro:teleport": ["sectionStart", "sectionLength", "sceneText"],
  "scro:life": ["characterId", "poseId"],
  "scro:poster": ["characterId", "productId", "styleId"],
  "scro:tts": ["characterId", "language", "voicePreset", "ttsVoiceId", "ttsSpeed", "ttsConversational"],
  "ffmpeg:concat": ["ffmpegTransition"],
  "ffmpeg:audio-mux": ["ffmpegMixMode", "ffmpegAudioGainDb"],
  "ffmpeg:trim-speed": ["ffmpegStartSec", "ffmpegEndSec", "ffmpegSpeed", "ffmpegTrimSilence"],
  "ffmpeg:transform": ["ffmpegCropMode", "ffmpegColorGrade"],
  "ffmpeg:extract-audio": [],
  "ffmpeg:color-grade": ["gradeLook"],
  "ffmpeg:smooth-silence": [],
};

const TOOL_PARAM_ENUMS: Record<string, readonly string[]> = {
  language: ["yue", "zh", "en"],
  framing: ["collarbone-close", "waist-up", "handheld-selfie", "full-body"],
  skillSlug: [
    "cartoon-explainer-video-director",
    "paper-cutout-explainer-video-director",
    "papercraft-diorama-director",
  ],
  durationPreset: ["15s", "30s", "45s", "60s"],
  swapMode: ["character", "object", "relight", "colorfix"],
  objectEditMode: ["change", "add", "remove"],
  voicePreset: ["alan", "cathy", "yu", "una", "brian", "bella"],
  ffmpegTransition: ["cut", "pad-200ms", "fade"],
  ffmpegMixMode: ["replace", "mix-ducking"],
  ffmpegCropMode: ["fit-pad", "center-crop"],
  ffmpegColorGrade: ["none", "h3-soft"],
  gradeLook: ["jutsu", "talking-head", "talking-head-selfie"],
};

function validateToolParamsForModel(
  g: CanvasAgentWorkingGraph,
  modelId: string,
  toolParams?: Record<string, unknown>,
): string | null {
  if (!toolParams) return null;
  const allowed = TOOL_PARAMS_ALLOWED_KEYS[modelId];
  if (!allowed) {
    return Object.keys(toolParams).length > 0
      ? `Model "${modelId}" does not accept toolParams.`
      : null;
  }
  for (const [key, val] of Object.entries(toolParams)) {
    if (!allowed.includes(key)) {
      return `Invalid toolParams key "${key}" for "${modelId}". Allowed: ${allowed.join(", ") || "(none)"}.`;
    }
    if (key === "characterId" && typeof val === "string" && val.trim()) {
      if (!g.characters.some((c) => c.id === val.trim())) {
        return `Unknown characterId "${val}". Call list_assets() and use an exact id from characters.`;
      }
    }
    const enumValues = TOOL_PARAM_ENUMS[key];
    if (enumValues && typeof val === "string" && !enumValues.includes(val)) {
      return `Invalid value "${val}" for toolParams.${key}. Allowed: ${enumValues.join(", ")}.`;
    }
  }
  return null;
}

function agentModels(g: CanvasAgentWorkingGraph): CanvasModelSpec[] {
  return g.catalog.filter(
    (spec) =>
      spec.provider !== "mentalok" &&
      spec.available !== false &&
      !spec.hiddenInSidebar &&
      !SCRO_GROUP_MODEL_IDS.includes(spec.id),
  );
}

// One short line per model so the chat prompt stays small.
export function canvasAgentModelLine(spec: CanvasModelSpec): string {
  const ports = spec.inputs
    .map((port) => {
      const required = port.required ? "*" : "";
      const many = port.multiple ? `x${port.maxConnections}` : "";
      return `${port.id}${required}:${port.type}${many}`;
    })
    .join(",");
  // Price of one run at the default length; video nodes are billed per run, not per second.
  const cost = estimateCanvasModelCostUsd(spec);
  const seconds = spec.output.type === "video" ? spec.defaultDurationSeconds : undefined;
  const price = seconds ? `${cost}/${seconds}s` : String(cost);
  return `${spec.id} | ${spec.name} | ${spec.output.type} | ${ports} | $${price}`;
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
  const groupId = g.groups.find((gr) => gr.memberIds.includes(node.id))?.id;
  return {
    id: node.id,
    type: node.type,
    ...(groupId ? { groupId } : {}),
    ...(node.type === "prompt" ? { text: clip(node.data.text) } : {}),
    ...(node.type === "media"
      ? { mediaKind: node.data.mediaKind, name: node.data.fileName ?? node.data.label }
      : {}),
    ...(node.type === "character"
      ? {
          name: node.data.label,
          characterId: node.data.characterId,
          status: node.data.status ?? "idle",
          hasOutput: Boolean(node.data.outputUrl),
          ...(isOutputStale(node.data) ? { outdated: true } : {}),
        }
      : {}),
    // Explainer Director: change these only through update_explainer_settings.
    ...(isExplainerDirectorNode(node)
      ? {
          director: {
            params: directorParams(node),
            textStyle: directorTextStyle(node),
            planStatus: node.data.toolParams?.planStatus ?? "idle",
            clips: readDirectorPlan(node)?.clips.length ?? 0,
            outputs: "clip-<n>-frame | clip-<n>-motion | clip-<n>-voice (text)",
            needsReplan: directorNeedsReplan(node),
          },
        }
      : {}),
    // Talking Head Director: change its script or settings only through replace_group.
    ...(isTalkingHeadDirectorNode(node)
      ? {
          director: {
            params: talkingHeadDirectorParams(node),
            planStatus: node.data.toolParams?.planStatus ?? "idle",
            clips: readDirectorPlan(node)?.clips.length ?? 0,
            outputs: "clip-1-frame (shared opening still) | clip-<n>-motion | clip-<n>-voice (text)",
            needsReplan: directorNeedsReplan(node),
          },
        }
      : {}),
    // A Setting's `{{key}}` vars: change these only through update_settings.
    ...(node.type === "settings" ? { vars: settingsVars(node.data.settings) } : {}),
    ...(node.type === "model"
      ? {
          modelId: node.data.modelId,
          modelName: spec?.name,
          output: spec?.output.type,
          prompt: clip(node.data.prompt),
          aspectRatio: node.data.aspectRatio,
          durationSeconds: node.data.durationSeconds,
          ...(node.data.toolParams ? { toolParams: node.data.toolParams } : {}),
          status: node.data.status ?? "idle",
          hasOutput: Boolean(node.data.outputUrl),
          // The preview predates an input change; Run regenerates it.
          ...(isOutputStale(node.data) ? { outdated: true } : {}),
        }
      : {}),
  };
}

export const CANVAS_AGENT_TOOL_HANDLERS = {
  get_canvas(g: CanvasAgentWorkingGraph): CanvasAgentToolResult {
    return {
      groups: describeGroups(g),
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

  add_model_node(
    g: CanvasAgentWorkingGraph,
    input: {
      modelId: string;
      prompt?: string;
      promptText?: string;
      wires?: Array<{ sourceId: string; targetPort: string }>;
      aspectRatio?: CanvasAspectRatio;
      durationSeconds?: number;
      toolParams?: Record<string, unknown>;
    },
  ): CanvasAgentToolResult {
    if (findCanvasModel(input.modelId, g.catalog)?.hiddenInSidebar) {
      return { error: `${input.modelId} is created by Explainer planning; add scro:explainer instead.` };
    }
    if (SCRO_GROUP_MODEL_IDS.includes(input.modelId)) {
      return {
        error: `${input.modelId} is built as a visible node group. Call add_scro_group with tool "${input.modelId.slice("scro:".length)}" instead.`,
      };
    }
    const spec = agentModels(g).find((s) => s.id === input.modelId);
    if (!spec) {
      return { error: `Unknown model "${input.modelId}". Call list_models and use an exact id.` };
    }
    const paramError = validateToolParamsForModel(g, spec.id, input.toolParams);
    if (paramError) return { error: paramError };
    // Explainer lands as a self-contained planning card that the canvas plans right after the turn.
    if (spec.id === "scro:explainer") {
      const topic = (input.prompt ?? input.promptText ?? "").trim();
      if (!topic) return { error: "scro:explainer needs the topic or script in \"prompt\"." };
      const named =
        typeof input.toolParams?.characterId === "string" ? input.toolParams.characterId.trim() : "";
      // With no character named, reuse the one character already on the canvas.
      const reused = named ? undefined : soleCanvasCharacterId(g, g.nodes);
      const created = addNode(g, "model", {
        modelId: spec.id,
        aspectRatio: input.aspectRatio ?? "9:16",
        prompt: topic,
        toolParams: {
          ...(reused ? { characterId: reused } : {}),
          ...(input.toolParams ?? {}),
          plannerMode: true,
        },
        status: "idle",
      });
      if (created.error || typeof created.nodeId !== "string") return created;
      return created;
    }
    const created = addNode(g, "model", {
      modelId: spec.id,
      presetId: spec.defaultPresetId,
      aspectRatio: spec.supportsAspectRatio ? (input.aspectRatio ?? "9:16") : undefined,
      resolution: spec.supportsResolution ? "2k" : undefined,
      durationSeconds: clampDuration(spec, input.durationSeconds),
      prompt: input.prompt ?? "",
      ...(input.toolParams ? { toolParams: input.toolParams } : {}),
      status: "idle",
    });
    if (created.error || typeof created.nodeId !== "string") return created;

    const nodeId = created.nodeId;
    const wireErrors: string[] = [];
    let promptNodeId: string | undefined;
    const promptText = input.promptText?.trim();
    if (promptText) {
      const promptNode = addNode(g, "prompt", { label: "Prompt", text: promptText });
      if (promptNode.error || typeof promptNode.nodeId !== "string") {
        wireErrors.push(String(promptNode.error ?? "Could not add the prompt node"));
      } else {
        promptNodeId = promptNode.nodeId;
        const linked = CANVAS_AGENT_TOOL_HANDLERS.connect(g, {
          sourceId: promptNodeId,
          targetId: nodeId,
          targetPort: "prompt",
        });
        if (linked.error) wireErrors.push(String(linked.error));
      }
    }
    for (const wire of input.wires ?? []) {
      const linked = CANVAS_AGENT_TOOL_HANDLERS.connect(g, {
        sourceId: wire.sourceId,
        targetId: nodeId,
        targetPort: wire.targetPort,
      });
      if (linked.error) wireErrors.push(String(linked.error));
    }

    return {
      ok: true,
      nodeId,
      ...(promptNodeId ? { promptNodeId } : {}),
      ...(wireErrors.length > 0
        ? {
            error: `Node ${nodeId} exists. Wires failed: ${wireErrors.join(" | ")}. Use connect to fix those wires. Do not add this node again.`,
          }
        : {}),
    };
  },

  add_media_node(g: CanvasAgentWorkingGraph, input: { assetId: string }): CanvasAgentToolResult {
    const asset = g.assets.find((a) => a.id === input.assetId);
    if (!asset) return { error: `Unknown asset "${input.assetId}". Call list_assets first.` };
    const draft = libraryAssetNodeDraft(asset);
    return addNode(g, draft.type, draft.data);
  },

  add_scro_group(g: CanvasAgentWorkingGraph, input: ScroGroupToolInput): CanvasAgentToolResult {
    const aspect = input.aspectRatio ?? "9:16";
    const text = input.prompt?.trim() ?? "";

    if (input.tool === "talking-head") {
      if (!text) return { error: "talking-head needs the script in \"prompt\"." };
      if (!input.characterId) return { error: "talking-head needs characterId from list_assets().characters." };
      if (!g.characters.some((c) => c.id === input.characterId)) {
        return { error: `Unknown characterId "${input.characterId}". Call list_assets() and use an exact id.` };
      }
      // Planning card: the canvas plans it for free right after this turn, then expands it.
      const created = addNode(g, "model", {
        modelId: "scro:talking-head",
        aspectRatio: aspect,
        prompt: text,
        toolParams: {
          plannerMode: true,
          characterId: input.characterId,
          language: input.language ?? "yue",
          framing: input.framing ?? "collarbone-close",
        },
        status: "idle",
      });
      return created;
    }

    if (input.tool === "swap" || input.tool === "teleport") {
      // Director card: the user presses Build on the canvas to expand trim → render → grade.
      if (!input.videoNodeId && !input.videoAssetId) {
        return { error: `${input.tool} needs videoNodeId or videoAssetId.` };
      }
      for (const assetId of [input.videoAssetId, input.referenceAssetId, input.sceneAssetId]) {
        if (assetId && !g.assets.some((asset) => asset.id === assetId)) {
          return { error: `Unknown asset "${assetId}".` };
        }
      }
      const mode = input.mode ?? "character";
      if (input.tool === "swap" && mode === "character" && !input.characterId && !input.referenceAssetId) {
        return { error: "swap in character mode needs characterId or referenceAssetId." };
      }
      if (input.tool === "swap" && mode === "object" && !text) {
        return { error: 'swap in object mode needs what to change into in "prompt".' };
      }
      if (input.tool === "teleport" && !input.sceneNodeId && !input.sceneAssetId && !input.sceneText?.trim()) {
        return { error: "teleport needs sceneNodeId, sceneAssetId, or sceneText." };
      }
      if (input.characterId && !g.characters.some((c) => c.id === input.characterId)) {
        return { error: `Unknown characterId "${input.characterId}". Call list_assets() and use an exact id.` };
      }
      const created = addNode(g, "model", {
        modelId: input.tool === "swap" ? "scro:swap" : "scro:teleport",
        aspectRatio: aspect,
        prompt: text,
        status: "idle",
        toolParams: {
          directorMode: true,
          sectionStart: input.sectionStart ?? 0,
          sectionLength: input.sectionLength ?? 6,
          ...(input.tool === "swap"
            ? {
                swapMode: mode,
                ...(input.characterId ? { characterId: input.characterId } : {}),
                ...(input.objectTarget ? { objectTarget: input.objectTarget } : {}),
                ...(input.objectEditMode ? { objectEditMode: input.objectEditMode } : {}),
                ...(input.lightLookId ? { lightLookId: input.lightLookId } : {}),
              }
            : { sceneText: input.sceneText?.trim() ?? "" }),
        },
      });
      if (created.error || typeof created.nodeId !== "string") return created;
      const targetId = created.nodeId;
      const wireErrors: string[] = [];
      const connectTo = (sourceId: string, targetPort: string) => {
        const linked = CANVAS_AGENT_TOOL_HANDLERS.connect(g, { sourceId, targetId, targetPort });
        if (linked.error) wireErrors.push(String(linked.error));
      };
      const connectAsset = (assetId: string, targetPort: string) => {
        const existing = g.nodes.find((n) => n.type === "character" && n.data.characterId === assetId);
        if (existing) {
          connectTo(existing.id, targetPort);
          return;
        }
        const media = CANVAS_AGENT_TOOL_HANDLERS.add_media_node(g, { assetId });
        if (media.error || typeof media.nodeId !== "string") {
          wireErrors.push(String(media.error ?? `Could not add asset "${assetId}"`));
          return;
        }
        connectTo(media.nodeId, targetPort);
      };
      if (input.videoNodeId) connectTo(input.videoNodeId, "video");
      else if (input.videoAssetId) connectAsset(input.videoAssetId, "video");
      if (input.tool === "swap") {
        if (input.referenceAssetId) connectAsset(input.referenceAssetId, "refImages");
        else if (input.characterId) connectAsset(input.characterId, "refImages");
      } else if (input.sceneNodeId) connectTo(input.sceneNodeId, "image");
      else if (input.sceneAssetId) connectAsset(input.sceneAssetId, "image");
      if (wireErrors.length > 0) {
        return { ...created, error: `Node ${targetId} exists. Wires failed: ${wireErrors.join(" | ")}` };
      }
      return created;
    }

    const built = buildAgentScroGroup(g, input, aspect, text);
    if ("error" in built) return { error: built.error };
    const group = built.group;
    if (g.addedNodes + group.nodes.length > CANVAS_AGENT_MAX_ADDED_NODES) {
      return {
        error: `This group adds ${group.nodes.length} nodes, over the limit of ${CANVAS_AGENT_MAX_ADDED_NODES} new nodes per message.`,
      };
    }
    for (const node of group.nodes) {
      g.nodes.push(node);
      g.ops.push({ kind: "add_node", node });
    }
    g.addedNodes += group.nodes.length;
    for (const edge of group.edges) {
      g.edges.push(edge);
      g.ops.push({ kind: "add_edge", edge });
    }
    const frame: CanvasGroup = {
      id: group.groupId,
      title: defaultGroupTitle(input.tool),
      color: defaultGroupColor(input.tool),
      kind: input.tool,
      memberIds: group.nodes.map((n) => n.id),
      params: { aspectRatio: aspect, ...(input.characterId ? { characterId: input.characterId } : {}) },
    };
    g.groups = withGroup(g.groups, frame);
    g.ops.push({ kind: "add_group", group: frame });
    return {
      ok: true,
      groupId: frame.id,
      nodeIds: group.nodes.map((n) => n.id),
      outputNodeId: group.outputNodeId,
    };
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
      sourceHandle: directorSource && input.sourcePort ? input.sourcePort : "output",
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

// AI SDK tool set bound to one working graph.
export function buildCanvasAgentTools(g: CanvasAgentWorkingGraph): ToolSet {
  const H = CANVAS_AGENT_TOOL_HANDLERS;
  return {
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
          .array(z.object({ sourceId: z.string(), targetPort: z.string() }))
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
        sourcePort: z.string().optional().describe("Only for an Explainer Director's clip outputs."),
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
