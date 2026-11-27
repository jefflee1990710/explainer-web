// Pure: switches a built Director group between a Concat chain and one Sequence node, in place.

import type { CanvasEdge, CanvasGroup, CanvasNode, CanvasNodeData } from "@/model/canvas";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { CONCAT_NODE_DATA } from "@/service/canvas/scro-groups/concat-chain";
import {
  CLIP_JOIN_PARAM,
  joinClips,
  joinEdgeId,
  type ClipJoinMode,
} from "@/service/canvas/scro-groups/clip-join";

// Explainer clips end at audio-mux, Talking Head clips at color-grade.
const CLIP_OUTPUT = /-(mux|grade)-(\d+)$/;
const JOIN_NODE = /-(concat-\d+|sequence)$/;

type Graph = { nodes: CanvasNode[]; edges: CanvasEdge[]; groups: CanvasGroup[] };

export type ClipJoinSwitch = Graph & { addedIds: string[]; removedIds: string[]; outputId: string };

function isJoinNode(node: CanvasNode): boolean {
  return JOIN_NODE.test(node.id) && (node.data.modelId === CONCAT_NODE_DATA.modelId || node.data.modelId === SEQUENCE_MODEL_ID);
}

// Current join of a built group, or undefined while it has no clip rows.
export function builtClipJoin(graph: Pick<Graph, "nodes" | "groups">, directorId: string): ClipJoinMode | undefined {
  const group = graph.groups.find((g) => g.memberIds.includes(directorId));
  if (!group) return undefined;
  const members = graph.nodes.filter((n) => group.memberIds.includes(n.id));
  if (!members.some((n) => CLIP_OUTPUT.test(n.id))) return undefined;
  return members.some((n) => isJoinNode(n) && n.data.modelId === SEQUENCE_MODEL_ID) ? "sequence" : "concat";
}

// Rebuilds only the join nodes; clip rows, their outputs, and wires out of the group stay.
export function switchDirectorClipJoin(graph: Graph, directorId: string, mode: ClipJoinMode): ClipJoinSwitch | null {
  const group = graph.groups.find((g) => g.memberIds.includes(directorId));
  const director = graph.nodes.find((n) => n.id === directorId);
  if (!group || !director) return null;
  const members = new Set(group.memberIds);
  const memberNodes = graph.nodes.filter((n) => members.has(n.id));
  const clipOutputs = memberNodes
    .flatMap((n) => {
      const match = CLIP_OUTPUT.exec(n.id);
      return match ? [{ id: n.id, order: Number(match[2]) }] : [];
    })
    .sort((a, b) => a.order - b.order)
    .map((c) => c.id);
  if (clipOutputs.length === 0 || builtClipJoin(graph, directorId) === mode) return null;

  const joinIds = new Set(memberNodes.filter(isJoinNode).map((n) => n.id));
  // The old output: the join node that feeds no other join node, or the lone clip.
  const oldOutput =
    [...joinIds].find((id) => !graph.edges.some((e) => e.source === id && joinIds.has(e.target))) ?? clipOutputs[0];
  const anchor = graph.nodes.find((n) => n.id === oldOutput)!.position;
  const outbound = graph.edges.filter(
    (e) => e.source === oldOutput && !joinIds.has(e.target) && !(oldOutput === clipOutputs[0] && members.has(e.target)),
  );

  const added: CanvasNode[] = [];
  const addedEdges: CanvasEdge[] = [];
  const takenIds = new Set(graph.nodes.filter((n) => !joinIds.has(n.id)).map((n) => n.id));
  const addNode = (suffix: string, data: CanvasNodeData) => {
    const id = `${group.id}-${suffix}`;
    if (takenIds.has(id)) throw new Error(`Node id ${id} is already on the canvas`);
    const offset = added.length * 340;
    // Fresh output: the join must render again.
    added.push({ id, type: "model", position: { x: anchor.x, y: anchor.y + offset }, data: { ...data, status: "idle" } });
    return id;
  };
  const wire = (source: string, target: string, targetHandle: string) =>
    addedEdges.push({ id: joinEdgeId(source, target, targetHandle), source, sourceHandle: "output", target, targetHandle });

  // A single Talking Head clip needs no Concat.
  const outputId =
    mode === "concat" && clipOutputs.length === 1
      ? clipOutputs[0]
      : joinClips(clipOutputs, {
          mode,
          idPrefix: group.id,
          aspectRatio: director.data.aspectRatio ?? "9:16",
          addNode,
          wire,
        });

  const rewired = outbound.map((e) => ({
    ...e,
    id: (e.sourceHandle || "output") === "output" ? joinEdgeId(outputId, e.target, e.targetHandle ?? "") : `${e.id}~${outputId}`,
    source: outputId,
  }));
  const removedIds = [...joinIds];
  const outboundIds = new Set(outbound.map((e) => e.id));
  const edges = [
    ...graph.edges.filter((e) => !joinIds.has(e.source) && !joinIds.has(e.target) && !outboundIds.has(e.id)),
    ...addedEdges,
    ...rewired,
  ];
  const nodes = [
    ...graph.nodes
      .filter((n) => !joinIds.has(n.id))
      .map((n) =>
        n.id === directorId ? { ...n, data: { ...n.data, toolParams: { ...n.data.toolParams, [CLIP_JOIN_PARAM]: mode } } } : n,
      ),
    ...added,
  ];
  const groups = graph.groups.map((g) =>
    g.id === group.id
      ? { ...g, memberIds: [...g.memberIds.filter((id) => !joinIds.has(id)), ...added.map((n) => n.id)] }
      : g,
  );
  return { nodes, edges, groups, addedIds: added.map((n) => n.id), removedIds, outputId };
}
