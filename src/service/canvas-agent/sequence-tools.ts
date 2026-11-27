// Canvas agent tools for the `ffmpeg:sequence` timeline: build one from clips or from a concat
// chain, and replace its tracks. Items that name a source not yet wired get wired here.

import { z } from "zod";
import type { CanvasNode } from "@/model/canvas";
import {
  canvasSequenceSchema,
  SEQUENCE_ASPECTS,
  SEQUENCE_LIMITS,
  SEQUENCE_MODEL_ID,
  SEQUENCE_RESOLUTIONS,
  SEQUENCE_TEXT_COLORS,
  SEQUENCE_TRANSITIONS,
  type CanvasSequence,
} from "@/model/canvas-sequence";
import { SUBTITLE_LOOK_IDS } from "@/model/subtitle-look-id";
import {
  applyConcatToSequence,
  planConcatToSequence,
  readSequence,
  SEQUENCE_PORTS,
  sequenceItemId,
  syncSequenceWithEdges,
} from "@/service/canvas/core/sequence";
import { isPlanDirectorNode } from "@/service/canvas/directors/explainer-director";
import { switchDirectorClipJoin } from "@/service/canvas/directors/director-clip-join";
import { CLIP_JOIN_MODES, CLIP_JOIN_PARAM } from "@/service/canvas/scro-groups/clip-join";
import type { EditToolHandlers } from "@/service/canvas-agent/edit-tools";
import { describeSequence } from "@/service/canvas-agent/sequence-describe";
import { COLUMN_GAP, markStale, type CanvasAgentToolResult, type CanvasAgentWorkingGraph } from "@/service/canvas-agent/working-graph";

const sourceRef = z
  .string()
  .describe('A wired edge id, or a source "nodeId" / "nodeId:video-b". Sources not wired yet are wired automatically.');

const clipSchema = z.object({
  source: sourceRef,
  inSec: z.number().min(0).optional(),
  outSec: z.number().min(0).optional().describe("Omit to play to the end of the source."),
  speed: z.number().min(0.25).max(4).optional(),
  muted: z.boolean().optional(),
  transition: z.enum(SEQUENCE_TRANSITIONS).optional().describe("Join into this clip from the previous one. Default cut."),
  transitionSec: z.number().min(0.1).max(2).optional(),
});

const layerSchema = z.object({
  kind: z.enum(["text", "image", "video"]),
  text: z.string().max(300).optional(),
  source: sourceRef.optional().describe("Image or video layer source (wired to refImages / videos)."),
  startSec: z.number().min(0).optional(),
  endSec: z.number().min(0).optional(),
  position: z.enum(["top", "center", "bottom"]).optional(),
  sizePct: z.number().min(2).max(15).optional(),
  color: z.enum(SEQUENCE_TEXT_COLORS).optional(),
  box: z.boolean().optional(),
  x: z.number().min(0).max(100).optional().describe("Image / video layer left edge, % of width."),
  y: z.number().min(0).max(100).optional(),
  scalePct: z.number().min(5).max(100).optional(),
  opacity: z.number().min(0.05).max(1).optional(),
});

const audioSchema = z.object({
  source: sourceRef,
  startSec: z.number().min(0).optional(),
  inSec: z.number().min(0).optional(),
  outSec: z.number().min(0).optional(),
  gainDb: z.number().min(-40).max(12).optional(),
  fadeInSec: z.number().min(0).max(10).optional(),
  fadeOutSec: z.number().min(0).max(10).optional(),
  duck: z.boolean().optional().describe("Lower this audio under the clips' own sound."),
  loop: z.boolean().optional(),
});

const settingsSchema = {
  aspectRatio: z.enum(SEQUENCE_ASPECTS).optional(),
  resolution: z.enum(SEQUENCE_RESOLUTIONS).optional(),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).optional(),
};

export const SEQUENCE_TOOL_SCHEMAS = {
  set_director_finish: z.object({
    directorId: z.string().describe("An Explainer Director or Talking Head Director node."),
    finishWith: z.enum(CLIP_JOIN_MODES),
  }),
  build_sequence: z.object({
    fromConcatId: z.string().optional().describe("Replace this ffmpeg:concat (and concats feeding only it) with a Sequence."),
    clips: z.array(clipSchema).max(SEQUENCE_LIMITS.videoClips).optional().describe("Or build from these sources, in play order."),
    ...settingsSchema,
  }),
  update_sequence: z.object({
    nodeId: z.string(),
    ...settingsSchema,
    clips: z.array(clipSchema).max(SEQUENCE_LIMITS.videoClips).optional().describe("Replaces the video track; wires for clips left out are removed."),
    layers: z.array(layerSchema).max(SEQUENCE_LIMITS.overlays).optional().describe("Replaces every text / image / video layer."),
    audio: z.array(audioSchema).max(SEQUENCE_LIMITS.audioItems).optional().describe("Replaces every music / voice item."),
    captions: z
      .object({ look: z.enum(SUBTITLE_LOOK_IDS).optional(), position: z.enum(["bottom", "middle", "top"]).optional() })
      .optional()
      .describe("Caption look; the SRT text comes from a node wired to the prompt port."),
  }),
};

type In<K extends keyof typeof SEQUENCE_TOOL_SCHEMAS> = z.infer<(typeof SEQUENCE_TOOL_SCHEMAS)[K]>;

// Finds the wire behind a ref on one port, wiring the source when it is not wired yet.
function resolveRef(
  g: CanvasAgentWorkingGraph,
  h: EditToolHandlers,
  nodeId: string,
  port: string,
  ref: string,
  taken: Set<string>,
): { edgeId: string } | { error: string } {
  const onPort = g.edges.filter((e) => e.target === nodeId && e.targetHandle === port && !taken.has(e.id));
  const byId = onPort.find((e) => e.id === ref);
  if (byId) return { edgeId: byId.id };
  const [sourceId, handle] = ref.split(":");
  const bySource = onPort.find((e) => e.source === sourceId && (handle === undefined || (e.sourceHandle || "output") === handle));
  if (bySource) return { edgeId: bySource.id };
  if (!g.nodes.some((n) => n.id === sourceId)) return { error: `"${ref}" is neither a wire into ${nodeId}.${port} nor a node.` };
  const linked = h.connect(g, { sourceId: sourceId!, ...(handle ? { sourcePort: handle } : {}), targetId: nodeId, targetPort: port });
  return typeof linked.edgeId === "string" ? { edgeId: linked.edgeId } : { error: String(linked.error ?? `Could not wire "${ref}".`) };
}

// Writes the document onto the node (bypassing the toolParams allowlist, which has no `sequence`).
function writeSequence(g: CanvasAgentWorkingGraph, node: CanvasNode, seq: CanvasSequence) {
  const toolParams = { ...(node.data.toolParams ?? {}), sequence: seq };
  node.data = { ...node.data, toolParams };
  g.ops.push({ kind: "update_node", nodeId: node.id, patch: { toolParams } });
  markStale(g, [node.id]);
}

function buildSequence(g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"build_sequence">): CanvasAgentToolResult {
  const settings = { aspectRatio: input.aspectRatio, resolution: input.resolution, fps: input.fps };
  if (input.fromConcatId) {
    const plan = planConcatToSequence(g, input.fromConcatId);
    if ("error" in plan) return plan;
    const nodeId = `model-${g.nextId()}`;
    const next = applyConcatToSequence(g, plan, { nodeId, edgeId: () => `e-${g.nextId()}` });
    const keep = new Set(next.edges.map((e) => e.id));
    for (const e of g.edges) if (!keep.has(e.id)) g.ops.push({ kind: "remove_edge", edgeId: e.id });
    for (const id of plan.absorbedIds) g.ops.push({ kind: "remove_node", nodeId: id });
    const node = next.nodes.find((n) => n.id === nodeId)!;
    const seq = readSequence(node.data.toolParams);
    node.data = { ...node.data, toolParams: { sequence: { ...seq, ...defined(settings) } } };
    g.ops.push({ kind: "add_node", node });
    const old = new Set(g.edges.map((e) => e.id));
    for (const e of next.edges) if (!old.has(e.id)) g.ops.push({ kind: "add_edge", edge: e });
    g.nodes = next.nodes;
    g.edges = next.edges;
    if (next.groups) g.groups = next.groups;
    g.addedNodes += 1;
    return { ok: true, nodeId, replaced: plan.absorbedIds, timeline: describeSequence(g, nodeId) };
  }
  if (!input.clips?.length) return { error: "Pass fromConcatId or at least one clip." };
  const created = h.add_model_node(g, { modelId: SEQUENCE_MODEL_ID });
  if (typeof created.nodeId !== "string") return created;
  const anchor = g.nodes.find((n) => n.id === input.clips![0]!.source.split(":")[0]);
  const node = g.nodes.find((n) => n.id === created.nodeId)!;
  if (anchor) {
    const position = { x: anchor.position.x + COLUMN_GAP, y: anchor.position.y };
    node.position = position;
    g.ops.push({ kind: "move_node", nodeId: node.id, position });
  }
  return updateSequence(g, h, { nodeId: node.id, ...settings, clips: input.clips });
}

function defined<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function updateSequence(
  g: CanvasAgentWorkingGraph,
  h: EditToolHandlers,
  input: In<"update_sequence">,
): CanvasAgentToolResult {
  const node = g.nodes.find((n) => n.id === input.nodeId);
  if (!node || node.data.modelId !== SEQUENCE_MODEL_ID) return { error: `"${input.nodeId}" is not an ${SEQUENCE_MODEL_ID} node.` };
  const current = syncSequenceWithEdges(readSequence(node.data.toolParams), node.id, g.edges);
  const draft: Record<string, unknown> = {
    ...current,
    ...defined({ aspectRatio: input.aspectRatio, resolution: input.resolution, fps: input.fps }),
    tracks: { ...current.tracks },
  };
  const tracks = draft.tracks as Record<string, unknown>;
  const errors: string[] = [];

  if (input.clips) {
    const taken = new Set<string>();
    const clips = [];
    for (const [i, c] of input.clips.entries()) {
      const ref = resolveRef(g, h, node.id, SEQUENCE_PORTS.video, c.source, taken);
      if ("error" in ref) {
        errors.push(`clip ${i + 1}: ${ref.error}`);
        continue;
      }
      taken.add(ref.edgeId);
      clips.push({
        id: current.tracks.video.find((x) => x.ref === ref.edgeId)?.id ?? sequenceItemId("clip"),
        ref: ref.edgeId,
        inSec: c.inSec ?? 0,
        ...defined({ outSec: c.outSec, muted: c.muted }),
        speed: c.speed ?? 1,
        ...(i > 0 && c.transition && c.transition !== "cut"
          ? { transitionIn: { effect: c.transition, durationSec: c.transitionSec ?? 0.5 } }
          : {}),
      });
    }
    // Clips left out lose their wire, so the next sync does not add them back.
    for (const e of g.edges.filter((x) => x.target === node.id && x.targetHandle === SEQUENCE_PORTS.video && !taken.has(x.id))) {
      const usedAsLayer = input.layers?.some((l) => l.source === e.id || l.source === e.source) ??
        current.tracks.overlay.some((l) => l.ref === e.id);
      if (!usedAsLayer) h.disconnect(g, { edgeId: e.id });
    }
    tracks.video = clips;
  }

  if (input.layers) {
    const taken = new Set<string>();
    tracks.overlay = input.layers.flatMap((l, i) => {
      let ref: string | undefined;
      if (l.kind !== "text") {
        if (!l.source) {
          errors.push(`layer ${i + 1}: an ${l.kind} layer needs a source.`);
          return [];
        }
        const port = l.kind === "image" ? SEQUENCE_PORTS.image : SEQUENCE_PORTS.video;
        const r = resolveRef(g, h, node.id, port, l.source, taken);
        if ("error" in r) {
          errors.push(`layer ${i + 1}: ${r.error}`);
          return [];
        }
        ref = r.edgeId;
        taken.add(ref);
      } else if (!l.text?.trim()) {
        errors.push(`layer ${i + 1}: a text layer needs text.`);
        return [];
      }
      const { source: _source, ...rest } = l;
      void _source;
      return [{ id: sequenceItemId(l.kind), ...defined(rest), ...(ref ? { ref } : {}) }];
    });
  }

  if (input.audio) {
    const taken = new Set<string>();
    tracks.audio = input.audio.flatMap((a, i) => {
      const r = resolveRef(g, h, node.id, SEQUENCE_PORTS.audio, a.source, taken);
      if ("error" in r) {
        errors.push(`audio ${i + 1}: ${r.error}`);
        return [];
      }
      taken.add(r.edgeId);
      const { source: _source, ...rest } = a;
      void _source;
      return [{ id: current.tracks.audio.find((x) => x.ref === r.edgeId)?.id ?? sequenceItemId("audio"), ref: r.edgeId, ...defined(rest) }];
    });
    for (const e of g.edges.filter((x) => x.target === node.id && x.targetHandle === SEQUENCE_PORTS.audio && !taken.has(x.id))) {
      h.disconnect(g, { edgeId: e.id });
    }
  }

  if (input.captions) {
    tracks.captions = { look: "clean", position: "bottom", ...current.tracks.captions, ...defined(input.captions) };
  }

  const parsed = canvasSequenceSchema.safeParse(draft);
  if (!parsed.success) return { error: `Invalid timeline: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` };
  // Keep `src` on every wired item so a recreated wire rebinds.
  const seq = syncSequenceWithEdges(parsed.data, node.id, g.edges);
  writeSequence(g, node, seq);
  return {
    ok: true,
    nodeId: node.id,
    timeline: describeSequence(g, node.id),
    ...(errors.length ? { error: errors.join(" | ") } : {}),
  };
}

// Director finish: sets the param, and on built rows swaps the join nodes in place.
function setDirectorFinish(g: CanvasAgentWorkingGraph, input: In<"set_director_finish">): CanvasAgentToolResult {
  const director = g.nodes.find((n) => n.id === input.directorId);
  if (!director || !isPlanDirectorNode(director)) return { error: `${input.directorId} is not an Explainer or Talking Head Director.` };
  const next = switchDirectorClipJoin(g, director.id, input.finishWith);
  if (!next) {
    const toolParams = { ...(director.data.toolParams ?? {}), [CLIP_JOIN_PARAM]: input.finishWith };
    director.data = { ...director.data, toolParams };
    g.ops.push({ kind: "update_node", nodeId: director.id, patch: { toolParams } });
    return { ok: true, directorId: director.id, finishWith: input.finishWith, note: "Applies when the rows are built." };
  }
  const keep = new Set(next.edges.map((e) => e.id));
  for (const e of g.edges) if (!keep.has(e.id)) g.ops.push({ kind: "remove_edge", edgeId: e.id });
  for (const id of next.removedIds) g.ops.push({ kind: "remove_node", nodeId: id });
  const toolParams = next.nodes.find((n) => n.id === director.id)!.data.toolParams;
  g.ops.push({ kind: "update_node", nodeId: director.id, patch: { toolParams } });
  for (const node of next.nodes.filter((n) => next.addedIds.includes(n.id))) g.ops.push({ kind: "add_node", node });
  const old = new Set(g.edges.map((e) => e.id));
  for (const e of next.edges) if (!old.has(e.id)) g.ops.push({ kind: "add_edge", edge: e });
  g.nodes = next.nodes;
  g.edges = next.edges;
  g.groups = next.groups;
  g.addedNodes += next.addedIds.length;
  markStale(g, next.addedIds);
  return {
    ok: true,
    directorId: director.id,
    finishWith: input.finishWith,
    outputId: next.outputId,
    replaced: next.removedIds,
    ...(input.finishWith === "sequence" ? { timeline: describeSequence(g, next.outputId) } : {}),
  };
}

export const SEQUENCE_TOOL_HANDLERS = {
  set_director_finish: (g: CanvasAgentWorkingGraph, _h: EditToolHandlers, input: In<"set_director_finish">) =>
    setDirectorFinish(g, input),
  build_sequence: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"build_sequence">) => buildSequence(g, h, input),
  update_sequence: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"update_sequence">) => updateSequence(g, h, input),
};

export const SEQUENCE_TOOL_DESCRIPTIONS: Record<keyof typeof SEQUENCE_TOOL_SCHEMAS, string> = {
  set_director_finish:
    "Choose how an Explainer / Talking Head Director joins its clips: \"concat\" (FFmpeg Concat chain, default) or \"sequence\" (one ffmpeg:sequence timeline, fewer nodes, editable with update_sequence). On built rows it swaps the join nodes in place; no Replan, nothing runs.",
  build_sequence:
    "Create an ffmpeg:sequence timeline (one node, rendered in one FFmpeg run) from clips in play order, or convert an existing ffmpeg:concat chain with fromConcatId. Prefer it when the user wants several edits together: titles, logos, music, transitions, captions.",
  update_sequence:
    "Edit an ffmpeg:sequence: settings, and any of clips / layers / audio (each list replaces that track; sources not wired yet are wired). Read the returned timeline and fix any issues it lists.",
};
