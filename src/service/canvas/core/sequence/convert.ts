// Pure: turn a chain of ffmpeg:concat nodes (director output) into one ffmpeg:sequence node.
// Nested concats that feed only the chain are absorbed; their clips keep their order and joins.

import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { canvasSequenceSchema, type CanvasSequence, type SequenceClip } from "@/model/canvas-sequence";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { edgeSrc, SEQUENCE_PORTS, sequenceItemId } from "@/service/canvas/core/sequence/document";

type Graph = { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[]; groups?: readonly CanvasGroup[] };

export type ConcatToSequencePlan = {
  // Concat nodes replaced by the sequence (the target first).
  absorbedIds: string[];
  // Leaf sources in play order, with the join that leads into each.
  clips: Array<{ source: string; sourceHandle: string; transitionIn?: SequenceClip["transitionIn"] }>;
  // Wires that left the target concat; they will leave the sequence instead.
  downstream: CanvasEdge[];
  aspectRatio: CanvasSequence["aspectRatio"];
};

const isConcat = (n?: CanvasNode) => n?.type === "model" && n.data.modelId === "ffmpeg:concat";

// The concat's join as a sequence transition (pad-200ms has no timeline twin and becomes a cut).
function joinOf(node: CanvasNode): SequenceClip["transitionIn"] | undefined {
  const t = String(node.data.toolParams?.ffmpegTransition ?? node.data.presetId ?? "pad-200ms");
  if (t === "pad-200ms" || t === "cut") return undefined;
  const raw = Number(node.data.toolParams?.ffmpegTransitionSec ?? 0.35);
  const effect = (["fade", "dissolve", "wipeleft", "wiperight", "slideleft", "slideright"] as const).find((e) => e === t) ?? "fade";
  return { effect, durationSec: Math.min(2, Math.max(0.1, Number.isFinite(raw) ? raw : 0.35)) };
}

export function planConcatToSequence(g: Graph, concatId: string): ConcatToSequencePlan | { error: string } {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const target = byId.get(concatId);
  if (!isConcat(target)) return { error: `"${concatId}" is not an ffmpeg:concat node.` };
  const absorbed: string[] = [];
  const clips: ConcatToSequencePlan["clips"] = [];

  const walk = (id: string) => {
    absorbed.push(id);
    const node = byId.get(id)!;
    const join = joinOf(node);
    const inputs = g.edges.filter((e) => e.target === id && e.targetHandle === "videos");
    inputs.forEach((edge) => {
      const source = byId.get(edge.source);
      const onlyFeedsChain = g.edges.filter((e) => e.source === edge.source).length === 1;
      const first = clips.length === 0;
      if (isConcat(source) && onlyFeedsChain && !absorbed.includes(edge.source)) {
        const before = clips.length;
        walk(edge.source);
        // The join into a nested chain applies to its first clip.
        if (!first && clips[before]) clips[before]!.transitionIn = join;
        return;
      }
      clips.push({ source: edge.source, sourceHandle: edge.sourceHandle || "output", ...(first ? {} : { transitionIn: join }) });
    });
  };
  walk(concatId);
  if (clips.length === 0) return { error: "This concat has no clips wired in." };
  const aspect = String(target!.data.toolParams?.ffmpegAspect ?? "9:16");
  return {
    absorbedIds: absorbed,
    clips,
    downstream: g.edges.filter((e) => e.source === concatId),
    aspectRatio: (["9:16", "16:9", "1:1", "4:5"] as const).find((a) => a === aspect) ?? "9:16",
  };
}

// Applies a plan: one sequence node at the target's place, leaf wires in order, downstream
// rewired, absorbed concats removed (and swapped for the sequence in their group).
export function applyConcatToSequence(
  g: Graph,
  plan: ConcatToSequencePlan,
  ids: { nodeId: string; edgeId: () => string; itemId?: (prefix: string) => string },
): { nodes: CanvasNode[]; edges: CanvasEdge[]; groups?: CanvasGroup[] } {
  const target = g.nodes.find((n) => n.id === plan.absorbedIds[0])!;
  const absorbed = new Set(plan.absorbedIds);
  const newItemId = ids.itemId ?? sequenceItemId;
  const leafEdges: CanvasEdge[] = plan.clips.map((c) => ({
    id: ids.edgeId(),
    source: c.source,
    sourceHandle: c.sourceHandle,
    target: ids.nodeId,
    targetHandle: SEQUENCE_PORTS.video,
  }));
  const sequence = canvasSequenceSchema.parse({
    aspectRatio: plan.aspectRatio,
    tracks: {
      video: plan.clips.map((c, i) => ({
        id: newItemId("clip"),
        ref: leafEdges[i]!.id,
        src: edgeSrc(leafEdges[i]!),
        inSec: 0,
        speed: 1,
        ...(c.transitionIn ? { transitionIn: c.transitionIn } : {}),
      })),
    },
  });
  const node: CanvasNode = {
    id: ids.nodeId,
    type: "model",
    position: target.position,
    data: { modelId: SEQUENCE_MODEL_ID, presetId: "sequence", status: "idle", toolParams: { sequence } },
  };
  const downstream = plan.downstream.map((e) => ({ ...e, id: ids.edgeId(), source: ids.nodeId, sourceHandle: "output" }));
  return {
    nodes: [...g.nodes.filter((n) => !absorbed.has(n.id)), node],
    edges: [...g.edges.filter((e) => !absorbed.has(e.source) && !absorbed.has(e.target)), ...leafEdges, ...downstream],
    ...(g.groups
      ? {
          // A node sits in one group at most: the sequence joins the target's group only.
          groups: g.groups.map((group) =>
            group.memberIds.some((id) => absorbed.has(id))
              ? {
                  ...group,
                  memberIds: [
                    ...group.memberIds.filter((id) => !absorbed.has(id)),
                    ...(group.memberIds.includes(target.id) ? [ids.nodeId] : []),
                  ],
                }
              : group,
          ),
        }
      : {}),
  };
}
