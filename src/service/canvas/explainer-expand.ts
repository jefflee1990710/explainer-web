// Pure: turns a finished Explainer plan into per-clip canvas nodes and edges.

import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import { isSilentSpokenLine } from "@/service/director/spoken-line";
import { layoutExplainerGroup } from "@/service/canvas/explainer-layout";

export const EXPLAINER_HAILUO_MODEL_ID = "openrouter:minimax/hailuo-3";
// Diagram explainers speed narration with atempo=1.25 in the director pipeline.
const EXPLAINER_TTS_SPEED = 1.25;
const CONCAT_MAX_INPUTS = 8;

export type ExplainerExpansionClip = {
  clipNumber: number;
  framePrompt: string;
  videoPrompt: string;
  durationSeconds: number;
  spokenLine: string;
};

export type ExplainerExpansionInput = {
  idPrefix: string;
  origin: { x: number; y: number };
  plannerVideoId: string;
  aspectRatio: CanvasAspectRatio;
  language: "yue" | "zh" | "en";
  voicePreset: string;
  characterId?: string;
  clips: ExplainerExpansionClip[];
};

// Same fixed narrators the director uses when the cast has no cloned voice.
export function explainerVoicePreset(
  language: "yue" | "zh" | "en",
  gender?: "male" | "female",
): string {
  const male = gender === "male";
  if (language === "yue") return male ? "alan" : "cathy";
  if (language === "zh") return male ? "yu" : "una";
  return male ? "brian" : "bella";
}

export function buildExplainerExpansion(input: ExplainerExpansionInput) {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const id = (suffix: string) => `${input.idPrefix}-${suffix}`;
  const edge = (source: string, target: string, targetHandle: string) =>
    edges.push({ id: `${source}->${target}:${targetHandle}`, source, sourceHandle: "output", target, targetHandle });

  // Final output per clip (mux, or the video for silent clips), in clip order.
  const clipOutputs: string[] = [];
  // Real positions come from layoutExplainerGroup once every node exists.
  const unplaced = { x: input.origin.x, y: input.origin.y };

  input.clips.forEach((clip) => {
    const n = clip.clipNumber;
    const frameId = id(`frame-${n}`);
    const videoId = id(`video-${n}`);
    nodes.push({
      id: frameId,
      type: "model",
      position: { ...unplaced },
      data: {
        modelId: "scro:explainer-frame",
        presetId: input.aspectRatio,
        aspectRatio: input.aspectRatio,
        prompt: clip.framePrompt,
        toolParams: { plannerVideoId: input.plannerVideoId, clipNumber: n },
        status: "idle",
      },
    });
    nodes.push({
      id: videoId,
      type: "model",
      position: { ...unplaced },
      data: {
        modelId: EXPLAINER_HAILUO_MODEL_ID,
        presetId: input.aspectRatio,
        aspectRatio: input.aspectRatio,
        durationSeconds: Math.min(15, Math.max(5, Math.round(clip.durationSeconds))),
        prompt: clip.videoPrompt,
        status: "idle",
      },
    });
    edge(frameId, videoId, "startImage");

    const line = clip.spokenLine.trim();
    if (!line || isSilentSpokenLine(line)) {
      clipOutputs.push(videoId);
      return;
    }
    const voiceId = id(`voice-${n}`);
    const muxId = id(`mux-${n}`);
    nodes.push({
      id: voiceId,
      type: "model",
      position: { ...unplaced },
      data: {
        modelId: "scro:tts",
        presetId: "natural",
        prompt: line,
        toolParams: {
          language: input.language,
          voicePreset: input.voicePreset,
          ttsSpeed: EXPLAINER_TTS_SPEED,
          ...(input.characterId ? { characterId: input.characterId } : {}),
        },
        status: "idle",
      },
    });
    nodes.push({
      id: muxId,
      type: "model",
      position: { ...unplaced },
      data: {
        modelId: "ffmpeg:audio-mux",
        presetId: "replace",
        toolParams: { ffmpegMixMode: "replace", ffmpegAudioGainDb: 0 },
        status: "idle",
      },
    });
    edge(videoId, muxId, "video");
    edge(voiceId, muxId, "refAudio");
    clipOutputs.push(muxId);
  });

  // First concat takes up to 8 clips; each next one takes the previous concat + up to 7 clips.
  let remaining = [...clipOutputs];
  let previous: string | undefined;
  let step = 0;
  while (remaining.length > 0 || !previous) {
    const room = previous ? CONCAT_MAX_INPUTS - 1 : CONCAT_MAX_INPUTS;
    const batch = remaining.slice(0, room);
    remaining = remaining.slice(room);
    const concatId = id(`concat-${step + 1}`);
    nodes.push({
      id: concatId,
      type: "model",
      position: { ...unplaced },
      data: {
        modelId: "ffmpeg:concat",
        presetId: "pad-200ms",
        toolParams: { ffmpegTransition: "pad-200ms" },
        status: "idle",
      },
    });
    if (previous) edge(previous, concatId, "videos");
    for (const item of batch) edge(item, concatId, "videos");
    previous = concatId;
    step += 1;
    if (batch.length === 0) break;
  }

  const positions = layoutExplainerGroup({
    nodeIds: nodes.map((n) => n.id),
    edges,
    origin: input.origin,
  });
  for (const node of nodes) node.position = positions.get(node.id) ?? node.position;

  return { nodes, edges, expandedNodeIds: nodes.map((n) => n.id) };
}

type GraphNode = { id: string };
type GraphEdge = { id: string; source: string; target: string };

// Swaps the planning card for its expanded nodes; ids already on the canvas are skipped.
export function replacePlannerWithExpansion<N extends GraphNode, E extends GraphEdge>(
  graph: { nodes: readonly N[]; edges: readonly E[] },
  plannerId: string,
  expansion: { nodes: readonly N[]; edges: readonly E[] },
): { nodes: N[]; edges: E[] } {
  const nodes = graph.nodes.filter((n) => n.id !== plannerId);
  const edges = graph.edges.filter((e) => e.source !== plannerId && e.target !== plannerId);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeIds = new Set(edges.map((e) => e.id));
  return {
    nodes: [...nodes, ...expansion.nodes.filter((n) => !nodeIds.has(n.id))],
    edges: [...edges, ...expansion.edges.filter((e) => !edgeIds.has(e.id))],
  };
}
