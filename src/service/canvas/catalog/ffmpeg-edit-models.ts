// Newer $0.00 Vast.ai Worker FFmpeg edit nodes: split, text, BGM mix, audio trim and join,
// picture adjust, freeze frame, and export. Appended to FFMPEG_STATIC_MODELS.

import type { CanvasModelSpec } from "@/model/canvas-model";
import { TRANSITION_EFFECTS } from "@/model/video-edit";
import {
  audioOutput,
  audiosPort,
  refAudioPort,
  videoOutput,
  videoPort,
} from "@/service/canvas/catalog/ports";
import { flag, num, oneOf, text } from "@/service/canvas/catalog/tool-param-specs";
import { SPLIT_SECOND_HANDLE } from "@/service/canvas/core/extra-outputs";

// Concat joins: a cut, a 0.2s hold, or any xfade transition the reel editor offers.
export const CONCAT_TRANSITIONS = [
  "pad-200ms",
  "cut",
  ...TRANSITION_EFFECTS.filter((effect) => effect !== "none"),
] as const;

export const EDIT_FRAME_SHAPES = ["source", "9:16", "16:9", "1:1", "4:5"] as const;

export const TEXT_COLORS = ["white", "yellow", "black", "lime", "red"] as const;

const base = {
  provider: "ffmpeg" as const,
  category: "ffmpeg" as const,
  basePriceUsd: 0,
  supportsAspectRatio: false,
  available: true,
};

export const FFMPEG_EDIT_MODELS: CanvasModelSpec[] = [
  {
    ...base,
    id: "ffmpeg:split",
    providerModelId: "split",
    name: "FFmpeg Split",
    inputs: [videoPort(true)],
    output: {
      id: "output",
      label: "前段 Part A",
      labels: { "zh-Hant": "前段", en: "Part A" },
      type: "video",
    },
    extraOutputs: [
      {
        id: SPLIT_SECOND_HANDLE,
        label: "後段 Part B",
        labels: { "zh-Hant": "後段", en: "Part B" },
        type: "video",
      },
    ],
    presets: ["split"],
    defaultPresetId: "split",
    agentHint: `Cuts a video in two at ffmpegAtSec. "output" is the part before, "${SPLIT_SECOND_HANDLE}" the part after (connect with sourcePort).`,
    toolParams: [num("ffmpegAtSec", 0.1, 36_000)],
  },
  {
    ...base,
    id: "ffmpeg:text",
    providerModelId: "text",
    name: "FFmpeg Text",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["title"],
    defaultPresetId: "title",
    agentHint: "Draws a title or caption line on the video (Chinese supported), optionally only between start and end.",
    toolParams: [
      text("ffmpegText", "the words to draw; use \\n for a second line"),
      oneOf("ffmpegTextPosition", ["top", "center", "bottom"]),
      num("ffmpegTextSizePct", 2, 15, "letter height, % of video height; default 5"),
      oneOf("ffmpegTextColor", TEXT_COLORS),
      flag("ffmpegTextBox", "dark box behind the text"),
      num("ffmpegTextStartSec", 0, 36_000),
      num("ffmpegTextEndSec", 0, 36_000, "0 = to the end"),
    ],
  },
  {
    ...base,
    id: "ffmpeg:audio-mix",
    providerModelId: "audio-mix",
    name: "FFmpeg Background Music",
    inputs: [videoPort(true), { ...refAudioPort(true), label: "背景音樂 Music", labels: { "zh-Hant": "背景音樂", en: "Music" } }],
    output: videoOutput(),
    presets: ["bgm"],
    defaultPresetId: "bgm",
    agentHint:
      "Mixes background music (refAudio) under the video's own sound for the video's full length; ducks the music while people speak.",
    toolParams: [
      num("ffmpegBgmVolumeDb", -40, 6, "music level, default -18"),
      num("ffmpegBgmStartSec", 0, 36_000, "music starts this far into the video"),
      flag("ffmpegBgmLoop", "repeat short music; default true"),
      num("ffmpegBgmFadeOutSec", 0, 10, "default 1.5"),
      flag("ffmpegBgmDuck", "lower the music under speech; default true"),
    ],
  },
  {
    ...base,
    id: "ffmpeg:audio-trim",
    providerModelId: "audio-trim",
    name: "FFmpeg Audio Trim & Level",
    inputs: [{ ...refAudioPort(true), label: "音訊 Audio", labels: { "zh-Hant": "音訊", en: "Audio" } }],
    output: audioOutput(),
    presets: ["mp3"],
    defaultPresetId: "mp3",
    agentHint: "Trims an audio file and sets its level and fades (the audio-only volume / fade).",
    toolParams: [
      num("ffmpegStartSec", 0, 36_000),
      num("ffmpegEndSec", 0, 36_000, "0 = to the end"),
      num("ffmpegAudioGainDb", -40, 24),
      flag("ffmpegLoudnorm", "even out loudness"),
      num("ffmpegFadeInSec", 0, 10),
      num("ffmpegFadeOutSec", 0, 10),
    ],
  },
  {
    ...base,
    id: "ffmpeg:audio-concat",
    providerModelId: "audio-concat",
    name: "FFmpeg Audio Join",
    inputs: [audiosPort(8)],
    output: audioOutput(),
    presets: ["join"],
    defaultPresetId: "join",
    agentHint: "Joins up to 8 audio files in the order of its audios edges.",
    toolParams: [num("ffmpegGapSec", 0, 5, "silence between files")],
  },
  {
    ...base,
    id: "ffmpeg:adjust",
    providerModelId: "adjust",
    name: "FFmpeg Adjust",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["adjust"],
    defaultPresetId: "adjust",
    agentHint: "Brightness, contrast, saturation, and warmth.",
    toolParams: [
      num("ffmpegBrightness", -0.5, 0.5, "0 = unchanged"),
      num("ffmpegContrast", 0.5, 2, "1 = unchanged"),
      num("ffmpegSaturation", 0, 3, "1 = unchanged, 0 = black and white"),
      num("ffmpegTemperatureK", 3000, 10000, "6500 = unchanged, lower = cooler, higher = warmer"),
      flag("ffmpegVignette", "darker corners"),
    ],
  },
  {
    ...base,
    id: "ffmpeg:freeze",
    providerModelId: "freeze",
    name: "FFmpeg Freeze Frame",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["freeze"],
    defaultPresetId: "freeze",
    agentHint: "Holds the frame at ffmpegAtSec for ffmpegDurationSec (silent), then plays on.",
    toolParams: [num("ffmpegAtSec", 0, 36_000), num("ffmpegDurationSec", 0.2, 10)],
  },
  {
    ...base,
    id: "ffmpeg:export",
    providerModelId: "export",
    name: "FFmpeg Export",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["mp4"],
    defaultPresetId: "mp4",
    agentHint: "Final file: resolution, frame rate, quality, loudness, file name, and mp4 / webm / gif.",
    toolParams: [
      oneOf("ffmpegResolution", ["source", "720p", "1080p", "4k"]),
      oneOf("ffmpegFps", ["source", "24", "30", "60"]),
      oneOf("ffmpegQuality", ["high", "standard", "small"]),
      flag("ffmpegLoudnorm", "even out loudness to -14 LUFS"),
      oneOf("ffmpegFormat", ["mp4", "webm", "gif"]),
      text("ffmpegFileName", "letters, digits, - and _"),
    ],
  },
];
