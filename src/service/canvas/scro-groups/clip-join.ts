// Pure: how a Director's clip outputs are joined — a chain of FFmpeg Concat nodes, or one Sequence node.

import type { CanvasAspectRatio, CanvasNodeData } from "@/model/canvas";
import { canvasSequenceSchema, SEQUENCE_ASPECTS, SEQUENCE_LIMITS, SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { CONCAT_NODE_DATA, chainConcats } from "@/service/canvas/scro-groups/concat-chain";

export const CLIP_JOIN_MODES = ["concat", "sequence"] as const;
export type ClipJoinMode = (typeof CLIP_JOIN_MODES)[number];

// Director toolParams key; not a plan parameter, so changing it never asks for a Replan.
export const CLIP_JOIN_PARAM = "finishWith";

export function readClipJoin(toolParams: Record<string, unknown> | undefined): ClipJoinMode {
  return toolParams?.[CLIP_JOIN_PARAM] === "sequence" ? "sequence" : "concat";
}

// Same edge id format as the group builders, so the sequence can point at its wires up front.
export const joinEdgeId = (source: string, target: string, handle: string) => `${source}->${target}:${handle}`;

export function sequenceJoinNodeId(idPrefix: string): string {
  return `${idPrefix}-sequence`;
}

// Sequence data with one clip per output, in order, joined by cuts.
export function sequenceJoinData(items: readonly string[], sequenceId: string, aspectRatio: CanvasAspectRatio): CanvasNodeData {
  const aspect = SEQUENCE_ASPECTS.find((a) => a === aspectRatio) ?? "9:16";
  const sequence = canvasSequenceSchema.parse({
    aspectRatio: aspect,
    tracks: {
      video: items.map((source, i) => ({
        id: `clip-${i + 1}`,
        ref: joinEdgeId(source, sequenceId, "videos"),
        src: `${source}:output`,
        inSec: 0,
        speed: 1,
      })),
    },
  });
  return { modelId: SEQUENCE_MODEL_ID, presetId: "sequence", toolParams: { sequence } };
}

// Adds the join nodes through the caller's builder and returns the final output node id.
export function joinClips(
  items: readonly string[],
  input: {
    mode: ClipJoinMode;
    idPrefix: string;
    aspectRatio: CanvasAspectRatio;
    addNode: (suffix: string, data: CanvasNodeData) => string;
    wire: (source: string, target: string, targetHandle: string) => void;
  },
): string {
  // Past the Sequence clip cap, fall back to Concat so no clip is dropped.
  if (input.mode === "sequence" && items.length <= SEQUENCE_LIMITS.videoClips) {
    const id = input.addNode("sequence", sequenceJoinData(items, sequenceJoinNodeId(input.idPrefix), input.aspectRatio));
    for (const item of items) input.wire(item, id, "videos");
    return id;
  }
  return chainConcats(items, (step) => input.addNode(`concat-${step}`, CONCAT_NODE_DATA), input.wire);
}
