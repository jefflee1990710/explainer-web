// Pure: finds runs of FFmpeg nodes that one worker job can render back to back.
// The head runs normally; each follower reads the previous step's local file instead of a Blob URL.

import type { CanvasNodeData } from "@/model/canvas";

type GraphNode = { id: string; type: string; data: CanvasNodeData };
type GraphEdge = { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null };

// Stand-in input URL for a step whose file is made earlier in the same fused job.
export const FUSED_OUTPUT_PREFIX = "fused://";

export function fusedOutputRef(nodeId: string): string {
  return `${FUSED_OUTPUT_PREFIX}${nodeId}`;
}

export function isFusedOutputRef(url: string | undefined): boolean {
  return Boolean(url?.startsWith(FUSED_OUTPUT_PREFIX));
}

// Long chains still fit one 15-minute worker slot.
export const MAX_FUSED_STEPS = 6;

// These write something other than one mp4, so nothing can read their file mid-chain.
const NOT_A_CHAIN_SOURCE = new Set([
  "ffmpeg:split",
  "ffmpeg:export",
  "ffmpeg:extract-audio",
  "ffmpeg:audio-trim",
  "ffmpeg:audio-concat",
  "ffmpeg:frame-grab",
]);

// These take no single `video` input to chain into.
const NOT_A_CHAIN_STEP = new Set([
  "ffmpeg:concat",
  "ffmpeg:sequence",
  "ffmpeg:image-to-video",
  "ffmpeg:audio-trim",
  "ffmpeg:audio-concat",
]);

function isFfmpegModel(node: GraphNode | undefined): node is GraphNode {
  return node?.type === "model" && Boolean(node.data.modelId?.startsWith("ffmpeg:"));
}

export function canFeedChain(node: GraphNode | undefined): boolean {
  return isFfmpegModel(node) && !NOT_A_CHAIN_SOURCE.has(node.data.modelId!);
}

export function canJoinChain(node: GraphNode | undefined): boolean {
  return isFfmpegModel(node) && !NOT_A_CHAIN_STEP.has(node.data.modelId!);
}

// Head first. Each next node takes the previous one's main output on `video`, is its only
// consumer, will run in this flow, and has every other input already settled.
export function planFusedChain(params: {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  headId: string;
  willRun: (nodeId: string) => boolean;
  // False for nodes another chain or another head already owns.
  canClaim?: (nodeId: string) => boolean;
  maxSteps?: number;
}): string[] {
  const byId = new Map(params.nodes.map((n) => [n.id, n]));
  const max = params.maxSteps ?? MAX_FUSED_STEPS;
  const chain = [params.headId];
  const inChain = new Set(chain);
  let current = byId.get(params.headId);
  while (chain.length < max && canFeedChain(current)) {
    const outgoing = params.edges.filter((e) => e.source === current!.id);
    if (outgoing.length !== 1) break;
    const edge = outgoing[0]!;
    if ((edge.sourceHandle ?? "output") !== "output" || edge.targetHandle !== "video") break;
    const next = byId.get(edge.target);
    if (!next || inChain.has(next.id) || !canJoinChain(next) || !params.willRun(next.id)) break;
    if (params.canClaim && !params.canClaim(next.id)) break;
    // Another input still being made in this flow would not exist yet when the chain runs.
    const otherInputs = params.edges.filter((e) => e.target === next.id && e !== edge);
    if (otherInputs.some((e) => params.willRun(e.source))) break;
    chain.push(next.id);
    inChain.add(next.id);
    current = next;
  }
  return chain;
}
