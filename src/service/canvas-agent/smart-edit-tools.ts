// Smart edit tools for the canvas agent: Clean Speech and Smart Reframe insert in place like
// FFmpeg edits; auto_bgm / auto_sfx find library audio (free) and wire it in. Nothing runs here.

import { z } from "zod";
import { SEQUENCE_LIMITS } from "@/model/canvas-sequence";
import { readSequence } from "@/service/canvas/core/sequence";
import { placeClips } from "@/service/canvas/core/sequence/timeline";
import { sequenceSourceDurations } from "@/service/canvas/core/edit-media";
import { addBgm, insertEdit, type EditToolHandlers } from "@/service/canvas-agent/edit-tools";
import { updateSequence } from "@/service/canvas-agent/sequence-tools";
import { addNode, type CanvasAgentToolResult, type CanvasAgentWorkingGraph } from "@/service/canvas-agent/working-graph";
import { defaultSmartAudioFinder, type SmartAudioFinder } from "@/service/canvas-agent/smart-audio";

const source = {
  sourceId: z.string().describe("Node whose video is edited."),
  sourcePort: z.string().optional().describe('Only for a named extra output, e.g. "video-b".'),
};

export const SMART_EDIT_TOOL_SCHEMAS = {
  clean_speech: z.object({
    ...source,
    language: z.enum(["yue", "zh", "en", "auto"]).optional(),
    maxPauseSec: z.number().min(0).max(5).optional().describe("Shorten pauses longer than this (default 0.8; 0 keeps pauses)."),
    fillers: z.boolean().optional().describe("Cut 嗯 / 呃 / um / uh. Default true."),
    repeats: z.boolean().optional().describe("Cut the first take of a phrase said twice. Default true."),
  }),
  smart_reframe: z.object({
    ...source,
    aspect: z.enum(["9:16", "1:1", "4:5", "16:9"]).optional().describe("Default 9:16."),
    resolution: z.enum(["720p", "1080p"]).optional(),
    motion: z.enum(["steady", "follow"]).optional().describe("steady (default) holds the framing unless the subject moves a lot."),
    focus: z.string().max(200).optional().describe("Who or what to follow; empty = the speaker."),
  }),
  auto_bgm: z.object({
    targetId: z.string().describe("A video node to mix music under, or an ffmpeg:sequence to add a music track to."),
    context: z.string().min(3).max(400).describe("What the video is about, in English, for picking the music."),
    mood: z.string().max(60).optional().describe('Mood the user asked for, e.g. "upbeat", "calm lo-fi".'),
    volumeDb: z.number().min(-40).max(6).optional().describe("Default -18 (under speech)."),
  }),
  auto_sfx: z.object({
    sequenceId: z.string().describe("An ffmpeg:sequence; sound effects land on its transitions and text pop-ins."),
    max: z.number().int().min(1).max(4).optional().describe("Default 3."),
  }),
};

type In<K extends keyof typeof SMART_EDIT_TOOL_SCHEMAS> = z.infer<(typeof SMART_EDIT_TOOL_SCHEMAS)[K]>;

function defined(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
}

function addAudioNode(g: CanvasAgentWorkingGraph, url: string, name: string): CanvasAgentToolResult {
  return addNode(g, "media", { label: name.slice(0, 60), fileName: name.slice(0, 60), mediaKind: "audio", mediaUrl: url });
}

// Current audio items as update_sequence input, so a new item is added rather than replacing them.
function currentAudio(g: CanvasAgentWorkingGraph, nodeId: string) {
  const node = g.nodes.find((n) => n.id === nodeId);
  const seq = readSequence(node?.data.toolParams);
  return seq.tracks.audio.flatMap((a) => {
    if (!g.edges.some((e) => e.id === a.ref)) return [];
    const { id: _id, ref, src: _src, ...rest } = a;
    void _id;
    void _src;
    return [{ source: ref, ...rest }];
  });
}

async function autoBgm(
  g: CanvasAgentWorkingGraph,
  h: EditToolHandlers,
  input: In<"auto_bgm">,
  finder: SmartAudioFinder,
): Promise<CanvasAgentToolResult> {
  const target = g.nodes.find((n) => n.id === input.targetId);
  if (!target) return { error: `Node "${input.targetId}" does not exist.` };
  const isSequence = target.data.modelId === "ffmpeg:sequence";
  if (isSequence && currentAudio(g, target.id).length >= SEQUENCE_LIMITS.audioItems) {
    return { error: "This timeline already has the most audio items it can hold." };
  }
  const music = await finder.findMusic({ context: input.context, mood: input.mood }).catch(() => null);
  if (!music) return { error: "No suitable music was found. Ask the user for a track or try another mood." };
  const media = addAudioNode(g, music.url, music.name);
  if (typeof media.nodeId !== "string") return media;
  const found = { music: { nodeId: media.nodeId, name: music.name, mood: music.mood, durationSec: music.durationSec, credit: music.credit } };
  const volumeDb = input.volumeDb ?? -18;

  if (isSequence) {
    const result = updateSequence(g, h, {
      nodeId: target.id,
      audio: [
        ...currentAudio(g, target.id),
        { source: media.nodeId, gainDb: volumeDb, duck: true, loop: true, fadeOutSec: 1.5 },
      ],
    });
    return { ...result, ...found };
  }
  const mixed = addBgm(g, h, {
    sourceId: target.id,
    musicNodeId: media.nodeId,
    toolParams: { ffmpegBgmVolumeDb: volumeDb, ffmpegBgmLoop: true, ffmpegBgmDuck: true, ffmpegBgmFadeOutSec: 1.5 },
  });
  return { ...mixed, ...found };
}

async function autoSfx(
  g: CanvasAgentWorkingGraph,
  h: EditToolHandlers,
  input: In<"auto_sfx">,
  finder: SmartAudioFinder,
): Promise<CanvasAgentToolResult> {
  const node = g.nodes.find((n) => n.id === input.sequenceId);
  if (node?.data.modelId !== "ffmpeg:sequence") return { error: `"${input.sequenceId}" is not an ffmpeg:sequence node.` };
  const seq = readSequence(node.data.toolParams);
  const existing = currentAudio(g, node.id);
  const room = SEQUENCE_LIMITS.audioItems - existing.length;
  if (room <= 0) return { error: "This timeline already has the most audio items it can hold." };
  const placed = placeClips(seq, sequenceSourceDurations(g, node.id));
  const transitions = placed
    .filter((p) => p.clip.transitionIn && p.transitionSec > 0)
    .map((p) => ({ effectType: p.clip.transitionIn!.effect, cutSec: p.start, durationSec: p.transitionSec }));
  const pops = seq.tracks.overlay
    .filter((l) => l.kind === "text" && l.text?.trim())
    .map((l) => ({ kind: "onscreen-text" as const, label: l.text!.slice(0, 40), startSec: l.startSec }));
  if (transitions.length === 0 && pops.length === 0) {
    return { error: "The timeline has no transitions or text pop-ins to put sound effects on." };
  }
  const sounds = await finder
    .findSfx({ transitions, pops, max: Math.min(room, input.max ?? 3) })
    .catch(() => []);
  if (sounds.length === 0) return { error: "No sound effects were found for this timeline." };
  const added: { nodeId: string; name: string; atSec: number; reason: string }[] = [];
  for (const s of sounds) {
    const media = addAudioNode(g, s.url, s.name);
    if (typeof media.nodeId !== "string") break;
    added.push({ nodeId: media.nodeId, name: s.name, atSec: s.atSec, reason: s.reason });
  }
  const result = updateSequence(g, h, {
    nodeId: node.id,
    audio: [
      ...existing,
      ...added.map((a) => ({ source: a.nodeId, startSec: Math.max(0, Number(a.atSec.toFixed(2))), gainDb: -6 })),
    ],
  });
  return { ...result, sfx: added };
}

export function smartEditToolHandlers(finder: SmartAudioFinder = defaultSmartAudioFinder) {
  return {
    clean_speech: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"clean_speech">) => {
      const res = insertEdit(g, h, {
        sourceId: input.sourceId,
        sourcePort: input.sourcePort,
        modelId: "scro:clean-speech",
        toolParams: defined({
          captionLanguage: input.language,
          cleanMaxPauseSec: input.maxPauseSec,
          cleanFillers: input.fillers,
          cleanRepeats: input.repeats,
        }),
      });
      return { ...res, note: "Clean Speech costs $0.20 per hour of source when run (Scribe)." };
    },
    smart_reframe: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"smart_reframe">) => {
      const res = insertEdit(g, h, {
        sourceId: input.sourceId,
        sourcePort: input.sourcePort,
        modelId: "scro:smart-reframe",
        toolParams: defined({
          reframeAspect: input.aspect,
          reframeResolution: input.resolution,
          reframeMotion: input.motion,
          reframeFocus: input.focus,
        }),
      });
      return { ...res, note: "Smart Reframe costs $0.02 per run." };
    },
    auto_bgm: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"auto_bgm">) => autoBgm(g, h, input, finder),
    auto_sfx: (g: CanvasAgentWorkingGraph, h: EditToolHandlers, input: In<"auto_sfx">) => autoSfx(g, h, input, finder),
  };
}

export const SMART_EDIT_TOOL_HANDLERS = smartEditToolHandlers();

export const SMART_EDIT_TOOL_DESCRIPTIONS: Record<keyof typeof SMART_EDIT_TOOL_SCHEMAS, string> = {
  clean_speech:
    "Insert Clean Speech after a talking video: Scribe word timings cut fillers, restarted phrases, and long pauses ($0.20 per hour of source when run; mention it).",
  smart_reframe:
    "Insert Smart Reframe after a wide video: crops to 9:16 (or 1:1 / 4:5) following the speaker's face ($0.02 per run; mention it).",
  auto_bgm:
    "Find free library background music that fits the video and mix it in, ducked under speech (on a Sequence it becomes a music track).",
  auto_sfx: "Find free library sound effects for a Sequence's transitions and text pop-ins and add them to its audio track.",
};

