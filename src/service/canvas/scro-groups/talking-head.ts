// Pure: a finished Talking Head plan as visible nodes —
// one opening still + per-clip voice → HeyGen → Smooth Silence → Color Grade → Concat.

import type { CanvasAspectRatio, CanvasEdge, CanvasNode } from "@/model/canvas";
import { createGroupBuilder } from "@/service/canvas/scro-groups/builder";
import { CONCAT_NODE_DATA, chainConcats } from "@/service/canvas/scro-groups/concat-chain";
import { OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL } from "@/service/openrouter/generate";

export const TALKING_HEAD_VIDEO_MODEL_ID = `openrouter:${OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL}`;

export type TalkingHeadExpansionInput = {
  idPrefix: string;
  origin: { x: number; y: number };
  plannerVideoId: string;
  aspectRatio: CanvasAspectRatio;
  language: "yue" | "zh" | "en";
  characterId?: string;
  voicePreset: string;
  framing: string;
  // Clip 1 start still, shared by every clip.
  framePrompt: string;
  clips: { clipNumber: number; spokenLine: string; heygenPrompt: string; durationSeconds?: number }[];
};

export function buildTalkingHeadExpansion(input: TalkingHeadExpansionInput): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  expandedNodeIds: string[];
} {
  const b = createGroupBuilder({ idPrefix: input.idPrefix, origin: input.origin });
  const gradeLook = input.framing === "handheld-selfie" ? "talking-head-selfie" : "talking-head";

  const frame = b.model("frame-1", {
    modelId: "scro:director-frame",
    presetId: input.aspectRatio,
    aspectRatio: input.aspectRatio,
    prompt: input.framePrompt,
    toolParams: { plannerVideoId: input.plannerVideoId, clipNumber: 1 },
  });

  const clipOutputs = input.clips.map((clip) => {
    const n = clip.clipNumber;
    const voice = b.model(`voice-${n}`, {
      modelId: "scro:tts",
      presetId: "natural",
      prompt: clip.spokenLine,
      toolParams: {
        language: input.language,
        voicePreset: input.voicePreset,
        ttsConversational: true,
        ...(input.characterId ? { characterId: input.characterId } : {}),
      },
    });
    const video = b.model(`video-${n}`, {
      modelId: TALKING_HEAD_VIDEO_MODEL_ID,
      presetId: input.aspectRatio,
      aspectRatio: input.aspectRatio,
      prompt: clip.heygenPrompt,
      // Estimate only; the run follows the wired voice length.
      ...(clip.durationSeconds ? { durationSeconds: Math.round(clip.durationSeconds) } : {}),
    });
    const silence = b.model(`silence-${n}`, {
      modelId: "ffmpeg:smooth-silence",
      presetId: "smooth",
    });
    const grade = b.model(`grade-${n}`, {
      modelId: "ffmpeg:color-grade",
      presetId: gradeLook,
      toolParams: { gradeLook },
    });
    b.wire(frame, video, "startImage");
    b.wire(voice, video, "refAudio");
    b.wire(video, silence, "video");
    b.wire(silence, grade, "video");
    return grade;
  });

  const output =
    clipOutputs.length > 1
      ? chainConcats(clipOutputs, (step) => b.model(`concat-${step}`, CONCAT_NODE_DATA), b.wire)
      : clipOutputs[0] ?? frame;
  const group = b.finish(output);
  return { nodes: group.nodes, edges: group.edges, expandedNodeIds: group.nodes.map((n) => n.id) };
}
