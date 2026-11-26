// ffmpeg:sequence — one timeline over many wired clips, layers, and audio, rendered in a
// single FFmpeg run. The timeline lives in toolParams.sequence (model/canvas-sequence.ts).

import type { CanvasModelSpec } from "@/model/canvas-model";
import { SEQUENCE_LIMITS, SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { audiosPort, promptPort, refImagesPort, videoOutput, videosPort } from "@/service/canvas/catalog/ports";

export const FFMPEG_SEQUENCE_MODEL: CanvasModelSpec = {
  id: SEQUENCE_MODEL_ID,
  provider: "ffmpeg",
  providerModelId: "sequence",
  name: "FFmpeg Sequence",
  category: "ffmpeg",
  inputs: [
    { ...videosPort(SEQUENCE_LIMITS.videoClips), label: "片段 Clips", labels: { "zh-Hant": "片段", en: "Clips" } },
    { ...audiosPort(SEQUENCE_LIMITS.audioItems), required: false, label: "音訊 Audio", labels: { "zh-Hant": "音訊", en: "Audio" } },
    { ...refImagesPort(SEQUENCE_LIMITS.overlays), label: "疊加圖片 Overlay images", labels: { "zh-Hant": "疊加圖片", en: "Overlay images" } },
    { ...promptPort(false), label: "字幕 SRT", labels: { "zh-Hant": "字幕 SRT", en: "Subtitles SRT" } },
  ],
  output: videoOutput(),
  presets: ["sequence"],
  defaultPresetId: "sequence",
  basePriceUsd: 0,
  supportsAspectRatio: false,
  available: true,
  agentHint:
    "A timeline over its wired clips (videos), music / voice (audios), overlay images (refImages), and optional SRT (prompt), rendered in one run. Edit it with build_sequence / update_sequence, never with toolParams.",
};
