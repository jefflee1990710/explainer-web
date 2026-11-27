// Higher-level edit tools for the canvas agent. Each inserts FFmpeg nodes right after a source
// and moves the source's downstream wires onto the new node, so "trim clip 2" edits the chain
// in place instead of leaving a dangling branch. Nothing runs or bills here.

import { z } from "zod";
import type { CanvasEdge } from "@/model/canvas";
import type { CanvasModelSpec } from "@/model/canvas-model";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { getNodeOutputPortType, validateEdgeConnection } from "@/service/canvas/core/graph";
import { SPLIT_SECOND_HANDLE } from "@/service/canvas/core/extra-outputs";
import {
  COLUMN_GAP,
  markStale,
  type CanvasAgentToolResult,
  type CanvasAgentWorkingGraph,
} from "@/service/canvas-agent/working-graph";
import type { AddModelNodeInput } from "@/service/canvas-agent/model-node-tool";

export type EditToolHandlers = {
  add_model_node: (g: CanvasAgentWorkingGraph, input: AddModelNodeInput) => CanvasAgentToolResult;
  add_media_node: (g: CanvasAgentWorkingGraph, input: { assetId: string }) => CanvasAgentToolResult;
  connect: (
    g: CanvasAgentWorkingGraph,
    input: { sourceId: string; sourcePort?: string; targetId: string; targetPort: string },
  ) => CanvasAgentToolResult;
};

type Source = { sourceId: string; sourcePort?: string };
type Handle = { source: string; sourceHandle: string };

const handleOf = (port?: string) => port || "output";

// Rebuilds one input port's edges in the given order (the client appends, so order needs a rebuild).
function rebuildPort(g: CanvasAgentWorkingGraph, targetId: string, port: string, sources: Handle[]): string | undefined {
  const old = g.edges.filter((e) => e.target === targetId && e.targetHandle === port);
  g.edges = g.edges.filter((e) => !old.includes(e));
  for (const e of old) g.ops.push({ kind: "remove_edge", edgeId: e.id });
  for (const s of sources) {
    const candidate = { source: s.source, sourceHandle: s.sourceHandle, target: targetId, targetHandle: port };
    const check = validateEdgeConnection(g.nodes, g.edges, candidate, g.catalog);
    if (!check.valid) return check.reason;
    const edge: CanvasEdge = { id: `e-${g.nextId()}`, ...candidate };
    g.edges.push(edge);
    g.ops.push({ kind: "add_edge", edge });
  }
  markStale(g, [targetId]);
  return undefined;
}

// Moves every wire leaving `from` onto `replacements`, keeping each port's clip order.
// Multi-input ports take every replacement; single ports take the first.
function rewireDownstream(g: CanvasAgentWorkingGraph, from: Handle, replacements: Handle[], skipTarget: string): string[] {
  const errors: string[] = [];
  const outgoing = g.edges.filter(
    (e) => e.source === from.source && handleOf(e.sourceHandle) === from.sourceHandle && e.target !== skipTarget,
  );
  const ports = new Map<string, { targetId: string; port: string }>();
  for (const e of outgoing) ports.set(`${e.target}|${e.targetHandle}`, { targetId: e.target, port: e.targetHandle ?? "" });
  for (const { targetId, port } of ports.values()) {
    const target = g.nodes.find((n) => n.id === targetId);
    const spec = target?.data.modelId ? findCanvasModel(target.data.modelId, g.catalog) : undefined;
    const multiple = Boolean(spec?.inputs.find((p) => p.id === port)?.multiple);
    const next = g.edges
      .filter((e) => e.target === targetId && e.targetHandle === port)
      .flatMap((e): Handle[] =>
        e.source === from.source && handleOf(e.sourceHandle) === from.sourceHandle
          ? multiple
            ? replacements
            : replacements.slice(0, 1)
          : [{ source: e.source, sourceHandle: handleOf(e.sourceHandle) }],
      );
    const error = rebuildPort(g, targetId, port, next);
    if (error) errors.push(`${targetId}.${port}: ${error}`);
  }
  return errors;
}

// First input port of the spec that takes the source's output type.
function inputPortFor(spec: CanvasModelSpec, type: string): string | undefined {
  return spec.inputs.find((p) => p.type === type && p.id !== "prompt")?.id;
}

function placeRightOf(g: CanvasAgentWorkingGraph, nodeId: string, anchorId: string, row = 0) {
  const anchor = g.nodes.find((n) => n.id === anchorId);
  const node = g.nodes.find((n) => n.id === nodeId);
  if (!anchor || !node) return;
  const position = { x: anchor.position.x + COLUMN_GAP, y: anchor.position.y + row * 260 };
  node.position = position;
  g.ops.push({ kind: "move_node", nodeId, position });
}

type InsertInput = Source & {
  modelId: string;
  toolParams?: Record<string, unknown>;
  // false leaves downstream wires alone (export, a side branch).
  rewire?: boolean;
};

export function insertEdit(g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: InsertInput): CanvasAgentToolResult {
  const source = g.nodes.find((n) => n.id === input.sourceId);
  if (!source) return { error: `Node "${input.sourceId}" does not exist.` };
  const sourceHandle = handleOf(input.sourcePort);
  const type = getNodeOutputPortType(source, g.catalog, sourceHandle);
  if (!type) return { error: `Node "${input.sourceId}" has no output "${sourceHandle}".` };
  const spec = findCanvasModel(input.modelId, g.catalog);
  if (!spec || spec.provider !== "ffmpeg") return { error: `"${input.modelId}" is not an FFmpeg edit node.` };
  const port = inputPortFor(spec, type);
  if (!port) return { error: `${spec.name} takes no ${type} input.` };

  const created = h.add_model_node(g, {
    modelId: spec.id,
    toolParams: input.toolParams,
    wires: [{ sourceId: source.id, ...(input.sourcePort ? { sourcePort: input.sourcePort } : {}), targetPort: port }],
  });
  if (typeof created.nodeId !== "string") return created;
  if (created.error) return created;
  const nodeId = created.nodeId;
  placeRightOf(g, nodeId, source.id);

  const outputs: Handle[] = [
    { source: nodeId, sourceHandle: "output" },
    ...(spec.id === "ffmpeg:split" ? [{ source: nodeId, sourceHandle: SPLIT_SECOND_HANDLE }] : []),
  ];
  const errors =
    input.rewire === false || spec.output.type !== type
      ? []
      : rewireDownstream(g, { source: source.id, sourceHandle }, outputs, nodeId);
  return {
    ok: true,
    nodeId,
    ...(spec.id === "ffmpeg:split" ? { outputs: ["output (part A)", `${SPLIT_SECOND_HANDLE} (part B)`] } : {}),
    ...(errors.length ? { error: `Node ${nodeId} was added but some downstream wires failed: ${errors.join(" | ")}` } : {}),
  };
}

// Reorders a join node's clips. `order` lists edge ids or source ids ("node" or "node:video-b").
export function reorderClips(g: CanvasAgentWorkingGraph, input: { nodeId: string; order: string[] }): CanvasAgentToolResult {
  const node = g.nodes.find((n) => n.id === input.nodeId);
  const port = node?.data.modelId === "ffmpeg:audio-concat" ? "audios" : node?.data.modelId === "ffmpeg:concat" ? "videos" : undefined;
  if (!node || !port) return { error: `"${input.nodeId}" is not an ffmpeg:concat or ffmpeg:audio-concat node.` };
  const current = g.edges.filter((e) => e.target === node.id && e.targetHandle === port);
  const remaining = [...current];
  const picked: CanvasEdge[] = [];
  for (const ref of input.order) {
    const [sourceId, handle] = ref.split(":");
    const i = remaining.findIndex(
      (e) => e.id === ref || (e.source === sourceId && (handle === undefined || handleOf(e.sourceHandle) === handle)),
    );
    if (i < 0) return { error: `"${ref}" is not wired into ${node.id}.${port}.` };
    picked.push(...remaining.splice(i, 1));
  }
  const ordered = [...picked, ...remaining];
  const error = rebuildPort(
    g,
    node.id,
    port,
    ordered.map((e) => ({ source: e.source, sourceHandle: handleOf(e.sourceHandle) })),
  );
  return error ? { error } : { ok: true, order: ordered.map((e) => `${e.source}${e.sourceHandle && e.sourceHandle !== "output" ? `:${e.sourceHandle}` : ""}`) };
}

// Music from a canvas node or a library asset, mixed under the video.
export function addBgm(
  g: CanvasAgentWorkingGraph,
  h: EditToolHandlers,
  input: Source & { musicNodeId?: string; musicAssetId?: string; toolParams?: Record<string, unknown> },
): CanvasAgentToolResult {
  let musicId = input.musicNodeId;
  if (!musicId && input.musicAssetId) {
    const media = h.add_media_node(g, { assetId: input.musicAssetId });
    if (typeof media.nodeId !== "string") return media;
    musicId = media.nodeId;
  }
  if (!musicId) return { error: "Pass musicNodeId (an audio node on the canvas) or musicAssetId from list_assets." };
  const inserted = insertEdit(g, h, { ...input, modelId: "ffmpeg:audio-mix" });
  if (typeof inserted.nodeId !== "string") return inserted;
  const linked = h.connect(g, { sourceId: musicId, targetId: inserted.nodeId, targetPort: "refAudio" });
  if (linked.error) return { ...inserted, error: `Music not wired: ${String(linked.error)}` };
  if (input.musicAssetId) placeRightOf(g, musicId, input.sourceId, 1);
  return inserted;
}

// Auto Captions ($0.20 per hour of speech when run) feeding a burn-subtitles node after the source.
export function addCaptions(
  g: CanvasAgentWorkingGraph,
  h: EditToolHandlers,
  input: Source & { language?: "yue" | "zh" | "en" | "auto"; toolParams?: Record<string, unknown> },
): CanvasAgentToolResult {
  const burn = insertEdit(g, h, { ...input, modelId: "ffmpeg:burn-subtitles" });
  if (typeof burn.nodeId !== "string") return burn;
  const captions = h.add_model_node(g, {
    modelId: "scro:auto-captions",
    ...(input.language ? { toolParams: { captionLanguage: input.language } } : {}),
    wires: [{ sourceId: input.sourceId, ...(input.sourcePort ? { sourcePort: input.sourcePort } : {}), targetPort: "video" }],
  });
  if (typeof captions.nodeId !== "string") return { ...burn, error: String(captions.error ?? "Auto Captions not added") };
  const captionsId = captions.nodeId;
  if (input.language) {
    // The card shows presetId; the provider reads captionLanguage first.
    const node = g.nodes.find((n) => n.id === captionsId);
    if (node) {
      node.data = { ...node.data, presetId: input.language };
      g.ops.push({ kind: "update_node", nodeId: captionsId, patch: { presetId: input.language } });
    }
  }
  placeRightOf(g, captionsId, input.sourceId, 1);
  const linked = h.connect(g, { sourceId: captionsId, targetId: burn.nodeId, targetPort: "prompt" });
  return {
    ...burn,
    captionsNodeId: captionsId,
    note: "Auto Captions costs $0.20 per hour of speech when run; the user can edit the SRT before burning.",
    ...(linked.error ? { error: String(linked.error) } : {}),
  };
}

const source = {
  sourceId: z.string().describe("Node whose output is edited (a video model, media node, or another edit node)."),
  sourcePort: z.string().optional().describe('Only for a named extra output, e.g. "video-b" of ffmpeg:split.'),
};
const params = z.record(z.string(), z.unknown());

export const EDIT_TOOL_SCHEMAS = {
  insert_edit: z.object({
    ...source,
    modelId: z.string().describe("Any ffmpeg:* id from the edit catalog."),
    toolParams: params.optional(),
    rewire: z.boolean().optional().describe("Default true: downstream wires move onto the new node."),
  }),
  trim_clip: z.object({
    ...source,
    startSec: z.number().min(0),
    endSec: z.number().min(0).optional().describe("Omit to keep to the end."),
    speed: z.number().min(0.25).max(4).optional(),
    reverse: z.boolean().optional(),
  }),
  cut_ranges: z.object({
    ...source,
    ranges: z.string().describe('Seconds, e.g. "0-3, 8-12" or "0:08-0:12".'),
    mode: z.enum(["keep", "remove"]).describe("keep = keep only these; remove = cut these out."),
  }),
  split_clip: z.object({ ...source, atSec: z.number().positive() }),
  reorder_clips: z.object({
    nodeId: z.string().describe("ffmpeg:concat or ffmpeg:audio-concat node."),
    order: z.array(z.string()).min(1).describe('Edge ids or source ids ("node" or "node:video-b"), first clip first; unlisted clips keep their order after them.'),
  }),
  add_bgm: z.object({
    ...source,
    musicNodeId: z.string().optional(),
    musicAssetId: z.string().optional(),
    volumeDb: z.number().min(-40).max(6).optional().describe("Default -18."),
    startSec: z.number().min(0).optional(),
    loop: z.boolean().optional(),
    fadeOutSec: z.number().min(0).max(10).optional(),
    duck: z.boolean().optional().describe("Lower the music under speech. Default true."),
  }),
  add_text: z.object({
    ...source,
    text: z.string().min(1).max(300),
    position: z.enum(["top", "center", "bottom"]).optional(),
    sizePct: z.number().min(2).max(15).optional(),
    color: z.enum(["white", "yellow", "black", "lime", "red"]).optional(),
    box: z.boolean().optional(),
    startSec: z.number().min(0).optional(),
    endSec: z.number().min(0).optional(),
  }),
  add_captions: z.object({
    ...source,
    language: z.enum(["yue", "zh", "en", "auto"]).optional(),
    look: z.string().optional().describe("subtitleLook id, e.g. clean, bold, neon."),
    position: z.enum(["bottom", "middle", "top"]).optional(),
  }),
  export_video: z.object({
    ...source,
    format: z.enum(["mp4", "webm", "gif"]).optional(),
    resolution: z.enum(["source", "720p", "1080p", "4k"]).optional(),
    fps: z.enum(["source", "24", "30", "60"]).optional(),
    quality: z.enum(["high", "standard", "small"]).optional(),
    loudnorm: z.boolean().optional(),
    fileName: z.string().max(60).optional(),
  }),
};

type In<K extends keyof typeof EDIT_TOOL_SCHEMAS> = z.infer<(typeof EDIT_TOOL_SCHEMAS)[K]>;

// Drops unset keys so the node keeps its own defaults.
function defined(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
}

const pick = (input: Source) => ({ sourceId: input.sourceId, sourcePort: input.sourcePort });

export const EDIT_TOOL_HANDLERS = {
  insert_edit: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"insert_edit">) => insertEdit(g, h, input),
  trim_clip: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"trim_clip">) =>
    insertEdit(g, h, {
      ...pick(input),
      modelId: "ffmpeg:trim-speed",
      toolParams: defined({
        ffmpegStartSec: input.startSec,
        ffmpegEndSec: input.endSec,
        ffmpegSpeed: input.speed,
        ffmpegReverse: input.reverse,
      }),
    }),
  cut_ranges: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"cut_ranges">) =>
    insertEdit(g, h, {
      ...pick(input),
      modelId: "ffmpeg:keep-ranges",
      toolParams: { ffmpegRanges: input.ranges, ffmpegRangeMode: input.mode },
    }),
  split_clip: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"split_clip">) =>
    insertEdit(g, h, { ...pick(input), modelId: "ffmpeg:split", toolParams: { ffmpegAtSec: input.atSec } }),
  reorder_clips: (g: CanvasAgentWorkingGraph, _h: EditToolHandlers, input: In<"reorder_clips">) => reorderClips(g, input),
  add_bgm: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"add_bgm">) =>
    addBgm(g, h, {
      ...pick(input),
      musicNodeId: input.musicNodeId,
      musicAssetId: input.musicAssetId,
      toolParams: defined({
        ffmpegBgmVolumeDb: input.volumeDb,
        ffmpegBgmStartSec: input.startSec,
        ffmpegBgmLoop: input.loop,
        ffmpegBgmFadeOutSec: input.fadeOutSec,
        ffmpegBgmDuck: input.duck,
      }),
    }),
  add_text: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"add_text">) =>
    insertEdit(g, h, {
      ...pick(input),
      modelId: "ffmpeg:text",
      toolParams: defined({
        ffmpegText: input.text,
        ffmpegTextPosition: input.position,
        ffmpegTextSizePct: input.sizePct,
        ffmpegTextColor: input.color,
        ffmpegTextBox: input.box,
        ffmpegTextStartSec: input.startSec,
        ffmpegTextEndSec: input.endSec,
      }),
    }),
  add_captions: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"add_captions">) =>
    addCaptions(g, h, {
      ...pick(input),
      language: input.language,
      toolParams: defined({ subtitleLook: input.look, ffmpegSubtitlePosition: input.position }),
    }),
  export_video: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"export_video">) =>
    insertEdit(g, h, {
      ...pick(input),
      modelId: "ffmpeg:export",
      rewire: false,
      toolParams: defined({
        ffmpegFormat: input.format,
        ffmpegResolution: input.resolution,
        ffmpegFps: input.fps,
        ffmpegQuality: input.quality,
        ffmpegLoudnorm: input.loudnorm,
        ffmpegFileName: input.fileName,
      }),
    }),
};

export const EDIT_TOOL_DESCRIPTIONS: Record<keyof typeof EDIT_TOOL_SCHEMAS, string> = {
  insert_edit:
    "Insert any FFmpeg edit node right after a node and move its downstream wires onto the new node (so a clip inside a concat is edited in place).",
  trim_clip: "Trim (and optionally speed up, slow down, or reverse) a clip in place.",
  cut_ranges: "Keep only, or cut out, time ranges of a clip in place.",
  split_clip:
    'Split a clip in two at atSec. In a concat both halves take its slot in order; elsewhere part A replaces it. Part B is sourcePort "video-b".',
  reorder_clips: "Reorder the clips of an ffmpeg:concat (or tracks of an ffmpeg:audio-concat).",
  add_bgm: "Mix background music under a video, ducked under speech by default.",
  add_text: "Draw a title or caption line on a video in place.",
  add_captions:
    "Add Auto Captions ($0.20 per hour of speech when run) and burn them into the video in place. Mention the cost in your reply.",
  export_video: "Add a final export node (format, resolution, fps, quality, loudness, file name) after a video. Does not move wires.",
};
