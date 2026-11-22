// Pure: turns a finished Explainer plan into per-clip canvas nodes and edges.

import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import { isSilentSpokenLine } from "@/service/director/spoken-line";
import { layoutExplainerGroup } from "@/service/canvas/explainer-layout";
import { NANO_BANANA_CANVAS_MODEL_ID } from "@/service/canvas/model-catalog";
import { CONCAT_NODE_DATA, chainConcats } from "@/service/canvas/scro-groups/concat-chain";

export const EXPLAINER_HAILUO_MODEL_ID = "openrouter:minimax/hailuo-3";
// Explainer start stills use the same image model as the director pipeline.
export const EXPLAINER_FRAME_MODEL_ID = NANO_BANANA_CANVAS_MODEL_ID;
// Diagram explainers speed narration with atempo=1.25 in the director pipeline.
const EXPLAINER_TTS_SPEED = 1.25;

export type ExplainerExpansionClip = {
  clipNumber: number;
  framePrompt: string;
  videoPrompt: string;
  durationSeconds: number;
  spokenLine: string;
  // Character / prop / set locks for this still, in the order the prompt expects.
  refUrls?: string[];
};

export type ExplainerExpansionInput = {
  idPrefix: string;
  origin: { x: number; y: number };
  aspectRatio: CanvasAspectRatio;
  frameResolution?: "1k" | "2k" | "4k";
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
  const refNodeByUrl = new Map<string, string>();
  const refNode = (url: string) => {
    const existing = refNodeByUrl.get(url);
    if (existing) return existing;
    const k = refNodeByUrl.size + 1;
    const refId = id(`ref-${k}`);
    nodes.push({
      id: refId,
      type: "media",
      position: { ...unplaced },
      data: { label: `參考圖 ${k}`, fileName: `參考圖 ${k}`, mediaKind: "image", mediaUrl: url },
    });
    refNodeByUrl.set(url, refId);
    return refId;
  };

  input.clips.forEach((clip) => {
    const n = clip.clipNumber;
    const frameId = id(`frame-${n}`);
    const videoId = id(`video-${n}`);
    nodes.push({
      id: frameId,
      type: "model",
      position: { ...unplaced },
      data: {
        modelId: EXPLAINER_FRAME_MODEL_ID,
        presetId: input.aspectRatio,
        aspectRatio: input.aspectRatio,
        ...(input.frameResolution ? { resolution: input.frameResolution } : {}),
        prompt: clip.framePrompt,
        status: "idle",
      },
    });
    for (const url of [...new Set(clip.refUrls ?? [])].slice(0, 14)) {
      edge(refNode(url), frameId, "refImages");
    }
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

  chainConcats(
    clipOutputs,
    (step) => {
      const concatId = id(`concat-${step}`);
      nodes.push({
        id: concatId,
        type: "model",
        position: { ...unplaced },
        data: { ...CONCAT_NODE_DATA, status: "idle" },
      });
      return concatId;
    },
    edge,
  );

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
