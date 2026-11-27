// The agent's in-memory working graph and the helpers its tools share:
// node placement, tool-param checks, model listing, and the node summaries get_canvas returns.

import type {
  CanvasEdge,
  CanvasGroup,
  CanvasNode,
  CanvasNodeData,
} from "@/model/canvas";
import type { CanvasAgentOp, CanvasAgentQuestion } from "@/model/canvas-agent";
import type {
  CanvasLibraryAsset,
  CanvasLibraryCharacterOption,
} from "@/model/canvas-dto";
import { type CanvasModelSpec, findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import { canvasGroupsForProject } from "@/service/canvas/core/groups";
import { settingsVars } from "@/service/canvas/core/settings/registry";
import { isOutputStale, markStaleOutputs } from "@/service/canvas/core/stale-outputs";
import {
  directorNeedsReplan,
  directorParams,
  directorTextStyle,
  isExplainerDirectorNode,
  readDirectorPlan,
} from "@/service/canvas/directors/explainer-director";
import { isTalkingHeadDirectorNode, talkingHeadDirectorParams } from "@/service/canvas/directors/talking-head-director";
import { SCRO_GROUP_MODEL_IDS } from "@/service/canvas-agent/scro-group-tool";
import {
  STYLE_TRANSFER_IMAGE_MODEL_KEY,
  STYLE_TRANSFER_MODEL_ID,
  styleTransferImageModels,
} from "@/service/canvas/core/style-transfer";

export const CANVAS_AGENT_MAX_ADDED_NODES = 20;
export const CANVAS_AGENT_MAX_QUESTION_OPTIONS = 6;

export const COLUMN_GAP = 400;
export const ROW_GAP = 40;
// Rough card heights so arranged columns do not overlap.
export const NODE_HEIGHT: Record<CanvasNode["type"], number> = {
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

export const EXPLAINER_REQUEST = /explainer|解說|講解|解释|讲解/i;
export const TALKING_HEAD_WORDS = /talking[\s-]?head|口播|對鏡頭|对镜头|on[\s-]camera/i;

const TOOL_PARAMS_ALLOWED_KEYS: Record<string, readonly string[]> = {
  "scro:talking-head": ["characterId", "language", "framing", "styleId"],
  "scro:explainer": ["characterId", "language", "skillSlug", "durationPreset", "styleId", "productId"],
  "scro:swap": ["characterId", "swapMode", "lightLookId", "objectTarget", "objectEditMode", "sectionStart", "sectionLength"],
  "scro:teleport": ["sectionStart", "sectionLength", "sceneText"],
  "scro:life": ["characterId", "poseId"],
  "scro:poster": ["characterId", "productId", "styleId"],
  "scro:tts": ["characterId", "language", "voicePreset", "ttsVoiceId", "ttsSpeed", "ttsConversational"],
  [STYLE_TRANSFER_MODEL_ID]: [STYLE_TRANSFER_IMAGE_MODEL_KEY],
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

export function validateToolParamsForModel(
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
    if (key === STYLE_TRANSFER_IMAGE_MODEL_KEY) {
      const id = typeof val === "string" ? val.trim() : "";
      if (!styleTransferImageModels(g.catalog).some((model) => model.id === id)) {
        return `Invalid toolParams.imageModelId "${String(val)}". Pick an image model that accepts a reference image.`;
      }
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

export function agentModels(g: CanvasAgentWorkingGraph): CanvasModelSpec[] {
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

export function clampDuration(spec: CanvasModelSpec, seconds?: number): number | undefined {
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

export function addNode(
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

export function describeNode(g: CanvasAgentWorkingGraph, node: CanvasNode) {
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
// Handlers that other handlers call to wire what they just added.
export type CanvasAgentLinkHandlers = {
  connect: (
    g: CanvasAgentWorkingGraph,
    input: { sourceId: string; sourcePort?: string; targetId: string; targetPort: string },
  ) => CanvasAgentToolResult;
  add_media_node: (g: CanvasAgentWorkingGraph, input: { assetId: string }) => CanvasAgentToolResult;
};
