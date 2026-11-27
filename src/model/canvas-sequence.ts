// Timeline document stored on an `ffmpeg:sequence` node as toolParams.sequence. The DAG stays
// the source of truth: every clip, layer, and audio item points at one wired edge (`ref`).

import { z } from "zod";
import { SUBTITLE_LOOK_IDS } from "@/model/subtitle-look-id";

export const SEQUENCE_MODEL_ID = "ffmpeg:sequence";
export const SEQUENCE_ASPECTS = ["9:16", "16:9", "1:1", "4:5"] as const;
export const SEQUENCE_RESOLUTIONS = ["720p", "1080p", "4k"] as const;
export const SEQUENCE_FPS = [24, 30, 60] as const;
export const SEQUENCE_TRANSITIONS = ["cut", "fade", "dissolve", "wipeleft", "wiperight", "slideleft", "slideright"] as const;
export const SEQUENCE_TEXT_COLORS = ["white", "yellow", "black", "lime", "red"] as const;

export const SEQUENCE_LIMITS = {
  videoClips: 30,
  overlays: 12,
  audioItems: 8,
  // Worker render caps (15-minute job timeout).
  maxTotalSec: 600,
  max4kSec: 180,
} as const;

// `src` ("nodeId:handle") rebinds a clip when its edge is recreated with a new id.
const refFields = { ref: z.string().min(1), src: z.string().optional() };

export const sequenceClipSchema = z.object({
  id: z.string().min(1),
  ...refFields,
  inSec: z.number().min(0).default(0),
  // Unset = to the end of the source.
  outSec: z.number().min(0).optional(),
  speed: z.number().min(0.25).max(4).default(1),
  muted: z.boolean().optional(),
  transitionIn: z
    .object({ effect: z.enum(SEQUENCE_TRANSITIONS), durationSec: z.number().min(0.1).max(2) })
    .optional(),
});

export const sequenceLayerSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image", "video", "text"]),
  ref: z.string().optional(),
  src: z.string().optional(),
  text: z.string().max(300).optional(),
  startSec: z.number().min(0).default(0),
  // Unset = to the end of the timeline.
  endSec: z.number().min(0).optional(),
  // Image / video layers: top-left corner and width, % of the frame.
  x: z.number().min(0).max(100).default(70),
  y: z.number().min(0).max(100).default(5),
  scalePct: z.number().min(5).max(100).default(25),
  opacity: z.number().min(0.05).max(1).default(1),
  // Text layers.
  position: z.enum(["top", "center", "bottom"]).default("bottom"),
  sizePct: z.number().min(2).max(15).default(5),
  color: z.enum(SEQUENCE_TEXT_COLORS).default("white"),
  box: z.boolean().default(false),
});

export const sequenceAudioSchema = z.object({
  id: z.string().min(1),
  ...refFields,
  startSec: z.number().min(0).default(0),
  inSec: z.number().min(0).default(0),
  outSec: z.number().min(0).optional(),
  gainDb: z.number().min(-40).max(12).default(0),
  fadeInSec: z.number().min(0).max(10).default(0),
  fadeOutSec: z.number().min(0).max(10).default(0),
  duck: z.boolean().default(false),
  loop: z.boolean().default(false),
  // Beat grid of the source file (source seconds), from "Snap to beats"; the render ignores it.
  bpm: z.number().min(0).max(400).optional(),
  beats: z.array(z.number().min(0)).max(4000).optional(),
});

export const canvasSequenceSchema = z.object({
  version: z.literal(1).default(1),
  aspectRatio: z.enum(SEQUENCE_ASPECTS).default("9:16"),
  resolution: z.enum(SEQUENCE_RESOLUTIONS).default("1080p"),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).default(30),
  tracks: z
    .object({
      video: z.array(sequenceClipSchema).max(SEQUENCE_LIMITS.videoClips).default([]),
      overlay: z.array(sequenceLayerSchema).max(SEQUENCE_LIMITS.overlays).default([]),
      audio: z.array(sequenceAudioSchema).max(SEQUENCE_LIMITS.audioItems).default([]),
      captions: z
        .object({
          look: z.enum(SUBTITLE_LOOK_IDS).default("clean"),
          position: z.enum(["bottom", "middle", "top"]).default("bottom"),
        })
        .optional(),
    })
    .default({ video: [], overlay: [], audio: [] }),
});

export type CanvasSequence = z.infer<typeof canvasSequenceSchema>;
export type SequenceClip = z.infer<typeof sequenceClipSchema>;
export type SequenceLayer = z.infer<typeof sequenceLayerSchema>;
export type SequenceAudio = z.infer<typeof sequenceAudioSchema>;
export type SequenceTransition = (typeof SEQUENCE_TRANSITIONS)[number];
